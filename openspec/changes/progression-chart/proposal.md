# Proposal: Progression Chart — Temporal Evolution Graph

## Intent

The app tracks personal records (PRs) and volume progression via `useProgression`, but there is no visual chart showing how these evolve over time. This change adds a lightweight SVG-based chart component that renders progression data as a temporal graph, displayed on the Analytics tab and optionally in ExerciseDetailScreen.

## Scope

### In
- Create `ProgressionChart` shared component (SVG-based line/bar chart)
- Integrate into Analytics screen below the Personal Records section
- Show volume-over-time (bar chart, weekly buckets)
- Show e1RM-over-time (line chart, per session)
- Handle loading, empty, and error states
- Use `useProgression` data as source

### Out
- Coach-specific analytics views (deferred to Item 5)
- Multiple exercise comparison
- Month/year filtering (shows last 90 days by default)

## Approach

Use `react-native-svg` to draw a compact, dark-themed chart. No external charting library. Pure SVG: `<Svg>`, `<Line>`, `<Rect>`, `<Text>` elements.

## Risks

| Risk | Mitigation |
|------|-----------|
| SVG rendering differences on web vs native | `react-native-svg` is cross-platform; test on both |
| Performance with many data points | `react-native-svg` handles up to ~200 points fine; cap at 90 days |
