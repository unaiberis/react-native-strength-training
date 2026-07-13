# Proposal: Fix Welcome Screen Redirect After Web Refresh

## Intent

On the Expo Router **web** build, every page refresh resets the URL to `/`, so `app/index.tsx` (the welcome/landing screen) always renders. The screen ignores auth state and unconditionally shows "Inicia sesión" / "Regístrate", stranding an authenticated user on the splash after refresh even though `AuthGate` correctly restores the session. This fix makes the welcome screen auth-aware so it redirects authenticated users into the app, mirroring the guard already in `app/(tabs)/_layout.tsx`.

## Scope

### In Scope
- Make `app/index.tsx` subscribe to `useAuthStore` (`state`, `role`, `isTeamCoach`).
- While `state === "loading"`: render a neutral logo-only splash (no action buttons) to avoid a flash of login UI.
- When `state === "authenticated"`: `router.replace(...)` — coach/team-coach → `/(coach)`, otherwise → `/(tabs)/home`.
- When `state === "unauthenticated"`: render the existing welcome UI unchanged.
- Use `useEffect` keyed on `[state, role, isTeamCoach]` with a `cancelled` cleanup guard (no redirect loop).
- Add test file `app/__tests__/index.test.tsx` (RED→GREEN, Jest + RTL, coverage ≥80%).

### Out of Scope
- No changes to `app/_layout.tsx`, `auth-store.ts`, or the PocketBase client (verified correct).
- No new features, no refactor of unrelated screens, no coach tab logic changes.
- Native refresh path already handled by `AuthGate`; out of scope.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `user-auth`: extend **Session Persistence** — when the landing route `/` renders while the session is already authenticated (e.g. web refresh), it MUST redirect into the main app (coach→`/(coach)`, athlete→`/(tabs)/home`) instead of showing the welcome splash.

## Approach

Single-file change. Read auth state via `useAuthStore`. Gate rendering on `state`:
- `loading` → logo-only splash.
- `authenticated` → `useEffect` calls `router.replace(target)`; component unmounts on route change, so the effect cleanup (`cancelled = true`) prevents loops.
- `unauthenticated` → current UI (login/register buttons) untouched.

Target resolution reuses the exact rule from `app/(tabs)/_layout.tsx`: `(role === "coach" || isTeamCoach) ? "/(coach)" : "/(tabs)/home"`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/index.tsx` | Modified | Add auth subscription + conditional redirect/loading splash |
| `app/__tests__/index.test.tsx` | New | Unit test for all three `state` branches |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Brief login-button flash before redirect | Low | Neutral logo-only splash while `loading` |
| Redirect loop | Low | `cancelled` guard + unmount on `replace` |

## Rollback Plan

Revert `app/index.tsx` to the current 69-line version (git checkout). No schema, store, or client changes — safe atomic revert.

## Dependencies

- `useAuthStore` (existing), `expo-router` `useRouter` (existing). None new.

## Success Criteria

- [ ] Authenticated user refreshing web at `/` is routed to `/(coach)` or `/(tabs)/home` automatically.
- [ ] `loading` state shows logo-only splash, no action buttons.
- [ ] Unauthenticated users still see the existing welcome screen.
- [ ] `app/__tests__/index.test.tsx` passes; coverage ≥80% for `app/index.tsx`.
