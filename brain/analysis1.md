# LinkedIn Post Audience Extraction – Request/Response Analysis

Analysis of **e2.jsonl** (request/response capture from a LinkedIn post page) to extract all audience members: **reactions** (likes/reactors) and **comments** (commenters). This document summarizes endpoints, parameters, client behavior, auth, pagination, and a minimal request structure for programmatic replication.

---

## 1. Main Endpoints

All audience data is served by LinkedIn’s **Voyager GraphQL** API on the same base URL.

| Purpose | Base URL | Identifier |
|--------|----------|------------|
| **Reactions** (who liked/reacted) | `https://www.linkedin.com/voyager/api/graphql` | `queryId=voyagerSocialDashReactions.41ebf31a9f4c4a84e35a49d5abc9010b` |
| **Comments** (and commenters) | `https://www.linkedin.com/voyager/api/graphql` | `queryId=voyagerSocialDashComments.afec6d88d7810d45548797a8dac4fb87` |
| **Conversation/social context** (optional) | `https://www.linkedin.com/voyager/api/voyagerFeedDashConversationStarters` | `q=socialDetail&socialDetailUrn=...` |

### Canonical URLs (with placeholders)

**Reactions:**

```
GET https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(count:10,start:0,threadUrn:urn%3Ali%3Aactivity%3A{activity_id})&queryId=voyagerSocialDashReactions.41ebf31a9f4c4a84e35a49d5abc9010b
```

**Comments:**

```
GET https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(count:10,numReplies:1,socialDetailUrn:urn%3Ali%3Afsd_socialDetail%3A%28urn%3Ali%3Aactivity%3A{activity_id}%2Curn%3Ali%3Aactivity%3A{activity_id}%2Curn%3Ali%3AhighlightedReply%3A-%29,sortOrder:RELEVANCE,start:0)&queryId=voyagerSocialDashComments.afec6d88d7810d45548797a8dac4fb87
```

`{activity_id}` is the numeric post ID from the post URL (e.g. `7078572509788291072` from `...activity-7078572509788291072-AOh6`).

---

## 2. Arguments and Parameters (args/kwargs)

### Reactions (`voyagerSocialDashReactions`)

| Parameter | Required | Description |
|-----------|----------|-------------|
| **threadUrn** | Yes | `urn:li:activity:{activity_id}` (URL-encode colons as `%3A`). |
| **count** | Yes | Page size (e.g. `10`). |
| **start** | Yes | Offset for pagination: `0`, `10`, `20`, … |

No cursor; pagination is **offset-based** via `start`.

### Comments (`voyagerSocialDashComments`)

| Parameter | Required | Description |
|-----------|----------|-------------|
| **socialDetailUrn** | Yes | `urn:li:fsd_socialDetail:(urn:li:activity:{activity_id},urn:li:activity:{activity_id},urn:li:highlightedReply:-)` (parentheses and colons URL-encoded). |
| **count** | Yes | Page size (e.g. `10`). |
| **start** | Yes | Offset: `0`, `10`, `20`, … |
| **numReplies** | Yes | Replies per comment (e.g. `1`). |
| **sortOrder** | Yes | e.g. `RELEVANCE`. |
| **paginationToken** | For pages after first | Opaque string returned in the **first** comments response; **same** token is sent for every subsequent page (`start:10`, `start:20`, …). |

First page: omit `paginationToken`. Next pages: include the token from the first response and increment `start`.

**Note:** Captures (e2/e3) show **socialDetailUrn** with `urn:li:activity:{id}`. For **ugcPost**-style post URLs, the CommentProspectExtractor uses **postType** and builds the URN with `urn:li:ugcPost:{id}` when applicable, for consistency with the reactions API.

---

## 3. Client-Side JavaScript / Triggers

- The **post page** loads; the React/Voyager app then:
  - Calls the **Reactions** GraphQL with `threadUrn`, `count`, `start:0`.
  - Calls **ConversationStarters** with `socialDetailUrn` (same activity).
  - Calls **Comments** GraphQL (first page without `paginationToken`, then with `paginationToken` + increasing `start`).
- When the user **scrolls**:
  - **Reactions:** same GraphQL with same `queryId` and `threadUrn`, with `start` incremented (e.g. `start:10`, `20`, `30`).
  - **Comments:** same GraphQL with same `queryId`, `socialDetailUrn`, and **same** `paginationToken`, with `start` set to next offset (e.g. `10`, `20`, `30`).

So “scroll to load more” is implemented by changing only `start` for reactions, and for comments by keeping `paginationToken` and changing `start`. No other client-side endpoints are required to get the list of reactors and commenters.

---

## 4. Cookies, Headers, and Keys

From the captured requests, the following are needed for the voyager GraphQL calls to succeed.

### Required

- **Cookie:** Full LinkedIn session cookie (e.g. `li_at`, `JSESSIONID`, and others set after login). Without a valid session, API responses will be 401/403 or non-200.
- **csrf-token:** Header `csrf-token: ajax:5064052269000733598`. In the browser this is typically read from a meta tag or cookie (e.g. `li_at` session) and must match the session.
- **Referer:** Same post URL as the one you’re querying, e.g.  
  `https://www.linkedin.com/posts/ganeshprasad1997_met-piyush-goyal-sir-along-with-some-great-activity-7078572509788291072-AOh6/`

### Strongly recommended (to look like the real client)

