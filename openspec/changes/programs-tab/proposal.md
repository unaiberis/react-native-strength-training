# Proposal: Complete Programs Tab

## Problem
The `programs.tsx` tab in the bottom navigation renders empty. Users who tap "Programs" expecting to see their workout templates or training programs see nothing — broken UX.

## Solution
Replace the empty tab with a full Programs screen that lists the user's `workout_templates`, provides quick-start to begin a workout, and links to the existing Routine Builder (create/edit).

## Scope
1. **Screen**: `ProgramsScreen` at `src/features/programs/screens/ProgramsScreen.tsx`
2. **Hook**: `usePrograms()` wrapping `TemplatesService.listTemplates()` with offline support
3. **Tab**: Update `app/(tabs)/programs.tsx` to render ProgramsScreen
4. **Quick-start**: "Start Workout" button per template → navigates to `(workout)/active` with template preloaded
5. **Offline-aware**: reads from SQLite when offline, shows dirty/sync-pending indicators

## Routes Updated
- `app/(tabs)/programs.tsx` → renders ProgramsScreen (was empty)
- `app/(tabs)/_layout.tsx` → tab icon/label adjustments if needed

## Non-goals
- Program blocks (periodization) — future change
- Social/shared programs
- Program progress tracking

## Risk
Low — replaces an empty tab, reuses existing `useTemplates` hook and `RoutineListScreen` patterns. No data model changes.
