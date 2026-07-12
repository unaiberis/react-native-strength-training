# Tasks: Progression Chart

## Phase 1: Shared Component

### Task 1.1 — Create ProgressionChart component
- File: `src/shared/ui/ProgressionChart.tsx`
- Props: `data: ProgressionDataPoint[]`, `isLoading: boolean`, `exerciseName?: string`
- Renders SVG bar chart (volume) + line chart (e1RM)
- Skeleton placeholder when loading
- Empty state when no data
- Horizontal scroll wrapper when >20 points

### Task 1.2 — Create ProgressionChart test
- File: `src/shared/ui/__tests__/ProgressionChart.test.tsx`
- Test: renders bars with data
- Test: renders empty state with no data
- Test: renders skeleton when loading
- Test: handles single data point

## Phase 2: Integration

### Task 2.1 — Add to Analytics screen
- File: `src/features/analytics/screens/AnalyticsScreen.tsx` or `app/(tabs)/analytics.tsx`
- Read exerciseId from search params or current selection
- Use `useProgression(exerciseId)` to fetch data
- Add `<ProgressionChart>` below Personal Records section

### Task 2.2 — Update tests
- Update Analytics screen tests to mock ProgressionChart or verify it renders
- Ensure coverage ≥80%

## Phase 3: Verification

### Task 3.1 — tsc check
- Command: `npx tsc --noEmit`
- Must be 0 errors

### Task 3.2 — test suite
- Command: `npx jest --passWithNoTests`
- Must pass (1089+ tests, 3 pre-existing analytics-calc failures acceptable)
