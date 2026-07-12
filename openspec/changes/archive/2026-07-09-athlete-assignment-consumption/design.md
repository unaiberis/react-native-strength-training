# Design: Athlete Assignment Consumption

## Technical Approach

Wire the read-only athlete consumption of `program_assignments` by adding one TanStack Query hook `useAthleteAssignments` that calls the existing `listAssignments(user.id)` and maps each `ProgramAssignmentRow` (with expanded `template`) into the existing `ProgramSummary` shape. Pure mapping helpers are exported for unit testing. `usePrograms` delegates to it; `useProgramDetail(id)` calls `getAssignment(id)`. Four UI surfaces (`programs.tsx`, `ProgramDetailScreen`, `WorkoutPreviewScreen`, Home/Calendar chip) are rewired to real data. No schema change; online-only (R1–R6).

## Architecture Decisions

| # | Decision | Tradeoff | Choice |
|---|----------|----------|--------|
| D1 | Mapping location | In-hook inline vs exported pure fn | **Exported pure fn** `mapAssignmentToProgramSummary(row, opts)` — testable without React/network (R7). |
| D2 | Phase model | Template has no weeks/phases field | **Single-phase fallback**: one `ProgramPhaseSummary` `{ weekStart:1, weekEnd: totalWeeks, workoutCount: 1 }` built from `template.exercises`. Documented assumption; weeks surface later (SPEC-0x). |
| D3 | `endDate`/`totalWeeks` | No source field exists | Derive `totalWeeks = DEFAULT_PROGRAM_WEEKS (8)` constant; `endDate = startDate + 7*weeks`. Feeds existing `computeProgramProgress`. Documented. |
| D4 | `currentProgram` selection | Multiple active rows possible | Filter status `!= "cancelled"`, `start_date <= today`, pick **latest** `start_date` (SPEC-01 R1). |
| D5 | Exercise names in preview | `template_exercises` store `exercise_id` only, no name | Resolve names via `getExercise(id)` batch (`Promise.all`) into an id→name map passed to pure `mapTemplateToWorkoutPreview`. Cached by TanStack. |
| D6 | `cancelled`/`completed` rows | ProgramSummary has no "cancelled" | Skip `cancelled`. `completed` rows with `start_date<=today` are NOT surfaced in current/upcoming (history is SPEC-02, out of scope) — documented. |

## Data Flow

```
Coach: assignProgram ──▶ program_assignments (PB)
                                │
        listAssignments(athleteId)  [expand: template]
                                │
                  useAthleteAssignments (TanStack, key ["programs", userId])
                                │  mapAssignmentToProgramSummary
              ┌─────────────────┼───────────────────┐
        Programs tab        Home/Calendar chip      ProgramDetailScreen
        (current+upcoming)  (start_date==today)          │
                                              getAssignment(id) [expand: template,athlete]
                                                        │ map → ProgramSummary → PhaseCard
        WorkoutPreviewScreen: useTemplate(workoutId) → mapTemplateToWorkoutPreview → <WorkoutPreview/>
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/programs/hooks/useAthleteAssignments.ts` | **Create** | New hook: `useQuery(["programs", userId], () => listAssignments(userId))`; exports `mapAssignmentToProgramSummary`, `deriveCurrentAndUpcoming(rows, today)`, `AssignmentWithTemplate` type. Returns `{currentProgram, upcomingPrograms, isLoading, error}`. |
| `src/features/programs/hooks/usePrograms.ts` | Modify | Delegate body to `useAthleteAssignments()`; keep `ProgramSummary`/`UseProgramsResult` exports + `computeProgramProgress` (unchanged). |
| `src/features/programs/hooks/useProgramDetail.ts` | Modify | `useQuery(["program-detail", id], () => getAssignment(id))`; map result → `ProgramSummary` via shared mapper; `error`→`program:null`. |
| `app/(tabs)/programs.tsx` | Modify | Already consumes `usePrograms()`; remove no-op `onRefresh`, wire `refetch` from query. No shape change needed. |
| `src/features/programs/screens/ProgramDetailScreen.tsx` | Modify | Keep `!program` → "Program not found." (now a true not-found state, non-permanent). Render real `phases` (single-phase). No structural change. |
| `src/features/programs/screens/WorkoutPreviewScreen.tsx` | Modify | Replace placeholder with `useTemplate(workoutId)` + `mapTemplateToWorkoutPreview` → `<WorkoutPreview>`. Error/empty states for missing/empty template. |
| `app/(tabs)/index.tsx` | Modify | Add `useAthleteAssignments()`; render "Entrenamiento asignado hoy" chip when any assignment `start_date === todayStr`; `onPress` → `router.push("/programs/program-detail/{id}")`. |
| `src/features/calendar/screens/CalendarScreen.tsx` | Modify | Same chip via `useAthleteAssignments()` when selected date or today matches `start_date`. |
| `src/features/programs/components/PhaseCard.tsx` | No change | Accepts derived single phase; nested `workouts` stays empty until workouts surface (SPEC-02). |

