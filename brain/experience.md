# Experience – LinkedIn post audience extraction

Consolidated learnings: what worked, what failed and why, and what to take care of next time.

---

## What worked

- **Execution capture:** `browser_data_utilizer.py` + Playwright; e2/e3.jsonl (request/response, optional meta/cookies/request_id) reliably captured Voyager GraphQL traffic.
- **API mapping:** Same base URL and queryIds for reactions (`voyagerSocialDashReactions.*`) and comments (`voyagerSocialDashComments.*`); activity ID from URL segment (`activity-{id}-` or `ugcPost-{id}-`); URNs: reactions = `threadUrn`, comments = `socialDetailUrn`.
- **Auth:** No API key; cookie session + `csrf-token` header. In the extension, **JSESSIONID** cookie (value `ajax:...`) is the reliable CSRF source when read from `document.cookie` on the LinkedIn tab.
- **Pagination:** Reactions = offset only (`start=0,10,20,...`). Comments = first request without `paginationToken`; extract token from first response; use same token + increasing `start` for later pages.
- **Extension:** Matching headers (csrf-token, Referer, x-restli, x-li-lang, x-li-track, x-li-page-instance, Accept, sec-ch-ua*) and correct `threadUrn` by post type (activity vs ugcPost) made reactions work end-to-end.
- **Error handling:** Check both `data.errors` and `data.data.errors`; treat as failure only when zero reactors and an error is present.

---

## What failed and why

- **CSRF from meta/input/cookie names:** Multiple attempts (meta tag, input, various cookie names, MAIN-world script) failed. **Why:** The working token in practice is the **JSESSIONID** cookie value; other sources were inconsistent or not set on the page.
- **"Reaction cannot be found" (404):** Using `urn:li:activity:{id}` for every post. **Why:** Posts whose URL has **ugcPost-{id}-** require **urn:li:ugcPost:{id}**; the API rejects activity URN for those.
- **Comments "Failed to decorate the URN" (NotFoundUrnException 404):** Using `urn:li:activity:{id}` in **socialDetailUrn** for every post. **Why:** Same as reactions: **ugcPost**-style URLs require **urn:li:ugcPost:{id}** in the fsd_socialDetail tuple; wrong type → 404.
- **Misdiagnosing API errors:** Assuming a single error location. **Why:** Errors can appear in **data.data.errors** as well as **data.errors**; responses can have both data and errors.

---

## What to take care of next time

- **Auth:** Always use a valid LinkedIn session (cookies) and the same CSRF value the app sends (JSESSIONID in the extension). If "Could not read CSRF" persists: add cookie permission, try more cookie names or the full tab URL for `getAll`, or consider reading from the page's own outbound request headers.
- **Post type:** Detect **activity** vs **ugcPost** from the URL and set **threadUrn** (reactions) and **socialDetailUrn** (comments) accordingly. Wrong URN → "Reaction cannot be found" or "Failed to decorate the URN" (404).
- **Headers:** Match the real client (Referer = post or current tab, x-restli, x-li-lang, x-li-track, x-li-page-instance, Accept). For 403, verify Referer and CSRF first.
- **Comments:** First page has no `paginationToken`; all later pages must send the token from the first response and increment `start`.
- **API drift:** QueryIds or response shape may change. Re-run `browser_data_utilizer.py`, open the post, scroll reactions/comments, then inspect the new e*.jsonl for updated queryId (update `REACTIONS_QUERY_ID` in extension), new headers, or changed JSON paths (e.g. `parseReactorsFromResponse`).
- **Reactions pagination (e3):** First request may send `includeWebMetadata=true`; later pages may omit it. If replication fails, compare with a fresh capture.
- **Extension inject:** Ensure content script is injected before `sendMessage`; if the tab is on non-www LinkedIn, consider querying both `www.linkedin.com/*` and `linkedin.com/*`.
- **Share URLs:** For `...share-{id}-...` posts the number in the URL is a share ID; the reactions API expects **urn:li:activity:{realId}** where **realId** is different. The real activity ID is sent by the app when the page loads (see e5: URL has share-7428422864288018432 but API uses activity:7428424304855322624). The extension must read it from the page (e.g. scan for `threadUrn` / `urn:li:activity:(\d+)` in the HTML).
