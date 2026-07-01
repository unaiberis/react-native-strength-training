# Proposal: Backend Migration — Supabase to PocketBase

## Intent

Replace Supabase (auth + DB + realtime) with a self-hosted PocketBase instance. Reduce operational cost, simplify the stack, and gain local-first capability via expo-sqlite for offline workouts.

## Scope

### In Scope
- Drop-in replacement of `src/lib/supabase/` by `src/lib/pocketbase/` (same service interfaces)
- Auth (email/password) migrated from Supabase Auth to PocketBase Auth
- All 5 data collections migrated: exercises, workout_templates, workout_template_exercises, workout_sessions, exercise_sets
- Expose same service exports so consuming code (stores, hooks) requires **no behavioral changes**
- Seed 50+ predefined exercises from `supabase/seed.sql` into PocketBase
- Install `expo-sqlite` for local storage (offline foundation)
- PRs computed on-the-fly from `exercise_sets` instead of persisted `personal_records` collection
- Data migration script: exports Supabase → imports PocketBase
- Keep `expo-secure-store` for auth token persistence

### Out of Scope
- Offline/local-first sync logic (future change)
- Multi-device conflict resolution
- Program blocks / periodization (not yet implemented)
- UI changes or new screens

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `user-auth`: Auth backend changes from Supabase Auth to PocketBase Auth (same email/password, same session persistence via SecureStore)
- `personal-records`: PRs computed on-the-fly from `exercise_sets` on read — no separate `personal_records` collection or write-on-complete step

## Approach

Create `src/lib/pocketbase/` mirroring the current `src/lib/supabase/` structure:
- `client.ts` — PocketBase SDK init with SecureStore adapter
- `services/auth.ts` — PocketBase `pb.collection("users").authWithPassword()` / `create()`
- `services/exercises.ts` — `pb.collection("exercises").getList()` / `getOne()`
- `services/templates.ts` — `pb.collection("workout_templates")` CRUD
- `services/sessions.ts` — session lifecycle + set logging
- `services/prs.ts` — on-the-fly PR calc from local `exercise_sets` queries

Replace `@supabase/supabase-js` by PocketBase SDK. Add `expo-sqlite` dep. All consumers import from the new path via a barrel export. Existing Supabase files deleted after migration.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/supabase/` | Removed | Entire directory replaced by pocketbase/ |
| `src/lib/pocketbase/` | New | 6 service files mirroring current interfaces |
| `src/shared/utils/pr-calc.ts` | Modified | Add on-the-fly computation entry point |
| `supabase/seed.sql` | Kept | Reference for PocketBase seed script |
| `package.json` | Modified | Add `expo-sqlite`, remove `@supabase/supabase-js` |
| `openspec/specs/user-auth/spec.md` | Modified | Backend ref from Supabase → PocketBase |
| `openspec/specs/personal-records/spec.md` | Modified | On-the-fly vs persisted PRs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data loss during migration | Low | Dry-run first, verify counts, rollback script ready |
| Auth tokens incompatible | Low | PocketBase JWT stored in SecureStore (same pattern) |
| On-the-fly PR perf on large datasets | Low-Med | Index exercise_sets by (user_id, exercise_id, achieved_at); paginate query |
| Existing mock client breaks | Low | PocketBase mock mirrors current Supabase mock pattern |

## Rollback Plan

1. Keep `@supabase/supabase-js` in `package.json` during migration (don't remove until verified)
2. Keep `src/lib/supabase/` intact during development (don't delete until verified)
3. Atomic cutover: switch imports in barrel/index file — instant revert by pointing back to supabase barrel
4. Data migration is additive: Supabase data untouched during export
5. If issues: restore imports, point PocketBase URL to env var toggle

## Dependencies

- PocketBase v0.27.0 running at `http://127.0.0.1:8090` (configured via env var)
- `pocketbase` npm SDK (already in `node_modules`)
- `expo-sqlite` (to be installed)
- Supabase credentials for data migration (env vars)

## Success Criteria

- [ ] All 128 existing Jest tests pass after migration
- [ ] Auth: register, login, session restore, logout all work against PocketBase
- [ ] Exercise library: browse, filter, detail, search return PocketBase data
- [ ] Templates: CRUD operations against PocketBase collections
- [ ] Sessions: create, log sets, complete, cancel, history listing
- [ ] PRs: computed on-the-fly return correct values matching old persisted approach
- [ ] Seed: all 50+ exercises present after init
- [ ] Data migration: user data round-trips correctly (export → import → verify)
