# Extension – What to Change

Summary of extension code vs. execution/analysis, and what to change if something still fails.

---

## 1. Current state (no change needed if it works)

| File | What it does |
|------|----------------|
| **manifest.json** | MV3, permissions: activeTab, scripting, cookies; host_permissions: linkedin.com; popup + content_script on linkedin.com |
| **popup.js** | Normalizes URL, parses activityId (activity-, ugcPost-, urn:li:activity), finds LinkedIn tab, injects content.js then sendMessage(fetchReactions), renders list, pagination (start += 10) |
| **content.js** | getCsrfToken (sync + chrome.cookies fallback), buildReactionsUrl, parseReactorsFromResponse (included[].reactorLockup.title.text), full headers, fetch with credentials |
| **popup.html / popup.css** | Input, Load 10, Load 10 more, status, list |

API and URL shape match the execution (e2) and analysis1: same queryId, variables (count:10, start, threadUrn), and header set (csrf-token, Referer, x-restli, x-li-lang, x-li-track, x-li-page-instance, Accept, sec-ch-ua*).

---

## 2. Changes if “Could not read CSRF token” persists

The token is sent by the real app as header `csrf-token: ajax:5064052269000733598`. We read it from meta, inputs, document.cookie, HTML/script regex, then from `chrome.cookies` (names: csrf-token, csrfToken, JSESSIONID; then getAll and use any cookie value matching `ajax:\d+`).

**If it still fails:**

1. **Confirm cookie permission**
   - User must allow the extension to read cookies (Chrome may prompt after adding `cookies`).
   - In **content.js** you can add a fallback that uses the **post URL as the cookie URL** when calling `chrome.cookies.get` / `getAll` (we already try `pageUrl`), so no code change unless you want to try more URLs (e.g. `https://www.linkedin.com/feed/`).

2. **Try additional cookie names**
   - In **content.js** around line 45, extend the `names` array with any cookie name you see in DevTools for linkedin.com that looks like a session/CSRF token (e.g. `li_at` is session, not CSRF; we only use value if it matches `ajax:\d+`).
   - Example: if your browser sets `csrfToken` (no hyphen), it’s already in the list.

3. **Get token from the page’s own requests (advanced)**
   - Option A: Inject a script (world: MAIN) that runs after load and reads from `window` if LinkedIn exposes the token there (e.g. `window.__INITIAL_STATE__?.csrfToken`). Then pass it back (e.g. via custom event or by having the content script ask for it).  
   - Option B: Use `chrome.declarativeNetRequest` or `webRequest` to observe the first request from the tab to `voyager/api/graphql` and read the `csrf-token` header from that request. This needs extra permissions and more code.

**Minimal code change to try first:** ensure we also request cookies for the **exact post URL** when the user is on that post. In **content.js** in `getCsrfToken()`, `pageUrl` is already `window.location.origin + pathname` when on LinkedIn; no change unless you want to add `window.location.href` (full URL) to `urlsToTry` for `getAll` (we don’t pass it to getAll currently; we use `baseUrl` and `pageUrl`). You could add:

```js
chrome.cookies.getAll({ url: window.location.href }, function (cookies3) { ... });
```

as one more fallback after the existing getAlls, using the same `ajax:\d+` check.

---

## 3. Changes if “API returned 403” persists

403 usually means wrong or missing CSRF or cookies. If CSRF is found but you still get 403:

1. **Referer**
   - We send `Referer: window.location.href` (the tab’s URL). Keep it that way so the request looks like it came from the current page.

2. **Optional: send post URL as Referer**
   - Some setups might expect the Referer to be the **post** URL. In **content.js** you receive `request.postUrl`. You could try:
     - If `postUrl` is a full linkedin.com URL, use `referer = postUrl` instead of `window.location.href`.
   - So the only change is in **content.js** around line 156:
     - Current: `var referer = window.location.href || 'https://www.linkedin.com/feed/';`
     - Try: `var referer = (postUrl && postUrl.indexOf('linkedin.com') !== -1) ? postUrl : (window.location.href || 'https://www.linkedin.com/feed/');`

3. **Headers**
   - We already send the same set as in the execution (csrf-token, x-restli, x-li-lang, x-li-track, x-li-page-instance, Accept, sec-ch-ua*). No change unless LinkedIn changes required headers.

---

## 4. Changes if “Receiving end does not exist” or inject fails

- We already inject **content.js** with `chrome.scripting.executeScript` before every `sendMessage`. No change unless you move to a persistent background script that keeps a tab ID and re-injects when needed.
- If the LinkedIn tab is on a non-www domain (e.g. `linkedin.com` without www), `chrome.tabs.query({ url: 'https://www.linkedin.com/*' })` won’t match. In **popup.js** you could add a second query with `url: 'https://linkedin.com/*'` and use the first tab found from either.

---

## 5. Optional improvements (no fix required)

| Change | File | Description |
|--------|------|-------------|
| Prefill from current tab | popup.js | Already done: we set `postUrlEl.value` from active tab if it’s a valid post URL. |
| QueryId / API version | content.js | If LinkedIn deprecates the current queryId, replace `REACTIONS_QUERY_ID` (line 2) with the new one from a fresh execution capture. |
| Pagination “no more” from API | content.js | We set `hasMore = reactors.length >= PAGE_SIZE`. If the API starts returning a total or a next cursor, you could use that to hide “Load 10 more” earlier. |
| Comments support | New or content.js + popup | To support comments like reactions: add a second action (e.g. `fetchComments`), same CSRF/headers, use Comments queryId and socialDetailUrn/paginationToken from analysis1; add UI and parsing for commenters. |

---

## 6. Quick reference – where things live

| Concern | File | Location |
|--------|------|----------|
| CSRF sync sources | content.js | getCsrfTokenSync() |
| CSRF cookie/API fallback | content.js | getCsrfToken() |
| Reactions API URL | content.js | buildReactionsUrl() |
| Request headers | content.js | headers object before fetch() |
| Referer choice | content.js | `var referer = ...` |
| Response parsing | content.js | parseReactorsFromResponse() |
| Activity ID from URL | popup.js | parseActivityId(), isValidPostUrl() |
| Tab lookup + inject + sendMessage | popup.js | fetchReactions() |
| Permissions | manifest.json | permissions, host_permissions |
| **Comments (commenters)** | extension/commentProspectExtractor | buildCommentsUrl(), parseCommentersFromResponse(), paginationToken from first response |

---

## 7. If you capture a new execution (e3.jsonl, …)

1. Run `browser_data_utilizer.py`, open the post, scroll reactions/comments, close browser.
2. Open the new e*.jsonl, search for `voyagerSocialDashReactions` (request and response).
3. Check request headers for any **new** header or changed value (e.g. new x-li-* or csrf-token format).
4. If the **queryId** changed (different hash at the end), update `REACTIONS_QUERY_ID` in **content.js** line 2.
5. If the response JSON shape for reactors changed (e.g. different path than `included[].reactorLockup.title.text`), update `parseReactorsFromResponse()` in **content.js**.

No other extension code needs to change for a new execution unless LinkedIn change their API or auth.
