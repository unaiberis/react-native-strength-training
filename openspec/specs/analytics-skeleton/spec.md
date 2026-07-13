# AnalyticsSkeleton Specification

## Purpose

Structured loading placeholder for AnalyticsScreen that mirrors the loaded layout — header, period toggle, stat cards, chart, and exercise list — replacing the current 3 generic SkeletonCard components that bear no visual resemblance to the loaded state.

## Requirements

### Requirement: AnalyticsSkeleton Visual Structure

The `AnalyticsSkeleton` component SHALL render a skeleton layout that visually mirrors the loaded AnalyticsScreen layout.

#### Scenario: Full skeleton renders all sections

- GIVEN AnalyticsScreen is in `isLoading` state
- WHEN the skeleton renders
- THEN it displays: header bar, subtitle bar, period toggle bar, 3 stat card skeletons, chart card skeleton, exercise list skeleton (3 items), and bottom spacer

#### Scenario: Stat cards are arranged in a horizontal row

- GIVEN the skeleton renders
- WHEN stat card skeletons are displayed
- THEN they occupy a `flex-row gap-3` container with 3 `flex-1` cards

#### Scenario: Chart card has a title bar and chart area placeholder

- GIVEN the skeleton renders
- WHEN the chart section is displayed
- THEN a card with a title bar (40% width, 18h) and a chart area bar (100% width, 120h) are shown inside a `bg-card rounded-2xl p-4 border border-border` container

#### Scenario: Exercise list shows 3 item rows

- GIVEN the skeleton renders
- WHEN the exercise list section is displayed
- THEN 3 exercise item rows are shown, each containing a name bar (60% width, 16h) and a details bar (30% width, 12h) inside a `bg-card rounded-2xl p-4 mb-3 border border-border` container

### Requirement: AnalyticsSkeleton Props Interface

The component SHALL accept a single optional `className` prop for external style overrides.

#### Scenario: Default render with no props

- GIVEN `<AnalyticsSkeleton />` is rendered
- WHEN no props are provided
- THEN the skeleton renders with default structure and no styling overrides

#### Scenario: className prop is passed through

- GIVEN `<AnalyticsSkeleton className="mt-8" />` is rendered
- WHEN the component mounts
- THEN the className is applied to the outermost container View

### Requirement: SkeletonBar Dimensions Per Section

Each skeleton section SHALL use specific SkeletonBar widths and heights to match the loaded layout proportions.

| Section | Element | Width | Height | Notes |
|---------|---------|-------|--------|-------|
| Header | Title bar | 50% | 28 | Matches 34px title font |
| Header | Subtitle bar | 30% | 14 | Matches sm subtitle |
| Toggle | Toggle bar | 120px | 44 | Self-start, card bg, rounded-xl |
| Stat cards | Value bar | 60% | 24 | Inside each flex-1 card |
| Stat cards | Label bar | 80% | 12 | Below value bar |
| Chart | Title bar | 40% | 18 | Inside chart card |
| Chart | Chart area | 100% | 120 | Inside chart card |
| Exercise | Name bar | 60% | 16 | Inside exercise row |
| Exercise | Details bar | 30% | 12 | Inside exercise row |

#### Scenario: Stat card has two bars

- GIVEN a stat card skeleton is rendered
- WHEN viewed
- THEN it contains a value bar (60%, 24h) and a label bar (80%, 12h) stacked vertically with 4px gap

#### Scenario: Exercise row has two bars side by side

- GIVEN an exercise row skeleton is rendered
- WHEN viewed
- THEN it contains a name bar and details bar in a `flex-row justify-between items-center` layout

### Requirement: Integration Point in AnalyticsScreen

The AnalyticsScreen loading state (lines 85-97) SHALL render `<AnalyticsSkeleton />` instead of the 3 `SkeletonCard` calls.

#### Scenario: Loading state shows AnalyticsSkeleton

- GIVEN `useAnalytics` returns `isLoading: true`
- WHEN AnalyticsScreen renders the loading branch
- THEN `<AnalyticsSkeleton />` is rendered inside `<ErrorBoundary><GradientBackground>`

#### Scenario: Loading state does not show PersonalRecordsSection

- GIVEN `isLoading: true`
- WHEN the loading branch renders
- THEN PersonalRecordsSection is NOT rendered (it loads independently)

### Requirement: Import Update in AnalyticsScreen

AnalyticsScreen SHALL import `AnalyticsSkeleton` from `@/shared/ui/SkeletonLoader` instead of `SkeletonCard`.

#### Scenario: No import of SkeletonCard remains

- GIVEN AnalyticsScreen is updated
- WHEN imports are checked
- THEN `SkeletonCard` is NOT imported and `AnalyticsSkeleton` IS imported from `@/shared/ui/SkeletonLoader`
