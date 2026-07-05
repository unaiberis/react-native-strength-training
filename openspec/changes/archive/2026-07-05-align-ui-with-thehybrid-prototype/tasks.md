# Tasks: Align UI with TheHybridProject Prototype Design System

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100–120 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | PR | Notes |
|------|------|----|-------|
| 1 | All 6 visual gaps | Single PR | Each gap is an isolated commit; ~100–120 lines across ~30 files |

## Phase 1: Low-Hanging Fruit (no dependencies)

- [x] 1.1 Fix Input bg: `bg-card-soft` → `bg-card` in `src/shared/ui/Input.tsx` line 32
- [x] 1.2 Add prototype button shadows: add `shadowColor: "#000"`, `shadowOffset: {width:0,height:8}`, `shadowOpacity: 0.35`, `shadowRadius: 14`, `elevation: 8` to `src/shared/ui/Button.tsx`
- [x] 1.3 Replace emoji map with Ionicons in `app/(tabs)/_layout.tsx` — use `Ionicons` name map (home, barbell, clipboard, trending-up, person) instead of emoji strings
- [x] 1.4 Switch `tabBarActiveTintColor` from `"#22c55e"` to `"#B9B9B6"` (titanium) in `app/(tabs)/_layout.tsx` line 74

## Phase 2: Green Accent Sweep (mechanical, 11 files)

- [x] 2.1 Replace `#22c55e` → `#B9B9B6` (titanium) in `app/(tabs)/train.tsx` (ActivityIndicator, line 96)
- [x] 2.2 Replace `#22c55e` → `#B9B9B6` in `app/_layout.tsx` (ActivityIndicator, line 192)
- [x] 2.3 Replace `#22c55e` → `#A4A4A8` (textMuted) in all `src/features/*/screens/` ActivityIndicator spinners (8 files — ProgressScreen, ExerciseDetailScreen, ExerciseListScreen, HistoryDetailScreen, HistoryListScreen, RoutineListScreen, RoutineFormScreen, ActiveWorkoutScreen)
- [x] 2.4 Replace `#22c55e` → `#B9B9B6` (titanium) for all `tintColor` props in `src/features/*/screens/` (ProgressScreen, ExerciseListScreen, HistoryListScreen, RoutineListScreen — 4 files)
- [x] 2.5 Verify: grep confirms zero occurrences of `#22c55e` in `src/`, `app/`, `scripts/`

## Phase 3: Gradient Background

- [x] 3.1 Install `expo-linear-gradient` dependency
- [x] 3.2 Create `src/shared/ui/GradientBackground.tsx` — reusable wrapper using `LinearGradient` with colors `["#030303", "#101012", "#050505"]`, diagonal angle, `flex-1` layout
- [x] 3.3 Wrap root views in `app/` files: `_layout.tsx`, `index.tsx`, `(tabs)/_layout.tsx`, `(tabs)/index.tsx`, `(tabs)/train.tsx`, `(tabs)/programs.tsx` — replace `bg-surface-950` with `<GradientBackground>`
- [x] 3.4 Wrap root views in `src/features/*/screens/` — replace `bg-surface-950` with `<GradientBackground>` in all 16 screen files (auth, exercises, history, records, routines, workout, profile)

## Phase 4: Typography Constants (independent)

- [x] 4.1 Create `src/shared/utils/typography.ts` with frozen constants for all 5 token categories: `title` (34px, 800, -0.8 tracking), `h2` (24px, 800), `h3` (18px, 700), `body` (15px, 500), `small` (12px, 600)

## Testing & Verification

- [x] 5.1 Run `npx jest` — confirm no existing tests break
- [x] 5.2 Verify `grep -rn "#22c55e" src/ app/ scripts/` returns zero matches
- [x] 5.3 Verify `grep "🏠\|💪\|📋\|📈\|👤" app/\(tabs\)/_layout.tsx` returns zero matches
- [x] 5.4 Run `npx tsc --noEmit` — confirm no type errors from new files
