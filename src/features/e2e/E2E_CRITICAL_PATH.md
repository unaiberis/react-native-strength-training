# E2E Critical Path Test Specification

> **Note**: Full E2E testing requires Detox or Maestro on an Expo dev build.
> This document specifies the critical path test scenario and assertions for
> manual or automated verification.

## Test: Login → Browse Exercises → Create Routine → Execute Workout → Verify PR

### Setup

- App is installed and launched fresh (no cached session)
- Supabase backend is running with seed data (50+ exercises)

### Step 1: Login

| Action | Assertion |
|--------|-----------|
| Open app → redirected to login screen | Login screen visible with email and password fields |
| Tap "Register" link | Register screen visible |
| Enter email: `test-e2e@example.com`, password: `TestPass1`, displayName: `E2E User` | Inputs accepted, no validation errors |
| Tap "Create Account" | Loading indicator, then redirect to home screen |
| Sign out via profile screen | Redirected to login screen |
| Enter same email + password on login screen | Login succeeds, home screen visible |

### Step 2: Browse Exercises

| Action | Assertion |
|--------|-----------|
| Tap "Exercises" tab | Exercise list loads with paginated items |
| Verify at least 10 exercises visible | Exercise cards show name, category, equipment |
| Tap category filter → select "Strength" | List filters to strength exercises only |
| Clear filter → all exercises shown | List returns to full set |
| Tap any exercise | Detail screen opens with description, equipment, body region, default sets/reps |

### Step 3: Create Routine

| Action | Assertion |
|--------|-----------|
| Tap "Routines" tab | Routine list shows empty state |
| Tap "Create Routine" | Routine form opens |
| Enter name: `E2E Push Day` | Name field populated |
| Tap "Add Exercise" → search "Bench Press" → select it | Exercise added to routine with default sets/reps |
| Add Squat as second exercise | Two exercises in list, sorted by order |
| Tap "Save" | Routine saved, visible in list |
| Open the saved routine | Detail shows both exercises with target config |

### Step 4: Execute Workout

| Action | Assertion |
|--------|-----------|
| Tap "Train" tab | Train screen with "Start Workout" |
| Select `E2E Push Day` routine | Start workout with pre-filled exercises |
| Tap "Start" | Active workout screen opens, current exercise = Bench Press |
| Log set: 60kg × 10, RPE 7 | Set recorded, rest timer starts |
| Wait for rest or skip timer | Timer stops, ready for next set |
| Log set: 60kg × 10, RPE 8 | Second set recorded |
| Log set: 60kg × 10, RPE 9 | Third set recorded |
| Move to Squat | Current exercise switches to Squat |
| Log set: 100kg × 5, RPE 8 | Set recorded for Squat |
| Log set: 100kg × 5, RPE 9 | Second set for Squat |
| Log set: 100kg × 5, RPE 9.5 | Third set for Squat |
| Tap "Finish Workout" | Confirmation dialog |
| Confirm "Complete" | Workout complete screen with summary (volume, duration, exercises) |
| Tap "Done" | Redirected to home screen |

### Step 5: Verify PR on Progress Screen

| Action | Assertion |
|--------|-----------|
| Tap "Progress" tab | Progress screen loads |
| Find Squat section (expand if collapsed) | Squat PRs visible: e1RM (~116.67), best volume set (500) |
| Find Bench Press section | Bench Press PRs visible: e1RM (~80), best volume set (600) |
| Note: PR types shown include estimated_one_rep_max and best_volume_set | PR cards show type, value, date |

### Step 6: Verify History

| Action | Assertion |
|--------|-----------|
| Tap "Home" → History card | History list shows 1 completed session |
| Tap session row | Detail screen: date, duration, exercises (Bench, Squat), sets per exercise, volume per exercise |

## Expected Pass Criteria

- All steps complete without crash or error toast
- PR values are mathematically correct per Epley formula
- Session appears in history with correct data
- App handles back-navigation at each step gracefully

## Prerequisites

- [ ] Supabase project deployed with schema + seed
- [ ] Expo dev build with Detox or Maestro config
- [ ] Test device or emulator
