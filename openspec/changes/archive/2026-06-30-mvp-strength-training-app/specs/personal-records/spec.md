# Personal Records Spec

## Purpose

Auto-detect PRs after workout: 1RM, e1RM (Epley), best volume set, best rep max per weight.

## Requirements

### Auto-Detect

MUST evaluate completed sessions against history and surface PRs.

- GIVEN Squat 140kg x 1 WHEN session done THEN checked against history, if highest, 1RM PR recorded
- GIVEN 80kg x 8 logged and 85kg x 6 exists WHEN session done THEN no PR created

### Display

MUST show PRs grouped by exercise with type, value, date.

- GIVEN PRs across 3 exercises WHEN progress opens THEN grouped PRs with type/value/date shown
- GIVEN fresh install WHEN first workout THEN tracking resets, first qualifying sets become PRs
