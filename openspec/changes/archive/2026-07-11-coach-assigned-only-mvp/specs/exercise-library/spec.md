# Delta for Exercise Library

## ADDED Requirements

### Requirement: Role-based Browse Access

Athlete role MUST NOT surface exercise browsing from the Train tab. Athlete role MAY surface exercise browsing from Home "Exercises" quick-action entry point, if present. Coach role SHALL retain full browsing, filter, and detail access from coach Library tab. The data layer (local SQLite read, React Query hydrate) SHALL remain unchanged regardless of role or entry point.

- GIVEN athlete is on Train tab WHEN no browse entry point is rendered THEN athlete cannot navigate to exercise list from Train
- GIVEN athlete is on Home AND "Exercises" chip exists WHEN athlete taps it THEN exercise browser opens with paginated list from local SQLite
- GIVEN coach is on Library tab WHEN coach opens exercise browser THEN all exercises shown with full browse/filter/detail access

## MODIFIED Requirements

### Requirement: Browse

MUST show a paginated list with name, category, equipment. Reads MUST serve from local SQLite with PocketBase fallback when online. React Query cache MUST be persisted to SQLite for offline access. Browse SHALL be accessible from coach Library and athlete Home (if enabled), but MUST NOT be accessible from athlete Train.
(Previously: Browse accessible from any surface within the app; no role-based restrictions)

- GIVEN exercises exist online AND athlete has browse access from a permitted entry point WHEN list loads THEN React Query hydrates from persisted cache, background refetch from PocketBase updates SQLite mirror
- GIVEN exercises exist AND offline WHEN list loads from a permitted entry point THEN paginated items returned from local SQLite `exercises` table
- GIVEN none WHEN list loads THEN empty state shown (unchanged)
