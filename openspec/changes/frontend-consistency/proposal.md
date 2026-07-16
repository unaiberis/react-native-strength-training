# Proposal: Frontend Consistency

## Intent

Polish the frontend for import consistency, eliminate dead code, close critical test gaps, and harden navigation styling. The app is feature-complete but has accumulated inconsistencies during rapid development — mixed import styles, duplicate screens, untested core flows, and hardcoded theme values. This change makes the codebase production-ready without adding new features.

## Scope

### In Scope

1. **Import alignment**: Convert ~60% of `app/` files from relative to `@/` alias imports
2. **Duplicate screen merge**: Remove `app/(tabs)/index.tsx`, consolidate into `app/(tabs)/home.tsx`
3. **Critical tests**: Add tests for `useWorkoutSession`, `useRestTimer`, `useHistory`, `useExercises`, `useAnalytics`, `useHomeStats`, `ProfileScreen`, `WellnessDashboardScreen`, `ExerciseListScreen`
4. **Forgot password**: Implement PocketBase forgot-password flow with email redirect
5. **Evolution chart**: Integrate existing `LineChart` component into PR screen for temporal progression
6. **Inline screen extraction**: Extract 8 inline screens >200 lines from `app/(coach)/` and `app/(auth)/` to feature screen components
7. **Hardcoded colors**: Replace hex values in tab layouts with Tailwind design tokens
8. **Header style dedup**: Centralize nav header styles via navigation theme instead of per-file repetition

### Out of Scope

- Performance optimization (FlashList, memoization)
- Type-safe navigation (future concern)
- PocketBase schema changes
- New feature additions

## Capabilities

### New Capabilities
None — pure polish, refactor, test coverage.

### Modified Capabilities
None — no spec-level behavior changes.

## Approach

SDD with force-chained PRs. Each PR is a self-contained deliverable:

1. PR #1: Import alignment (`app/` files) + dead-code removal (duplicate home screen)
2. PR #2: Critical test coverage (8 missing test suites)
3. PR #3: Forgot password + evolution chart integration
4. PR #4: Inline screen extraction (8 route files → feature components)
5. PR #5: Theme hardening (colors + header style)

PRs chain to `main` sequentially (stacked-to-main). Each keeps tests green.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/` (25+ route files) | Modified | Relative → `@/` imports |
| `app/(tabs)/index.tsx` | Removed | Duplicate home screen |
| `app/(tabs)/home.tsx` | Modified | Absorb index.tsx logic |
| `src/features/*/hooks/` | New tests | 8 critical test files |
| `app/(auth)/forgot-password.tsx` | New | Forgot password screen |
| `app/(coach)/` 8 files | Extracted | Inline screens → feature components |
| `app/(tabs)/_layout.tsx` | Modified | Hardcoded → Tailwind tokens |
| `app/(coach)/_layout.tsx` | Modified | Hardcoded → Tailwind tokens |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Import refactor breaks lazy routes | Low | Run full test suite + manual smoke |
| Forgot password email delivery | Low | PocketBase handles SMTP; test in staging |
| Screen extraction changes navigation | Low | Preserve router params, keep exports |

## Rollback Plan

Per chained PR: `git revert <merge-commit>`. Each PR is atomic — reverting one does not cascade. No data migrations involved.

## Dependencies

- PocketBase SMTP configured for forgot-password flow (server-side, no code change)
- Existing `LineChart` component in `src/features/analytics/components/LineChart.tsx`

## Success Criteria

- [ ] All `app/` files use `@/` imports (zero relative imports)
- [ ] `index.tsx` removed, `home.tsx` handles all home logic
- [ ] 8 new test suites passing with >=80% coverage on each file
- [ ] Forgot password flow working end-to-end
- [ ] LineChart visible on PR screen showing volume/strength over time
- [ ] 8 inflated screens extracted to feature components
- [ ] Zero hardcoded hex colors in tab layouts
- [ ] Header styles defined in one place via navigation theme
