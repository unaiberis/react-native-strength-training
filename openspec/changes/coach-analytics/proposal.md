# Proposal: Coach Analytics — Wellness Integration

## Intent
Add a wellness section to the existing per-athlete coach analytics screen, showing sleep, fatigue, soreness, and mood trends using PocketBase `daily_wellness` data.

## Scope
- Add inline wellness query to `CoachAnalyticsScreen` (using `pb.collection("daily_wellness").getList`)
- Display recent sleep/fatigue/soreness/mood as a simple stats grid
- Show comparison: current week average vs overall average (like athlete's own view)
- No changes to existing hooks
