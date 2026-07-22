# PRD: Role Source Unification (SPEC-07)

## Problem

The app uses two sources for determining if a user is a coach:

1. **`users.role`** — global role set during registration (`"coach" | "athlete"`)
2. **`team_memberships.role`** — per-team role (`"admin" | "coach" | "athlete"`), resolved asynchronously into `isTeamCoach`

Navigation checks use `role === "coach" || isTeamCoach` (both sources), which:
- Creates a dual source of truth that can misroute users
- `extractRole` silently defaults to `"athlete"` when no role exists, masking config errors
- `isTeamCoach` resolution is "best effort" — if it fails, `users.role` carries navigation alone

Per audit SPEC-07, the reference (TheHybridProject/CoachAthletic) derives `effectiveCoach` **only from `team_memberships.role`**.

## Scope

Files to modify:

| File | Change |
|------|--------|
| `src/stores/auth-store.ts` | Remove silent default in `extractRole`; return `null` for unknown/missing roles |
| `app/_layout.tsx` (AuthGate) | Make `isTeamCoach` resolution eager (not best-effort) in web flow; set it BEFORE state transitions to authenticated |
| `app/index.tsx` | Change `effectiveCoach` to use ONLY `isTeamCoach` (remove `role === "coach"`) |
| `app/(auth)/_layout.tsx` | Same — remove `role === "coach"` from `effectiveCoach` |
| `app/(tabs)/_layout.tsx` | Same — remove `role === "coach"` from coach redirect guard |
| `src/features/profile/screens/ProfileScreen.tsx` | `isCoachView` uses `isTeamCoachFlag` only (remove `userRole === "coach"`) |

## Behaviour

| Scenario | Before | After |
|----------|--------|-------|
| User with `users.role="coach"` and `isTeamCoach=true` | Coach UI | Coach UI (no change) |
| User with `users.role="coach"` but NO team memberships | Coach UI | **Athlete UI** (respects memberships) |
| User with `users.role="athlete"` and `isTeamCoach=true` | Coach UI | Coach UI (no change) |
| User with `users.role=null` (legacy/admin-created) | Silently treated as athlete | `role` stays `null`; routing falls to `isTeamCoach` |
| Coach offline (no network for memberships) | Coach UI (via `users.role`) | **Athlete UI** (safe default when `isTeamCoach` can't resolve) |

### Offline note

When `getMyMemberships` fails (offline), `isTeamCoach` stays `false` and the user routes to athlete UI. This is the **safe default** — better to show athlete UI to a coach than to show coach UI to an athlete. Once online, a `useEffect` in the layout can re-check and redirect if needed.

## Acceptance Criteria

1. `extractRole` returns `null` (not `"athlete"`) when no role is present on the user record
2. Navigation in `app/index.tsx`, `app/(auth)/_layout.tsx`, `app/(tabs)/_layout.tsx` uses ONLY `isTeamCoach` (not `role === "coach"`)
3. `ProfileScreen.isCoachView` uses `isTeamCoachFlag` only
4. AuthGate web flow resolves memberships BEFORE auth state transitions from "loading"
5. All 1337+ existing tests pass
6. No regressions for:
   - User with `users.role="athlete"` + team coach membership → coach UI
   - User with `users.role="coach"` + no teams → athlete UI
   - New user with `users.role="athlete"` + no teams → athlete UI
