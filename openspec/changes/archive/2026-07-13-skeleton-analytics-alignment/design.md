# Design: Skeleton Analytics Alignment

## Technical Approach

Refactor `SkeletonLoader.tsx` to use a single shared `Animated.Value` for all pulse animations, then add a new `AnalyticsSkeleton` composite component that mirrors the AnalyticsScreen loaded layout. Replace the 3 generic `SkeletonCard` calls in AnalyticsScreen with the new component. Delete the legacy `SkeletonCard.tsx` file (zero consumers confirmed).

## Architecture Decisions

### Decision: Module-level shared Animated.Value

**Choice**: Create a single `Animated.Value` at module scope, started by a `useEffect` in a thin wrapper component, and consumed by `SkeletonPulse` via `style` prop.

**Alternatives considered**:
- Context provider: Overkill — adds provider nesting, re-render risk, and no benefit since animation is module-scoped.
- Refs + imperative API: More complex, harder to compose, breaks declarative pattern.

**Rationale**: Follows the existing `SkeletonPulse` pattern (already uses `useRef` + `useEffect`). Moving the value and loop to module scope eliminates 7+ independent loops with zero API change to consumers.

### Decision: AnalyticsSkeleton as composite in SkeletonLoader.tsx

**Choice**: Add `AnalyticsSkeleton` export to the existing `SkeletonLoader.tsx` file (follows `DashboardSkeleton` / `PageSkeleton` pattern).

**Alternatives considered**:
- Separate file: Breaks the pattern — `DashboardSkeleton` and `PageSkeleton` live in the same file.
- Inline in AnalyticsScreen: Violates SRP, duplicates skeleton logic.

**Rationale**: Consistent with existing convention. All skeleton composites live in `SkeletonLoader.tsx`.

### Decision: Delete SkeletonCard.tsx (not refactor)

**Choice**: Remove `src/shared/ui/SkeletonCard.tsx` entirely.

**Rationale**: Zero consumers — grep confirms all 4 import sites (`AnalyticsScreen`, `CalendarScreen`, `DashboardSkeleton` internals, `PageSkeleton` internals) use `@/shared/ui/SkeletonLoader`, not the legacy file.

## Data Flow

```
AnalyticsScreen
  └── isLoading? → <AnalyticsSkeleton /> (from SkeletonLoader.tsx)
                       └── uses SkeletonBar (shared Animated.Value)
                       └── uses SkeletonCircle (shared Animated.Value)
                       └── plain Views for layout containers
```

Single animation loop:
```
Module scope: Animated.Value (opacity)
  └── Animated.loop(Animated.sequence([...timings...]))
  └── Shared by all SkeletonPulse instances via style prop
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/shared/ui/SkeletonLoader.tsx` | Modify | (1) Lift `Animated.Value` + loop to module scope. (2) Refactor `SkeletonPulse` to consume shared value. (3) Add `AnalyticsSkeleton` export. |
| `src/features/analytics/screens/AnalyticsScreen.tsx` | Modify | Replace `SkeletonCard` import with `AnalyticsSkeleton`. Replace 3 `SkeletonCard` calls (lines 90-92) with single `<AnalyticsSkeleton />`. |
| `src/shared/ui/SkeletonCard.tsx` | Delete | Legacy file with zero consumers. |

### SkeletonLoader.tsx — Detailed Changes

**1. Module-level animation (after imports, before types)**

```typescript
// ─── Shared Skeleton Animation ─────────────────────────────────────────────
// Single Animated.Value shared by all SkeletonPulse instances.
// Reduces N independent Animated.loop calls to 1.

const sharedOpacity = new Animated.Value(0.3);

Animated.loop(
  Animated.sequence([
    Animated.timing(sharedOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }),
    Animated.timing(sharedOpacity, {
      toValue: 0.3,
      duration: 800,
      useNativeDriver: true,
    }),
  ]),
).start();
```

**2. SkeletonPulse refactor (remove internal Animated.Value)**

```typescript
function SkeletonPulse({ className, style }: SkeletonBaseProps) {
  // No longer creates own Animated.Value — uses shared module-level value
  return (
    <Animated.View
      className={`bg-surface-700 rounded-lg ${className ?? ""}`}
      style={StyleSheet.flatten([{ opacity: sharedOpacity }, style])}
    />
  );
}
```

**3. AnalyticsSkeleton component (after DashboardSkeleton)**

