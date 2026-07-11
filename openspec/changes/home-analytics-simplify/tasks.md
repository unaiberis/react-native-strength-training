# Tasks: Simplify Home & Analytics (home-analytics-simplify)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | single commit (main-direct) |
| Delivery strategy | main-direct |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

TDD: `apply.tdd: true` — every changed file is guarded by a RED test written first. Coverage ≥ 80% per changed/new file (`npx jest`).

## Phase 1: Foundation — Shared PR Component (B)

- [x] 1.1 Create `src/features/records/components/PersonalRecordsSection.tsx`: export `PersonalRecordsSection(): JSX.Element` that calls `usePersonalRecords()` + `useRouter()`, owns `expandedExercises` collapse state, renders header "Personal Records", loading (`ActivityIndicator`), empty state ("No records yet" + Start Workout `Button` → `/(tabs)/train`), and grouped `ExercisePRGroup[]`.
- [x] 1.2 Move `PRCard`, `ExercisePRGroup`, `formatDate` from `ProgressScreen.tsx` into the new component; reuse exported `getPRTypeLabel`, `formatPRValue`, `PRDisplayItem` from `usePersonalRecords`. Use `@/` aliases.
- [x] 1.3 RED: write `src/features/records/components/__tests__/PersonalRecordsSection.test.tsx` asserting grouped PRs render, empty CTA renders, and spinner shows on loading (mock `usePersonalRecords`). Run `npx jest` → RED.
- [x] 1.4 GREEN: implement 1.1–1.2 until 1.3 passes. Keep `usePersonalRecords` hook + its existing tests unchanged.

## Phase 2: Merge into Analytics (B)

- [x] 2.1 RED: write `src/features/analytics/screens/__tests__/AnalyticsScreen.test.tsx` asserting a "Personal Records" section renders grouped PRs (mock `usePersonalRecords` + `useAnalytics`) and an empty-state variant. Run → RED.
- [x] 2.2 GREEN: in `src/features/analytics/screens/AnalyticsScreen.tsx`, `import { PersonalRecordsSection }` and render `<PersonalRecordsSection />` after the charts block (before bottom spacing) so it shows regardless of chart `hasData`.
- [x] 2.3 RED: write `app/(tabs)/__tests__/layout.test.tsx` (or extend existing) asserting no `progress` tab — `tabIcons` lacks `progress` and no `<Tabs.Screen name="progress">`. Run → RED.
- [x] 2.4 GREEN: in `app/(tabs)/_layout.tsx` remove `progress: "trending-up-outline"` from `tabIcons` (line 38) and the `<Tabs.Screen name="progress" …/>` block (lines 127–135).
- [x] 2.5 Delete `app/(tabs)/progress.tsx` and `src/features/records/screens/ProgressScreen.tsx`.

## Phase 3: Remove e1RM from Home (A)

- [x] 3.1 RED: write `app/(tabs)/__tests__/home.test.tsx` rendering `home.tsx` and asserting `queryByText("Best e1RM")` is null. Extend `app/(tabs)/__tests__/index.test.tsx` with same "Best e1RM" absent assertion. Run → RED.
- [x] 3.2 GREEN: in `app/(tabs)/home.tsx` remove `bestE1RM` from the `useHomeStats()` destructure (line 23) and delete the Row 2 "Best e1RM" `StatCard` block (lines 109–126).
- [x] 3.3 GREEN: in `app/(tabs)/index.tsx` remove `bestE1RM` from destructure (line 28) and delete the 2nd Row 2 `StatCard` (lines 136–150), leaving "This Week". e1RM stays in `ExerciseTimelineScreen` (untouched).
- [x] 3.4 In `app/(tabs)/__tests__/index.test.tsx` remove the obsolete test "renders '—' for bestE1RM when it is null" (lines 236–251); keep `bestE1RM` fixtures in other tests (hook output stays intact per design).

## Phase 4: Cleanup / Drift Guard

- [ ] 4.1 grep confirm: zero references to `ProgressScreen`, `progress.tsx` route, and `<Tabs.Screen name="progress">` in `src/`, `app/`, `tests/`. Update any leftover imports/mocks.
- [ ] 4.2 grep confirm: `bestE1RM` still produced by `useHomeStats` (left intact) — only the two `StatCard` render sites removed; no dangling `value={bestE1RM…}` JSX remains.

## Phase 5: Verify

- [ ] 5.1 Run `npx jest` — all new + existing tests pass; `PersonalRecordsSection`, `AnalyticsScreen`, `home.tsx`, `index.tsx`, `_layout.tsx` each ≥ 80% coverage.
- [ ] 5.2 Run `npx tsc --noEmit` — no type errors.

### Dependencies
- 2.1–2.2 depend on 1.1–1.4 (section must exist before wiring). 2.3–2.5 independent of 1–2 but all of B is independent of A (Phase 3). 4.x and 5.x depend on all prior.
- Apply order: Phase 1 → 2 → 3 → 4 → 5, each guarded by its RED test first.
