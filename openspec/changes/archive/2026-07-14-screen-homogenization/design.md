# Design: Screen Homogenization

## Technical Approach

Create a shared `ScreenLayout` wrapper component that standardizes padding, headers, loading/error/empty states, scroll behavior, pull-to-refresh, and bottom spacers across all 21 screen files. The migration follows the proposal's 5-chained-PR strategy, delivering independently revertible slices.

## Architecture Decisions

### Decision: ScreenLayout props shape

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Render prop (`children` only) | Simple but screens still manage all state | ❌ — too little value |
| Config object (`title`, `loading`, `error`, `empty`) | Declarative, readable | ✅ — chosen |
| Compound component (`<ScreenLayout.Header>`, `<ScreenLayout.Content>`) | Flexible but verbose | ❌ — over-engineered for this refactor |

**Rationale**: A single config interface covers 19/21 screens. The 2 outlier screens (ActiveWorkout, WorkoutComplete) pass `mode="none"` and handle their own layout, getting only GradientBackground + ErrorBoundary.

### Decision: Import path strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Fix all in one PR | Touches many files, high conflict risk | ❌ |
| Per-screen migration | Gradual, easy to review | ✅ — per the proposed chained PR strategy |

**Rationale**: Relative `../../../shared/ui/` imports in ExerciseList, ExerciseDetail, HistoryList, HistoryDetail, ActiveWorkout, WorkoutComplete, Profile, and `train.tsx` will be migrated to `@/` aliases in PR 2 (alongside ScreenLayout adoption). Coach screens and most new screens already use `@/`.

### Decision: Color token migration

| Token | Replace With | Prevalence |
|-------|-------------|------------|
| `surface-900` | `card` | 11 screens (cards, item backgrounds) |
| `surface-800` | `cardSoft` or `graphite` | 15 screens (chip backgrounds, borders) |
| `surface-700` | `border` | 8 screens (subtle borders, input backgrounds) |
| `surface-950` | `background` | 4 screens (containers) |
| `surface-50` | `text` | All screens (headings, body text) |
| `surface-100` | `text` | 12 screens (body text) |
| `surface-300` | `textMuted` | 6 screens (secondary labels) |
| `surface-400` | `textMuted` | 15 screens (tertiary text) |
| `surface-500` | `textSubtle` | 8 screens (placeholders, hints) |

**Rationale**: The design tokens (`text`, `textMuted`, `textSubtle`) already exist in AGENTS.md but are partially applied. The migration replaces raw surface-* classes with semantic v2 tokens across all screen files.

### Decision: Safe area strategy

Continue the existing pattern of manual `pt-*` top padding — do NOT introduce `SafeAreaView`. The ScreenLayout applies `paddingTop` via `useSafeAreaInsets()` (from `react-native-safe-area-context`) with a fallback of 64px. This maintains visual consistency and avoids wrapping GradientBackground in a View.

### Decision: Loading state pattern

| Screen Type | Default Loading Component |
|-------------|--------------------------|
| List/FlatList screens | `PageSkeleton` (from existing `SkeletonLoader`) |
| Detail/ScrollView screens | `ActivityIndicator` centered |
| Coach screens (with ErrorBoundary) | `PageSkeleton` inside ErrorBoundary |
| Tab screens (home, train) | Inline skeleton (existing pattern kept) |

Screens can override via `loadingComponent` prop.

### Decision: Error state pattern

ScreenLayout internally wraps content in `ErrorBoundary`. When `error` prop is set, renders the ErrorBoundary's default fallback (which includes a "Try Again" button wired to `onRetry`). For screens with custom error UIs (Analytics, Wellness), pass `errorMode="custom"` to suppress the default error overlay.

## Data Flow

No data flow changes — this is a pure UI refactor. Data fetching remains in hooks. ScreenLayout consumes only presentational props (isLoading, error, empty, onRefresh).

```
Hook (useExercises, useHistory, etc.)
  └─ returns { data, isLoading, error, refetch }
       └─ Screen converts to ScreenLayout props
            └─ ScreenLayout renders { loading, error, empty, children }
                 └─ ErrorBoundary → ScrollView/FlatList → Header + children + BottomSpacer
```

## Component: ScreenLayout

```typescript
// src/shared/ui/ScreenLayout.tsx

interface ScreenLayoutProps {
  children: ReactNode;
  mode?: "scroll" | "flatlist" | "none"; // default: "scroll"

  // Header
  title?: string;
  subtitle?: string;
  kicker?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;

  // States
  loading?: boolean;
  loadingComponent?: ReactNode;
  error?: Error | null;
  errorMessage?: string;
  onRetry?: () => void;
  empty?: {
    icon?: string;
    title: string;
    subtitle?: string;
    action?: { label: string; onPress: () => void };
  } | null;

  // Scroll
  onRefresh?: () => void;
  refreshing?: boolean;

  // Styling
  className?: string;
  contentContainerClassName?: string;
}
```

**Rendering logic:**

