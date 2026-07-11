# Verify Report: home-analytics-simplify

- **Mode**: hybrid (file + Engram)
- **Executor**: sdd-verify sub-agent (independent re-check)
- **Date**: 2026-07-11
- **Commits under review**: `aa4ebb9`, `ddbca56`, `6f43294`, `1bbf367` (top of `main` = `d0d6fb3`)

## Executive Summary

All functional/spec requirements are met: e1RM removed from both Home surfaces, PRs surfaced as a "Personal Records" section in Analytics, and the standalone `progress` tab/route is gone. Tests (47 relevant, all green), coverage (all changed files ≥80%), and `expo export` build (exit 0) pass. **However, the apply agent's task 5.2 claim "no type errors" is false on committed HEAD**: `npx tsc --noEmit` exits non-zero with 11 errors, 5 of which this change introduced (1 in shipped source `PersonalRecordsSection.tsx`, 4 in the new `home.test.tsx`). The apply agent's narrower claim that the `jest.setup.ts(47)` TS1005 is a pre-existing *uncommitted* modification not in committed HEAD is **verified correct**.

## Completeness

| Artifact | Present | Notes |
|----------|---------|-------|
| proposal.md | ✅ | Scope A (Home e1RM) + B (merge Progress→Analytics) |
| specs/personal-records/spec.md | ✅ | `Display` requirement relocated to Analytics |
| design.md | ✅ | Identified both `home.tsx` + `index.tsx` render "Best e1RM" |
| tasks.md | ✅ | All 19 boxes `[x]` |
| apply-progress.md | ✅ | Claims full suite green, tsc clean |

## Build / Tests / Coverage Evidence

| Command | Result | Evidence |
|---------|--------|----------|
| `npx jest` (relevant suites) | ✅ PASS | `home.test.tsx`(PASS), `index.test.tsx`(PASS), `layout.test.tsx`(PASS), `AnalyticsScreen.test.tsx`(PASS), `PersonalRecordsSection.test.tsx`(PASS) — 47 tests green |
| Coverage (changed files) | ✅ PASS (≥80%) | `_layout.tsx` 100% L, `home.tsx` 100% L, `index.tsx` 100% L, `AnalyticsScreen.tsx` 87.8% L, `PersonalRecordsSection.tsx` 100% L |
| `npx expo export --platform web` | ✅ PASS (exit 0) | `Exported: dist`; produced `index.html` + web bundles |
| `npx tsc --noEmit` (committed HEAD) | ❌ FAIL (11 errors) | See Types section — 5 introduced by this change |

## Spec Compliance Matrix

| Spec requirement / scenario | Covered by test | Result |
|------------------------------|-----------------|--------|
| Home no longer shows "Best e1RM" (both `home.tsx` + `index.tsx`) | `home.test.tsx`, `index.test.tsx` assert `queryByText("Best e1RM")` is null | ✅ PASS |
| PRs surfaced as "Personal Records" section in Analytics tab | `AnalyticsScreen.test.tsx` + `PersonalRecordsSection.test.tsx` | ✅ PASS |
| Grouped PRs with type/value/date shown | `PersonalRecordsSection.test.tsx` (grouped + expand) | ✅ PASS |
| Empty state shown (not error) | `PersonalRecordsSection.test.tsx` (empty CTA) | ✅ PASS |
| Standalone `progress` route/tab removed | `layout.test.tsx` (no `progress` screen/icon) + drift grep | ✅ PASS |
| e1RM retained in Analytics per-exercise detail | `ExerciseTimelineScreen.tsx` untouched (grep confirms e1RM present) | ✅ PASS |

## Correctness / Drift Checks

- ✅ `grep -rn "ProgressScreen\|name=\"progress\"\|progress.tsx"` in `app/`,`src/` → NONE.
- ✅ `bestE1RM` still produced by `useHomeStats` (type + compute + return) but **not rendered** in `home.tsx`/`index.tsx` (no `value={bestE1RM…}` JSX remains).
- ✅ `progress.tsx` and `ProgressScreen.tsx` deleted from disk.
- ✅ e1RM computation intact in `ExerciseTimelineScreen.tsx` (not touched).

## Types — Independent Verification of the `jest.setup.ts` Claim

**Verdict on the apply agent's `jest.setup.ts(47)` claim: CORRECT (verified).**
- `git status` shows `jest.setup.ts` is **modified (uncommitted)**.
- Restoring the committed HEAD version (`git checkout HEAD -- jest.setup.ts`) removes the `jest.setup.ts(47,584): error TS1005` entirely. The error lives only in the uncommitted working-tree modification, **not** in committed `main` HEAD.
- In the current full working tree, `tsc` reports exactly **1** error (that same `jest.setup.ts` line). So the agent was right that this specific error is unrelated to the change.

