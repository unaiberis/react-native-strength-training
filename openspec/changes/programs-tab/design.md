# Design: Programs Tab

## Architecture

### Component Tree

```
app/(tabs)/programs.tsx
└── ProgramsScreen
    ├── FlatList
    │   └── TemplateCard (TouchableOpacity)
    │       ├── Name + sync icon
    │       ├── Metadata (exercises count, last updated)
    │       └── Start Workout button
    └── EmptyState (conditional)
```

### Data Flow

```
usePrograms() → useQuery({
  queryKey: ['templates', 'programs'],
  queryFn: isOnline ? TemplatesService.listTemplates(userId) : readLocal(),
})
```

- **Online:** `TemplatesService.listTemplates()` from PocketBase (existing)
- **Offline:** direct SQLite read via `getDb()` → `workout_templates` table
- **Mutation:** "Start Workout" → `useCreateSession()` (existing hook in `useWorkoutSession.ts`)

### Reuse

- `useTemplates()` hook from `routines/` already fetches templates with exercises
- `RoutineListScreen` pattern exists in `routines/screens/RoutineListScreen.tsx`
- `/routines/new` and `/routines/[id]/edit` routes already exist
- `useCreateSession()` and `useDeleteTemplate()` exist

## Files

| File                                                        | Action                                     |
| ----------------------------------------------------------- | ------------------------------------------ |
| `src/features/programs/screens/ProgramsScreen.tsx`          | CREATE                                     |
| `src/features/programs/hooks/usePrograms.ts`                | CREATE                                     |
| `app/(tabs)/programs.tsx`                                   | MODIFY — replace empty with ProgramsScreen |
| `src/features/programs/__tests__/ProgramsScreen.test.tsx`   | CREATE                                     |
| `src/features/programs/hooks/__tests__/usePrograms.test.ts` | CREATE                                     |

## States

- **Loading:** skeleton cards (pulse animation with `bg-surface-800`)
- **Empty:** illustration-less, just text + CTA button
- **Error:** "Could not load programs" with retry button
- **Data:** card list with pull-to-refresh
- **Offline:** reads from cache, shows stale indicator
