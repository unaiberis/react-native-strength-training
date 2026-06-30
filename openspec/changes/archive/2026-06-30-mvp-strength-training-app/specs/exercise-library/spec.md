# Exercise Library Spec

## Purpose

Browsable catalog of exercises with category, equipment, body region, default metrics. Seed 50+ exercises.

## Requirements

### Browse

MUST show a paginated list with name, category, equipment.

- GIVEN exercises exist WHEN list loads THEN paginated items shown
- GIVEN none WHEN list loads THEN empty state shown

### Filter

MUST filter by category.

- GIVEN multiple categories WHEN user picks "olympic" THEN only olympic shown
- GIVEN no matches THEN "no exercises found" with clear option

### Detail

MUST show description, equipment, body region, default sets/reps.

- GIVEN exercise tapped WHEN detail opens THEN all fields displayed