## Interfaces / Contracts

```ts
// useAthleteAssignments.ts
export type AssignmentWithTemplate =
  ProgramAssignmentRow & { expand?: { template?: TemplateRow | null } };

export interface MapOptions { totalWeeks?: number; today?: Date; }
export function mapAssignmentToProgramSummary(
  row: AssignmentWithTemplate, opts?: MapOptions
): ProgramSummary;                       // null-guards missing expand.template

export function deriveCurrentAndUpcoming(
  rows: AssignmentWithTemplate[], today?: Date
): { currentProgram: ProgramSummary | null; upcomingPrograms: ProgramSummary[] };

export function useAthleteAssignments(): {
  currentProgram: ProgramSummary | null;
  upcomingPrograms: ProgramSummary[];
  isLoading: boolean; error: unknown;
};

// WorkoutPreviewScreen helper
export function mapTemplateToWorkoutPreview(
  tpl: TemplateWithExercises, nameMap: Record<string,string>
): WorkoutPreviewData;   // single block "Workout", straight_set
```

Mapping rules: `id=row.id`; `name=template?.name ?? "Untitled Program"`; `description=template?.description ?? ""`; `startDate=row.start_date`; `endDate=addWeeks(start_date,totalWeeks)`; `status`: `start_date>today ? "upcoming" : row.status==="completed"?"completed":"active"`; `phases`: `[{id:"phase-"+tpl.id, name:tpl.name, weekStart:1, weekEnd:totalWeeks, workoutCount:1}]` when `template` present, else `[]`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `mapAssignmentToProgramSummary` | Mock `listAssignments`; assert happy path, 0 assignments, null `template` (no throw, empty phases), multiple-active picks latest `start_date<=today`, future→upcoming. |
| Unit | `mapTemplateToWorkoutPreview` | Inject `nameMap`; assert block/exercise/Sets-Reps-Rest mapping, empty exercises→`blocks:[]`. |
| Unit | `deriveCurrentAndUpcoming` | Date-boundary cases (today/not-today, cancelled skipped). |
| Render | Programs tab | `renderHook`/`render` with mocked `useAthleteAssignments` → current card + upcoming list + EmptyState on `[]`. |
| Render | `WorkoutPreviewScreen` | Mock `useTemplate` → renders `<WorkoutPreview>`; missing template → error state. |

Jest node env + `@testing-library/react-native`; mock `pb`/`listAssignments`/`getAssignment`/`useTemplate`. **Every new/modified file ≥80% coverage** (`openspec/config.yaml`). `npx tsc --noEmit && npx jest --passWithNoTests` green.

## Migration / Rollout

No migration required. No schema change. Online-only read path; offline visibility deferred to SPEC-05.

## Open Questions

- [ ] Is `DEFAULT_PROGRAM_WEEKS = 8` acceptable, or should the coach-assignment carry an explicit length (schema addition, SPEC-0x)?
- [ ] Should `workoutCount` show `1` (template = one workout) or `template.exercises.length`? UI label currently reads "workouts".
