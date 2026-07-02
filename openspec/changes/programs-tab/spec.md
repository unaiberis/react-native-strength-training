# Programs Tab Spec

## Purpose

Display the user's workout templates in the Programs tab with quick-start, delete, and link to the Routine Builder.

## Requirements

### List Templates

MUST show all user templates in a scrollable list, newest first. Each card shows: name, exercise count, last updated.

- GIVEN user has 5 templates WHEN Programs tab opened THEN list shows 5 cards sorted by `updated_at` DESC
- GIVEN user has 0 templates WHEN opened THEN empty state with "Create your first program" CTA shown
- GIVEN app is offline WHEN opened THEN list reads from SQLite `workout_templates` (via React Query persister or direct read)

### Quick-Start

MUST allow starting a workout from any template in the list with a single tap.

- GIVEN template card visible WHEN user taps "Start" THEN navigates to `(workout)/active` with template ID preloaded
- GIVEN tap on card body (not button) WHEN tapped THEN navigates to `routines/[id]/edit` for editing

### Offline Indicator

SHOULD show a subtle sync-pending icon on templates with `dirty=1`.

- GIVEN template created offline WHEN list renders THEN small sync icon shown on that card
- GIVEN template synced successfully WHEN list refreshes THEN icon removed

### Empty State

MUST show empty state with action when no templates exist.

- GIVEN no templates WHEN tab opened THEN "No programs yet" message + "Create Program" button
- GIVEN "Create Program" tapped WHEN offline THEN navigates to `routines/new` (works offline)

## UI Spec

### Layout

```
┌──────────────────────────────┐
│  Programs                    │  ← header
│                              │
│  ┌──────────────────────────┐│
│  │ Push Day          ▶     ││  ← card (tap body → edit)
│  │ 4 exercises · 2d ago    ││  ← metadata
│  │ [▶ Start Workout]       ││  ← CTA button
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │ Leg Day          ▶     ││
│  │ 6 exercises · 5d ago    ││
│  │ [▶ Start Workout]  🔄  ││  ← sync icon (dirty)
│  └──────────────────────────┘│
└──────────────────────────────┘
```

### Tokens

- Card: `bg-surface-900` + `border-surface-800` + `rounded-2xl` + `p-4`
- Title: `text-surface-50 text-lg font-semibold`
- Metadata: `text-surface-400 text-xs`
- CTA: `bg-brand-500` text `text-surface-50`
- Empty state: centered, `text-surface-400`
- Sync icon: `text-surface-500` small, top-right of card
