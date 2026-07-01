# Exercise Library Spec

## Purpose

Browsable catalog of exercises with category, equipment, body region, default metrics. Seed 50+ exercises.

## Requirements

### Browse

MUST show a paginated list with name, category, equipment. Reads MUST serve from local SQLite with PocketBase fallback when online. React Query cache MUST be persisted to SQLite for offline access.
(Previously: Data fetched directly from PocketBase on each list load)

- GIVEN exercises exist AND online WHEN list loads THEN React Query hydrates from persisted cache, background refetch from PocketBase updates SQLite mirror
- GIVEN exercises exist AND offline WHEN list loads THEN paginated items returned from local SQLite `exercises` table
- GIVEN none WHEN list loads THEN empty state shown (unchanged)

### Filter

MUST filter by category. Filtering MUST operate on local SQLite data regardless of connectivity.

- GIVEN multiple categories AND offline WHEN user picks "olympic" THEN only olympic shown from local data
- GIVEN no matches AND offline THEN "no exercises found" with clear option (unchanged)

### Detail

MUST show description, equipment, body region, default sets/reps. Detail MUST load from local SQLite.

- GIVEN exercise tapped AND offline WHEN detail opens THEN all fields displayed from local `exercises` row

### Initial Seed

On first launch after offline sync init, the system MUST populate the local `exercises` table from PocketBase.

- GIVEN fresh install AND first online launch WHEN exercises fetched THEN `exercises` table populated, `sync_meta.exercises` updated
- GIVEN exercises already seeded locally WHEN app starts THEN no re-fetch unless forced by sync engine
