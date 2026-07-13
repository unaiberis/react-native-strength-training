# Delta for user-auth

## ADDED Requirements

### Requirement: Post-Refresh Landing Redirect

WHEN the landing route `/` (`app/index.tsx`) renders AND `useAuthStore.state === "authenticated"`, the screen MUST call `router.replace(target)` where `target = "/(coach)"` if `role === "coach"` OR `isTeamCoach` is true, otherwise `target = "/(tabs)/home"`. The redirect MUST occur via a `useEffect` keyed on `[state, role, isTeamCoach]` guarded by a `cancelled` cleanup flag, fire exactly once, and MUST NOT loop.

#### Scenario: Authenticated athlete refreshes web at `/`

- GIVEN `state === "authenticated"`, `role === "athlete"`, `isTeamCoach === false`
- WHEN the `/` route renders after refresh
- THEN `router.replace("/(tabs)/home")` is called exactly once
- AND no redirect loop occurs

#### Scenario: Authenticated coach refreshes web at `/`

- GIVEN `state === "authenticated"`, `role === "coach"`
- WHEN the `/` route renders after refresh
- THEN `router.replace("/(coach)")` is called exactly once

#### Scenario: Authenticated team-coach athlete refreshes web at `/`

- GIVEN `state === "authenticated"`, `role === "athlete"`, `isTeamCoach === true`
- WHEN the `/` route renders after refresh
- THEN `router.replace("/(coach)")` is called (mirrors the `app/(tabs)/_layout.tsx` guard)

#### Scenario: No redirect loop after replace

- GIVEN an authenticated user at `/`
- WHEN `router.replace(target)` fires and the component unmounts
- THEN the effect MUST NOT re-fire on the unmounted component (`cancelled` guard + unmount)

### Requirement: Loading Splash

WHEN `useAuthStore.state === "loading"`, `app/index.tsx` MUST render a neutral logo-only splash (the existing logo/title block, NO "Inicia sesión" / "Regístrate" buttons) so there is no flash of login UI before the authenticated redirect.

#### Scenario: Loading state at `/` shows logo-only splash

- GIVEN `state === "loading"`
- WHEN the `/` route renders
- THEN only the logo splash is rendered (no action buttons, no redirect)

### Requirement: Unauthenticated Welcome

WHEN `useAuthStore.state === "unauthenticated"`, `app/index.tsx` MUST render the existing welcome UI (login/register buttons) unchanged and MUST NOT redirect.

#### Scenario: Unauthenticated user at `/` sees welcome UI

- GIVEN `state === "unauthenticated"`
- WHEN the `/` route renders
- THEN the existing welcome UI (login/register buttons) is shown and no `router.replace` is called
