# Proposal: Add Tempo Field to Exercise Sets

## Problem
Strength training athletes track tempo (cadence) for each set — e.g. "2020" means 2s eccentric, 0s pause, 2s concentric, 0s hold. The app currently lacks this field, limiting usefulness for hypertrophy and power programming.

## Solution
Add an optional `tempo` field (string, format `"0000"` or `"000"`, each digit = seconds for eccentric/pause/concentric/hold) to `exercise_sets` in:
1. PocketBase schema (already covered by `001_init_collections.js` migration)
2. SQLite schema (migration bumping `schema_version` to 2)
3. TypeScript types (`ExerciseSetRow`)
4. Zod schemas (`setEntrySchema`, `logSetSchema`)
5. Code: offline services, online services, hooks (pass-through)
6. UI: optional text input in ActiveWorkoutScreen
7. Tests: migration, schema validation, type coverage

## Scope
- Database only (SQLite + PocketBase): ALTER TABLE + version bump
- Types + Zod validation
- Offline/online services: pass tempo through
- UI: input field in ActiveWorkoutScreen
- Tests: migration idempotence, schema, service passthrough

## Non-goals
- Tempo validation beyond regex `^\d{3,4}$`
- Tempo history or analytics
- Tempo in template exercises (future change)

## Risk
Low — optional field, no breaking changes. Existing records get `null`.
