# Delta: Fix active route and template N+1

> Pure implementation fix. No new capabilities, no spec-level behavior changes.

## Modified: Root Layout Route Declaration

### Requirement: Root Stack MUST NOT declare `active`

`app/_layout.tsx` SHALL NOT include `<Stack.Screen name="active" />`. The `(workout)` group already declares it. All navigation targets `/(workout)/active`.

- GIVEN root layout has no `Stack.Screen name="active"`
- WHEN a user navigates to `/(workout)/active`
- THEN the route resolves via `(workout)` group
- AND no duplicate route warning appears

#### Scenario: Future `app/active.tsx`

- GIVEN a developer later creates `app/active.tsx` (file-based)
- WHEN root layout has no explicit `Stack.Screen name="active"`
- THEN expo-router registers the file-based route normally (no collision)

## Modified: Template Name Resolution

### Requirement: Batch-fetch via shared helper

A shared `fetchTemplateNames(templateIds: string[])` SHALL replace individual `getOne("workout_templates")` calls. It MUST collect unique truthy IDs, batch-fetch via `getFullList({ filter: ids.map(id => \`id='${id}'\`).join('||'), fields: "id,name" })`, and return a `Map<string, string>`.

- GIVEN 3 unique template IDs
- WHEN `fetchTemplateNames(ids)` is called
- THEN one `getFullList` with `filter: "id='a' || id='b' || id='c'"` SHALL fire
- AND result SHALL be a Map with 3 entries

| Edge | Behavior |
|------|----------|
| Empty `[]` | Empty Map, zero network calls |
| All `null`/`undefined` | Filtered to empty → zero calls |
| Template ID not found | Omitted from Map — caller uses fallback |
| PB filter length limit hit | Catch error → empty Map, callers degrade gracefully |
| Duplicate IDs | Deduped — one entry per unique ID |

### Requirement: 5 call sites use batch helper

Each site SHALL call `fetchTemplateNames` once per logical request (not per session row), after collecting all `workout_template_id`s. Existing null/fallback behavior SHALL be preserved.

| Site | File | Current | Replace |
|------|------|---------|---------|
| 1. `getSessionDetail` | `sessions.ts:262` | `getOne` per session | batch once |
| 2. `listSessions` | `sessions.ts:401` | `getOne` per row in loop | batch once |
| 3. `fetchSessionsFromPB` | `useSessionsForDate.ts:127` | `getOne` per row in loop | batch once |
| 4. `fetchSessionsForDate` | `useCalendar.ts:185` | `getOne` per row in loop | batch once |
| 5. `fetchHomeStats` | `useHomeStats.ts:142` | `getOne` per row in loop | batch once |

- GIVEN `listSessions` returns 20 sessions with 12 unique template IDs
- WHEN the batch helper is called after collecting those IDs
- THEN exactly 1 `getFullList` call SHALL fire
- AND each session's `templateName` resolves from the Map, missing IDs get `undefined`

- GIVEN `fetchHomeStats` returns sessions with all `workout_template_id = null`
- WHEN `fetchTemplateNames([])` returns empty Map
- THEN all sessions show "Custom Workout" fallback (preserved)

### Test Requirements

| Test | Scope | Assertions |
|------|-------|------------|
| Helper returns correct Map for valid IDs | Unit | 1 `getFullList`, correct entries |
| Helper returns empty Map for empty input | Unit | Zero network calls |
| Helper handles PB filter length error | Unit | Catches error, returns empty Map |
| Helper dedupes duplicate IDs | Unit | Map size ≤ unique count |
| Call sites resolve names from batch, not per-row | Integration | All sessions get correct `templateName`, zero `getOne("workout_templates")` calls |
| Missing templates get fallback | Integration | Sessions with absent IDs get `undefined` / "Custom Workout" |
