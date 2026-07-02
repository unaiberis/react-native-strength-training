# Tasks: Backend Migration — Supabase to PocketBase

## Review Workload Forecast

| Field                   | Value                                |
| ----------------------- | ------------------------------------ |
| Estimated changed lines | ~1,100                               |
| 400-line budget risk    | High                                 |
| Chained PRs recommended | Yes                                  |
| Suggested split         | PR 1 → PR 2 → PR 3 → PR 4            |
| Delivery strategy       | auto-chain                           |
| Chain strategy          | feature-branch-chain                 |
| Feature branch          | `chore/backend-migration-pocketbase` |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                                | Likely PR | Notes                                       |
| ---- | --------------------------------------------------- | --------- | ------------------------------------------- |
| 1    | Core types + client + auth service                  | PR 1      | Base = `chore/backend-migration-pocketbase` |
| 2    | Data services (exercises, templates, sessions, PRs) | PR 2      | Base = PR 1 branch                          |
| 3    | Integration (hooks, screens, stores, test mocks)    | PR 3      | Base = PR 2 branch                          |
| 4    | Seed script + PocketBase cleanup                    | PR 4      | Base = PR 3 branch                          |

## Phase 1: Core Infrastructure

- [x] 1.1 Add `expo-sqlite` and `pocketbase` to `package.json` dependencies
- [x] 1.2 Create `src/types/pocketbase.ts` — shared DB→app type interfaces (ExerciseRow, TemplateRow, SessionRow, ExerciseSetRow)
- [x] 1.3 Create `src/lib/pocketbase/client.ts` — PocketBase init + `ExpoSecureStoreAuth` (extends `BaseAuthStore`) + mock fallback matching current mock pattern
- [x] 1.4 Create `src/lib/pocketbase/services/auth.ts` — `signUp`, `signIn`, `signOut`, `getSession`, `onAuthStateChange` with error mapping
- [x] 1.5 Create `src/lib/pocketbase/index.ts` — barrel re-exporting all service modules

## Phase 2: Data Services

- [x] 2.1 Create `src/lib/pocketbase/services/exercises.ts` — `listExercises`, `getExercise`, `searchExercises`, `getCategories` via `pb.collection("exercises")`
- [x] 2.2 Create `src/lib/pocketbase/services/templates.ts` — `createTemplate`, `listTemplates`, `getTemplate`, `updateTemplate`, `deleteTemplate`, `reorderTemplateExercises` via `workout_templates` + `workout_template_exercises`
- [x] 2.3 Create `src/lib/pocketbase/services/sessions.ts` — `createSession`, `logSet`, `completeSession`, `cancelSession`, `getSession`, `getSessionDetail`, `listSessions`, `updateSessionDuration` via `workout_sessions` + `exercise_sets`
- [x] 2.4 Create `src/lib/pocketbase/services/prs.ts` — `listPRs`, `getExercisePRs` (on-the-fly computation from `exercise_sets`; no `personal_records` collection read/write)

## Phase 3: Integration

- [x] 3.1 Update `src/stores/auth-store.ts` — replace `Session`/`User` from `@supabase/supabase-js` with PocketBase `RecordModel`; update `setSession` signature
- [x] 3.2 Update `app/_layout.tsx` — import `getSession` from `pocketbase/services/auth`
- [x] 3.3 Update `src/features/auth/hooks/useAuth.ts` — import path from `supabase/services/auth` → `pocketbase/services/auth`
- [x] 3.4 Update `src/features/exercises/hooks/useExercises.ts` — import path from `supabase/services/exercises` → `pocketbase/services/exercises`
- [x] 3.5 Update `src/features/routines/hooks/useTemplates.ts` — import path from `supabase/services/templates` → `pocketbase/services/templates`
- [x] 3.6 Update `src/features/workout/hooks/useWorkoutSession.ts` — import paths from `supabase/services/sessions` → `pocketbase/services/sessions`
- [x] 3.7 Update `src/features/history/hooks/useHistory.ts` — import paths from `supabase/services/sessions` → `pocketbase/services/sessions`
- [x] 3.8 Update `src/features/records/hooks/usePersonalRecords.ts` — import paths from `supabase/services/prs` → `pocketbase/services/prs`
- [x] 3.9 Update screen files (ProgressScreen, ExerciseListScreen, HistoryListScreen, RoutineListScreen, RoutineFormScreen) — type import paths from `supabase` → `pocketbase`
- [x] 3.10 Update `jest.setup.ts` — add PocketBase mock / ensure `expo-secure-store` mock covers both adapters
- [x] 3.11 Update `src/features/auth/hooks/__tests__/useAuth.test.tsx` — mock path from `supabase/services/auth` → `pocketbase/services/auth`

## Phase 4: Seed Data + Cleanup

- [x] 4.1 Create `scripts/seed-pocketbase.mjs` — read `supabase/seed.sql`, parse INSERT statements, POST exercises to PocketBase via admin API
- [x] 4.2 Execute seed script against running PocketBase at `http://127.0.0.1:8090` — 63 exercises created, verified count
- [x] 4.3 Drop the old `test` collection from PocketBase (not found — already deleted or never created)
