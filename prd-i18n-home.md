# PRD: i18n — Wrap hardcoded UI strings in translation calls

## Problem

Several screens in the app display hardcoded English strings that bypass the Lingui i18n system. Despite the i18n infrastructure being in place (Lingui v6 with `t` macro, active Spanish catalog), these texts never get translated:

- Home screen (`app/(tabs)/home.tsx`) — no `t` import, all strings hardcoded
- Calendar empty states (`WorkoutDayList.tsx`, `DayDetail.tsx`) — all strings hardcoded
- Analytics screen (`AnalyticsScreen.tsx`) — StatCard labels hardcoded
- Train screen (`train.tsx`) — empty state strings hardcoded
- Notification screens — ScreenTitle and EmptyState strings hardcoded

## Scope

### Files to modify

| File | Texts to wrap |
|---|---|
| `app/(tabs)/home.tsx` | "Welcome back, {name}", "Ready to train?", "Quick Stats", "Workouts" (StatCard label), "Sets", "This Week", "History" (quick action button), "Past", "Recent Activity" (Card title), "Complete a workout to see your recent activity." |
| `app/(tabs)/train.tsx` | "No training scheduled for today", "Your coach will assign training for today's workout...", "Start Workout" |
| `app/(tabs)/notifications.tsx` | ScreenTitle "Notifications" (×2), EmptyState "No notifications yet" |
| `app/(tabs)/notification/[id].tsx` | ScreenTitle "Notification" |
| `src/features/calendar/components/WorkoutDayList.tsx` | "Rest day — No workout scheduled", "Rest days are part of the plan. Stay ready.", "Start a Workout" |
| `src/features/calendar/components/DayDetail.tsx` | "No Workout Scheduled", "Rest days are part of the plan. Stay ready.", "Start a Workout", "Free Workout", "Completed", "In Progress", "View Details", "Start Workout", "Volume", "PRs" |
| `src/features/analytics/screens/AnalyticsScreen.tsx` | "Total Volume" (StatCard label), "Workouts" (StatCard label), "Exercises" (StatCard label), "Weekly Volume", "Monthly Volume", "Exercise Progress" (heading), "Start Workout" (EmptyState action), empty state subtitle "Complete some workouts to see your progress." |
| `src/features/history/screens/HistoryListScreen.tsx` | "No workouts yet" (empty state) |
| `app/_layout.tsx` | "Welcome back!" |

### What to do per file

1. Add `import { t } from "@lingui/core/macro";` if not already present
2. Wrap every user-facing string literal with `` t`...` ``
3. For strings with interpolations like `"Welcome back, {displayName}"` → convert to `` t`Welcome back, ${displayName}` ``
4. For props like `title="X"`, `label="X"`, `subtitle="X"` → pass `` t`X` ``
5. For StaticCard labels like `label="Workouts"` → `label={t`Workouts`}`
6. For `block`/`blocks` plural: `` t`${workout.blockCount} block` `` + `` t`${workout.blockCount} blocks` `` or handle via conditional
7. For `session.exerciseCount` plural (home.tsx line 207): `` t`${session.exerciseCount} exercise` `` + `` t`${session.exerciseCount} exercises` ``

### After wrapping

8. Run `npx lingui extract` to update the English catalog
9. Verify `src/i18n/locales/en/messages.js` has new entries
10. Add Spanish translations in `src/i18n/locales/es/messages.js`
11. Run `npx tsc --noEmit` and `npx jest` — all tests must pass

## Acceptance criteria

- [ ] Home screen texts translate to Spanish when locale is "es"
- [ ] Calendar empty states translate to Spanish
- [ ] Analytics screen StatCard labels translate
- [ ] Train screen empty state translates
- [ ] Notification screen titles translate
- [ ] No TypeScript errors
- [ ] All existing tests pass (116 suites, 1289 tests)
- [ ] Updated tests reflect translated text when needed (tests that `getByText("X")` need to be updated if the component no longer renders the hardcoded string)

## Non-goals

- Do NOT modify the i18n infrastructure (config.ts, macro-runtime.ts, etc.)
- Do NOT change English source strings unless necessary for plural handling
- Do NOT refactor components deeper than adding `t` calls
- Do NOT touch files that already use `t` (auth screens, profile screens, CalendarGrid, etc.)
