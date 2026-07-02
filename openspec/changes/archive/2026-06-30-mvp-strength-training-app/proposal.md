# Proposal: MVP — Strength Training App

## Intent

TrainingPeaks-style strength-only app. Phase 1: browse exercises, build routines, log workouts, view history, surface PRs. Foundation for later phases.

## Scope

**In**: Email/password auth via Supabase; exercise library (name, category, equipment); routine builder (templates with ordered exercises); workout execution (start session, log sets with reps/weight/RPE/RIR, rest timer); workout history (paginated list, detail view); personal records (auto-detect 1RM, e1RM, volume, tonnage PRs); tab nav (Home, Train, Programs, Progress, Profile); sports metrics (RPE, RIR, frequency, density, effective sets).

**Out**: Block programming, charts, fatigue (Phase 2). Coach↔athlete, shared programs, social (Phase 3). Social login, offline sync, wearables.

## Capabilities

### New

- `user-auth`: Register, login, logout, profile, session persistence
- `exercise-library`: Catalog CRUD — name, category, equipment, body region
- `routine-builder`: Templates with ordered exercises and set config
- `workout-execution`: Start/end sessions, log sets (reps, weight, RPE, RIR), rest timer
- `workout-history`: Paginated session list, detail drill-down
- `personal-records`: Auto-detected PRs (1RM, e1RM, volume, tonnage)

### Modified

None — greenfield.

## Approach

Scaffold via `create-expo-app` (TS + Expo Router). Supabase Auth, TanStack Query for server-state, Zustand for UI/workout-session state, NativeWind, React Hook Form + Zod. Domain logic in custom hooks + services, not raw Supabase calls in components. RLS scoped to user. Seed 50+ exercises via migration.

## Affected Areas

| Area                   | Impact   | Description                                          |
| ---------------------- | -------- | ---------------------------------------------------- |
| `app/`                 | New      | Expo Router screens (auth, tabs, modals)             |
| `src/features/`        | New      | Auth, exercises, routines, workout, history, records |
| `src/shared/`          | New      | UI primitives, design system                         |
| `src/lib/`             | New      | Supabase, TanStack Query, API layer                  |
| `src/stores/`          | New      | Zustand stores                                       |
| `supabase/migrations/` | New      | Schema, RLS, seed                                    |
| `package.json`         | Modified | Dependencies                                         |

## Risks

| Risk                         | Likelihood | Mitigation                     |
| ---------------------------- | ---------- | ------------------------------ |
| Scope creep into Ph2         | Med        | Freeze list, enforce in review |
| RLS data leaks               | Low        | Policy tests + peer review     |
| Network loss during workouts | Low        | stale-while-revalidate, toast  |

## Rollback Plan

Greenfield — delete project dir, restore from git. Destructive migrations include rollback scripts.

## Dependencies

Node v24.13.0, npm 11.6.2. Supabase project (create + API keys). `create-expo-app`. No existing code.

## Success Criteria

- [ ] Auth: sign up, sign in, session survives app restart
- [ ] Exercises: 50+ seed items browsable by category
- [ ] Routines: create/edit/delete templates with 4+ exercises
- [ ] Workout execution: start template/blank, log sets, end session
- [ ] History: past sessions listed with detail drill-down
- [ ] PRs: 1RM/volume PRs auto-appear after qualifying sets
- [ ] Build: `npx expo export` succeeds with zero errors
