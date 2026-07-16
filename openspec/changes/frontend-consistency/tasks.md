# Tasks: Frontend Consistency

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

~1200–1800 lines across 5 stacked PRs. Each independently revertable.

| PR | Scope | Test |
|----|-------|------|
| #1 | Import alignment + dead code | `npx tsc --noEmit && npx jest` |
| #2 | Critical tests | `npx jest --coverage` |
| #3 | Forgot password + chart | `npx jest src/features/auth/hooks/__tests__/` |
| #4 | Screen extraction | `npx jest` |
| #5 | Theme hardening | `npx jest` |

## Phase 1 — Import Alignment (PR #1)

- [x] 1.1 Fix imports: `../../src/` → `@/`, `../../../src/` → `@/` across 20 `app/` files
- [x] 1.2 `npx tsc --noEmit` — passes with no errors
- [x] 1.3 Merge `findAssignedToday` + `PressScale` from `index.tsx` into `home.tsx`
- [x] 1.4 Delete `app/(tabs)/index.tsx`
- [x] 1.5 Repoint `app/(tabs)/__tests__/index.test.tsx` to `home.tsx`
- [x] 1.6 Update `app/(tabs)/__tests__/home.test.tsx` — remove `HomeIndexScreen` import + test
- [x] 1.7 `npx jest` — 105 suites, 1187 tests, all green

## Phase 2 — Critical Tests (PR #2)

- [ ] 2.1 `src/features/workout/hooks/__tests__/useWorkoutSession.test.ts` — mock pb session CRUD
- [ ] 2.2 `src/features/workout/hooks/__tests__/useRestTimer.test.ts` — timer logic
- [ ] 2.3 `src/features/history/hooks/__tests__/useHistory.test.ts` — list + detail
- [ ] 2.4 `src/features/exercises/hooks/__tests__/useExercises.test.ts` — filtering + pagination
- [ ] 2.5 `src/features/analytics/hooks/__tests__/useAnalytics.test.ts` — volume calc, period toggle
- [ ] 2.6 `src/features/home/hooks/__tests__/useHomeStats.test.ts` — aggregation queries
- [ ] 2.7 `src/features/profile/screens/__tests__/ProfileScreen.test.tsx` — mock auth render
- [ ] 2.8 `src/features/wellness/screens/__tests__/WellnessDashboardScreen.test.tsx` — mock trends
- [ ] 2.9 `src/features/exercises/screens/__tests__/ExerciseListScreen.test.tsx` — list + search
- [ ] 2.10 `npx jest --coverage` — >=80% per new file

## Phase 3 — Forgot Password + Chart (PR #3)

- [ ] 3.1 `src/features/auth/screens/ForgotPasswordScreen.tsx` — email + `requestPasswordReset`
- [ ] 3.2 `app/(auth)/forgot-password.tsx` — thin route wrapper
- [ ] 3.3 `src/features/auth/hooks/__tests__/ForgotPasswordScreen.test.tsx` — submit + success/error
- [ ] 3.4 `LoginScreen.tsx` — add "Forgot password?" link
- [ ] 3.5 `usePersonalRecords.ts` — expose `prTimeline` per exercise
- [ ] 3.6 `PersonalRecordsSection.tsx` — add LineChart weight/volume
- [ ] 3.7 `PersonalRecordsSection.test.tsx` — chart render tests

## Phase 4 — Inline Screen Extraction (PR #4)

- [ ] 4.1 `CoachAssignmentScreen.tsx` from `app/(coach)/assign.tsx` (364L)
- [ ] 4.2 `CoachAthletesScreen.tsx` from `app/(coach)/athletes.tsx` (285L)
- [ ] 4.3 `TeamDetailScreen.tsx` from `app/(coach)/teams/[id].tsx` (423L)
- [ ] 4.4 Mod `app/(coach)/library/create.tsx` — thin wrapper (231L)
- [ ] 4.5 Mod `app/(coach)/library/[id]/edit.tsx` — thin wrapper (270L)
- [ ] 4.6 `SignUpInfoScreen.tsx` from `app/(auth)/signup-info.tsx` (305L)
- [ ] 4.7 `npx jest` — no regressions

## Phase 5 — Theme Hardening (PR #5)

- [ ] 5.1 `src/constants/theme.ts` — `TAB_BAR_BG`, `TAB_BAR_BORDER`, `TAB_BAR_HEIGHT`
- [ ] 5.2 `app/(tabs)/_layout.tsx` — hex → Tailwind tokens + `DETAIL_HEADER` constant
- [ ] 5.3 `app/(coach)/_layout.tsx` — same hex → Tailwind pattern
- [ ] 5.4 Remove remaining hardcoded hex header colors in `app/`
- [ ] 5.5 Manual verify: tab bars identical to pre-change
- [ ] 5.6 `npx jest` — no regressions
