# E2E Tests Spec

## Purpose

Automated regression testing of critical user flows on real devices via Maestro.

## Requirements

### Offline → Online Critical Path

MUST execute the full offline→online→sync flow:

```
Flow: Offline Workout → Online Sync
  GIVEN app launches with EXPO_PUBLIC_OFFLINE_ENABLED=true
  WHEN app starts and auth token is stored
  THEN home screen loads
  WHEN user taps "Routines" tab
  THEN routine list screen renders
  WHEN user creates a new routine with 2 exercises (offline)
  THEN routine appears in list with dirty indicator
  WHEN user taps "Start" on the routine
  THEN active workout screen loads with exercises pre-filled
  WHEN user logs a set (100kg x 8, RPE 8, tempo 2020)
  THEN set appears in the list
  WHEN user completes the workout
  THEN session appears in history
  WHEN connectivity is restored
  THEN sync occurs automatically
```

### Auth Flow

```
Flow: Login → Logout
  GIVEN user is logged out
  WHEN login screen loads
  THEN email and password fields are visible
  WHEN valid credentials submitted
  THEN home screen loads
  WHEN user taps Profile tab → "Sign Out"
  THEN login screen shown again
```

### Workout CRUD Flow

```
Flow: Workout CRUD
  GIVEN user is logged in
  WHEN user creates a routine "Push Day" with 3 exercises
  THEN routine visible in programs list
  WHEN user edits the routine (rename to "Push A")
  THEN name updated in list
  WHEN user deletes the routine
  THEN routine removed from list
```

## Files

| File | Action |
|------|--------|
| `.maestro/critical-path.yaml` | CREATE |
| `.maestro/auth.yaml` | CREATE |
| `.maestro/workout.yaml` | CREATE |
| `.github/workflows/ci.yml` | MODIFY — add optional e2e step |
| `e2e/README.md` | CREATE — setup instructions |

## Acceptance Criteria

- Flows pass on Android emulator (API 34)
- Full suite completes in <5 minutes
- CI can run with `maestro test .maestro/` when emulator available
- No changes to app source code required
