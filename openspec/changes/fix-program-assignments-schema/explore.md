# Explore: Fix Program Assignments Schema Mismatch

> Generated: 2026-07-09 | Phase: explore

## Current State

The `program_assignments` collection on PocketBase server (`api.entrenamentua.musikak.com`)
was created manually (not via `pb_migrations/`). Its field names follow the `_id` suffix
convention, but the TypeScript types and service code use bare field names.

### Server Schema (truth)

| Server Field | Type | Required | Code Uses | Match? |
|---|---|---|---|---|
| `athlete_id` | text | no | `athlete` | ❌ |
| `coach_id` | text | no | `coach` | ❌ |
| `template_id` | text | no | `template` | ❌ |
| `status` | select (active, completed, paused, cancelled) | yes | missing `paused` | ⚠️ |
| `assigned_at` | date | yes | missing entirely | ❌ |
| `started_at` | date | no | `start_date` | ❌ |
| `completed_at` | date | no | missing | ❌ |
| `program_id` | text | no | missing | ❌ |
| `notes` | text | no | missing | ❌ |
| `team_id` | relation (teams) | no | `team_id` | ✅ |

### API Rules
```
listRule: @request.auth.id = coach_id || @request.auth.id = athlete_id
```

The athlete CAN read their own assignments — the 400 is purely a field name mismatch.

### Verified Errors (curl against real API)
- `filter=athlete = 'id'` → 400 (no `athlete` field)
- `filter=athlete_id = 'id'` → ✅ returns records
- `sort=-start_date` → 400 (no `start_date` field)
- `sort=-started_at` → ✅ correct
- `expand=template` → silently ignored (field is `text` type, not `relation`)

## Affected Areas

- `src/types/pocketbase.ts:159-169` — type uses wrong names
- `src/lib/pocketbase/services/program-assignments.ts` — ALL 7 functions
- `src/features/programs/hooks/useAthleteAssignments.ts` — map + expand
- `src/features/coach/hooks/useAthleteDetail.ts` — listAssignments usage
- `scripts/seed-teams.mjs:297` — dedup readback
- `src/lib/pocketbase/services/__tests__/program-assignments.test.ts` — tests

## Root Cause

The collection was created manually with `_id` suffix convention matching other
collections (`WorkoutFeedbackRow` has `athlete_id`, `coach_id`). The TypeScript
type was written without the `_id` suffix, creating a total mismatch.

## Recommendation

**Option A: Align code to server.** The server is the truth and already follows
the established convention. Fix types, services, hooks, and tests. No schema
changes or data migration needed.

## Ready for Proposal
Yes.
