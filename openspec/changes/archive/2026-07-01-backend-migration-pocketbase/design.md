# Design: Backend Migration — Supabase to PocketBase

## Technical Approach

Drop-in replacement of `src/lib/supabase/` by `src/lib/pocketbase/` preserving the same service interface signatures, types, and export structure. Consuming hooks, screens, and stores change only their import path. PocketBase URL toggled via `EXPO_PUBLIC_POCKETBASE_URL` env var — when empty, app uses a mock client (same pattern as current Supabase mock). PRs computed on-the-fly from `exercise_sets` instead of a persisted `personal_records` collection.

## Architecture Decisions

| Decision               | Choice                                                   | Alternatives                           | Rationale                                                                                                                      |
| ---------------------- | -------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Service types location | `types/pocketbase.ts`                                    | Inline in each service                 | Single source of truth for DB→app type mapping; all 5 services share `id`, `created`, `updated` base; avoids scattered casts   |
| Auth token persistence | `expo-secure-store` via PocketBase `AuthStore` interface | PocketBase in-memory default           | Same adapter pattern already exists in `client.ts` for Supabase; port `ExpoSecureStoreAdapter` to PocketBase's `BaseAuthStore` |
| PR computation         | On-the-fly query of `exercise_sets`                      | Separate `personal_records` collection | Eliminates write-on-complete step; no collection to migrate; indexed query performs well; PR calc utils already standalone     |
| Import strategy        | Barrel file per service (same shape)                     | Path alias swap at build level         | No tooling changes; consumer imports change exactly one path segment per file: `supabase` → `pocketbase`                       |
| Mock client            | Same mock pattern in `client.ts`                         | Remove mock entirely                   | UI development and CI without a running PocketBase still needed; existing 100ms delay prevents root-layout race                |
| Env var toggle         | `EXPO_PUBLIC_POCKETBASE_URL`                             | New config module                      | Follows existing `EXPO_PUBLIC_SUPABASE_URL` pattern; zero config change for consumers                                          |
| Data migration script  | Standalone Node.js script                                | Inline in app startup                  | Security: admin token never in app bundle; separation of concerns: migration is one-time ops, not app behavior                 |

## Data Flow

```
App _(layout.tsx) → import getSession
   │
   ▼
Hook (useAuth, useExercises, etc.)
   │  imports from pocketbase/services/*  (same interface as supabase)
   ▼
PocketBase service
   │  pb.collection("workout_sessions").getList(...)
   ▼
PocketBase SDK → HTTP → PocketBase Server (127.0.0.1:8090)
   │
   ▼
Response mapped to app types (ExerciseRow, SessionRow, etc.)
```

Auth flow detail:

```
App cold start
  → _layout.tsx init()
  → pocketbase/auth.getSession()
  → pb.authStore.isValid (checks stored token in SecureStore)
  → if valid: auto-refresh via PocketBase SDK
  → auth-store.ts: setSession({user, token})
  → navigation redirects based on auth state
```

PR flow (on-the-fly):

```
usePersonalRecords()
  → prs.listPRs(userId)
  → pb.collection("exercise_sets").getList(filter by userId, group by exercise_id)
  → shared/utils/pr-calc.ts: detectPRs() per exercise
  → return computed PRs (no personal_records collection read)
```

## File Changes

