# Proposal: Skeleton Analytics Alignment

## Intent

The AnalyticsScreen loading state (lines 85-97) renders 3 generic `SkeletonCard` components that bear no visual resemblance to the loaded layout. Users see unrelated card shapes that flash away when data arrives, creating a jarring transition. The loaded screen has a distinct structure — header, period toggle, 3 stat cards, chart, exercise list — that a skeleton should mirror.

## Scope

### In Scope

- Create `AnalyticsSkeleton` component that mirrors the loaded AnalyticsScreen layout (header → toggle → stat cards → chart → exercise list items)
- Add `SharedSkeletonValue` pattern to `SkeletonLoader.tsx` — a single `Animated.Value` shared across all `SkeletonPulse` instances to reduce 7+ independent animation loops to 1
- Replace 3 `SkeletonCard` calls in AnalyticsScreen with the new `AnalyticsSkeleton`
- Remove legacy `src/shared/ui/SkeletonCard.tsx` (zero consumers — all 4 import sites already use `SkeletonLoader`)

### Out of Scope

- Modifying `PersonalRecordsSection` loading behavior (it owns its own `ActivityIndicator` independently)
- Chart skeleton animation (BarChart area uses a static placeholder, not pulsing bars)
- Refactoring `DashboardSkeleton` or `PageSkeleton` to use shared animated value (separate change)

## Capabilities

### New Capabilities

- `analytics-skeleton`: Structured loading placeholder matching the AnalyticsScreen layout

### Modified Capabilities

- `design-system`: Extend SkeletonLoader primitives with shared animation pattern

## Approach

1. **Shared animated value** — Add a module-level `Animated.Value` in `SkeletonLoader.tsx` shared by all `SkeletonPulse` instances. This cuts 7+ independent `Animated.loop` calls to 1, reducing JS thread load on low-end devices.

2. **AnalyticsSkeleton** — New exported component in `SkeletonLoader.tsx` (follows `DashboardSkeleton` / `PageSkeleton` pattern). Structure:
   - Header: `SkeletonBar` (50%, 28h) + subtitle bar (30%, 14h)
   - Toggle: `SkeletonBar` (self-start, 120w, 44h) with card bg
   - 3 stat cards: row of `flex-1` cards with value bar + label bar each
   - Chart card: `bg-card rounded-2xl` with title bar + chart area placeholder
   - Exercise list: title bar + 3 exercise item rows
   - Bottom spacer

3. **Integration** — Replace the 3 `SkeletonCard` calls in `AnalyticsScreen.tsx` lines 90-92 with single `<AnalyticsSkeleton />`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/ui/SkeletonLoader.tsx` | Modified | Add shared animated value + `AnalyticsSkeleton` export |
| `src/features/analytics/screens/AnalyticsScreen.tsx` | Modified | Replace SkeletonCard with AnalyticsSkeleton |
| `src/shared/ui/SkeletonCard.tsx` | Removed | Legacy duplicate, zero consumers |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Shared animated value causes all skeletons to pulse in sync (unified rhythm) | Low | Unified pulse is the intent — reduces visual noise and JS load. If desync is desired later, add phase offset parameter. |
| `SkeletonCard.tsx` removal breaks an undiscovered consumer | Low | Grep confirms all 4 import sites use `@/shared/ui/SkeletonLoader`, not the legacy file. Run `npx tsc --noEmit` to verify. |
| 7+ pulsing elements still heavy on very old devices | Low | Shared animated value addresses this. Worst case: add `SkeletonPulse` toggle prop to disable animation. |

## Rollback Plan

1. Revert `AnalyticsScreen.tsx` changes — restore 3 `SkeletonCard` calls
2. Restore `SkeletonCard.tsx` from git history
3. Remove `AnalyticsSkeleton` export from `SkeletonLoader.tsx`
4. All changes are pure UI — no data or state implications

## Dependencies

- None — all primitives (`SkeletonBar`, `SkeletonPulse`) already exist

## Success Criteria

- [ ] `AnalyticsSkeleton` visually mirrors loaded layout (header, toggle, stat cards, chart, exercise list)
- [ ] `npx tsc --noEmit` passes with no type errors
- [ ] `npx jest` passes (existing tests + new skeleton tests)
- [ ] Legacy `SkeletonCard.tsx` deleted, zero broken imports
- [ ] Shared animated value confirmed active (single `Animated.loop` in profiler or code review)
