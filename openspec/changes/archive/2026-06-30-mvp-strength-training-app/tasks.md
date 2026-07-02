# Tasks: MVP — Strength Training App

## Review Workload Forecast

| Field                   | Value                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Estimated changed lines | ~2,950 (55 files, greenfield)                                                                                  |
| 400-line budget risk    | High                                                                                                           |
| Chained PRs recommended | Yes                                                                                                            |
| Suggested split         | PR 1: Foundation+Auth → PR 2: Exercises+Routines → PR 3: Workout Execution → PR 4: History+PRs → PR 5: Testing |
| Delivery strategy       | auto-forecast                                                                                                  |
| Chain strategy          | stacked-to-main                                                                                                |

```
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

### Suggested Work Units

| Unit | Goal                                                      | Likely PR | Notes                   |
| ---- | --------------------------------------------------------- | --------- | ----------------------- |
| 1    | Expo scaffold, Supabase, DB schema, nav shell, auth       | PR 1      | Base = main. ~800 lines |
| 2    | Exercise library, routine builder                         | PR 2      | Base = PR 1. ~600 lines |
| 3    | Workout execution (start, log sets, rest timer, complete) | PR 3      | Base = PR 2. ~500 lines |
| 4    | History list/detail, PR auto-detect + display             | PR 4      | Base = PR 3. ~400 lines |
| 5    | Unit, integration, RLS, E2E critical-path tests           | PR 5      | Base = PR 4. ~600 lines |

## Phase 1: Foundation

- [x] 1.1 Scaffold Expo app, TypeScript config, install deps → `package.json`, `tsconfig.json`
- [x] 1.2 Init Supabase client → `src/lib/supabase/client.ts`
- [x] 1.3 Create DB schema migration (profiles, exercises, programs, blocks, templates, template_exercises, sessions, sets, coach_relationships, personal_records, indexes) → `supabase/migrations/00001_schema.sql`
- [x] 1.4 Create RLS policies per table → `supabase/migrations/00002_rls.sql`
- [x] 1.5 Create seed data (50+ exercises) → `supabase/seed.sql`
- [x] 1.6 Create Zod schemas (auth, template, set) → `src/shared/schemas/auth.ts`, `template.ts`, `set.ts`
- [x] 1.7 Create UI primitives (Button, Card, Input) → `src/shared/ui/Button.tsx`, `Card.tsx`, `Input.tsx`
- [x] 1.8 Create Expo Router layouts (root, auth group, tab group) → `app/_layout.tsx`, `app/(auth)/_layout.tsx`, `app/(tabs)/_layout.tsx`

## Phase 2: Auth

- [x] 2.1 Create auth Zustand store → `src/stores/auth-store.ts`
- [x] 2.2 Create Supabase auth service (signUp, signIn, signOut, getSession) → `src/lib/supabase/services/auth.ts`
- [x] 2.3 Create useAuth hook → `src/features/auth/hooks/useAuth.ts`
- [x] 2.4 Create login screen + route → `app/(auth)/login.tsx`, `src/features/auth/screens/LoginScreen.tsx`
- [x] 2.5 Create register screen + route → `app/(auth)/register.tsx`, `src/features/auth/screens/RegisterScreen.tsx`
- [x] 2.6 Create profile screen + tab route → `app/(tabs)/profile.tsx`, `src/features/profile/screens/ProfileScreen.tsx`

## Phase 3: Exercise Library

- [x] 3.1 Create exercises service (list, get, search by category) → `src/lib/supabase/services/exercises.ts`
- [x] 3.2 Create useExercises query hook → `src/features/exercises/hooks/useExercises.ts`
- [x] 3.3 Create exercise list screen (paginated, category filter) → `src/features/exercises/screens/ExerciseListScreen.tsx`
- [x] 3.4 Create exercise detail screen → `src/features/exercises/screens/ExerciseDetailScreen.tsx`
- [x] 3.5 Wire train/home tab screens → `app/(tabs)/index.tsx`, `app/(tabs)/train.tsx`

## Phase 4: Routine Builder

- [x] 4.1 Create templates service (CRUD + reorder) → `src/lib/supabase/services/templates.ts`
- [x] 4.2 Create useTemplates hook → `src/features/routines/hooks/useTemplates.ts`
- [x] 4.3 Create routine list screen → `src/features/routines/screens/RoutineListScreen.tsx`
- [x] 4.4 Create routine form screen (exercise picker, target sets/reps/RPE, reorder) → `src/features/routines/screens/RoutineFormScreen.tsx`

## Phase 5: Workout Execution

- [x] 5.1 Create session Zustand store (activeSession, rest timer) → `src/stores/session-store.ts`
- [x] 5.2 Create sessions service (create, logSet, complete, cancel) → `src/lib/supabase/services/sessions.ts`
- [x] 5.3 Create useWorkoutSession hook (TQ + Zustand bridge) → `src/features/workout/hooks/useWorkoutSession.ts`
- [x] 5.4 Create rest timer hook + UI component → `src/features/workout/hooks/useRestTimer.ts`, `src/shared/ui/RestTimer.tsx`
- [x] 5.5 Create active workout screen + modal route → `app/(workout)/active.tsx`, `src/features/workout/screens/ActiveWorkoutScreen.tsx`
- [x] 5.6 Create workout complete screen → `src/features/workout/screens/WorkoutCompleteScreen.tsx`

## Phase 6: Workout History & PRs

- [x] 6.1 Create PR calc utility (Epley e1RM, volume, tonnage) → `src/shared/utils/pr-calc.ts`
- [x] 6.2 Create PRs service (calculate, list, get) → `src/lib/supabase/services/prs.ts`
- [x] 6.3 Create useHistory hook (paginated list, filter) → `src/features/history/hooks/useHistory.ts`
- [x] 6.4 Create history list screen → `src/features/history/screens/HistoryListScreen.tsx`
- [x] 6.5 Create history detail screen → `src/features/history/screens/HistoryDetailScreen.tsx`
- [x] 6.6 Create usePersonalRecords hook + progress screen → `src/features/records/hooks/usePersonalRecords.ts`, `app/(tabs)/progress.tsx`, `src/features/records/screens/ProgressScreen.tsx`

## Phase 7: Testing

- [x] 7.1 Unit tests: pr-calc (Epley, volume, tonnage edge cases), Zod schema validation, Zustand store transitions (auth-store, session-store)
- [x] 7.2 Integration tests: auth flow (signUp→signIn→restore→signOut), workout execution flow (create→logSet→complete→PR calc), RLS policy enforcement
- [x] 7.3 E2E critical path test spec: login → browse exercises → create routine → execute workout → verify PR on progress screen
