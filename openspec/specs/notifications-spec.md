# Notifications — PocketBase Collection

## Architecture

The notifications system SHALL use a PocketBase `notifications` collection as the online data store, with a local SQLite `notifications` table for offline access.

### PocketBase Collection: `notifications`

| Field | Type | Rules |
|-------|------|-------|
| `id` | text (auto) | Auto-generated PocketBase record ID |
| `user_id` | relation (users) | The recipient of the notification |
| `type` | text | One of: `workout_assigned`, `program_updated`, `feedback_reply`, `achievement`, `system` |
| `title` | text | Short notification title |
| `body` | text | Notification body text |
| `data` | json (nullable) | Optional payload (e.g. `{ "assignmentId": "abc" }`) |
| `read` | bool | Whether the user has marked it as read (default: false) |
| `created` | auto | Auto-managed by PocketBase |

### API Rules

- **List/View**: `user_id = @request.auth.id` — users can only see their own notifications
- **Create**: Admin/webhook only (not user-facing)
- **Update**: `user_id = @request.auth.id` for updating `read` field
- **Delete**: Admin only

### Local SQLite Table (`notifications`)

Mirrors the PocketBase collection with an additional `synced` flag:

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PRIMARY KEY | Matches PocketBase record ID |
| `user_id` | TEXT NOT NULL | FK to users table |
| `type` | TEXT NOT NULL | CHECK constraint on allowed types |
| `title` | TEXT NOT NULL | |
| `body` | TEXT NOT NULL | |
| `data` | TEXT (nullable) | JSON string |
| `read` | INTEGER DEFAULT 0 | 0 = unread, 1 = read |
| `synced` | INTEGER DEFAULT 0 | 0 = not synced, 1 = synced |
| `created_at` | TEXT NOT NULL | ISO timestamp |

### Scenario: Athlete views notifications list

- GIVEN the athlete is authenticated
- WHEN they navigate to the Notifications screen
- THEN the screen SHALL load notifications from PocketBase (newest first)
- AND offline fallback SHALL use the local SQLite table
- AND each notification SHALL display type icon, title, body, and relative timestamp

### Scenario: Athlete marks a notification as read

- GIVEN an unread notification exists
- WHEN the athlete taps the notification
- THEN the `read` field SHALL be set to `true` optimistically (UI updates immediately)
- AND the mutation SHALL send `markNotificationRead` to PocketBase in the background
- AND the unread count SHALL decrement immediately

### Scenario: Athlete marks all notifications as read

- GIVEN at least one unread notification exists
- WHEN the athlete taps "Mark All Read"
- THEN all notifications SHALL be marked read optimistically
- AND `markAllNotificationsRead` SHALL be called on PocketBase

### Scenario: Offline fallback

- GIVEN the device is offline
- WHEN the Notifications screen loads
- THEN it SHALL read from the local SQLite `notifications` table
- AND SHALL return empty array if the table doesn't exist or is empty
