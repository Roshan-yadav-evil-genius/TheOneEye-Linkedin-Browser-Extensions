# LinkedIn Voyager API Common Patterns Analysis

This document identifies shared patterns and schemas across `recent-activity-all.json`, `recent-activity-comments.json`, and `recent-activity-reactions.json` to inform the design of Pydantic classes for parsing LinkedIn Voyager API responses.

## 1. Top-Level Response Structure

All three files follow a consistent top-level structure:

- **`data`**:
  - **`data`**: Contains the main response object named after the specific query (e.g., `feedDashProfileUpdatesByMemberShareFeed`, `feedDashProfileUpdatesByMemberComments`, or `feedDashProfileUpdatesByMemberReactions`).
    - **`*elements`**: A list of URNs pointing to entities in the `included` array.
    - **`paging`**: Standard pagination metadata (`count`, `start`, `total`).
    - **`metadata`**: Includes `paginationToken`.
- **`included`**: A flat array of normalized entities. Each entity has a `$type` and `entityUrn`.

## 2. Core Entities & Types

The following entities are common across all activity types:

### 2.1 `com.linkedin.voyager.dash.feed.Update`
The primary object for any feed item. Whether it's a post, a comment activity, or a reaction activity, it is represented as an `Update`.

**Key Fields:**
- `entityUrn`: `urn:li:fsd_update:(urn:li:activity:[ACTIVITY_ID],...)`
- `actor`: Contains profile/company information (name, image, headline).
- `commentary`: Contains the text of the post (if applicable).
  - Type: `com.linkedin.voyager.dash.feed.component.commentary.CommentaryComponent`
- `content`: Contains media (video, images, articles).
  - Examples: `LinkedInVideoComponent`, `ImageComponent`, `ArticleComponent`.
- `socialContent`: Metadata about social interactions (share URL, visibility settings).
- `resharedUpdate`: Reference to the original post if the current update is a reshare.

### 2.2 `com.linkedin.voyager.dash.social.Comment`
Used in the `comments.json` file to represent the actual comment content.

**Key Fields:**
- `entityUrn`: `urn:li:fsd_comment:([COMMENT_ID],urn:li:activity:[ACTIVITY_ID])`
- `createdAt`: Millisecond timestamp.
- `commentary`: The text of the comment.
  - Type: `com.linkedin.voyager.dash.common.text.TextViewModel`
- `commenter`: Information about the person who made the comment.
- `*parentComment`: Reference to the parent comment (if it's a reply).

### 2.3 `com.linkedin.voyager.dash.feed.SocialActivityCounts`
Contains the metrics for likes, comments, and shares.

**Key Fields:**
- `entityUrn`: `urn:li:fsd_socialActivityCounts:urn:li:activity:[ID]` or `urn:li:fsd_socialActivityCounts:urn:li:ugcPost:[ID]`
- `numLikes`: Total count of reactions.
- `numComments`: Total count of comments.
- `numShares`: Total count of shares/reposts.
- `reactionTypeCounts`: A list of `ReactionTypeCount` objects (LIKE, CELEBRATE, SUPPORT, etc.).

### 2.4 Shared Component Types
- **`TextViewModel`**: Used for almost all text fields.
  - `text`: The raw string.
  - `attributesV2`: List of formatting/mention attributes (mentions, hashtags, links).
- **`ImageViewModel`**: Used for profile pictures and post images.
  - `attributes`: List of `ImageAttribute` (includes `vectorImage` with `rootUrl` and `artifacts`).

## 3. Relationship Mapping

- **Update to Social Counts**: The `SocialActivityCounts` entity for an `Update` can be found in `included` by constructing a URN using the `activity ID` found inside the `Update.entityUrn`.
- **Update to Comment**: In `comments.json`, the `Update` entity has a `*highlightedComments` field which points to the `Comment` entity.
- **Update to Actor**: The `actor` field in an `Update` often contains a reference to a `Profile` or `Company` entity also found in `included`.

## 4. Suggested Pydantic Class Hierarchy

1.  **`BaseEntity`**: Abstract base with `entityUrn` and `$type`.
2.  **`TextViewModel`**: For parsing text with attributes.
3.  **`Actor`**: Shared class for Profiles and Companies.
4.  **`SocialCounts`**: For parsing `SocialActivityCounts`.
5.  **`Update`**: Main class for posts, with optional fields for `commentary`, `content`, and `resharedUpdate`.
6.  **`Comment`**: Class for parsing individual comments.
7.  **`LinkedInResponse`**: Top-level parser for the `data` and `included` structure.
