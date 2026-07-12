# Proposal: Coach Dashboard — Multi-Athlete Summary

## Intent
Replace the current 3-stat banner in the coach athletes list with a real dashboard showing adherence, last workout, and basic alerts for all athletes.

## Scope
- Enhanced header stats: total athletes, active this week, avg compliance, total volume
- Per-athlete cards with: lastWorkoutDate (relative), thisWeekWorkouts, compliance bar
- Alert indicators: athlete inactive >7 days, compliance <50%
- Sort/filter: "Inactive" chip to filter by stale athletes

## Approach
Enhance the existing `CoachAthletesScreen` and `useCoachDashboard`. Data is already in `AthleteSummary`. Pure UI changes, no new hooks.
