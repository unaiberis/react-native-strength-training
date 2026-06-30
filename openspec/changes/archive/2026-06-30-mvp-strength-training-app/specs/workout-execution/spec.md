# Workout Execution Spec

## Purpose

Start session from routine or blank. Log sets (weight, reps, RPE/RIR). Rest timer between sets.

## Requirements

### Start

MUST allow starting from routine or free.

- GIVEN routine WHEN "start" THEN exercises with targets pre-filled
- GIVEN free workout THEN empty session, exercises added one at a time

### Log Sets

MUST log weight, reps, RPE (1-10), RIR (0-5).

- GIVEN Squat active WHEN 100kg x 8, RPE 8 logged THEN set recorded, rest timer starts
- GIVEN RPE 11 THEN "must be 1-10" error, set not recorded

### Complete

MUST allow finishing or cancelling.

- GIVEN all sets logged WHEN "finish" THEN marked complete with duration, volume
- GIVEN partial session WHEN cancel confirmed THEN marked cancelled, not deleted
