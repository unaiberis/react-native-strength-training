# Proposal: Simplify Home & Analytics (coach feedback safe batch)

## Intent

Act on the non-controversial simplifications from coach/tester Paul Elorza's feedback: declutter the athlete Home tab and consolidate two overlapping athlete tabs (standalone **Progress** + **Analytics**) into a single **Analytics** surface. This reduces navigation redundancy and surfaces personal records where charts already live. e1RM stays fully available in Analytics per-exercise detail.

## Scope

### In Scope
- **A — Remove e1RM from Home:** delete the "Best e1RM" `StatCard` (and `bestE1RM` usage) in `app/(tabs)/index.tsx`. e1RM MUST remain in `Analytics → analytics/exercise/[id]` progression charts.
- **B — Merge Progress into Analytics:** render the personal-record view (grouped PR cards from `usePersonalRecords`) as a "Personal Records" section inside `AnalyticsScreen`; remove the standalone Progress tab from `app/(tabs)/_layout.tsx` and delete route `app/(tabs)/progress.tsx` + `ProgressScreen`.

### Out of Scope
- **F — Team assignment:** validated as-is (Profile "My Teams" is coach-assigned, athlete view-only). No work.
- Adding new charts or reworking Analytics layout beyond the PR section.
- Coaching/assignment flow changes.

## Capabilities

### New Capabilities
None. Analytics behavior is currently unspecced; this change does not introduce new spec-level behavior beyond relocating existing PR display.

### Modified Capabilities
- `personal-records`: the **Display** requirement ("MUST show PRs grouped by exercise with type, value, date") is relocated — PRs are now surfaced inside the Analytics tab (Personal Records section) instead of a standalone Progress tab. The scenario `GIVEN PRs across 3 exercises WHEN progress opens THEN grouped PRs…` MUST be updated to `WHEN Analytics opens / the Personal Records section is shown`.

## Approach

- **Home (A):** drop the 4th `StatCard` in Row 2 of `index.tsx`; stop consuming `bestE1RM` from `useHomeStats` (leave hook output intact if other consumers exist, else trim).
- **Merge (B):** extract `PRCard`/`ExercisePRGroup` from `ProgressScreen` into a shared component under `src/features/records/components/`; render a "Personal Records" section at the bottom of `AnalyticsScreen` using `usePersonalRecords`. Remove the `progress` `Tabs.Screen` and route file. Keep `usePersonalRecords`, `ProgressScreen` code deletable.
- **Testing (Strict TDD, `npx jest`, 80% cov):** add a `HomeScreen` render test asserting "Best e1RM" absent; add an `AnalyticsScreen` test asserting the Personal Records section renders grouped PRs; add a layout/route check asserting no `progress` tab. Red→green per `tdd` skill.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/(tabs)/index.tsx` | Modified | Remove Best e1RM StatCard |
| `app/(tabs)/_layout.tsx` | Modified | Remove `progress` tab screen |
| `app/(tabs)/progress.tsx` | Removed | Delete standalone route |
| `src/features/records/screens/ProgressScreen.tsx` | Removed | Fold into Analytics |
| `src/features/analytics/screens/AnalyticsScreen.tsx` | Modified | Add Personal Records section |
| `src/features/records/components/` | New | Shared PR card/group |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PR section overloads Analytics scroll | Med | Place after charts; reuse existing empty/loading states |
| `bestE1RM` used elsewhere | Low | Grep before trimming `useHomeStats` |

## Rollback Plan

Git revert the change commit/PR. No schema or persisted-data changes; `progress.tsx` restoration re-adds the tab. Feature is pure UI/route removal.

## Dependencies

None beyond existing `usePersonalRecords` and `useAnalytics` hooks.

## Success Criteria

- [ ] Home no longer shows "Best e1RM"; e1RM still in Analytics exercise detail
- [ ] No `progress` tab in bottom nav; route/file removed
- [ ] Analytics shows Personal Records section with grouped PRs
- [ ] New tests pass; coverage ≥ 80% on changed files
