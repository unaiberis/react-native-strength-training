# Tasks: skeleton-analytics-alignment

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~60-80 additions, ~12 deletions |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | All tasks in one PR | PR 1 | `npx tsc --noEmit && npm test` | N/A — UI skeleton only, visual verify on device | Revert single commit |

## Phase 1: Refactor Skeleton Animation to Shared Value

- [x] 1.1 In `src/shared/ui/SkeletonLoader.tsx`, extract `Animated.Value` from `SkeletonPulse` to module scope. Create `const sharedOpacity = new Animated.Value(0.3)` and a module-level `Animated.loop` that starts on import. Update `SkeletonPulse` to read from `sharedOpacity` directly instead of `useRef`. Remove `useEffect` from `SkeletonPulse` (animation lifecycle now tied to module).

## Phase 2: Add AnalyticsSkeleton Composite

- [x] 2.1 In `src/shared/ui/SkeletonLoader.tsx`, add `AnalyticsSkeleton` export. Build from `SkeletonBar` and `View` — header (title 50%/28h + subtitle 30%/14h), toggle bar (120px/44h), stat cards row (3× flex-1 cards with value 60%/24h + label 80%/12h), chart card (title 40%/18h + area 100%/120h), exercise list (3 rows: name 60%/16h + details 30%/12h). Accept optional `className` prop per spec R2.

## Phase 3: Wire AnalyticsScreen

- [x] 3.1 In `src/features/analytics/screens/AnalyticsScreen.tsx`, change import on line 7 from `SkeletonCard` to `AnalyticsSkeleton` (same module path `@/shared/ui/SkeletonLoader`). Replace lines 89-92 (the three `SkeletonCard` calls) with a single `<AnalyticsSkeleton />`. Remove `lines` and `lastLineWidth` props.

## Phase 4: Cleanup Legacy File

- [x] 4.1 Delete `src/shared/ui/SkeletonCard.tsx` — zero consumers confirmed (all 4 import sites use `@/shared/ui/SkeletonLoader`).

## Phase 5: Verification

- [x] 5.1 Run `npx tsc --noEmit` — confirm no type errors.
- [x] 5.2 Run `npm test` — confirm no regressions.
- [x] 5.3 Grep for `SkeletonCard` across codebase — confirm zero remaining imports/references.
