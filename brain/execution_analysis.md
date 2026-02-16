# Execution e2.jsonl – Analysis

Analysis of **brain/execution/e2.jsonl**: request/response trace from one run of [browser_data_utilizer.py](browser_data_utilizer.py) (Playwright, persistent context, initial URL = first post in `constants.POSTS`).

---

## 1. Overview

| Metric | Value |
|--------|--------|
| Total records | 678 (one JSON object per line) |
| Requests | 341 |
| Responses | 337 |
| Time span | 2026-02-15T04:12:36.311847Z → 04:13:51.558296Z (~75 s) |
| Initial navigation | GET post URL (line 1) |

**Record format**

- **Request:** `type`, `ts`, `url`, `method`, `headers`; optional `post_data`.
- **Response:** `type`, `ts`, `url`, `status`, `headers`, `body` (decoded or base64).

---

## 2. Hosts and traffic

| Host | Request count |
|------|----------------|
| www.linkedin.com | 110 |
| static.licdn.com | 106 |
| media.licdn.com | 87 |
| www.gstatic.com | 4 |
| collector-pxdojv695v.protechts.net | 4 |
| cs.ns1p.net | 4 |
| www.google.com | 3 |
| merchantpool1.linkedin.com | 3 |

Most traffic is LinkedIn (www + static + media). A small share is third‑party (Google, collectors, etc.).

---

## 3. HTTP methods and status codes

**Methods**

- GET: 261  
- POST: 72  
- HEAD: 7  
- PUT: 1  

**Response status**

- 200: 334  
- 201: 1  
- 204: 1  
- 502: 1  

The only error response in the trace is **502** for `https://www.linkedin.com/3wAYfyrylvfTN` (likely tracking/telemetry), not for Voyager API or the post page.

---

## 4. Voyager / API traffic

- **Voyager/API-related requests:** 42 (URLs containing `voyager` or `graphql`).
- **Unique GraphQL queryIds:** 18.

**Examples of queryIds**

- voyagerSocialDashReactions.* (reactions on the post)
- voyagerSocialDashComments.* (comments)
- voyagerIdentityDashProfiles.*
- voyagerDashMySettings.*
- voyagerFeedDashIdentityModule.*
- voyagerLegoDashPageContents.*
- messengerConversations.*, messengerMailboxCounts.*
- voyagerPremiumDashUpsellSlotContent.*, voyagerPremiumDashFeatureAccess.*
- voyagerJobsDashJobSeekerPreferences.*
- voyagerMessagingDashAffiliatedMailboxes.*, voyagerMessagingDashMessagingSettings.*

---

## 5. Timeline of main events

| Timestamp (UTC) | Type | Event | Line |
|-----------------|------|--------|------|
| 04:12:36.311 | NAV | GET post page | 1 |
| 04:12:44.576 | request | voyagerSocialDashReactions (first) | 139 |
| 04:12:45.030 | response | voyagerSocialDashReactions | 312 |
| 04:13:15.115 | request | voyagerSocialDashComments (first) | 422 |
| 04:13:16.033 | response | voyagerSocialDashComments | 430 |
| 04:13:21.548 | request | voyagerSocialDashComments (pagination) | 446 |
| 04:13:22.369 | response | voyagerSocialDashComments | 458 |
| 04:13:25.564 | request | voyagerSocialDashComments (pagination) | 472 |
| 04:13:26.434 | response | voyagerSocialDashComments | 480 |
| 04:13:34.371 | request | voyagerSocialDashReactions (again, start=0) | 522 |
| 04:13:35.024 | response | voyagerSocialDashReactions | 551 |
| 04:13:38.306 | request | voyagerSocialDashReactions (start=10) | 560 |
| … | … | Reactions pagination (start=20, 30, 40, 50) | 585–647 |

**Interpretation**

- ~8 s after load: first Reactions request (start=0).  
- ~39 s after load: first Comments request; then two more Comments pages (scroll/load more).  
- ~58 s after load: Reactions requested again (start=0), then pagination 10, 20, 30, 40, 50.

So the session: load post → fetch reactions → later open/scroll comments (3 pages) → then refetch reactions and paginate reactions (5 more pages).

---

## 6. Reactions and Comments response sizes

Approximate response body lengths (characters/bytes in stored `body`):

- **Reactions:** first response ~70k, later pages ~35k–47k.  
- **Comments:** first ~141k, next pages ~114k–116k.

All these API responses have status 200. Sizes reflect normalized JSON (with `included` and entity data).

---

## 7. Relation to analysis1.md and the extension

- **analysis1.md** was derived from this execution (endpoints, variables, headers, pagination for reactions and comments).  
- The **extension** uses the same reactions GraphQL endpoint and `queryId` as in this trace; comments and other queryIds are available in e2.jsonl for future use.  
- The only non‑success response in e2 is the 502 on a non‑API URL; the Voyager calls recorded here all succeed.

---

## 8. How to re-run and get a new execution

1. Set `POSTS` in [constants.py](constants.py) to the LinkedIn post URL(s) you want.  
2. Run: `python browser_data_utilizer.py`.  
3. Use the browser (open post, scroll reactions/comments as needed).  
4. Close the browser; the script writes **brain/execution/e{N}.jsonl** (next N after existing e*.jsonl).  
5. Inspect the new file with the same structure (request/response lines, `type`, `url`, `ts`, etc.) for updated endpoints or behavior.
