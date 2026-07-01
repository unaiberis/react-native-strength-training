# Archive Report: Add Tempo Field to Exercise Sets

**Change**: add-tempo-to-sets
**Archived**: 2026-07-01
**Status**: Success — 14 tests added, 394 total passing, tsc clean

## Summary

Added an optional `tempo` field (string, regex `^\d{3,4}$`) to exercise_sets across all layers:

- **SQLite migration**: `schema_version` bumped 1→2, idempotent ALTER TABLE
- **Types**: `ExerciseSetRow` (pocketbase + db) + `LogSetInput` (offline)
- **Zod**: `setEntrySchema` + `logSetSchema` with regex validation
- **Online services**: `sessions.ts` — tempo passthrough
- **Offline services**: `offline-sessions.ts` — tempo in SQL INSERT + change queue
- **Store**: `LoggedSet` type extended
- **UI**: tempo input in ActiveWorkoutScreen + display in SetRow
- **Tests**: 14 new (migration, schema validation, service passthrough)

## Files Changed (13)

| File | Action |
|------|--------|
| `src/lib/db/schema.ts` | Modified |
| `src/lib/db/types.ts` | Modified |
| `src/types/pocketbase.ts` | Modified |
| `src/shared/schemas/set.ts` | Modified |
| `src/lib/pocketbase/services/sessions.ts` | Modified |
| `src/lib/db/services/offline-sessions.ts` | Modified |
| `src/stores/session-store.ts` | Modified |
| `src/features/workout/hooks/useWorkoutSession.ts` | Modified |
| `src/features/workout/screens/ActiveWorkoutScreen.tsx` | Modified |
| `src/lib/db/__tests__/schema.test.ts` | Modified |
| `src/shared/schemas/__tests__/set.test.ts` | Modified |
| `src/lib/pocketbase/services/__tests__/sessions.test.ts` | Modified |
| `src/lib/db/__tests__/offline-sessions.test.ts` | Modified |

## Spec Updated
- `openspec/specs/workout-execution/spec.md` — Log Sets requirement now documents tempo field

## Post-Archive Notes
- PocketBase schema: `exercise_sets.tempo` already included in `pb_migrations/001_init_collections.js`
- SQLite migration: idempotent from v1 or fresh install
- No breaking changes — tempo defaults to null in all paths
