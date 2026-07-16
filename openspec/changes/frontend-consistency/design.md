# Design: Frontend Consistency

## Technical Approach

5 sequential stacked PRs, each atomic and independently revertable, chained to `main`. No branching fork — each PR targets `main` post-merge of the previous. Zero behavior changes in PRs #1, #2, #4, #5; PR #3 adds two new capabilities (forgot-password screen, evolution chart integration).

---

## Architecture Decisions

### Decision: Import migration — batch regex, not manual

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Manual per-file | Safe but 25+ files × 2-10 imports = slow | ❌ |
| Batch `sed` + review | Fast, grep audit catches misses | ✅ |
| Codemod | Overkill for flat pattern | ❌ |

`../../src/` → `@/` and `../../../src/` → `@/` via `sed -i`, then `npx tsc --noEmit` + test suite for validation.

### Decision: Navigation theme — `defaultScreenOptions` object

Extract the repeated `headerStyle: { backgroundColor: "#171719" }, headerTintColor: "#F4F4F2"` from 10+ `Tabs.Screen` entries into a shared `DETAIL_HEADER` constant in `_layout.tsx`. Single source of truth that maps to Tailwind tokens (`bg-card`, `text-surface-50`).

### Decision: Forgot-password — PocketBase native, no custom service

PocketBase's `pb.collection("users").requestPasswordReset(email)` already exists in the mock client (line 102-103 of `client.ts`). The real client handles SMTP. No service-layer change needed — call it directly from the new screen/hook.

### Decision: Screen extraction — preserve route params via `useLocalSearchParams`

Each extracted screen component receives params via `useLocalSearchParams` (same as current inline code). Route file becomes a one-line `<Screen />` wrapper. No param forwarding via props — keeps Expo Router's lazy-loading intact.

---

## PR-by-PR File Changes

### PR #1 — Import alignment + dead code

| File | Action | Description |
|------|--------|-------------|
| ~20 `app/` files | Modify | `../../src/` → `@/`, `../../../src/` → `@/` (e.g., `profile.tsx`, `train.tsx`, `login.tsx`, `active.tsx`, `_layout.tsx` files) |
| `app/(tabs)/home.tsx` | Modify | Merge `findAssignedToday` block + `PressScale` History button from `index.tsx` |
| `app/(tabs)/index.tsx` | Delete | Logic absorbed into `home.tsx` |
| `app/(tabs)/__tests__/index.test.tsx` | Modify/Delete | Point to `home.tsx` or remove |
| `app/(tabs)/__tests__/home.test.tsx` | Modify | Update imports if aliased |

### PR #2 — Critical tests

| File | Action | Description |
|------|--------|-------------|
| `src/features/workout/hooks/__tests__/useWorkoutSession.test.ts` | Create | Mock pb, test session CRUD |
| `src/features/workout/hooks/__tests__/useRestTimer.test.ts` | Create | Pure timer logic test |
| `src/features/history/hooks/__tests__/useHistory.test.ts` | Create | List + detail with mock pb |
| `src/features/exercises/hooks/__tests__/useExercises.test.ts` | Create | Filtering + pagination |
| `src/features/analytics/hooks/__tests__/useAnalytics.test.ts` | Create | Volume calc, period toggle |
| `src/features/home/hooks/__tests__/useHomeStats.test.ts` | Create | Aggregation queries |
| `src/features/profile/screens/__tests__/ProfileScreen.test.tsx` | Create | Render with mock auth |
| `src/features/wellness/screens/__tests__/WellnessDashboardScreen.test.tsx` | Create | Render with mock trends |
| `src/features/exercises/screens/__tests__/ExerciseListScreen.test.tsx` | Create | List render + search |

### PR #3 — Forgot password + evolution chart

| File | Action | Description |
|------|--------|-------------|
| `app/(auth)/forgot-password.tsx` | Create | Route wrapper |
| `src/features/auth/screens/ForgotPasswordScreen.tsx` | Create | Email input + `pb.collection("users").requestPasswordReset(email)` |
| `src/features/auth/hooks/__tests__/ForgotPasswordScreen.test.tsx` | Create | Test submit + success/error states |
| `src/features/auth/screens/LoginScreen.tsx` | Modify | Add "Forgot password?" link below password input |
| `src/features/records/components/PersonalRecordsSection.tsx` | Modify | Add per-exercise `LineChart` showing weight/volume over time |
| `src/features/records/hooks/usePersonalRecords.ts` | Modify | Expose `prTimeline` data per exercise for chart |
| `src/features/records/components/__tests__/PersonalRecordsSection.test.tsx` | Modify | Add evolution chart render tests |

### PR #4 — Inline screen extraction

| File | Action | Description |
|------|--------|-------------|
| `app/(coach)/assign.tsx` | Modify | Thin wrapper → `CoachAssignmentScreen` |
| `src/features/coach/screens/CoachAssignmentScreen.tsx` | Create | Extracted from `assign.tsx` |
| `app/(coach)/athletes.tsx` | Modify | Thin wrapper → `CoachAthletesScreen` |
| `src/features/coach/screens/CoachAthletesScreen.tsx` | Create | Already exists partially — consolidate |
| `app/(coach)/teams/[id].tsx` | Modify | Thin wrapper → `TeamDetailScreen` |
| `src/features/coach/screens/TeamDetailScreen.tsx` | Create | Extracted from `teams/[id].tsx` |
| `app/(coach)/library/create.tsx` | Modify | Thin wrapper → `ExerciseLibraryCreateScreen` |
| `app/(coach)/library/[id]/edit.tsx` | Modify | Thin wrapper |
| `app/(auth)/signup-info.tsx` | Modify | Thin wrapper → `SignUpInfoScreen` |
| `src/features/auth/screens/SignUpInfoScreen.tsx` | Create | Extracted from `signup-info.tsx` |

### PR #5 — Theme hardening

| File | Action | Description |
|------|--------|-------------|
| `app/(tabs)/_layout.tsx` | Modify | `backgroundColor: "#0B0B0C"` → `bg-bg-soft`, `borderTopColor: "#343437"` → `border-border`. Extract `DETAIL_HEADER` constant. |
| `app/(coach)/_layout.tsx` | Modify | Same pattern: `tabBarStyle` hex → Tailwind classes |
| `src/constants/theme.ts` | Create | Token constants for Reanimated styles that can't use Tailwind classes: `TAB_BAR_BG`, `TAB_BAR_BORDER`, `TAB_BAR_HEIGHT` |

---

## Testing Strategy

| PR | Layer | Approach |
|----|-------|----------|
| #1 | Type-check | `npx tsc --noEmit` validates all imports resolve |
| #1 | Regression | Full `npx jest` — existing tests must stay green |
| #2 | Unit | Pure TS tests with mocked PocketBase client. Follow existing pattern: `jest.mock("@/lib/pocketbase/client")`, node env, ts-jest |
| #2 | Coverage | Each new file >=80% coverage |
| #3 | Unit | ForgotPasswordScreen: mock `pb.collection().requestPasswordReset`, test success + error. PersonalRecordsSection: mock `usePersonalRecords` + test chart renders with data |
| #4 | Regression | Extracted screens render identically — existing tests pass |
| #5 | Visual | Manual verification that tab bars look identical. Jest regression for layout files if they have tests |

---

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

---

## Migration / Rollout

No migration required. Each PR is fully revertable via `git revert <merge-commit>`. No data migrations, no feature flags, no schema changes.

---

## Open Questions

- [ ] Should `app/(tabs)/__tests__/index.test.tsx` be deleted or repointed to `home.tsx`? (Decision: keep and repoint — tests for merged features should survive)
