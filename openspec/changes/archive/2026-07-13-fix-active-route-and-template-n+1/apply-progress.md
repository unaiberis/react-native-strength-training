# Apply Progress: fix-active-route-and-template-n+1

**Status**: Complete
**Date**: 2026-07-13
**Phase**: PR #2 — Batch template fetch helper + migration

---

## Completed Tasks

| Task | Status | Evidence |
|------|--------|----------|
| 2.1 — Create batch helper | ✅ | `src/lib/pocketbase/services/fetch-template-names.ts` created (28 lines) |
| 2.2 — Unit tests for helper | ✅ | `__tests__/fetch-template-names.test.ts` (5 tests, all pass) |
| 2.3 — Migrate `getSessionDetail` | ✅ | Replaced per-row `getOne` with `fetchTemplateNames` in `sessions.ts` |
| 2.4 — Migrate `listSessions` | ✅ | Batch-fetch template IDs before `Promise.all` in `sessions.ts` |
| 2.5 — Migrate `fetchSessionsFromPB` | ✅ | Batch-fetch in `useSessionsForDate.ts` |
| 2.6 — Migrate `fetchSessionsForDate` | ✅ | Batch-fetch in `useCalendar.ts` |
| 2.7 — Migrate `fetchHomeStats` | ✅ | Batch-fetch in `useHomeStats.ts` |
| 2.8 — Update mock expectations | ✅ | `sessions.test.ts` + `useSessionsForDate.test.ts` updated |
| 2.9 — Full suite verification | ✅ | 95 suites, 1105 tests passing; `tsc --noEmit` clean |

---

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1+2.2 | `fetch-template-names.test.ts` | Unit | N/A (new) | ✅ Written | ✅ Passed | ✅ 5 cases | ➖ None needed |
| 2.3 | `sessions.test.ts` | Unit | ✅ 55/55 | ✅ Existing tests red after change | ✅ Mocks updated | ✅ Behavior preserved | ➖ None needed |
| 2.4 | `sessions.test.ts` | Unit | ✅ 55/55 | ✅ Existing tests red after change | ✅ Mocks updated | ✅ Behavior preserved | ➖ None needed |
| 2.5 | `useSessionsForDate.test.ts` | Unit | ✅ 12/12 | ✅ Existing tests red after change | ✅ Mocks updated | ✅ 2 cases preserved | ➖ None needed |
| 2.6 | `useCalendar.test.ts` | Unit | N/A (pure fn only) | N/A — no template tests exist | N/A | ➖ Single | ➖ None needed |
| 2.7 | N/A (no test file) | — | N/A | N/A | N/A | N/A | N/A |

---

## Files Changed

| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `src/lib/pocketbase/services/fetch-template-names.ts` | **Created** | 28 | Shared batch helper `fetchTemplateNames(ids)` |
| `src/lib/pocketbase/services/__tests__/fetch-template-names.test.ts` | **Created** | 90 | 5 unit tests for helper |
| `src/lib/pocketbase/services/sessions.ts` | Modified | 33ch | Import + migrate `getSessionDetail` and `listSessions` |
| `src/features/calendar/hooks/useSessionsForDate.ts` | Modified | 20ch | Migrate `fetchSessionsFromPB` |
| `src/features/calendar/hooks/useCalendar.ts` | Modified | 18ch | Migrate `fetchSessionsForDate` |
| `src/features/home/hooks/useHomeStats.ts` | Modified | 22ch | Migrate `fetchHomeStats` |
| `src/lib/pocketbase/services/__tests__/sessions.test.ts` | Modified | 13ch | Replace `mockGetOne` → `mockGetFullList` |
| `src/features/calendar/hooks/__tests__/useSessionsForDate.test.ts` | Modified | 8ch | Replace `pb.getOne` → `pb.getFullList` |

**Total**: ~232 lines (under 400 budget)

---

## Deviations from Design

**TypeScript type guard**: Used `filter((id): id is string => id != null)` instead of `filter(Boolean)` because TypeScript doesn't narrow union types with `Boolean`. This is a type-safety improvement, not a behavioral change.

---

## Verification Results

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | ✅ Zero errors |
| `npx jest` (full suite) | ✅ 95 suites, 1105 tests passing |
| `npx jest fetch-template-names` | ✅ 5/5 passing |
| `npx jest sessions` | ✅ 55/55 passing |
| `npx jest useSessionsForDate` | ✅ 12/12 passing |
| `grep getOne.*workout_templates src/ \| grep -v templates.ts` | ✅ Zero results |
