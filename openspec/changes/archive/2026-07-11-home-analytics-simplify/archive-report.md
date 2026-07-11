# Archive Report: home-analytics-simplify

- **Date**: 2026-07-11
- **Mode**: hybrid (openspec file + Engram topic key)
- **Archived to**: `openspec/changes/archive/2026-07-11-home-analytics-simplify/`
- **Delivery**: main-direct (commit + push to `main`)
- **Verify verdict**: PASS

## What Shipped

### A — Remove e1RM from Home
- `app/(tabs)/home.tsx`: removed `bestE1RM` destructure + Row 2 "Best e1RM" `StatCard`.
- `app/(tabs)/index.tsx`: removed `bestE1RM` destructure + 2nd Row 2 `StatCard` (leaving "This Week").
- `useHomeStats.bestE1RM` left intact (only render sites removed); e1RM retained in `ExerciseTimelineScreen` detail — per design.

### B — Merge Progress → Analytics
- New `src/features/records/components/PersonalRecordsSection.tsx`: owns data (`usePersonalRecords()` + `useRouter()`), collapse state, header "Personal Records", loading/empty CTA (`Button` → `/(tabs)/train`), grouped `ExercisePRGroup[]`. `PRCard`/`ExercisePRGroup`/`formatDate` migrated here from `ProgressScreen`.
- `src/features/analytics/screens/AnalyticsScreen.tsx`: render `<PersonalRecordsSection />` after charts regardless of `hasData`.
- `app/(tabs)/_layout.tsx`: removed `progress` tab icon + `<Tabs.Screen name="progress">`.
- Deleted `app/(tabs)/progress.tsx` and `src/features/records/screens/ProgressScreen.tsx`.
- Net spec change: PRs now surfaced as a "Personal Records" section within the **Analytics** tab (not a standalone Progress tab); auto-detection (1RM, e1RM Epley, volume, rep max) unchanged; Given/When/Then scenarios updated to Analytics tab / Personal Records section + empty state.

### Type-defect fix (resolved before archive; unblocks PASS)
- Commit `137f011` (`fix: resolve tsc type errors from home-analytics-simplify`):
  - `PersonalRecordsSection.tsx(112)`: `JSX.Element` → `ReactElement` (imported `type ReactElement` from `react`).
  - `home.test.tsx`: spread mocks `useAuth`/`useHomeStats` → `() => mockX()`; `recentSessions` typed `[] as RecentSession[]`; `mockUseAuth` optional `display_name?`/`email?` so the `user_metadata: {}` fallback type-checks.
  - Committed HEAD `tsc` dropped 11 → 6 errors; the remaining 6 are pre-existing (present at freeze commit `ed49ce7`), outside this change's scope.

## Commits (on main)
- `aa4ebb9` feat(records): add shared PersonalRecordsSection component
- `ddbca56` feat(analytics): merge Progress PRs into Analytics tab
- `6f43294` feat(home): remove Best e1RM stat card from Home
- `1bbf367` test: raise coverage on changed Home/Analytics/_layout files
- `d0d6fb3` docs(sdd): record apply-progress for home-analytics-simplify
- `137f011` fix: resolve tsc type errors from home-analytics-simplify

## Quality Evidence
- Tests: 47 relevant tests green (`home.test.tsx`, `index.test.tsx`, `layout.test.tsx`, `AnalyticsScreen.test.tsx`, `PersonalRecordsSection.test.tsx`). Full suite 1075 passing.
- Coverage ≥80% per changed file: `_layout.tsx` 100%, `home.tsx` 100%, `index.tsx` 100%, `AnalyticsScreen.tsx` 87.8%, `PersonalRecordsSection.tsx` 100%.
- Build: `npx expo export --platform web` exit 0.
- Drift grep: zero `ProgressScreen` / `name="progress"` / `progress.tsx` refs in `app/`,`src/`.

## TDD Compliance
- All 19 tasks in `tasks.md` marked `[x]` (Strict RED→GREEN, TDD enabled). Task Completion Gate passes.

## Risks / Residual
- 6 pre-existing `tsc` errors on `main` are out of scope (present before this change at freeze commit `ed49ce7`: `app/(coach)/assign.tsx`, `index.test.tsx` ×3, `programs` tests ×2). They ride along on `main` but were not introduced by this change and do not touch its files.
- Delta is MODIFIED (relocate `Display` requirement), NON-destructive — no `rules.archive` destructive warning triggered.

## Audit Trail
- Proposal, design, tasks, apply-progress, verify-report, and delta spec retained in the archived folder.
- Base spec synced: `openspec/specs/personal-records/spec.md` `Display` requirement updated to Analytics-tab Personal Records section.
- Engram: `mem_save` topic_key `sdd/home-analytics-simplify/archive-report`, type `architecture`.
