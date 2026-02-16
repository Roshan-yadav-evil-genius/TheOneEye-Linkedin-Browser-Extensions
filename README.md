# Prospect Involved In Post Extractor

Extract prospects (people who reacted or commented) from LinkedIn posts using Chrome extensions that call LinkedIn's GraphQL APIs. Optional Python tooling records request/response traffic to JSONL for reverse-engineering and extension development. Part of the TheOneEye ecosystem.

## Features

- **Reactors extractor** — Chrome extension that loads who reacted to the current LinkedIn post, 10 at a time, with pagination.
- **Commenters extractor** — Chrome extension that loads who commented on the current post, 10 at a time, with pagination (including `paginationToken`). Popup includes list, export, and limit controls.
- **Python utilizer** — Playwright-based browser that reuses saved session state and records all requests/responses to `brain/execution/e{N}.jsonl` for analysis and debugging.

## Repository structure

| Path | Description |
|------|-------------|
| `extension/reactedProspectExtractor/` | Reactors Chrome extension (manifest, content script, popup). |
| `extension/commentProspectExtractor/` | Commenters Chrome extension. |
| `browser_data_utilizer.py` | Playwright launcher that records requests and responses. |
| `constants.py` | Config: list of LinkedIn post URLs used as initial URLs by the utilizer. |
| `brain/` | Research and analysis notes; execution logs live under `brain/execution/` (gitignored). |

## Prerequisites

- **Extensions:** Chrome or another Chromium-based browser.
- **Python utilizer:** Python 3, Playwright (`playwright` package and browser binary). Use the **theoneeye** Conda environment for backend and tooling when applicable.

## Setup and usage

### Chrome extensions

1. Open Chrome → Extensions → Manage extensions → **Load unpacked**.
2. Choose either `extension/reactedProspectExtractor` or `extension/commentProspectExtractor`.
3. Each extension expects `icon.png` (16×16, 48×48, 128×128) in its folder; add your own icons if missing.

Use the extension only on LinkedIn post pages while logged in. Open the popup to load reactors or commenters and paginate or export as needed.

### Python utilizer

1. Activate the theoneeye Conda environment and install Playwright:
   ```bash
   pip install playwright
   playwright install chromium
   ```
2. Optionally edit `constants.py` and set `POSTS` to the LinkedIn post URL(s) to open.
3. Run:
   ```bash
   python browser_data_utilizer.py
   ```
   A browser window opens, navigates to the first post (or feed), and records traffic to `brain/execution/e{N}.jsonl` until you close the window. Session data is stored in `browser_data/`.

## Execution logs

Each run writes a new `brain/execution/e{N}.jsonl` file. Lines are JSON objects: `type=meta` (run info), `type=cookies` (LinkedIn cookies snapshot), and `type=request` / `type=response` pairs (with tags such as `graphql`, `reactions`, `comments`). These logs are for analysis and extension development only; `brain/execution/` is gitignored.

## Research context

The reverse-engineering workflow and replication strategy (minimal request derivation, dependency mapping, Playwright and extension replication) are documented in `agent.md` for contributors who need the full investigation process.
