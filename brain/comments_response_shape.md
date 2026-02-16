# Comments API response shape (from e3)

- **paginationToken:** `data.data.socialDashCommentsBySocialDetail.metadata.paginationToken` (string). First response only; use for all subsequent pages.
- **Comment list:** `data.data.socialDashCommentsBySocialDetail['*elements']` is a list of comment URN strings. The actual comment entities are in **included**.
- **Commenters:** In `included[]`, find objects with `$type === 'com.linkedin.voyager.dash.social.Comment'`. Each has a **commenter** object:
  - `commenter.title.text` = display name
  - `commenter.navigationUrl` = profile URL (e.g. https://www.linkedin.com/in/pratikymishra)
  - Fallback: `commenter.accessibilityText` (e.g. "View Pratik Mishra's graphic link") or commenter.subtitle for name.

Parse order: get commenters from included (Comment.commenter) first; then check for errors in data.errors / data.data.errors.

## Request details (from e3)

- **Required header:** `x-li-pem-metadata: Voyager - Feed - Comments=load-comments` (real app sends this; missing it can cause 400).
- **e3 only captured paginated Comments requests** (start:10, start:20 with paginationToken). The first request (start:0, no token) was not in the capture. To capture it: run `browser_data_utilizer.py`, open a post, **expand the comments section** (click Comments), then scroll comments; the new execution file will tag the first Comments request as `comments_first` and log `variables_snippet` for analysis.