- **x-restli-protocol-version:** `2.0.0`
- **x-li-lang:** `en_US`
- **x-li-page-instance:** e.g. `urn:li:page:d_flagship3_detail_base;R6FTiOIrQ7ajsfpF4fYwnQ==` (can be obtained from the post page or left as a generic detail-page value if you replicate from a real session).
- **x-li-track:** JSON object with `clientVersion`, `mpVersion`, `osName`, `timezoneOffset`, `timezone`, `deviceFormFactor`, `mpName`, etc. (the app sends this; cloning from e2.jsonl is enough for replication).
- **User-Agent / sec-ch-ua***: Same as in the capture so the request looks like a normal browser.

### Accept

- **Accept:** `application/vnd.linkedin.normalized+json+2.1` (or the same as in the capture for graphql).

No API key is sent in the request; **auth is cookie + csrf-token**.

---

## 5. Pagination (Scroll / Load More)

### Reactions

- **Mechanism:** Offset-based.
- **Parameters:**  
  - First page: `start=0`, `count=10`.  
  - Next page: `start=10`, then `start=20`, `start=30`, …
- **Stopping:** When the response returns fewer than `count` items (or an empty list), or when the response indicates there are no more (if present in the JSON).

### Comments

- **Mechanism:** Offset + **pagination token**.
- **First page:**  
  `start=0`, `count=10`, `numReplies=1`, `socialDetailUrn=...`, `sortOrder=RELEVANCE`.  
  **No** `paginationToken`.
- **Next pages:**  
  - Use the **same** `paginationToken` returned in the **first** comments response.  
  - Increment **start**: `start=10`, `start=20`, `start=30`, …
- In the capture the same token is used for all subsequent pages:  
  `paginationToken:1242472395-1771128755013-fb77f91a58fafde45efc218b22c684f9`.

So for comments you must:
1. Parse the first response to get `paginationToken`.
2. For every next batch, pass that token and the next `start` until no more comments are returned.

---

## 6. Essential Request Structure for Python

Minimal shape to replicate in Python:

1. **Resolve activity ID** from the post URL (e.g. regex or split on `activity-` and `-` to get the numeric id).
2. **Build URNs:**
   - Reactions: `threadUrn = f"urn:li:activity:{activity_id}"`
   - Comments:  
     `social_detail_urn = f"urn:li:fsd_socialDetail:(urn:li:activity:{activity_id},urn:li:activity:{activity_id},urn:li:highlightedReply:-)"`
3. **Session:** Use a session that has logged into LinkedIn (e.g. `requests.Session()` with cookies from a browser or from your Playwright run that produced e2.jsonl). Set **csrf-token** from the same session (e.g. from a GET to the post page and parse meta/cookie).
4. **Reactions:**  
   - GET the graphql URL with query string:  
     `includeWebMetadata=true`, `variables=(count:10,start:{start},threadUrn:{threadUrn_encoded})`, `queryId=voyagerSocialDashReactions.41ebf31a9f4c4a84e35a49d5abc9010b`.  
   - Loop with `start = 0, 10, 20, ...` until the payload has no more reactors.
5. **Comments:**  
   - First GET with the comments `queryId`, `socialDetailUrn` (encoded), `count:10`, `start:0`, `numReplies:1`, `sortOrder:RELEVANCE`, no `paginationToken`.  
   - Parse JSON; extract `paginationToken` from the response.  
   - Next GETs: same URL/queryId/socialDetailUrn, same `paginationToken`, `start=10`, then `20`, etc., until no more comments.
6. **Headers:** At least `csrf-token`, `Referer` (post URL), `Cookie`, and `x-restli-protocol-version: 2.0.0`; ideally also `x-li-lang`, `x-li-track`, and the same User-Agent/sec-ch-ua as in e2.jsonl.

With that, you have the exact endpoints, required args/kwargs, how the client triggers and paginates them, which cookies/headers/keys to send, and how scroll/load-more maps to **reactions** (`start` only) and **comments** (`start` + `paginationToken`). You can implement a Python extractor that, given a post URL and a logged-in session (and csrf), fetches all reaction and comment pages and then parses the response JSON to list all audience members (reactors and commenters).

---

## 7. Source and Conventions

- **Source files:** `brain/execution/e2.jsonl` and `brain/execution/e3.jsonl` (one JSON object per line: `type` = `request` or `response`, with `url`, `method`, `headers`, and optionally `post_data` or `body`). **e3** adds `type=meta` (initial_url, ts), `type=cookies` (snapshot of linkedin.com cookies after load), `request_id` pairing, `page_url`, and `tag` (e.g. graphql, reactions, comments).
- **e3 notes:** Same reactions/comments endpoints and queryIds as e2. Referer in e3 is the full post URL. First reactions request uses `includeWebMetadata=true`; later pagination requests omit it. Cookie snapshot in e3 is useful for CSRF/cookie debugging; `request_id` links each response to its request. See [brain/execution/e3_analysis.md](brain/execution/e3_analysis.md) for a short e3 summary.
- **Post URL in capture:**  
  `https://www.linkedin.com/posts/ganeshprasad1997_met-piyush-goyal-sir-along-with-some-great-activity-7078572509788291072-AOh6/`
- **Activity ID used:** `7078572509788291072` (extracted from the segment `activity-7078572509788291072-AOh6`).
- **Query IDs** are fixed in the capture; they may change in future LinkedIn app versions and would need to be re-captured if requests start failing.