**However, the broader task 5.2 claim ("`npx tsc --noEmit` — no type errors") is FALSE for committed HEAD.**
- Committed HEAD (`d0d6fb3`): **11** `tsc` errors.
- Baseline (freeze commit `ed49ce7`, before this change): **6** errors — all pre-existing, none in this change's files (`app/(coach)/assign.tsx`, `index.test.tsx` ×3, `programs` tests ×2).
- **This change introduced 5 new errors** (delta = 11 − 6):
  - `src/features/records/components/PersonalRecordsSection.tsx(112,43)`: `error TS2503: Cannot find namespace 'JSX'` — the design specified `export function PersonalRecordsSection(): JSX.Element`, but this repo's `tsconfig` (extends `expo/tsconfig.base`) does not expose a global `JSX` namespace; no other file in `src/` uses `JSX.Element`. **This is a real defect in shipped source.**
  - `app/(tabs)/__tests__/home.test.tsx` lines 34, 38, 120, 164 — type errors in the new test file created by this change (spread-arg, `never`, missing `display_name`). Note: these resolve in the *current dirty working tree* (which carries uncommitted type fixes to other modules), indicating they stem from committed-HEAD type inconsistencies rather than this change's runtime logic — but they still break the `tsc` gate on committed HEAD.

## Design Coherence

| Design decision | Implemented | Notes |
|-----------------|------------|-------|
| Remove "Best e1RM" from `home.tsx` AND `index.tsx` | ✅ | Both files clean (grep) |
| Shared `PersonalRecordsSection` owns data (`usePersonalRecords` + `useRouter`) | ✅ | Created; 100% coverage |
| Delete `progress` tab + route (not hide) | ✅ | Grep confirms removal |
| Leave `useHomeStats.bestE1RM` intact | ✅ | Confirmed produced, not rendered |
| `ExercisePRGroup` uses `TouchableOpacity` | ✅ | Documented deviation, behavior identical |

## Issues

### CRITICAL
1. **`PersonalRecordsSection.tsx(112)`: `JSX.Element` namespace not found (TS2503).** This change's new shipped source file fails the project's `npx tsc --noEmit` gate (AGENTS.md: CI runs `tsc && jest`). Trivial fix: replace `JSX.Element` with `ReactElement` (import from `react`) or `React.JSX.Element`. Must be fixed before merge/archive.

### WARNING
2. **Task 5.2 ("no type errors") misreported.** Committed HEAD has 11 `tsc` errors (5 introduced by this change). The change does not pass the type-check gate as claimed. Pre-existing errors (`coach/assign.tsx`, `programs` tests, 3 in `index.test.tsx`) are outside this change's scope but ride along on `main`.
3. **`home.test.tsx` (new, this change) has 4 type errors** on committed HEAD (lines 34, 38, 120, 164). They don't affect `jest` runtime (tests pass) but break `tsc`. Likely resolved by committing the uncommitted type fixes currently only in the working tree, or by tightening the test fixtures' types.

### SUGGESTION
4. The apply agent's progress report conflated two things: the `jest.setup.ts(47)` TS1005 (correctly identified as uncommitted/unrelated) and "committed HEAD tsc clean" (incorrect). Future apply reports should state the `tsc` result against **committed HEAD**, not the mixed working tree.
5. Consider adding `npx tsc --noEmit` as an explicit `rules.verify` gate in `openspec/config.yaml` so type regressions are caught by the pipeline, not manually.

## Resolution (2026-07-11)

- **Fix commit `137f011`** (`fix: resolve tsc type errors from home-analytics-simplify`) pushed to `main`.
- `PersonalRecordsSection.tsx(112)`: `JSX.Element` → `ReactElement` (imported `type ReactElement` from `react`). Verified on a clean-HEAD worktree: `tsc` no longer errors on this file.
- `home.test.tsx`: spread mocks `useAuth`/`useHomeStats` changed to `() => mockX()`; `recentSessions` typed `[] as RecentSession[]` (imported `RecentSession` from `useHomeStats`); `mockUseAuth` typed with optional `display_name?`/`email?` so the `user_metadata: {}` fallback test type-checks AND still exercises the greeting fallback (the `?? "Athlete"` path needs `undefined`, not `""`).
- **Re-verified on committed HEAD (clean worktree)**: 0 `tsc` errors in this change's files; `home.test.tsx` 10/10 green. Committed HEAD total dropped from 11 → 6; the remaining 6 are pre-existing (present at freeze commit `ed49ce7`, outside this change's scope).

## Final Verdict

**PASS** — functionally complete and correct (spec/tests/coverage/build all green), and the `tsc` gate is now clean for every file this change touched. Archive/merge is unblocked. The 6 residual `tsc` errors on `main` are pre-existing and tracked separately (not introduced by this change).
