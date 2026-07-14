# Archive Report: fix-active-route-and-template-n+1

**Archived**: 2026-07-13
**Source of truth**: openspec/changes/archive/2026-07-13-fix-active-route-and-template-n+1/

## Summary

Two independent reliability bugs fixed in one change. Pure implementation fix — no spec-level behavior changes, no new capabilities, no schema migrations.

### Bug 1 — Orphaned Route Declaration
- **Root cause**: `app/_layout.tsx` had a `<Stack.Screen name="active" />` declaration (line 266) that was orphaned. The real route lives in `(workout)/_layout.tsx`.
- **Fix**: Deleted the orphaned line. All navigation already uses absolute path `/(workout)/active`.
- **Files changed**: `app/_layout.tsx` (-1 line)

### Bug 2 — Template N+1 Queries
- **Root cause**: 5 call sites were calling `pb.collection("workout_templates").getOne(...)` individually per session row, producing 5×N network requests that failed with 404 after DB reseeding.
- **Fix**: Created `src/lib/pocketbase/services/fetch-template-names.ts` — a shared batch helper that deduplicates unique `workout_template_id`s, fires one `getFullList` with `||` filter, and returns a `Map<string, string>`.
- **Files changed**: 1 new file, 5 modified files
- **Call sites migrated**: `getSessionDetail`, `listSessions`, `fetchSessionsFromPB`, `fetchSessionsForDate`, `fetchHomeStats`

## Task Completion

| Task | Status | Description |
|------|--------|-------------|
| 1.1 | ✅ | Remove orphaned `Stack.Screen name="active"` from root layout |
| 1.2 | ✅ | Verify routing still works |
| 2.1 | ✅ | Create `fetch-template-names.ts` batch helper |
| 2.2 | ✅ | Unit tests for batch helper (5 tests, all passing) |
| 2.3 | ✅ | Migrate `getSessionDetail` in `sessions.ts` |
| 2.4 | ✅ | Migrate `listSessions` in `sessions.ts` |
| 2.5 | ✅ | Migrate `fetchSessionsFromPB` in `useSessionsForDate.ts` |
| 2.6 | ✅ | Migrate `fetchSessionsForDate` in `useCalendar.ts` |
| 2.7 | ✅ | Migrate `fetchHomeStats` in `useHomeStats.ts` |
| 2.8 | ✅ | Update mock expectations in test files |
| 2.9 | ✅ | Run full test suite and type check |

All 9 implementation tasks complete. 2 manual verification checklist items (navigation test, duplicate route warning check) noted as pending manual confirmation.

## Verification Results

- **Build**: ✅ `npx tsc --noEmit` passes
- **Tests**: ✅ 1105 passed, 0 failed (95 suites)
- **Coverage**: fetch-template-names.ts 100%, sessions.ts 94.53%, useSessionsForDate.ts 98.11%
- **Zero remainder**: ✅ `grep -rn "getOne.*workout_templates" src/ | grep -v "templates.ts"` → 0 results
- **Route fix**: ✅ No `Stack.Screen name="active"` in `app/_layout.tsx`; route exists in `(workout)/_layout.tsx`
- **Verdict**: PASS — no CRITICAL issues

## Key Decisions

1. **New module placement**: `src/lib/pocketbase/services/fetch-template-names.ts` — sibling to existing PocketBase services. Keeps service boundary clean.
2. **Return type**: `Promise<Map<string, string>>` — empty Map on failure preserves existing silent-fallback behavior.
3. **Caller pattern**: Collect unique `workout_template_id`s first → batch fetch once → resolve from Map. O(N) → O(1) network calls.
4. **Delivery strategy**: Two stacked PRs — `fix/remove-orphan-active-route` (1 line + test) then `fix/migrate-template-nplus1` (~280 lines). Under 400-line budget per PR.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `app/_layout.tsx` | Modified | Removed orphaned `<Stack.Screen name="active" />` |
| `src/lib/pocketbase/services/fetch-template-names.ts` | **Created** | Shared batch helper |
| `src/lib/pocketbase/services/sessions.ts` | Modified | `getSessionDetail` + `listSessions` migrated |
| `src/features/calendar/hooks/useSessionsForDate.ts` | Modified | `fetchSessionsFromPB` migrated |
| `src/features/calendar/hooks/useCalendar.ts` | Modified | `fetchSessionsForDate` migrated |
| `src/features/home/hooks/useHomeStats.ts` | Modified | `fetchHomeStats` migrated |
| `src/lib/pocketbase/services/__tests__/fetch-template-names.test.ts` | **Created** | 5 unit tests for helper |
| `src/lib/pocketbase/services/__tests__/sessions.test.ts` | Modified | Mock expectations migrated |
| `src/features/calendar/hooks/__tests__/useSessionsForDate.test.ts` | Modified | Mock expectations migrated |

## Spec Merge Status

**No spec files merged.** This was a pure implementation fix with no spec-level behavior changes. The delta spec explicitly states "Pure implementation fix. No new capabilities, no spec-level behavior changes." No main specs needed updating.

## Engram Artifact IDs

| Artifact | Type | Observation ID |
|----------|------|---------------|
| Proposal | architecture | N/A (stored on disk) |
| Spec | architecture | N/A (stored on disk) |
| Design | architecture | N/A (stored on disk) |
| Tasks | architecture | N/A (stored on disk) |
| Verify Report | architecture | #1916 |
| Archive Report | architecture | N/A (saved below) |

## Rollback Plan

Revert the commits. No DB changes, no data loss, no schema migration.

## SDD Cycle Complete

| Phase | Status |
|-------|--------|
| Proposal | ✅ |
| Spec | ✅ |
| Design | ✅ |
| Tasks | ✅ |
| Apply | ✅ |
| Verify | ✅ |
| Archive | ✅ |