```typescript
interface AnalyticsSkeletonProps {
  className?: string;
}

export function AnalyticsSkeleton({ className }: AnalyticsSkeletonProps) {
  return (
    <View className={`flex-1 px-4 pt-16 ${className ?? ""}`}>
      {/* Header */}
      <SkeletonBar width="50%" height={28} className="mb-6" />
      <SkeletonBar width="30%" height={14} className="mb-6" />

      {/* Period toggle placeholder */}
      <SkeletonBar width={120} height={44} className="mb-6 self-start" />

      {/* Stat cards — 3 in a row */}
      <View className="flex-row gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <View key={i} className="flex-1 bg-card rounded-2xl p-4 items-center border border-border">
            <SkeletonBar width="60%" height={24} className="mb-1" />
            <SkeletonBar width="80%" height={12} />
          </View>
        ))}
      </View>

      {/* Chart card */}
      <View className="bg-card rounded-2xl p-4 mb-4 border border-border">
        <SkeletonBar width="40%" height={18} className="mb-3" />
        <SkeletonBar width="100%" height={120} />
      </View>

      {/* Exercise list title */}
      <SkeletonBar width="35%" height={20} className="mb-3" />

      {/* Exercise list items */}
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          className="bg-card rounded-2xl p-4 mb-3 border border-border min-h-[60px] justify-center"
        >
          <View className="flex-row justify-between items-center">
            <SkeletonBar width="60%" height={16} />
            <SkeletonBar width="30%" height={12} />
          </View>
        </View>
      ))}

      {/* Bottom spacer */}
      <View className="h-8" />
    </View>
  );
}
```

### AnalyticsScreen.tsx — Import and Render Changes

**Import (line 7)**:
```diff
- import { SkeletonCard } from "@/shared/ui/SkeletonLoader";
+ import { AnalyticsSkeleton } from "@/shared/ui/SkeletonLoader";
```

**Loading state (lines 86-97)**:
```diff
  if (isLoading) {
    return (
      <ErrorBoundary>
        <GradientBackground>
-         <View className="flex-1 px-4 pt-16">
-           <SkeletonCard lines={2} className="mb-6" />
-           <SkeletonCard lines={4} className="mb-4" />
-           <SkeletonCard lines={3} lastLineWidth="45%" />
-         </View>
+         <AnalyticsSkeleton />
        </GradientBackground>
      </ErrorBoundary>
    );
  }
```

## Interfaces / Contracts

No new types. `AnalyticsSkeleton` accepts the same optional `className` prop as `DashboardSkeleton` and `PageSkeleton`.

```typescript
interface AnalyticsSkeletonProps {
  className?: string;
}
```

## Animation Implementation

| Aspect | Value |
|--------|-------|
| Opacity range | 0.3 → 1.0 → 0.3 |
| Duration per phase | 800ms |
| Total loop | 1600ms |
| useNativeDriver | `true` (all timing animations) |
| Instances | 1 loop, shared by all `SkeletonPulse` renders |

**Lifecycle**: The `Animated.loop().start()` call runs at module load time. Since `SkeletonLoader.tsx` is a module (not a component), the loop runs as long as the module is loaded. This is correct — skeleton components only render when the module is imported, and the loop is lightweight (single native-driver timing).

**Edge case**: If no skeleton components are mounted, the loop still runs but `sharedOpacity` updates are batched by the native driver with no visible effect. Acceptable overhead (~0 CPU on native thread).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `AnalyticsSkeleton` renders without crashing | Render in test, assert no error |
| Unit | `AnalyticsSkeleton` renders all 7 sections | Query for expected View/SkeletonBar structure |
| Unit | `AnalyticsScreen` loading state renders `AnalyticsSkeleton` | Mock `useAnalytics` → `isLoading: true`, assert no "Personal Records" text |
| Integration | Existing AnalyticsScreen tests pass unchanged | Test line 173-185 already covers loading skeleton branch |
| Build | `npx tsc --noEmit` passes | Verify no broken imports after SkeletonCard.tsx deletion |

**Existing test coverage**: `AnalyticsScreen.test.tsx` line 173-185 tests the loading skeleton branch. The test asserts `screen.queryByText("Personal Records")` is null — this still passes with `AnalyticsSkeleton` since it doesn't render "Personal Records". No test changes needed for existing tests.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. This is a pure UI refactor:
- SkeletonLoader.tsx animation change is internal (no API change)
- AnalyticsSkeleton replaces SkeletonCard in one location
- SkeletonCard.tsx deletion has zero consumers

All changes are backward-compatible with existing consumers of `SkeletonBar`, `SkeletonCircle`, `SkeletonCard` (from SkeletonLoader), `DashboardSkeleton`, and `PageSkeleton`.

## Open Questions

- None — all specs are clear, codebase is understood, and the approach follows existing patterns.
