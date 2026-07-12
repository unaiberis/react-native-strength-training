# Proposal: Web SQLite Fallback

## Intent

On web (`expo start --web`), `expo-sqlite` is unavailable — it hangs in the browser with no WASM fallback. Six hooks that read from local SQLite crash or return empty data on web, making the app unusable in a browser. The fix pattern is already proven in `useProfileStats` (Platform.OS check + PocketBase alternative). This change applies the same pattern to the remaining hooks.

## Scope

### In Scope
- Add web fallback to `useWellnessTrends` — query `pb.collection("daily_wellness").getFullList()` on web
- Add web fallback to `useProgression` — query `pb.collection("exercise_sets")` with session filter on web
- Add web fallback to `useAssessmentComparison` (history part) — PB `daily_wellness` on web
- Add web fallback to `useWeekCalendar` — query `pb.collection("workout_sessions")` with date range on web
- Add web fallback to `useAnalytics` — PB equivalents for sessions + sets + exercises
- Add web fallback to `usePendingSyncCount` — return `{pending:0,deadLetters:0,authErrors:0,hasPending:false}` on web (no change queue on web)

### Out of Scope
- Test harness for web-specific paths (covered by existing hook tests + follow-up)
- AsyncStorage/SQLite WASM alternatives for web (premature — PB direct query is sufficient)
- expo-sqlite package updates or migration

## Capabilities

### New Capabilities
None

### Modified Capabilities
None (pure refactor — no spec-level behavior changes, same data surfaced via different backend)

## Approach

Follow the `useProfileStats` pattern for each hook:
1. Extract the SQLite query into a `fetchXFromLocal()` function (already exists in most hooks)
2. Add a `fetchXFromPocketBase()` function that queries PB directly with equivalent data
3. Add a `Platform.OS === "web"` guard in the queryFn to route to PB on web, SQLite on native
4. Use `pb.collection()` with appropriate filters, sorts, and pagination

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/wellness/hooks/useWellnessTrends.ts` | Modified | Add PB fallback for daily_wellness |
| `src/features/records/hooks/useProgression.ts` | Modified | Add PB fallback for exercise_sets + sessions |
| `src/features/wellness/hooks/useAssessmentComparison.ts` | Modified | Add PB fallback for history query |
| `src/features/calendar/hooks/useWeekCalendar.ts` | Modified | Add PB fallback for session dates |
| `src/features/analytics/hooks/useAnalytics.ts` | Modified | Add PB fallback for 4 queries |
| `src/features/profile/hooks/usePendingSyncCount.ts` | Modified | Return static zero counts on web |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PB filter syntax differs from SQL (e.g. DATE(..) filtering) | Medium | Use PB's built-in `filter` syntax; test each query against live PB |
| Performance: PB round-trips on every hook mount | Low | TanStack Query `staleTime` already caches; same pattern as useProfileStats |
| Auth state: PB query requires valid user session | Low | All hooks already check `userId` before querying |

## Rollback Plan

Revert individual hook files:
```bash
git checkout src/features/*/hooks/use*.ts
```
Each hook is self-contained — partial rollback is safe.

## Dependencies

None — all hooks already import `pb` and `Platform` where needed.

## Success Criteria

- [ ] Each hook returns correct data on web (`expo start --web` + browser dev tools)
- [ ] Existing native behavior unchanged — all native tests pass
- [ ] Hooks gracefully handle PB query failures (empty data, not crash)
- [ ] `usePendingSyncCount` returns zero counts on web without attempting SQLite
