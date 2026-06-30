# Routine Builder Spec

## Purpose

Create/manage workout templates with ordered exercises, target sets/reps, rest intervals.

## Requirements

### Create

MUST allow creating a routine with exercises and set config.

- GIVEN 3 exercises with targets WHEN saved THEN routine in list
- GIVEN no exercises WHEN saving THEN "add at least one" error shown

### Edit

MUST allow reordering and modifying exercises.

- GIVEN 4 exercises WHEN #4 moved to #2 and saved THEN new order persisted
- GIVEN routine linked to incomplete sessions WHEN deleted THEN routine removed, sessions kept
