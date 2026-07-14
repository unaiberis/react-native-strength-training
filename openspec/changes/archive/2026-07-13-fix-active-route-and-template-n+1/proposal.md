# Proposal: Fix active route and template N+1

## Intent

Two reliability bugs: orphaned route declaration that could cause routing confusion, and 5 N+1 template fetches producing 404 HTTP errors after DB reseeding (silently swallowed, but noisy + wasteful).

## Scope

### In Scope

- Remove `Stack.Screen name="active"` from `app/_layout.tsx:266` (real route lives in `(workout)/_layout.tsx`)
- Batch-fetch template names in all 5 locations via a shared `fetchTemplateNames(ids)` helper replacing individual `getOne` calls
- Add/extend tests for the helper and modified call sites

### Out of Scope

- Denormalizing `template_name` on session creation (deferred)
- Template ID migration or reseeding strategy
- Other N+1 patterns in the codebase

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None — pure implementation fix, no spec-level behavior change.

## Approach

**Bug 1:** Delete 1 line from `app/_layout.tsx`. `(workout)/_layout.tsx` already registers `active`; nav uses absolute `/(workout)/active`.

**Bug 2:** Extract `src/lib/pocketbase/services/fetch-template-names.ts`:
- Collect unique truthy `workout_template_id`s → `getFullList({ filter: ids.map(id => `id='${id}'`).join('||'), fields: "id,name" })` → `Map<string, string>`
- Replace the 5 `getOne` sites: `getSessionDetail()`, `listSessions()`, `fetchSessionsFromPB()`, `fetchSessionsForDate()`, `fetchHomeStats()`
- Each site calls batch once per render, not N times

## Affected Areas

| Area | Impact |
|------|--------|
| `app/_layout.tsx` | Remove line 266 |
| `src/lib/pocketbase/services/sessions.ts` | 2 sites (`getSessionDetail`, `listSessions`) |
| `src/features/calendar/hooks/useSessionsForDate.ts` | `fetchSessionsFromPB` |
| `src/features/calendar/hooks/useCalendar.ts` | `fetchSessionsForDate` |
| `src/features/home/hooks/useHomeStats.ts` | `fetchHomeStats` |
| `src/lib/pocketbase/services/fetch-template-names.ts` | **New** |
| `src/lib/pocketbase/services/__tests__/fetch-template-names.test.ts` | **New** |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Removing root `active` breaks routing | Low | `(workout)` layout already declares it; all nav uses absolute path |
| PB filter `||` hits length limit | Low | Bounded by visible sessions (<100); try/catch stays as safety net |

## Rollback Plan

Revert the commit(s). No DB changes, no data loss.

## Dependencies

None.

## Success Criteria

- [ ] `npx tsc --noEmit` passes
- [ ] Navigation to `/(workout)/active` works
- [ ] No individual `getOne("workout_templates", …)` calls in network logs
- [ ] `npx jest` passes (including new tests)
