# Design: Home / Calendario — Weekly Calendar in the Athlete Home Tab

## Architecture Decision: Calendar Section Inside Home Tab

**Decision:** Add a `WeekCalendarSection` component as a section inside the existing `home.tsx` screen, positioned below the greeting and above Quick Stats.

**Alternatives considered:**
| Approach | Pros | Cons |
|----------|------|------|
| New Calendar tab | Already exists (`app/(tabs)/calendar.tsx` with `CalendarScreen`) | Not the "Home" — user asked for calendar in home |
| Replace home content entirely | Clean slate for calendar | Loses stats + recent activity that athletes depend on |
| **Section in home (chosen)** | Preserves existing home content; calendar is the hero element; no new tab/route needed | Home becomes longer — mitigated by ScrollView |

**Rationale:**
- The gap in the project says "Home / Calendario ❌ No existe" — it's the Home that needs a calendar
- The existing `CalendarScreen` at `src/features/calendar/screens/CalendarScreen.tsx` is a full dedicated screen with month/week toggle, useful for deep browsing
- The Home tab needs a **compact weekly preview** — the `WeekCalendarSection` is a different use case
- No navigation structure changes needed

## Component Tree

```
app/(tabs)/home.tsx (or index.tsx)
├── ScrollView
│   ├── Greeting ("Welcome back, {name}")
│   ├── Assigned Today chip (existing, conditional)
│   ├── WeekCalendarSection (NEW)
│   │   ├── WeekStrip (EXISTING — reused from src/features/calendar/components/)
│   │   ├── WorkoutDayList (NEW)
│   │   │   └── WorkoutDayItem (NEW) × N
│   │   │       └── Navigate onPress → router.push(path)
│   │   └── EmptyState (when no workouts, EXISTING from shared/ui/)
│   ├── Quick Stats (existing)
│   ├── Quick Actions (existing)
│   └── Recent Activity (existing)
```

## Data Flow

```
useWeekCalendar()                    useSessionsForDate(selectedDate)
     │                                       │
     │  weekDays, isLoading                  │  data: WorkoutSummary[]
     │  selectedDate, selectDate             │  isLoading, refetch
     │  goToPrevWeek, goToNextWeek           │
     │  goToToday, weekLabel                 │
     └──────────────┬────────────────────────┘
                    │
         WeekCalendarSection
         ├── passes weekDays → WeekStrip
         └── passes selectedDate → useSessionsForDate → WorkoutDayList
```

### New Hook: `useSessionsForDate`

```typescript
// src/features/calendar/hooks/useSessionsForDate.ts

interface WorkoutSummary {
  id: string;
  templateName: string | null;
  status: "assigned" | "active" | "completed";
  startedAt: string | null;
  durationMinutes: number | null;
  exerciseCount: number;
}

function useSessionsForDate(date: string | null): {
  sessions: WorkoutSummary[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}
```

**Behavior:**
- `date` param comes from `useWeekCalendar().selectedDate`
- Passes through to TanStack Query with key `["sessions-for-date", date, userId]`
- On native: queries local SQLite `workout_sessions` table (same pattern as `fetchWeekSessionsFromLocal`)
- On web: queries PocketBase `workout_sessions` collection (same pattern as `fetchSessionsForDate` in `useCalendar.ts`)
- Returns empty array when `date` is null
- `staleTime: 60_000` (1 minute)

### New Hook: `useAssignedSessionsForDate`

For displaying **assigned** (coach-created) workouts that haven't started yet, we need a companion data source. The `useAthleteAssignments` hook provides `currentProgram` and `upcomingPrograms` with `startDate` fields.

```typescript
// src/features/calendar/hooks/useSessionsForDate.ts

function useAssignedSessionsForDate(date: string): WorkoutSummary[]
```

This filters `useAthleteAssignments` results where `startDate === date` and maps them to `WorkoutSummary` shape. It reuses the already-mounted `useAthleteAssignments` hook so there's no additional network call.

The `useSessionsForDate` hook combines both data sources:
1. Completed/active sessions from SQLite or PocketBase
2. Assigned (not started) sessions from the assignment data

## New Components

### `WorkoutDayItem`
- Location: `src/features/calendar/components/WorkoutDayItem.tsx`
- Props: `workout: WorkoutSummary`, `onPress: () => void`
- Renders: card with icon, name, status badge, duration/exercise count
- Status badge colors: assigned → titanium border, active → titanium fill, completed → sacred (green) fill

