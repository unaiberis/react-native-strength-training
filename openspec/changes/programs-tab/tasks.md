# Tasks: Programs Tab

## Review Workload Forecast

~350 lines across 5 files — within 400-line budget.

## Delivery Strategy

Single PR.

## Tasks

### Phase 1: Hook + Screen (~200 lines)

- [ ] 1.1 Create `src/features/programs/hooks/usePrograms.ts`
  - Wraps `useQuery` with key `['templates', 'programs']`
  - Online: `TemplatesService.listTemplates()`
  - Offline: reads from SQLite `workout_templates`
  - Returns `{ templates, isLoading, error, refetch }`
- [ ] 1.2 Create `src/features/programs/screens/ProgramsScreen.tsx`
  - FlatList with TemplateCard items
  - Pull-to-refresh
  - Empty state, loading, error states
  - Navigate to edit on card tap, to workout on "Start" tap
- [ ] 1.3 Modify `app/(tabs)/programs.tsx` to render ProgramsScreen

### Phase 2: Tests (~100 lines)

- [ ] 2.1 Hook tests: mock PocketBase client, verify online/offline branching, empty state
- [ ] 2.2 Screen tests: render cards, tap handlers, loading state

### Phase 3: Verify

- [ ] 3.1 `npx tsc --noEmit`
- [ ] 3.2 `npx jest --coverage` (≥80% on new files)