- **mode="scroll"** (default): GradientBackground → ErrorBoundary → View (safe padding) → ScrollView (refreshControl, showsVerticalScrollIndicator) → Header (kicker + ScreenTitle + actions) → children → bottom spacer h-8
- **mode="flatlist"**: GradientBackground → ErrorBoundary → View (safe padding) → Header → children (screen provides its own FlatList; LayoutBouncer not needed)
- **mode="none"**: GradientBackground → ErrorBoundary → children (for outlier screens like ActiveWorkout)

**When loading is true**: renders loadingComponent (default: centered ActivityIndicator for scroll, PageSkeleton for flatlist) instead of content.

**When error is non-null**: renders ErrorBoundary fallback with error message + "Try Again" button calling onRetry.

**When empty is set AND data is absent**: renders EmptyState component before children (used by FlatList screens via ListEmptyComponent).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/shared/ui/ScreenLayout.tsx` | **Create** | Shared layout wrapper component |
| `src/shared/ui/__tests__/ScreenLayout.test.tsx` | **Create** | Unit tests for ScreenLayout |
| `src/shared/ui/ScreenTitle.tsx` | Modify | Accept `accessibilityLabel` prop, v2 token overrides |
| `src/shared/ui/ErrorBoundary.tsx` | Modify | Add `onReset` callback type export |
| **12 screen files** (migration) | Modify | Adopt ScreenLayout + @/ imports + v2 tokens |
| `app/(tabs)/home.tsx` | Modify | Adopt ScreenLayout |
| `app/(tabs)/train.tsx` | Modify | Adopt ScreenLayout + @/ imports |
| Various `*Screen.tsx` files | Modify | Color token swap |

## Migration Strategy Per Screen

### Tier 1: FlatList screens (PR 1–2)

| Screen | Current Header | Changes Needed | Tailwind Surface Tokens |
|--------|---------------|----------------|------------------------|
| ExerciseListScreen | Title inline as heading | Add ScreenLayout with `mode="flatlist"`, wrap content, add `@/` imports | `surface-900→card`, `surface-800→cardSoft`, `surface-700→border` in CategoryChip, ExerciseItem |
| HistoryListScreen | Title inline as heading | Same pattern | `surface-900→card`, `surface-800→cardSoft` in SessionRow, FilterBar |
| WorkoutTemplateListScreen | ScreenTitle used | Already uses ScreenTitle — needs `@/` import check, token swap | Already v2 in most places |
| AssignedProgramsScreen | ScreenTitle used | Token swap only | Already v2 in most places |
| UnassignedProgramsScreen | ScreenTitle used | Token swap only | Already v2 in most places |

### Tier 2: ScrollView detail screens (PR 2–3)

| Screen | Current Header | Changes Needed | Surface Tokens |
|--------|---------------|----------------|----------------|
| ExerciseDetailScreen | Title inline as `Text` | Add ScreenLayout, swap title, add `@/` imports | `surface-800→cardSoft` in badge |
| HistoryDetailScreen | Title inline as `Text` | Same pattern | `surface-800→cardSoft` |
| ProfileScreen | Already uses ScreenTitle | Wrap ScrollView in ScreenLayout, consolidate padding | `surface-900→card` (minimal — mostly v2) |
| WellnessDashboardScreen | Title inline as h1 | Add ScreenLayout, use `title="Wellness"` | Already v2 |
| AnalyticsScreen | Title inline as h1 | Add ScreenLayout (with `errorMode="custom"` — Analytics has custom error UI) | Already v2 |
| ExerciseTimelineScreen | Title inline as h1 | Same as Analytics pattern | Already v2 |
| CalendarScreen | Already uses ScreenTitle | Wrap in ScreenLayout, add `mode="scroll"` | Already v2 |
| WorkoutBuilderScreen | Already uses ScreenTitle | Add ScreenLayout with `noPadding` (has custom padding) | Already v2 |

### Tier 3: Tab screens + outlier screens (PR 3)

| Screen | Current Pattern | Changes Needed |
|--------|----------------|----------------|
| home.tsx | Inline ErrorBoundary + GradientBackground + ScrollView | Replace with ScreenLayout |
| train.tsx | Same pattern | Replace with ScreenLayout, fix `../../src/` imports to `@/` |

### Tier 4: Outlier screens (PR 4 — minimal ScreenLayout integration)

| Screen | Reason for "none" mode | Changes Needed |
|--------|----------------------|----------------|
| ActiveWorkoutScreen | Custom top bar, custom header, multi-section layout | Wrap in ScreenLayout `mode="none"` — gets GradientBackground + ErrorBoundary only |
| WorkoutCompleteScreen | Full-screen celebration layout | Same — `mode="none"` |
| SelfAssessmentScreen | Uses custom padding `pt-[80px]` | Wrap in ScreenLayout `mode="scroll"`, adjust padding |
| AssessmentResultsScreen | Uses `pt-[80px]`, custom content | Wrap in ScreenLayout `mode="scroll"` |

## Chained PR Breakdown

### PR 1: ScreenLayout + Card migration (~320 lines)

**Scope**: New ScreenLayout component, LoadingState, ScreenTitle accessibility, ErrorBoundary `onReset` export. Unit tests for ScreenLayout. Also migrate `Card` component's remaining surface-700/800 tokens to v2.

**Start**: No ScreenLayout exists.
**Finish**: ScreenLayout with tests, Card migrated.
**Verify**: `npx jest --testPathPattern="ScreenLayout"`, `npx tsc --noEmit`.
**Rollback**: Revert PR. No screens depend on ScreenLayout yet.

### PR 2: Import paths + ScreenTitle adoption (~380 lines)

**Scope**: Migrate 8 screens from relative `../../../shared/ui/` to `@/` aliases. Add ScreenLayout to screens that don't use ScreenTitle yet (ExerciseList, ExerciseDetail, HistoryList, HistoryDetail, Wellness, Analytics, ExerciseTimeline, home, train). Token map applied on migrated lines.

**Start**: All screens work with relative imports.
**Finish**: 10 screens use `@/` and ScreenLayout.
**Verify**: `npx jest`, `npx tsc --noEmit`, manual check of home + train.
**Rollback**: Revert PR. PR 1 components remain.

### PR 3: Color tokens migration (~350 lines)

**Scope**: Replace all remaining `surface-900→card`, `surface-800→cardSoft`, `surface-700→border`, `surface-50→text`, `surface-100→text`, `surface-300→textMuted`, `surface-400→textMuted`, `surface-500→textSubtle` across all screen files. This is a mechanical search-and-replace across ~15 files.

**Start**: Mix of legacy surface-* and v2 tokens.
**Finish**: Zero `surface-*` tokens in screen files (shared UI components keep surface-* if needed internally).
**Verify**: `npx jest`, `npx tsc --noEmit`, visual check of 3 key screens (Calendar, Analytics, Profile).
**Rollback**: Revert PR. All screens still compile with either token set.

### PR 4: Error/loading/empty + accessibility (~280 lines)

**Scope**: Standardize all loading states to ScreenLayout's pattern. Add `accessibilityLabel` to every ScreenLayout title (via ScreenTitle prop). Wire `ErrorBoundary` fallback for screens that lack it. Ensure `EmptyState` component is used everywhere (replacing inline empty JSX in ExerciseList, HistoryDetail, etc.).

**Start**: Inconsistent error/loading/empty patterns.
**Finish**: All screens use ScreenLayout's state props. All titles have accessibilityLabel.
**Verify**: `npx jest --coverage` (verify coverage thresholds), manual VoiceOver spot-check on 2 screens.
**Rollback**: Revert PR. State standardization is additive — old patterns still work.

### PR 5: Polish — pull-to-refresh, bottom spacers, ScrollView wrappers (~200 lines)

**Scope**: Add pull-to-refresh to screens missing it (Profile, WellnessDashboard, ExerciseDetail, HistoryDetail). Standardize bottom spacer pattern (ScreenLayout auto-appends bottom spacer, remove manual `View className="h-8"`). Fix remaining `ScrollView` wrapper inconsistencies.

**Start**: Gaps in pull-to-refresh; manual bottom spacers.
**Finish**: All scrollable screens have pull-to-refresh. No manual bottom spanner in screens.
**Verify**: `npx jest`, manual check of Profile pull-to-refresh + bottom spacing.
**Rollback**: Revert PR. All screens functional without these enhancers.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | ScreenLayout | `render` with different prop combinations. Verify loading/error/empty states render correct fallbacks. Verify ScrollView vs FlatList mode. Verify header renders ScreenTitle. |
| Unit | ScreenTitle | Accessibility label test |
| Unit | ErrorBoundary integration | Inject error in child, verify fallback renders + retry works |
| Regression | All migrated screens | `npx jest` must pass (100% migration coverage). Screen snapshot comparison for 3 key screens. |

## Rollback Plan

| PR | Independent Revert? | Downstream Impact |
|----|--------------------|-------------------|
| PR 1 | ✅ Yes | No screens depend on ScreenLayout yet |
| PR 2 | ✅ Yes | Screens go back to relative imports; ScreenLayout remains unused |
| PR 3 | ✅ Yes | Screens go back to legacy tokens; all compile |
| PR 4 | ✅ Yes | States go back to inline patterns; screens still compile |
| PR 5 | ✅ Yes | Missing pull-to-refresh and manual spacers — non-breaking |

Per-PR manual check: build the app (`npx expo export`), spot-check 2 screens per PR.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Open Questions

- None — the proposal, codebase audit, and this design resolve all known questions. Each PR's implementation can resolve per-screen edge cases during migration.

## Success Criteria (from proposal)

- [ ] All 12+ screens use ScreenLayout (zero inline SafeAreaView/GradientBackground/ScrollView)
- [ ] All screens use `@/` alias imports
- [ ] All screens use v2 tokens (no `surface-*` legacy tokens)
- [ ] All screens have `accessibilityLabel` on title
- [ ] All scrollable screens have pull-to-refresh
- [ ] States use shared components (EmptyState, SkeletonLoader, LoadingState)
- [ ] All screens include bottom spacer (via ScreenLayout)
- [ ] `npx jest` passes; `npx tsc --noEmit` passes
