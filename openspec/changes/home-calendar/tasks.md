# Tasks: Home / Calendario — Weekly Calendar in the Athlete Home Tab

## Delivery Strategy

- **Decision needed before apply:** No
- **Chained PRs recommended:** No
- **400-line budget risk:** Medium (~220 lines new + ~40 lines modified)
- **Estimated total:** ~260 new + modified lines across 8 files

All work fits in a single PR. The change touches isolated new components plus two existing files (home.tsx, index.tsx), making it straightforward to review.

---

## Phase 1: New Hook — `useSessionsForDate`

### Task 1.1 — Create `useSessionsForDate` hook

- **File:** `src/features/calendar/hooks/useSessionsForDate.ts`
- **What:**
  - Create a new hook that takes a `date: string | null` parameter
  - Returns `{ sessions: WorkoutSummary[], isLoading, error, refetch }`
  - On native: queries local SQLite `workout_sessions` table (pattern from `fetchWeekSessionsFromLocal` in `useWeekCalendar.ts`)
  - On web: queries PocketBase `workout_sessions` collection (pattern from `fetchSessionsForDate` in `useCalendar.ts`)
  - Uses TanStack Query with key `["sessions-for-date", date, userId]`
  - `staleTime: 60_000`
  - Return type `WorkoutSummary` with fields: `id`, `templateName`, `status`, `startedAt`, `durationMinutes`, `exerciseCount`
  - Reuses `useAthleteAssignments` to include assigned (not-started) workouts that match the date
  - Returns empty array when date is null or no sessions found
- **Pattern reference:** `src/features/calendar/hooks/useCalendar.ts` — `fetchSessionsForDate` function

### Task 1.2 — Unit test `useSessionsForDate`

- **File:** `src/features/calendar/hooks/__tests__/useSessionsForDate.test.ts`
- **What:**
  - Mock SQLite (`expo-sqlite`) and PocketBase client
  - Test: returns sessions for a date with data
  - Test: returns empty array for date with no data
  - Test: handles null date (returns empty)
  - Test: includes assigned (not started) workouts from assignments
  - Test: loading state
  - Test: error state
- **Pattern reference:** `src/features/calendar/hooks/__tests__/useWeekCalendar.test.ts`

---

## Phase 2: New Components

### Task 2.1 — Create `WorkoutDayItem` component

- **File:** `src/features/calendar/components/WorkoutDayItem.tsx`
- **What:**
  - Props: `workout: WorkoutSummary`, `onPress: () => void`
  - Card layout: icon (left), name + status (center), exercise count + duration (right)
  - Status styling: "Assigned" → titanium border/badge, "Active" → titanium fill, "Completed" → sacred (green) fill
  - `React.memo` wrapped for performance
  - `TouchableOpacity` with `active:opacity-80`
  - Design tokens: `bg-card`, `border border-border`, `rounded-xl`, etc.
- **Pattern reference:** `src/features/calendar/components/DayDetail.tsx` — `WorkoutCard` component

### Task 2.2 — Create `WorkoutDayList` component

- **File:** `src/features/calendar/components/WorkoutDayList.tsx`
- **What:**
  - Props: `sessions: WorkoutSummary[]`, `date: string`, `onStartWorkout: () => void`, `onViewDetail: (id: string) => void`
  - When sessions exist: renders date header + `FlatList` of `WorkoutDayItem`
  - When sessions empty: renders `EmptyState` from `@/shared/ui/EmptyState` with message "Rest day — No workout scheduled" and "Start a Workout" CTA
  - Date header formatted as "Wednesday, July 8" using locale format
  - Date header styling: `text-surface-400 text-xs font-semibold`

### Task 2.3 — Create `WeekCalendarSection` component

