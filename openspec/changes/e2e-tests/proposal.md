# Proposal: E2E Tests with Maestro

## Problem
The app has 394 unit/integration tests but zero E2E tests. Critical user flows (login → workout → sync) are only covered by a manually maintained `E2E_CRITICAL_PATH.md` doc. No automated regression detection for full-device scenarios.

## Solution
Setup Maestro (mobile E2E framework by Mobile.dev) with a critical-path flow that exercises the complete offline sync pipeline:

1. Launch app (offline) → login with stored token
2. Browse exercise library (offline cache)
3. Create template offline
4. Start workout from template
5. Log sets with tempo, weight, reps
6. Complete workout
7. Go online → verify sync completed

## Why Maestro
- Cross-platform (iOS + Android) from a single YAML flow
- No custom instrumentation needed — works with any RN/Expo app
- Fast feedback loop (sub-5min full flow)
- Free tier for CI

## Scope
1. Install Maestro CLI + configure in CI
2. Create `e2e/` directory with:
   - `e2e/critical-path.yaml` — full offline→online flow
   - `e2e/auth.yaml` — login/logout flow
   - `e2e/workout.yaml` — workout CRUD flow
3. Wire into CI (`.github/workflows/ci.yml`) as optional step (not blocking)

## Non-goals
- Visual regression testing
- Performance benchmarking
- iOS simulator flow (Android-first)

## Risk
Low — Maestro runs externally, no changes to app code. CI step is non-blocking.
