# Spec: Coach Dashboard

## Requirements
1. RQ-CD-01: The dashboard header shall display total athletes, active this week, average compliance rate, and total volume.
2. RQ-CD-02: Each athlete card shall show: name, email, last workout date (relative like "2 days ago" or "Never"), this week workouts count, compliance rate as a progress bar.
3. RQ-CD-03: Athletes inactive >7 days shall show a "⚠ Inactive" badge.
4. RQ-CD-04: Athletes with compliance <50% shall show a ⚠ alert with their compliance.
5. RQ-CD-05: Navigation shall be: tap athlete → profile, calendar button, analytics button.

## Scenarios
1. SC-CD-01: Given 5 athletes with varying activity, the dashboard header shows correct counts and averages.
2. SC-CD-02: Given an athlete with last workout 10 days ago, a warning badge "⚠ Inactive 10d" appears.
3. SC-CD-03: Given an athlete with compliance 35%, a red badge "⚠ 35% compliance" appears.
4. SC-CD-04: Given no athletes, the empty state shows "No Athletes Yet".
5. SC-CD-05: Given the dashboard is loaded, tapping an athlete navigates to their profile.
