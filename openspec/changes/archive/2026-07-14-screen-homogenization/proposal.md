# Proposal: Screen Homogenization

## Intent

12 screens use 3+ competing patterns for imports, titles, padding, colors, error/loading/empty states, cards, pull-to-refresh, accessibility, and bottom spacers. This fragmentation raises cognitive load and makes systematic changes expensive. A shared `ScreenLayout` wrapper eliminates inconsistency at the source.

## Scope

### In Scope
- **ScreenLayout**: shared wrapper (SafeAreaView + GradientBackground + optional ScrollView with refreshControl + padding + ScreenTitle + children + bottom spacer). Accepts `error`/`loading`/`empty` state props rendering shared components.
- **All 12 screens**: migrate to ScreenLayout + v2 tokens (`bg-card`, `border-border`, `text-surface-50`)
- **Retrofit states**: shared EmptyState, SkeletonLoader, LoadingState
- **Standardize**: `@/` alias imports everywhere

### Out of Scope
- Visual redesign (tokens defined in design-system spec)
- Navigation, features, data layer, GradientBackground

## Capabilities
**New**: None — pure refactor. **Modified**: None — no spec-level behavior changes.

## Approach

5 chained PRs (< 400 lines each):

| PR | Scope |
|----|-------|
| 1 | ScreenLayout + LoadingState component + unit tests |
| 2 | ExerciseList, ExerciseDetail, HistoryList, HistoryDetail |
| 3 | ActiveWorkout, Profile |
| 4 | Calendar, Analytics, Wellness, WorkoutBuilder, home |
| 5 | Accessibility labels, pull-to-refresh gaps, bottom spacer audit |

## Affected Areas

| Area | Impact |
|------|--------|
| `src/shared/ui/ScreenLayout.tsx` | New |
| `src/shared/ui/ScreenTitle.tsx` | Modify — accept v2 token overrides |
| `src/shared/ui/LoadingState.tsx` | New |
| `12 screen files in 6 features` | Modify |

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Visual regressions | Per-PR review + manual check ActiveWorkout, Analytics, home |
| Stacked PR merge conflicts | Each PR merges to main before next starts |

## Rollback Plan

Each PR independently revertable. ScreenLayout bug? Revert PR 1 — other screens still compile with their old containers. No atomicity dependency.

## Success Criteria

- [ ] All 12 screens use ScreenLayout (zero inline SafeAreaView/GradientBackground/ScrollView)
- [ ] All screens use `@/` alias imports
- [ ] All screens use v2 tokens (no `surface-*` legacy tokens)
- [ ] All screens have `accessibilityLabel` on title
- [ ] All scrollable screens have pull-to-refresh
- [ ] States use shared components (EmptyState, SkeletonLoader, LoadingState)
- [ ] All screens include bottom spacer
- [ ] `npx jest` passes; `npx tsc --noEmit` passes
