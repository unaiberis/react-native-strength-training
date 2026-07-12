# Design: Progression Chart

## Component Tree

```
ProgressionChart (src/shared/ui/ProgressionChart.tsx)
├── SkeletonChart (when loading)
├── EmptyState (when no data)
└── Chart (main render)
    ├── SVG container (width by data points, min full screen)
    ├── Y-axis labels + grid lines (volume or e1RM)
    ├── Bar series (weekly volume — titanium bars)
    ├── Line series (e1RM — connected dots)
    └── X-axis date labels (every 7 days)
```

## Data Flow

`useProgression(exerciseId)` returns `{ data: ProgressionDataPoint[], isLoading, error }`.

`ProgressionChart` receives the progression data and renders the chart:
- Map data points to SVG x/y coordinates
- Compute Y-axis max from data range
- Render bars + line over a shared x-axis

## Integration

- Add `ProgressionChart` to the Analytics screen below the Personal Records section
- Pass exercise ID from the URL params or selected exercise
- Reuse existing `useProgression` hook

## Styling

- Bar fill: titanium (#B9B9B6) with 0.6 opacity
- Line stroke: surface-50 (#F4F4F2), width 2
- Dot fill: surface-50
- Grid lines: surface-800 (#2C2C2E), dashed
- Chart padding: 16px left (axis), 8px right, 8px top, 24px bottom
- Height: 200px