| File                                                 | Action | Description                                                                                                              |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/pocketbase/client.ts`                       | Create | PocketBase init + AuthStore adapter + mock fallback                                                                      |
| `src/lib/pocketbase/services/auth.ts`                | Create | signUp, signIn, signOut, getSession, onAuthStateChange                                                                   |
| `src/lib/pocketbase/services/exercises.ts`           | Create | listExercises, getExercise, searchExercises, getCategories                                                               |
| `src/lib/pocketbase/services/templates.ts`           | Create | createTemplate, listTemplates, getTemplate, updateTemplate, deleteTemplate, reorderTemplateExercises                     |
| `src/lib/pocketbase/services/sessions.ts`            | Create | createSession, logSet, completeSession, cancelSession, getSession, getSessionDetail, listSessions, updateSessionDuration |
| `src/lib/pocketbase/services/prs.ts`                 | Create | listPRs (on-the-fly from exercise_sets), getExercisePRs                                                                  |
| `src/lib/pocketbase/index.ts`                        | Create | Barrel exports (re-exports all services)                                                                                 |
| `src/types/pocketbase.ts`                            | Create | Type mapping: snake_case DB → camelCase app interfaces                                                                   |
| `src/stores/auth-store.ts`                           | Modify | Replace `Session/User` from supabase-js with PocketBase `RecordModel`                                                    |
| `app/_layout.tsx`                                    | Modify | Import `getSession` from `pocketbase/services/auth`                                                                      |
| `src/features/auth/hooks/useAuth.ts`                 | Modify | Import from `pocketbase/services/auth`                                                                                   |
| `src/features/exercises/hooks/useExercises.ts`       | Modify | Import from `pocketbase/services/exercises`                                                                              |
| `src/features/routines/hooks/useTemplates.ts`        | Modify | Import from `pocketbase/services/templates`                                                                              |
| `src/features/workout/hooks/useWorkoutSession.ts`    | Modify | Import types + service from `pocketbase/services/sessions`                                                               |
| `src/features/history/hooks/useHistory.ts`           | Modify | Import types + service from `pocketbase/services/sessions`                                                               |
| `src/features/records/hooks/usePersonalRecords.ts`   | Modify | Import types + service from `pocketbase/services/prs`                                                                    |
| 6 screen files importing types                       | Modify | All import paths from `supabase` → `pocketbase`                                                                          |
| `src/features/auth/hooks/__tests__/useAuth.test.tsx` | Modify | Mock path from `supabase/services/auth` → `pocketbase/services/auth`                                                     |
| `package.json`                                       | Modify | Add `expo-sqlite`, keep `@supabase/supabase-js` until verified                                                           |
| `scripts/seed-pocketbase.mjs`                        | Create | Standalone seed script: parse `supabase/seed.sql` → POST exercises to PocketBase                                         |

## Interfaces / Contracts

```typescript
// types/pocketbase.ts — All PocketBase records share:
interface PBBase {
  id: string;
  created: string; // ISO datetime
  updated: string; // ISO datetime
}

// Auth store uses PocketBase types instead of supabase:
interface AuthStore {
  session: { user: RecordModel; token: string } | null;
  user: RecordModel | null;
}

// Service functions KEEP SAME return types as supabase versions:
// ExerciseRow, TemplateRow, SessionRow, ExerciseSetRow, etc.
// Only the implementation changes (supabase.from() → pb.collection())
```

Key difference: `prs.ts` no longer has `PersonalRecordRow` or `detectAndSavePRs()`. Instead `listPRs()` queries `exercise_sets`, groups by `exercise_id`, calls `shared/utils/pr-calc.ts: detectPRs()` per group, and returns computed results. Return shape changes from `PersonalRecordRow[]` to `ComputedPR[]`.

## Testing Strategy

| Layer       | What                      | Approach                                                       |
| ----------- | ------------------------- | -------------------------------------------------------------- |
| Unit        | PR calc logic (unchanged) | Existing `pr-calc.test.ts` — no changes needed                 |
| Unit        | PocketBase services       | Jest mock of PB SDK; test each endpoint mapping                |
| Unit        | Mock client               | Verify mock returns null session, empty lists                  |
| Integration | Auth hook                 | Update mock path in `useAuth.test.tsx`; same scenario coverage |
| E2E         | Full auth + data flow     | Manual against running PB instance at 127.0.0.1:8090           |

Existing 128 tests remain target. Mock path update in `useAuth.test.tsx` only test change needed — all hooks mock their service module, so behavior tests pass unchanged.

## Migration / Rollout

**Env var gating**: `EXPO_PUBLIC_POCKETBASE_URL` (default empty). When empty → mock client. When set → real PocketBase client. No toggle between Supabase and PocketBase — this is a cutover, not a dual-write.

**Seed script** (`scripts/seed-pocketbase.mjs`):

1. Read `supabase/seed.sql`
2. Parse INSERT INTO exercises VALUES (...)
3. For each row, POST to PocketBase `exercises` collection via PB admin API
4. Verify count matches expected

**Phase plan**:

1. Create `types/pocketbase.ts` + all `services/*.ts` + mock client
2. Create `expo-sqlite` foundation (collection schema definitions only — sync logic is future)
3. Update `auth-store.ts` types + all consumer import paths
4. Update test mock paths → all 128 tests pass
5. Run seed script against PocketBase
6. Manual smoke test: register, browse exercises, create template, complete workout, check PRs
7. Update spec files (user-auth, personal-records) to reference PocketBase
8. Remove `src/lib/supabase/` and `@supabase/supabase-js` after verification

## Open Questions

- None — client adapter and service shape are fully determined by existing code
