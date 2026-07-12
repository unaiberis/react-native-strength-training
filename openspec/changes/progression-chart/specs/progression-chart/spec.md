# Spec: Progression Chart

## Requirements

1. RQ-PC-01: The system shall display a temporal progression chart on the Analytics tab showing volume and e1RM trends.
2. RQ-PC-02: The chart shall use `useProgression` data from the selected exercise.
3. RQ-PC-03: A bar chart shall display total volume per session over time.
4. RQ-PC-04: A line chart shall display estimated 1RM (e1RM) per session over time.
5. RQ-PC-05: When no progression data exists, the chart shall show an empty state message.
6. RQ-PC-06: The chart shall handle loading state with a skeleton placeholder.
7. RQ-PC-07: The chart shall be scrollable horizontally if more than 20 data points exist.
8. RQ-PC-08: The chart shall use the existing dark design tokens (background #050505, text #F4F4F2, titanium #B9B9B6).

## Scenarios

1. SC-PC-01: Given `useProgression` returns 10 sessions with e1RM and volume data, when the chart renders, it shall display both the bar chart (volume) and line chart (e1RM).
2. SC-PC-02: Given `useProgression` returns empty array, when the chart renders, it shall display "No progression data yet for this exercise."
3. SC-PC-03: Given the component is in loading state, when rendered, it shall display a skeleton placeholder.
4. SC-PC-04: Given there are 30 data points, when the chart renders, it shall be scrollable horizontally.
5. SC-PC-05: Given only one data point, when the chart renders, it shall display a single bar/point without dividing by zero.
