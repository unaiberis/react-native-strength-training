# Proposal: Enrich Demo Seed Data

## Intent

Current seed data leaves populated fields that real UI screens consume. Session logging, personal records, progression charts, coach dashboards, and wellness trends all show empty/partial states because seed scripts don't fill optional schema fields or spread data across users. This change enriches the existing seed scripts to exercise the full schema and feature surface.

## Scope

### In Scope
1. **Populate empty exercise fields** — add `video_url` (YouTube links) and descriptions for all 63 exercises
2. **Fill `rir` and `tempo` on exercise_sets** — add `rir: 0..3` and `tempo: "20X0"` style values in session seed data
3. **Set `target_rpe_low/high` on template_exercises** — add RPE targets (e.g., `6-8`, `7-9`) to all 12 template exercises
4. **Add session data for beginner and intermediate profiles** — 8-10 sessions each, spanning 30-90 days
5. **Expand wellness entries** — 14-30 days per athlete (not just today)
6. **Add 6 more templates** (moving from 12 toward the 18 defined in seed-system.md spec)
7. **Add an in-progress session for intermediate** (currently only test@test.com has one)

### Out of Scope
- Coach-specific session creation flow (coach creating sessions for athletes) — deferred
- The full 78-week progression generator described in seed-system.md
- Video content hosting or upload — seed only references existing YouTube URLs
- UI changes to consume richer data
- Adding new PocketBase collections

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `seed-system`: expanding the existing seed scripts; requirements change is additive (populate more fields, more users)

## Approach

- **`seed-pocketbase.mjs`**: add `video_url` and description data inline as a lookup map keyed by exercise name. Existing parse-then-post loop unchanged — extra fields flow through to PB.
- **`seed-demo-data.mjs`**: extend the `SESSIONS` array with per-athlete blocks; add `rir` and `tempo` to each set definition; add `target_rpe_low`/`target_rpe_high` to template exercise definitions; add 6 new template entries.
- **`seed-teams.mjs`**: expand the wellness generator from 1 to 14-30 entries per athlete using a date loop.
- All changes additive — existing data preserved. `--clean` flag still resets per-user data.
- Exercise resolution (name→ID map) already works; new templates reference existing exercises.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/seed-pocketbase.mjs` | Modified | Add `video_url` + description lookup map |
| `scripts/seed-demo-data.mjs` | Modified | Add rir/tempo, target_rpe, 6 templates, beginner/intermediate sessions |
| `scripts/seed-teams.mjs` | Modified | Expand wellness from 1 to 14-30 days per athlete |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| New exercise names in lookup map don't match PB records | Low | Script validates all keys exist before POST; CI run of seed verifies |
| RIR/tempo values are unrealistic for certain exercise types | Low | Use conservative defaults (rir: 0-2, tempo: 20X0) — validated by `verify-seed` |
| 14-30 wellness entries per athlete increases seed time | Low | Tiny payloads — well under rate limits |

## Rollback Plan

Re-run `seed-pocketbase.mjs` without changes (additive for video_url — just skip if already set). Re-run `seed-demo-data.mjs` without `--clean` (additive only — new templates/sessions added without removing old). Re-run `seed-teams.mjs` without `--clean` (adds wellness entries without removing). Full rollback: restore `pb_data/` from backup.

## Dependencies

None — all changes are self-contained within existing seed scripts.

## Success Criteria

- [ ] All 63 exercises have non-empty `video_url` and `description`
- [ ] All exercise_sets in seeded sessions have `rir` and `tempo` values
- [ ] All template_exercises have `target_rpe_low` and `target_rpe_high`
- [ ] Beginner and intermediate each have 8+ completed sessions spanning >30d
- [ ] All 3 athletes have 14+ daily wellness entries
- [ ] 18 templates exist (6 new + 12 existing)
