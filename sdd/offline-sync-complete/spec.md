# Offline Sync — Complete Specification

## New: sync-ui

**Sync Status** — SHALL display pending count, last sync, and sync-in-progress.
- 3 pending | home renders | badge "3"
- sync running | indicator renders | spinner "Syncing…"
- synced 2m ago | indicator renders | "Synced 2m ago"
- 0 pending, never synced | indicator renders | "Never synced"

**Offline Banner** — SHALL show persistent banner when offline, dismiss on reconnect.
- device offline | any screen renders | "You're offline" banner
- device reconnects | online event | banner dismissed ≤1s

**Pull-to-Sync** — SHALL trigger `syncEngine.syncAll()` via RefreshControl.
- history screen | user pull-to-refresh | RefreshControl + syncAll()
- auth_expired during pull | refresh completes | "Session expired" replaces spinner

**Conflict Resolution** — SHALL surface conflicts when server `updated_at` differs from local.
- local < server `updated_at` | flushQueue detects | conflict sheet with diff
- user taps "Keep local" | resolved | local re-pushed, server overwritten
- user taps "Accept server" | resolved | local replaced, entry dequeued

**Dead-Letter Management** — SHALL let users retry or discard dead-letter entries.
- 2 dead-letter entries | user opens sheet | each with last_error + retry/discard
- user taps Retry | succeeds | dequeued, badge updated
- user taps Discard | confirmed | removed, local record cleaned

---

## Modified: offline-sync

**Conflict Detection** — MUST compare `updated_at` before upsert; emit CONFLICT on mismatch.
- local `updated_at < server` | flushQueue runs | CONFLICT emitted, entry paused
- timestamps equal | flushQueue runs | upsert proceeds normally

**Progress Events** — MUST emit progress per batch during flushQueue.
- 50 pending | batch of 10 processed | PROGRESS {processed:10, total:50}
- dead-letter during sync | sync completes | SYNC_PARTIAL with dead_letter_count

**Retry / Discard API** — MUST expose `changeQueue.retry(id)` and `changeQueue.discard(id)`.
- dead-letter entry | retried + succeeds | dequeued, queue resumes
- dead-letter entry | discarded | deleted, local record cleaned

---

## Modified Capabilities

**workout-execution — Offline Set Mutations** — ALL set mutations MUST route through offline service.
- dirty set in active session | user deletes offline | row dirty, DELETE queued
- synced set | deleted offline, sync runs | server DELETE replayed

**exercise-library — Offline Multi-Filter** — ALL filter combos MUST query local SQLite.
- category + equipment + region | offline query | results from SQLite WHERE
- no match for combined filters | offline | empty state shown

**routine-builder — Offline Deletion** — MUST queue template DELETE when offline.
- template with 4 exercises | deleted offline | template + exercises deleted locally, DELETE queued

**routine-builder — Offline Reorder** — MUST support reordering exercises offline.
- 4 exercises | #4 dragged to #2 | sort_order updated, UPDATE queued

**workout-history — Offline Session Deletion** — MUST support deleting sessions offline.
- completed session | deleted offline | session + sets deleted locally, DELETE queued

**workout-history — Offline Detail** — MUST read ALL set data from local SQLite when offline.
- session tapped, offline | detail opens | sets, volume, timestamps from local `exercise_sets`

**personal-records — Offline PR Computation** — MUST compute PRs from local SQLite when offline.
- 50 logged sets, offline | PRs page opens | 1RM, e1RM from SQLite aggregate
- no sets, offline | PRs page opens | empty state shown
