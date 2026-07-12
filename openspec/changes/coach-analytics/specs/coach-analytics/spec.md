# Spec & Tasks: Coach Analytics Wellness

## Requirement
RQ-CAW-01: Coach analytics screen shall show a "Wellness" section below compliance with:
- Average sleep hours (last 7 days), fatigue score, soreness score, mood score
- Color-coded indicators (green ≥ 7h sleep, ≤ 3 fatigue, ≤ 3 soreness, ≥ 4 mood; amber/red otherwise)
- Comparison of current week vs historical averages (improving/declining arrows)
- Empty state when no wellness data exists

## Tasks
1. Add `pb.collection("daily_wellness").getList` query in the screen for the athleteId
2. Compute averages for last 7 days + all-time averages
3. Render wellness stats grid with color-coded indicators
4. Verify tsc + jest green
