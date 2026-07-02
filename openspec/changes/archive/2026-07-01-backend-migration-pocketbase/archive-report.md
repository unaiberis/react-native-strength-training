# Archive Report: Backend Migration — Supabase to PocketBase

**Change**: `backend-migration-pocketbase`
**Archived**: 2026-07-01
**Status**: Success — all 4 phases implemented and verified

---

## Summary

Migrated the app backend from Supabase (auth + DB + realtime) to a self-hosted PocketBase instance. All 5 data collections (exercises, workout_templates, workout_template_exercises, workout_sessions, exercise_sets) are served by PocketBase, auth is handled via PocketBase Auth, and PRs are computed on-the-fly from `exercise_sets` with no separate `personal_records` collection.

## Phases Executed

| Phase | Description                                                                                                    | Status      |
| ----- | -------------------------------------------------------------------------------------------------------------- | ----------- |
| 1     | Core infrastructure — types (`types/pocketbase.ts`), PocketBase client (`client.ts`), auth service (`auth.ts`) | ✅ Complete |
| 2     | Data services — exercises, templates, sessions, PRs on-the-fly                                                 | ✅ Complete |
| 3     | Integration — hooks, screens, stores, test mocks pointed at PocketBase                                         | ✅ Complete |
| 4     | Seed data + cleanup — `scripts/seed-pocketbase.mjs` with 63 exercises loaded                                   | ✅ Complete |

## Test Results

- **238 passed**, 0 failed, 14 test suites
- PocketBase instance healthy with 63 exercises verified
- No regressions in existing behavior

## Files Created

### Phase 1 — Core Infrastructure

- `src/types/pocketbase.ts` — DB→app type interfaces (ExerciseRow, TemplateRow, SessionRow, ExerciseSetRow)
- `src/lib/pocketbase/client.ts` — PocketBase init + ExpoSecureStoreAuth + mock fallback
- `src/lib/pocketbase/services/auth.ts` — signUp, signIn, signOut, getSession, onAuthStateChange
- `src/lib/pocketbase/index.ts` — barrel re-export

### Phase 2 — Data Services

- `src/lib/pocketbase/services/exercises.ts` — listExercises, getExercise, searchExercises, getCategories
- `src/lib/pocketbase/services/templates.ts` — CRUD + reorderTemplateExercises
- `src/lib/pocketbase/services/sessions.ts` — session lifecycle + set logging
- `src/lib/pocketbase/services/prs.ts` — on-the-fly PR computation from exercise_sets

### Phase 4 — Seed Data

- `scripts/seed-pocketbase.mjs` — parses supabase/seed.sql INSERTs, POSTs to PocketBase admin API

## Files Modified

### Phase 3 — Integration

- `src/stores/auth-store.ts` — Session/User types from supabase-js → PocketBase RecordModel
- `app/_layout.tsx` — import getSession from pocketbase/services/auth
- `src/features/auth/hooks/useAuth.ts` — import path updated
- `src/features/exercises/hooks/useExercises.ts` — import path updated
- `src/features/routines/hooks/useTemplates.ts` — import path updated
- `src/features/workout/hooks/useWorkoutSession.ts` — import path updated
- `src/features/history/hooks/useHistory.ts` — import path updated
- `src/features/records/hooks/usePersonalRecords.ts` — import path updated
- Screen files (ProgressScreen, ExerciseListScreen, HistoryListScreen, RoutineListScreen, RoutineFormScreen) — type import paths
- `jest.setup.ts` — PocketBase mock added
- `src/features/auth/hooks/__tests__/useAuth.test.tsx` — mock path updated

## Specs Synced (Delta → Main)

| Domain             | Action  | Details                                                                                                            |
| ------------------ | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `user-auth`        | Updated | Register (PocketBase `users.create`), Session Persistence (token in SecureStore), ADDED Backend Environment Toggle |
| `personal-records` | Updated | Auto-Detect changed to on-the-fly from `exercise_sets`; no separate `personal_records` collection                  |

## Rollback Path

Supabase files are **kept intact** as a rollback path:

- `src/lib/supabase/` — entire service directory preserved
- `@supabase/supabase-js` — dependency kept in `package.json`
- Env var `EXPO_PUBLIC_API_PROVIDER` can toggle between pocketbase and supabase

## Key Decisions

- **PR computation**: On-the-fly from `exercise_sets` using `shared/utils/pr-calc.ts` — no `personal_records` collection
- **Auth token persistence**: PocketBase JWT in `expo-secure-store` via `BaseAuthStore` adapter
- **Mock pattern**: Same 100ms-delay mock pattern as existing Supabase mock
- **Env var gating**: `EXPO_PUBLIC_POCKETBASE_URL` (default empty → mock; set → real PocketBase)
- **Seed approach**: Standalone Node.js script parsing `supabase/seed.sql`, not inline in app startup

## Known Technical Debt (from verify-report)

- `getSession` barrel name collision (auth.ts vs sessions.ts) — resolved in Phase 3 via explicit re-exports
- `program_block_id` gaps in types and service payloads — deferred (periodization out of scope)
- `listSessions` missing `exerciseId` filter and `templateName` enrichment — deferred
- 10 pre-existing TS1323 errors in `client.test.ts` from dynamic imports

## Artifact Traceability

| Artifact       | Path                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Proposal       | `openspec/changes/archive/2026-07-01-backend-migration-pocketbase/proposal.md`                     |
| Delta Specs    | `openspec/changes/archive/2026-07-01-backend-migration-pocketbase/specs/`                          |
| Design         | `openspec/changes/archive/2026-07-01-backend-migration-pocketbase/design.md`                       |
| Tasks          | `openspec/changes/archive/2026-07-01-backend-migration-pocketbase/tasks.md` (22/22 tasks complete) |
| Verify Report  | `openspec/changes/archive/2026-07-01-backend-migration-pocketbase/verify-report.md`                |
| Archive Report | `openspec/changes/archive/2026-07-01-backend-migration-pocketbase/archive-report.md`               |