- **File:** `src/features/calendar/components/WeekCalendarSection.tsx`
- **What:**
  - Self-contained section component (no props — hooks are inside)
  - Imports and uses `useWeekCalendar()`
  - Imports and uses `useSessionsForDate(selectedDate)`
  - Renders:
    1. WeekStrip (above) — passing all week data
    2. Today button — aligned right, small "Today" text button, calls `goToToday()`
    3. WorkoutDayList (below) — passing sessions for selected date
  - Loading state: skeleton placeholders (2 skeleton lines for week strip, 3 for day list)
  - Error state: inline error text with retry button
  - All styled with existing design tokens
  - Section wrapper: `mb-6` spacing below

### Task 2.4 — Unit test `WeekCalendarSection`

- **File:** `src/features/calendar/components/__tests__/WeekCalendarSection.test.tsx`
- **What:**
  - Mock `useWeekCalendar` and `useSessionsForDate`
  - Test: renders week strip with 7 days
  - Test: renders workout list when sessions exist
  - Test: renders empty state when no sessions
  - Test: loading state shows skeletons
  - Test: "Today" button calls goToToday
  - Test: selecting a day updates display

### Task 2.5 — Unit test `WorkoutDayList`

- **File:** `src/features/calendar/components/__tests__/WorkoutDayList.test.tsx`
- **What:**
  - Test: renders list of workout items
  - Test: renders empty state with CTA
  - Test: tap workout calls onViewDetail
  - Test: tap "Start a Workout" calls onStartWorkout

---

## Phase 3: Integration into Home Tab

### Task 3.1 — Integrate into `home.tsx`

- **File:** `app/(tabs)/home.tsx`
- **What:**
  - Import `WeekCalendarSection` from `@/features/calendar/components/WeekCalendarSection`
  - Insert `<WeekCalendarSection />` after the "Assigned Today" chip and before "Quick Stats"
  - Wrap in a `<View className="mb-2">` for spacing
  - Verify existing content below still renders correctly (stats, actions, recent activity)
  - No changes to existing data fetching (useHomeStats stays)
  - Pull-to-refresh already handles `refetch()` — verify calendar refetches (React Query handles this automatically via query invalidation)

### Task 3.2 — Apply same integration to `index.tsx` (hidden route)

- **File:** `app/(tabs)/index.tsx`
- **What:**
  - Same import and insertion as Task 3.1
  - `index.tsx` is the hidden default route; keep in sync with `home.tsx`

---

## Phase 4: Verification

### Task 4.1 — TypeScript compilation check

- **Command:** `npx tsc --noEmit`
- **What:** Ensure zero type errors across all new and modified files

### Task 4.2 — Run test suite

- **Command:** `npx jest --passWithNoTests`
- **What:** All existing tests + new tests pass. Verify coverage threshold (80%).

### Task 4.3 — Check exports and imports

- **What:** Verify all barrel exports work — `src/features/calendar/components/` (add `WeekCalendarSection`, `WorkoutDayList`, `WorkoutDayItem` to exports if index.ts exists) and `src/features/calendar/hooks/` (add `useSessionsForDate`)

---

## Summary of New/Modified Files

| File | Action | Est. Lines |
|------|--------|-----------|
| `src/features/calendar/hooks/useSessionsForDate.ts` | CREATE | ~80 |
| `src/features/calendar/hooks/__tests__/useSessionsForDate.test.ts` | CREATE | ~80 |
| `src/features/calendar/components/WorkoutDayItem.tsx` | CREATE | ~40 |
| `src/features/calendar/components/WorkoutDayList.tsx` | CREATE | ~50 |
| `src/features/calendar/components/WeekCalendarSection.tsx` | CREATE | ~70 |
| `src/features/calendar/components/__tests__/WeekCalendarSection.test.tsx` | CREATE | ~60 |
| `src/features/calendar/components/__tests__/WorkoutDayList.test.tsx` | CREATE | ~40 |
| `app/(tabs)/home.tsx` | MODIFY | +5 |
| `app/(tabs)/index.tsx` | MODIFY | +5 |
| **Total** | | **~430** |
