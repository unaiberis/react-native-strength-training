# Coach Athlete Calendar Specification

## Purpose

Coach-facing calendar view per athlete enabling date-based workout assignment. Reuses existing `assign` flow, `workout-builder`, and `program_assignments` data model. This is a NEW capability — no existing spec.

## Requirements

### View Athlete Calendar

Coach MUST view a month calendar per athlete showing dates with existing assignments visually distinguished.

- GIVEN coach is viewing athlete detail WHEN coach taps "Calendar" entry point THEN month calendar renders with assigned dates marked
- GIVEN month calendar is shown WHEN coach swipes left/right THEN adjacent month loads without full-screen transition
- GIVEN month calendar is shown WHEN coach taps "Week" toggle THEN week view replaces month view

### Assign Workout to Unassigned Date

Coach MUST assign a workout to a date that has no existing assignment, using existing template selection and assignment screens.

- GIVEN coach taps a date WITHOUT an existing assignment WHEN coach confirms selection THEN existing `assign` screen opens pre-filtered for that athlete and date
- GIVEN assign screen is open WHEN coach picks a template template AND confirms THEN assignment saved to `program_assignments` collection
- GIVEN assign screen is open WHEN coach creates new template template THEN existing `workout-builder` opens, template saves, and assignment is created
- GIVEN assign screen is open WHEN coach taps "Cancel" THEN no assignment created and calendar returns

### View or Modify Existing Assignment

Coach MUST view and MAY modify existing assignments from the calendar for a given date.

- GIVEN coach taps a date WITH an existing assignment WHEN date tapped THEN assignment detail screen shows with "Edit" and "Remove" options
- GIVEN coach is viewing assignment detail WHEN coach taps "Edit" THEN existing `assignment/edition` flow opens with current data pre-filled
- GIVEN coach taps "Remove" on an existing assignment WHEN coach confirms THEN assignment deleted and calendar shows date as unassigned

### Athlete Visibility of Assigned Workouts

Coach-assigned workouts MUST be visible to the athlete on their Calendar screen and as today's training when the assigned date matches today.

- GIVEN coach assigned a workout to date D WHEN athlete views Calendar THEN workout shown on date D with name and template reference
- GIVEN coach assigned a workout to today's date WHEN athlete opens Train tab THEN workout shown as the sole "today's assigned" entry
- GIVEN coach removes or reschedules an existing assignment WHEN athlete next views Calendar or Train THEN previous assignment no longer shown
- GIVEN an assigned date is in the future (not today) WHEN athlete opens Train tab THEN empty state shown with message indicating no training today
