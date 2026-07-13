# Tasks: Fix Welcome Screen Redirect After Web Refresh

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80 (modify `app/index.tsx` ~+25/-69, new `app/__tests__/index.test.tsx` ~60) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (≤400 lines, no chaining) |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## TDD Order

Strict TDD per `AGENTS.md`: write failing test (T1) BEFORE implementation (T2). Verify (T3), then PR (T4).

---

## Tasks

- [x] T1 (RED) Add failing test `app/__tests__/index.test.tsx` covering all branches
  **Details:** Mock `expo-router` `useRouter` with a local `mockReplace` (override global setup). Drive `useAuthStore.setState(...)` in `beforeEach` with `jest.clearAllMocks()`. Assert: athlete→`replace("/(tabs)/home")` once; coach→`replace("/(coach)")` once; team-coach athlete→`replace("/(coach)")`; unauthenticated→`mockReplace` not called + "Inicia sesión" present; loading→`mockReplace` not called + no button text.
  **Files:** `app/__tests__/index.test.tsx` (new)
  **Acceptance:** `npx jest app/__tests__/index.test.tsx` FAILS against current `app/index.tsx` (redirect not yet implemented). Tests mirror `app/(auth)/__tests__/signup-info.test.tsx` setup.
  **Depends on:** none

- [x] T2 (GREEN) Rewrite `app/index.tsx` per design
  **Details:** `import { useEffect } from "react"; import { useRouter } from "expo-router"; import { useAuthStore } from "@/stores/auth-store";`. Subscribe `const { state, role, isTeamCoach } = useAuthStore();`. Add `useEffect` keyed `[state, role, isTeamCoach, router]` with `cancelled` cleanup: when `state==="authenticated"`, `target = (role==="coach" || isTeamCoach) ? "/(coach)" : "/(tabs)/home"; if (!cancelled) router.replace(target);`. Render `loading`/`authenticated` → logo-only splash (GradientBackground + SafeAreaView + infinite-outline icon + "THE HYBRID PROJECT" + footer, NO buttons). Render `unauthenticated` → existing welcome UI unchanged.
  **Files:** `app/index.tsx` (modify)
  **Acceptance:** `npx jest app/__tests__/index.test.tsx` passes; `npx tsc --noEmit` clean; no redirect loop; `app/_layout.tsx`, `auth-store.ts`, PocketBase client untouched.
  **Depends on:** T1

- [x] T3 (VERIFY) Run test suite + type check + coverage gate
  **Details:** `npx jest app/__tests__/index.test.tsx` must pass. Coverage for `app/index.tsx` ≥80%. Run `npx tsc --noEmit`. Run full `npm test` to confirm no regressions.
  **Files:** `app/index.tsx`, `app/__tests__/index.test.tsx`
  **Acceptance:** All tests green; coverage ≥80% for `app/index.tsx`; tsc clean.
  **Depends on:** T2

- [ ] T4 (PR) Branch, commit work units, open single PR
  **Details:** Create branch `fix/welcome-refresh-redirect`. Conventional commits: `test:` (T1), `fix:` (T2), `refactor:` if cleanup. Open a SINGLE PR (≤400 lines, no chaining) via `branch-pr` skill at `/root/.config/opencode/skills/branch-pr/SKILL.md`.
  **Files:** `app/index.tsx`, `app/__tests__/index.test.tsx`
  **Acceptance:** PR opened, diff ≤400 lines, links this change's proposal/spec/design.
  **Depends on:** T3

## Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | RED test + GREEN impl + verify | PR 1 | `npx jest app/__tests__/index.test.tsx` | N/A (web refresh redirect is runtime-only; covered by unit test asserting `replace`) | `git checkout -- app/index.tsx`; test file deletable independently |
