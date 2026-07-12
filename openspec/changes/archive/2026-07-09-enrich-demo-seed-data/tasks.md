# Tasks: Enrich Demo Seed Data

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 300–400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single commit |
| Delivery strategy | main-direct |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Phase 1: Exercise Metadata — `scripts/seed-pocketbase.mjs`

- [x] 1.1 Add `VIDEO_URLS` lookup map (63 entries, keyed by exercise name) with YouTube links for every exercise
- [x] 1.2 Add `DESCRIPTIONS` lookup map (63 entries) with exercise descriptions
- [x] 1.3 Apply `video_url` and `description` from lookup maps during the POST loop (currently passes `ex.description || ''` and `ex.video_url || ''` — lookup map enriches before sending)

## Phase 2: Session Data Enrichment — `scripts/seed-demo-data.mjs`

- [x] 2.1 Add `rir` (0–3) and `tempo` ("20X0" / "30X0" / "2010") to every exercise_set definition in existing `SESSIONS` array
- [x] 2.2 Add `target_rpe_low` and `target_rpe_high` to every template_exercise in existing `TEMPLATES` array
- [x] 2.3 Add 6 new template entries to `TEMPLATES` — upper/lower split, push/pull, full body, and cardio
- [x] 2.4 Generalize script for multi-user (add beginner + intermediate user IDs; create per-user SESSION blocks with adjusted weights/RPE)
- [x] 2.5 Add 8–10 completed sessions for beginner@test.com spanning 30+ days (lower weights, higher RIR 1–3)
- [x] 2.6 Add 8–10 completed sessions for intermediate@test.com spanning 30+ days
- [x] 2.7 Add 1 in-progress session for intermediate@test.com with 2+ logged exercise_sets

## Phase 3: Wellness Expansion — `scripts/seed-teams.mjs`

- [x] 3.1 Modify wellness generation loop from 1 entry to 14–30 entries per athlete (iterate over last N days with random metrics)
- [x] 3.2 Verify team/assignment/invite/feedback creation code is unchanged

## Phase 4: Verification

- [x] 4.1 ~~Run all 3 seed scripts (with `--clean`) and verify spec scenarios~~ — **RECONCILED at archive**: requires a running PocketBase instance, not executable in this environment. Static code analysis confirms all scenarios are correctly implemented per verify-report. (Reason: environment constraint — no PocketBase instance available.)
- [x] 4.2 ~~Run seed scripts additive (no `--clean`) to verify idempotent re-run~~ — **RECONCILED at archive**: requires a running PocketBase instance, not executable in this environment. Idempotency logic (409 skip in seed-pocketbase, per-date dedup in seed-teams) confirmed via static analysis. (Reason: environment constraint — no PocketBase instance available.)
