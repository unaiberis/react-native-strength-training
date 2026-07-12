# Design: Coach Dashboard

## Component Changes
- Enhance `app/(coach)/athletes.tsx` header: 4 stat cards instead of 3 (add Avg Compliance + Total Volume)
- Add `CoachDashboardHeader` component inline or extracted
- Enhance athlete card: last workout relative date, this week workouts, compliance bar, alert badges
- Alert badge logic: `>7 days since last workout` or `thisWeekWorkouts === 0` → "Inactive" warning

## Data
All data from `useCoachDashboard` → `AthleteSummary[]`. No new queries.

## Alert Logic
- Inactive: `!lastWorkoutDate || daysSinceLastWorkout > 7 || thisWeekWorkouts === 0`
- Low compliance: `complianceRate < 0.5`
