# Delta for Design System

## MODIFIED Requirements

### Requirement: Skeleton Primitives

The SkeletonLoader module SHALL provide reusable skeleton primitives (`SkeletonBar`, `SkeletonCircle`, `SkeletonCard`) with a shared pulsing animation driven by a single module-level `Animated.Value`.

(Previously: Each `SkeletonPulse` instance created its own `Animated.Value` and `Animated.loop`, resulting in 7+ independent animation loops running simultaneously.)

#### Scenario: All SkeletonPulse instances share one animated value

- GIVEN multiple `SkeletonBar`, `SkeletonCircle`, or `SkeletonCard` components are rendered
- WHEN the animation runs
- THEN all pulsing elements animate in sync using the same module-level `Animated.Value`

#### Scenario: Single Animated.loop for all instances

- GIVEN the SkeletonLoader module is loaded
- WHEN skeleton components mount
- THEN exactly ONE `Animated.loop` call drives all `SkeletonPulse` instances (verifiable via code review or React Native profiler)

#### Scenario: Animation lifecycle is tied to module, not component

- GIVEN a `SkeletonBar` unmounts
- WHEN other skeleton elements are still mounted
- THEN the shared animation continues without interruption

## ADDED Requirements

### Requirement: AnalyticsSkeleton Composite Component

The SkeletonLoader module SHALL export an `AnalyticsSkeleton` composite component that renders a structured skeleton matching the AnalyticsScreen loaded layout.

#### Scenario: Exported from SkeletonLoader

- GIVEN a consumer imports `AnalyticsSkeleton`
- WHEN the import resolves
- THEN it comes from `@/shared/ui/SkeletonLoader` (not a separate file)

#### Scenario: Composed from existing primitives

- GIVEN `AnalyticsSkeleton` is rendered
- WHEN its internal structure is inspected
- THEN it uses only `SkeletonBar`, `SkeletonCircle`, and plain `View` elements — no direct `Animated.Value` creation

## REMOVED Requirements

### Requirement: Legacy SkeletonCard File

The file `src/shared/ui/SkeletonCard.tsx` SHALL be removed. All consumers already import `SkeletonCard` from `@/shared/ui/SkeletonLoader`.

(Reason: Duplicate component with zero consumers — grep confirms all 4 import sites use `@/shared/ui/SkeletonLoader`.)
(Migration: None needed — no consumer imports from `@/shared/ui/SkeletonCard`.)

#### Scenario: SkeletonCard.tsx no longer exists

- GIVEN the change is applied
- WHEN the file system is checked
- THEN `src/shared/ui/SkeletonCard.tsx` does not exist

#### Scenario: No broken imports after deletion

- GIVEN the change is applied
- WHEN `npx tsc --noEmit` runs
- THEN zero type errors related to SkeletonCard imports
