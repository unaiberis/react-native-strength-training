# Proposal: Fix Program Assignments Schema Mismatch

## Intent

`listAssignments()` returns 400 errors because TypeScript types and service code use bare field names (`athlete`, `coach`, `template`, `start_date`) while the PocketBase server was created with `_id` suffix convention (`athlete_id`, `coach_id`, `template_id`, `started_at`). The coach-side `assignProgram` also silently writes to non-existent fields. 10 existing records on the server are unreachable through the app due to this mismatch.

## Scope

### In Scope
- Align `ProgramAssignmentRow` type fields to server schema (`athlete_id`, `coach_id`, `template_id`, `started_at`, `assigned_at`, `completed_at`, `program_id`, `notes`, `paused` status)
- Fix all 7 functions in `program-assignments.ts` to use correct filter/create/update/sort field names
- Fix `mapAssignmentToProgramSummary()` — replace `row.start_date` with `row.started_at` and remove `expand: "template"` (text field, not relation)
- Update `UpdateAssignmentInput.status` to include `"paused"`
- Fix `scripts/seed-teams.mjs:297` dedup readback keys (`a.athlete` → `a.athlete_id`, `a.template` → `a.template_id`)
- Update all test assertions and mock fixtures to match new field names
- No schema changes — server is the truth

### Out of Scope
- Adding `expand: "template"` equivalent (template_name is a text field — fetching it separately is a future UX enhancement, not a fix)
- `program_id` and `notes` fields in service calls (present in type but not yet used by any flow — add when needed)
- `completed_at` write logic (no business flow sets it yet — type-only addition)
- PocketBase migration scripts (schema created manually; no migration to fix)

## Capabilities

### New Capabilities
None — pure refactor/internal alignment. No new user-facing behavior introduced.

### Modified Capabilities
None — no spec-level behavior changes. The API contract (return `ProgramAssignmentRow[]`) is unchanged, only payload/query field names are fixed.

## Approach

**Option A (recommended by explore):** Align code to server. The server already uses the established `_id` convention matching `WorkoutFeedbackRow`. Fix 6 files in dependency order:

1. `ProgramAssignmentRow` type → correct names, add missing fields
2. Service functions → fix all filter, create, update field names; remove `expand: "template"`
3. `useAthleteAssignments.ts` → `row.start_date` → `row.started_at`, drop `expand.template` from `AssignmentWithTemplate`
4. `useAthleteDetail.ts` — no code changes needed (delegates to `listAssignments`)
5. Test fixtures + assertions → match new field names
6. `seed-teams.mjs` dedup key → fix readback field names

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/types/pocketbase.ts` | Modified | `ProgramAssignmentRow` field names + types |
| `src/lib/pocketbase/services/program-assignments.ts` | Modified | All 7 functions: filters, creates, updates, expands |
| `src/features/programs/hooks/useAthleteAssignments.ts` | Modified | `start_date` → `started_at`, remove `expand.template` |
| `src/features/coach/hooks/useAthleteDetail.ts` | None | Pure consumer — fix in service propagates |
| `src/lib/pocketbase/services/__tests__/program-assignments.test.ts` | Modified | Fixtures + assertions |
| `scripts/seed-teams.mjs` | Modified | Dedup key at line 297 |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `paused` status in type breaks consumers that switch on status | Low | `paused` is additive — existing `active|completed|cancelled` branches unchanged. New value handled at display layer only. |
| Code references `row.template_id` where `expand.template.id` was used | Medium | TypeScript catches all field-access mismatches after type change. Run `npx tsc --noEmit` after edits. |
| Seed script dedup broken after fix still | Low | Fix is explicit: `a.athlete_id` vs `a.athlete`. Verified against `listAll` response shape. |

## Rollback Plan

1. **Git revert:** `git revert HEAD` on the single fix commit restores all files.
2. **No data migration:** No schema changes — no data to revert.
3. **No database state change:** Fix is purely code-side; no migration run.

## Dependencies

None. This is a self-contained code alignment.

## Success Criteria

- [ ] `listAssignments(userId)` returns records without 400 error
- [ ] `assignProgram(...)` creates valid records on server (verified by curl)
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx jest src/lib/pocketbase/services/__tests__/program-assignments.test.ts` passes
- [ ] Coach can assign programs to athletes without silent failure
- [ ] Athlete can view assigned programs without error
