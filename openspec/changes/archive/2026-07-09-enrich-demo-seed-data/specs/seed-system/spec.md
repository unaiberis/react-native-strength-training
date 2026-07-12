# Delta for seed-system

## MODIFIED Requirements

### Requirement: Seed Architecture

The seed system SHALL consist of three standalone scripts in `scripts/`:

| Script | Purpose |
|--------|---------|
| `scripts/seed-pocketbase.mjs` | Parse `supabase/seed.sql` and POST 63 exercises to PocketBase |
| `scripts/seed-demo-data.mjs` | Create templates, sessions, and exercise sets for test user |
| `scripts/seed-teams.mjs` | Create teams, memberships, wellness entries, feedback, and in-progress sessions |

All scripts SHALL support `--clean` flags for additive re-runs. Each script SHALL authenticate as admin via `PB_URL` + admin credentials. The `seed-pocketbase.mjs` script SHALL read exercise data from `supabase/seed.sql` and SHALL include `description` and `video_url` fields in each POST request.

(Previously: single `scripts/seed/` directory with helpers/data/generators, 80 exercises, PRNG-based progression)

#### Scenario: Exercises seeded with metadata

- GIVEN PocketBase is running with the exercises collection
- WHEN `seed-pocketbase.mjs` completes
- THEN all 63 exercises MUST have non-empty `name`, `category`, `description`, `video_url`, `equipment`, `default_sets`, `default_reps`, and `default_rest_seconds`

#### Scenario: Idempotent re-run

- GIVEN exercises already exist in PocketBase
- WHEN `seed-pocketbase.mjs` runs again
- THEN it MUST skip duplicates (HTTP 409) and SHALL NOT overwrite existing records

### Requirement: User Profiles

| Profile | Email | Templates | Sessions | Source |
|---------|-------|-----------|----------|--------|
| Advanced | test@test.com | 12 (→ 18) | 13 (→ 21-23) | seed-demo-data.mjs |
| Beginner | beginner@test.com | 0 (→ 12) | 0 (→ 8-10) | seed-demo-data.mjs |
| Intermediate | intermediate@test.com | 0 (→ 12) | 0 (→ 8-10 + 1 in-progress) | seed-demo-data.mjs |
| Demo | demo@test.com | 0 | 0 | — |

All passwords: test123456. Profiles marked with arrows (→) indicate targets after this change.

(Previously: beginner 16wk/70 sessions, intermediate 36wk/156 sessions, advanced 78wk/339 sessions — all 18 templates)

#### Scenario: Beginner has session history

- GIVEN seed-demo-data.mjs has run with `--clean`
- WHEN checking workout_sessions for beginner@test.com
- THEN 8-10 completed sessions MUST exist
- AND dates MUST span at least 30 days

#### Scenario: New templates assigned to all profiles

- GIVEN 6 new template definitions exist in seed-demo-data.mjs
- WHEN the script runs
- THEN 18 total templates MUST exist across all athlete users
- AND each new template SHALL reference existing exercise IDs from the 63 seeded exercises

## ADDED Requirements

### Requirement: RIR and Tempo on Exercise Sets

Each exercise_set in seeded session data MUST include `rir` (0-3 integer) and `tempo` (string like "20X0", "30X0", or "2010").

#### Scenario: All seeded sets have RIR

- GIVEN a seeded session exists for any athlete
- WHEN inspecting its exercise_sets
- THEN every set MUST have `rir` IS NOT NULL
- AND `rir` MUST be between 0 and 3

### Requirement: Target RPE on Template Exercises

Each template_exercise in seed data MUST include `target_rpe_low` and `target_rpe_high`.

#### Scenario: All template exercises have RPE target

- GIVEN a seeded template exists
- WHEN inspecting its template_exercises
- THEN every row MUST have `target_rpe_low` and `target_rpe_high` IS NOT NULL

### Requirement: Expanded Wellness History

Each athlete SHALL have 14-30 daily wellness entries instead of 1.

#### Scenario: Wellness entries span multiple weeks

- GIVEN seed-teams.mjs has run
- WHEN checking daily_wellness for any athlete
- THEN at least 14 entries MUST exist
- AND entries SHALL span at most 30 days

### Requirement: In-Progress Session for Intermediate

A single in-progress workout session SHALL exist for intermediate@test.com.

#### Scenario: Intermediate has active session

- GIVEN seed-demo-data.mjs has run
- WHEN checking workout_sessions for intermediate@test.com
- THEN exactly one record with `status = 'in_progress'` MUST exist
- AND it SHALL have at least 2 exercise_sets logged

## Known Issues (Updated)

- Equipment field may be returned as JSON string (PB field type) — verify-seed warns, doesn't fail
- Epley e1RM may exceed logistic ceiling with 8-rep sets (known Epley artifact)
- demo@test.com user exists from old seed (0 data) — safe to ignore or delete
- RIR/tempo values are seed defaults, not user-entered — verify scripts SHOULD flag excessive RIR (>=3) on compound lifts as a warning
