# Personal Records Spec

## Purpose

Auto-detect PRs from `exercise_sets` on read: 1RM, e1RM (Epley), best volume set, best rep max per weight.

## Requirements

### Auto-Detect

MUST compute PRs on-the-fly from `exercise_sets` on read — no separate `personal_records` collection or write-on-complete step.
(Previously: evaluate completed sessions after completion against stored history and write result to `personal_records` collection)

- GIVEN Squat 140kg x 1 logged in `exercise_sets` WHEN PRs queried THEN 1RM = 140kg (highest weight at 1 rep)
- GIVEN 80kg x 8 and 85kg x 6 logged for same exercise WHEN PRs queried THEN highest e1RM (Epley) returned
- GIVEN no `exercise_sets` for an exercise WHEN PRs queried THEN null/empty returned for that exercise
- GIVEN 10,000+ `exercise_sets` for a user WHEN PRs queried THEN query completes within 2s (indexed on user_id + exercise_id)

### Display

MUST show PRs grouped by exercise with type, value, date.

- GIVEN PRs across 3 exercises WHEN progress opens THEN grouped PRs with type/value/date shown
- GIVEN fresh install WHEN first workout THEN tracking resets, first qualifying sets become PRs
