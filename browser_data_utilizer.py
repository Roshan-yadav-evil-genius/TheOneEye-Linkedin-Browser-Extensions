"""
Persistent browser launcher: normal-looking browser, no automation trace.
State (cookies, sessions) is saved in browser_data/ and reused on next run.
Each run records request/response to brain/execution/e{N}.jsonl (one JSON object per line).
Waits until you close the browser window (infinite, no timeout).

Recorded lines give better context for analysis and extension work:
- type=meta: run info (initial_url, timestamp)
- type=cookies: snapshot of linkedin.com cookies after initial load (for CSRF/cookie debugging)
- type=request/response: request_id pairs them; page_url shows which page triggered it; tag marks graphql/reactions/comments
"""
import asyncio
import base64
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from constants import POSTS
from playwright.async_api import async_playwright

USER_DATA_DIR = os.path.abspath("browser_data")
INITIAL_URL = POSTS[0] if POSTS else "https://www.linkedin.com/feed/"

BASE_DIR = Path("brain/execution").resolve()
BASE_DIR.mkdir(parents=True, exist_ok=True)

# Seconds to wait after initial load so first API calls (reactions/comments) are captured
WAIT_AFTER_LOAD_S = 5

def _next_execution_path() -> Path:
    existing = list(BASE_DIR.glob("e*.jsonl"))
    numbers = [
        int(f.stem[1:])
        for f in existing
        if len(f.stem) > 1 and f.stem[1:].isdigit()
    ]
    next_number = max(numbers, default=0) + 1
    return BASE_DIR / f"e{next_number}.jsonl"


def _encode_body(raw: bytes) -> str:
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return base64.b64encode(raw).decode("ascii")


def _headers_dict(headers: dict) -> dict:
    return dict(headers) if headers else {}


def _skip_url(url: str) -> bool:
    return url.startswith("chrome-extension://")


def _tag_request(url: str) -> list:
    """Return tags for high-value requests so analysis/grep is easier."""
    tags = []
    if "voyager/api/graphql" in url:
        tags.append("graphql")
        if "voyagerSocialDashReactions" in url or "Reactions" in url:
            tags.append("reactions")
        if "voyagerSocialDashComments" in url or "Comments" in url:
            tags.append("comments")
            if "paginationToken" not in url and "start:0)" in url:
                tags.append("comments_first")
    return tags


def _graphql_variables_snippet(url: str, max_len: int = 220):
    """Extract variables= value from graphql URL for logging (start:0 vs paginationToken etc)."""
    if "variables=" not in url or "voyager/api/graphql" not in url:
        return None
    start = url.find("variables=") + len("variables=")
    end = url.find("&", start)
    if end == -1:
        end = url.find("?", start)
    if end == -1:
        snippet = url[start:]
    else:
        snippet = url[start:end]
    return snippet[:max_len] if snippet else None


def _attach_listeners(page, file_handle, write_lock: asyncio.Lock, request_ids: dict, request_counter: list) -> None:
    async def on_request(request):
        if _skip_url(request.url):
            return
        rid = request_counter[0]
        request_counter[0] += 1
        request_ids[id(request)] = rid
        raw = request.post_data_buffer
        post_data = _encode_body(raw) if raw else None
        payload = {
            "type": "request",
            "request_id": rid,
            "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "url": request.url,
            "method": request.method,
            "headers": _headers_dict(request.headers),
        }
        tags = _tag_request(request.url)
        if tags:
            payload["tag"] = tags
        snippet = _graphql_variables_snippet(request.url)
        if snippet is not None:
            payload["variables_snippet"] = snippet
        try:
            payload["page_url"] = page.url
        except Exception:
            payload["page_url"] = None
        if post_data is not None:
            payload["post_data"] = post_data
        async with write_lock:
            file_handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
            file_handle.flush()

    async def on_response(response):
        if _skip_url(response.url):
            return
        rid = request_ids.get(id(response.request))
        body_encoded: str
        try:
            raw = await response.body()
            body_encoded = _encode_body(raw)
        except Exception:
            body_encoded = ""
        payload = {
            "type": "response",
            "request_id": rid,
            "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "url": response.url,
            "status": response.status,
            "headers": _headers_dict(response.headers),
            "body": body_encoded,
        }
        tags = _tag_request(response.url)
        if tags:
            payload["tag"] = tags
        if response.status >= 400 and body_encoded:
            payload["error_preview"] = body_encoded[:500] if isinstance(body_encoded, str) else ""
        try:
            payload["page_url"] = page.url
        except Exception:
            payload["page_url"] = None
        async with write_lock:
            file_handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
            file_handle.flush()

    page.on("request", on_request)
    page.on("response", on_response)


async def main() -> None:
    path = _next_execution_path()
    write_lock = asyncio.Lock()
    request_ids = {}
    request_counter = [0]

    with open(path, "w", encoding="utf-8") as f:
        meta = {
            "type": "meta",
            "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "initial_url": INITIAL_URL,
            "user_data_dir": USER_DATA_DIR,
        }
        f.write(json.dumps(meta, ensure_ascii=False) + "\n")
        f.flush()

        print(f"Recording to: {path}")
        async with async_playwright() as p:
            context = await p.chromium.launch_persistent_context(
                USER_DATA_DIR,
                headless=False,
                ignore_default_args=["--enable-automation"],
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--window-size=1920,1080",
                ],
                viewport={"width": 1920, "height": 1080},
            )
            try:
                for existing_page in context.pages:
                    _attach_listeners(existing_page, f, write_lock, request_ids, request_counter)
                context.on("page", lambda page: _attach_listeners(page, f, write_lock, request_ids, request_counter))

                page = context.pages[0] if context.pages else await context.new_page()
                await page.goto(INITIAL_URL)
                await asyncio.sleep(WAIT_AFTER_LOAD_S)
                try:
                    all_cookies = await context.cookies()
                    linkedin = [c for c in all_cookies if "linkedin.com" in (c.get("domain") or "")]
                    cookie_line = {
                        "type": "cookies",
                        "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                        "page_url": page.url,
                        "cookies": [{"name": c.get("name"), "domain": c.get("domain"), "value": c.get("value")} for c in linkedin],
                    }
                    f.write(json.dumps(cookie_line, ensure_ascii=False) + "\n")
                    f.flush()
                except Exception as e:
                    f.write(json.dumps({"type": "cookies", "error": str(e)}, ensure_ascii=False) + "\n")
                    f.flush()
                await page.wait_for_event("close", timeout=0)
            finally:
                await context.close()

    print(f"JSONL saved to: {path}")


if __name__ == "__main__":
    asyncio.run(main())
