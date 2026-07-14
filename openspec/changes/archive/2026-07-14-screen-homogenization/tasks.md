# Tasks: Screen Homogenization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280-320 |
| 400-line budget risk | Low |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

## PR 1: ScreenLayout + Card migration

- [x] 1.1 Create `src/shared/ui/ScreenLayout.tsx` — wrapper with props: title, subtitle, kicker, mode (scroll/flatlist/none), loading, error, empty, onRefresh, refreshing, padded, className, data, renderItem, keyExtractor, onEndReached, onEndReachedThreshold, ListHeaderComponent, ListFooterComponent. Renders GradientBackground → ErrorBoundary → Safe padding → state-aware content (loading/error/empty/ScrollView/FlatList/none) → ScreenTitle → children → bottom spacer h-8.
- [x] 1.2 Write `src/shared/ui/__tests__/ScreenLayout.test.tsx` — 21 tests covering title, subtitle, kicker, loading state, error state, empty state, scroll mode, flatlist mode, none mode, and state priority (loading > error > empty).
- [x] 1.3 Migrate `src/features/analytics/screens/AnalyticsScreen.tsx` — replaced inline `StatCard` with `<Card>` component, replaced inline card containers (`bg-card rounded-2xl...`) with `<Card>`, used ScreenLayout as wrapper with title/subtitle, removed inline GradientBackground/ErrorBoundary/ScrollView/RefreshControl.
- [x] 1.4 Migrate `src/features/wellness/screens/WellnessDashboardScreen.tsx` — replaced `PeriodCard`, `MetricTrendChart`, and inline empty-state card Views with `<Card>` component, used ScreenLayout as wrapper with title/subtitle/loading/error props.
- [x] 1.5 Migrate `src/features/calendar/screens/CalendarScreen.tsx` — replaced ScrollView + GradientBackground + header structure with ScreenLayout wrapper, pass view mode toggle and assigned chip as children.
- [x] 1.6 Verify `npx tsc --noEmit` passes (2 pre-existing errors unrelated to changes). `npx jest --passWithNoTests` passes (all 1111 tests pass, 8 pre-existing failures in unrelated test suites).

## PR 2: Import paths + ScreenTitle adoption

- [x] 2.1 (in PR 1) jest.setup.ts safe area mock
- [x] 2.2 Convert `../../../shared/` → `@/shared/` in ExerciseListScreen (3 imports: Card, GradientBackground, types/pocketbase)
- [x] 2.3 Convert imports (Card, GradientBackground, VideoPlayer) + add ScreenTitle to ExerciseDetailScreen
- [x] 2.4 Convert imports (Card, Button, GradientBackground, sessions type) + add ScreenTitle to HistoryListScreen
- [x] 2.5 Convert imports (Card, GradientBackground, pr-calc) + add ScreenTitle to HistoryDetailScreen
- [x] 2.6 Convert imports in ProfileScreen (Card, Button, ScreenTitle, GradientBackground, auth-store)
- [x] 2.7 Convert imports in ActiveWorkoutScreen (Card, Button, GradientBackground, RestTimer, RpeSlider, WeightTypeSelector, session-store, prescription)
- [x] 2.8 Verify `npx tsc --noEmit` + `npx jest --passWithNoTests`

## PR 3: Color tokens migration

- [x] 3.1 Apply token map (surface-900→card, surface-800→cardSoft, etc.)
- [x] 3.2 Target 17+ files
- [x] 3.3 Verify builds

## PR 4: Error/loading/empty states + accessibility

- [x] 4.1 Wrap remaining screens in ErrorBoundary
- [x] 4.2 Replace inline empty-state JSX with EmptyState component
- [x] 4.3 Add PageSkeleton loading state to screens using ScreenLayout loading prop
- [x] 4.4 Add accessibilityRole + accessibilityLabel to TouchableOpacity
- [x] 4.5 Verify builds

## PR 5: Polish (pull-to-refresh, bottom spacers, pt-16)

- [x] 5.1 Add pull-to-refresh to HistoryDetailScreen, WellnessDashboardScreen, WorkoutBuilderScreen
- [x] 5.2 Add bottom spacer (View h-8) to ExerciseDetailScreen, home.tsx; verified others already have it
- [x] 5.3 Standardize top padding to pt-16 on ExerciseDetailScreen, HistoryDetailScreen
- [x] 5.4 Final type check (2 pre-existing errors) and test run (8 pre-existing failures, 1116 passing)