### `WorkoutDayList`
- Location: `src/features/calendar/components/WorkoutDayList.tsx`
- Props: `sessions: WorkoutSummary[]`, `emptyMessage?: string`, `onStartWorkout: () => void`
- Renders: list of `WorkoutDayItem` or `EmptyState`
- Uses FlatList for performance

### `WeekCalendarSection`
- Location: `src/features/calendar/components/WeekCalendarSection.tsx`
- Props: none (self-contained — uses hooks internally)
- Composes:
  - `useWeekCalendar()` for week data
  - `useSessionsForDate()` for selected day's sessions
  - `WeekStrip` component
  - `WorkoutDayList` component
  - Today button
- Handles: loading state (skeleton), empty state, error state

## Navigation Wiring

| User Action | Navigation Call |
|-------------|----------------|
| Tap completed workout | `router.push("/history/${session.id}")` |
| Tap active workout | `router.push("/(workout)/active")` with session ID params |
| Tap assigned workout | `router.push("/(tabs)/train")` |
| Tap "Start a Workout" (empty state) | `router.push("/(tabs)/train")` |

## File Structure

```
src/features/calendar/
├── hooks/
│   ├── useWeekCalendar.ts          (EXISTING)
│   ├── useCalendar.ts              (EXISTING)
│   ├── useSessionsForDate.ts       (NEW)
│   └── __tests__/
│       ├── useWeekCalendar.test.ts (EXISTING)
│       └── useSessionsForDate.test.ts (NEW)
├── components/
│   ├── WeekStrip.tsx               (EXISTING)
│   ├── DayDetail.tsx               (EXISTING — not reused, kept for CalendarScreen)
│   ├── CalendarGrid.tsx            (EXISTING)
│   ├── WeekCalendarSection.tsx     (NEW)
│   ├── WorkoutDayList.tsx          (NEW)
│   ├── WorkoutDayItem.tsx          (NEW)
│   └── __tests__/
│       ├── WeekCalendarSection.test.tsx (NEW)
│       └── WorkoutDayList.test.tsx      (NEW)
├── screens/
│   └── CalendarScreen.tsx          (EXISTING — unchanged)

app/(tabs)/
├── home.tsx                        (MODIFIED — add WeekCalendarSection)
├── index.tsx                       (MODIFIED — add WeekCalendarSection, same change)
└── calendar.tsx                    (UNCHANGED)
```

## Theming

All new components MUST use the existing design tokens from the project (NativeWind utility classes mapped to TheHybridProject palette):

- Background: `bg-card` for cards, `bg-cardSoft` for secondary surfaces
- Borders: `border border-border`
- Text: `text-surface-50` primary, `text-surface-400` secondary, `text-surface-500` muted
- Accents: `bg-titanium` for selected/highlighted, `text-titanium` for accents
- Success: `bg-sacred` for completed states (check with existing color, likely a green)
- Border radius: `rounded-xl` (12px) for cards, `rounded-full` for circles
- Typography: `text-sm font-semibold`, `text-xs font-semibold`, `text-lg font-bold`

## State Management

| State | Source | Type |
|-------|--------|------|
| Week days + indicators | `useWeekCalendar` hook | TanStack Query + derived state |
| Selected date | `useWeekCalendar` | Local state in hook |
| Sessions for selected date | `useSessionsForDate` hook | TanStack Query |
| Loading (week) | `useWeekCalendar().isLoading` | Boolean |
| Loading (sessions) | `useSessionsForDate().isLoading` | Boolean |
| Pull-to-refresh | `home.tsx` RefreshControl | Local state |

## Performance Considerations

- `WeekStrip` is already `memo`-ized (DayCell is `memo`)
- `WorkoutDayItem` SHALL be `React.memo` wrapped
- `WorkoutDayList` SHALL use `FlatList` instead of `ScrollView` children for list rendering
- React Query `staleTime: 60_000` prevents refetch on rapid week nav
- No unnecessary re-renders: `WeekCalendarSection` only re-renders when `selectedDate` or `sessions` change

## Rollback

Revert `home.tsx` and `index.tsx` changes, delete new files:
```
git checkout -- app/(tabs)/home.tsx app/(tabs)/index.tsx
rm src/features/calendar/hooks/useSessionsForDate.ts
rm src/features/calendar/components/WeekCalendarSection.tsx
rm src/features/calendar/components/WorkoutDayList.tsx
rm src/features/calendar/components/WorkoutDayItem.tsx
```
