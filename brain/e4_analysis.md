# e4.jsonl analysis

## Meta
- **Initial URL:** Same post as e3 (`...activity-7078572509788291072-AOh6/`).
- **Capture:** New run with enhanced logging (`variables_snippet`, `error_preview` for 4xx).

## Findings

### 1. Comments: still no first request (start:0) in capture
- **All Comments requests in e4** have `paginationToken` and `start:10`, `start:20`, `start:30`, `start:40`.
- **No request with `start:0` and no token** was captured (no `comments_first` tag).
- So the **first Comments call** (which returns `paginationToken` for later pages) either:
  - Fires before the request listener is attached, or
  - Is made from a context we do not record (e.g. worker/frame), or
  - Is triggered by a user action that did not happen in this run (e.g. first click on "Comments" before capture started).

### 2. ConversationStarters does not supply the token
- Response for `voyagerFeedDashConversationStarters` (request_id 105) was inspected.
- Body is a small JSON: `elements: []`, `paging: { count: 10, start: 0 }` — **no paginationToken**.
- So the comments pagination token is **not** from ConversationStarters; it must come from the first Comments GraphQL response (start:0, no token).

### 3. Comments request format in e4 (matches e3)
- **URL:** `includeWebMetadata=true` only on the **first captured** Comments request (id 176, start:10); later (start:20, 30, 40) omit it.
- **Variables:** `(count:10,numReplies:1,paginationToken:<opaque>,socialDetailUrn:urn%3Ali%3Afsd_socialDetail%3A%28...%29,sortOrder:RELEVANCE,start:10)`.
- **Headers (request 176):** accept, csrf-token, referer, sec-ch-*, user-agent, x-li-lang, x-li-page-instance, **x-li-pem-metadata: Voyager - Feed - Comments=load-comments**, x-li-track, x-restli-protocol-version.
- All Comments responses in e4 returned **status 200**.

### 4. New logging in e4
- **variables_snippet** is present on Comments requests (first 220 chars of variables).
- **tag** includes `["graphql", "comments"]`; no `comments_first` because no start:0 Comments request was captured.
- No 4xx in this run, so **error_preview** did not appear.

### 5. Reactions
- One Reactions request with **start:0** (request_id 108), same pattern as e3 — first page is captured.

## Conclusion for CommentProspectExtractor
- We still have **no real-world example** of the first Comments request (start:0, no paginationToken) in e3 or e4.
- Extension must send that first request to obtain `paginationToken`; 400 may be due to missing header (we added **x-li-pem-metadata**), encoding, or another requirement.
- To capture the first Comments request: run `browser_data_utilizer.py`, wait for the post to load, **then click to expand the Comments section** and scroll a bit so the first Comments call is made after listeners are active; check the new e*.jsonl for `comments_first` or a Comments request with `variables_snippet` containing `start:0)` and no `paginationToken`.
