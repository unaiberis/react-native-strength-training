# Prompt: Continue Building React Native Strength Training App to Full Potential

You are the next AI engineer taking over `react-native-strength-training`. Your job is to bring this app from its current state to a **production-grade, fully-featured strength training platform** that covers both athlete and coach experiences. Read every word below before writing a single line of code.

---

## PHASE 0 — READ FIRST (Mandatory, Do Not Skip)

1. Read `openspec/analysis/athlete-copy-status.md` — this is your handoff document. It tells you exactly what was ported, what wasn't, and why.
2. Run `npx jest` and confirm 502 tests pass. Run `npx tsc --noEmit` and confirm zero errors. If either fails, stop and fix before proceeding.
3. Read `AGENTS.md` for project conventions, file structure rules, and coding standards.
4. Read `src/types/pocketbase.ts` to understand every type in the system.
5. Read `src/lib/db/schema.ts` to understand the current DB schema (v3 with `daily_wellness`).
6. Read `app/(tabs)/_layout.tsx` to understand current tab structure.
7. Read `src/stores/session-store.ts` to understand session state shape.
8. Browse `src/lib/pocketbase/services/` to understand all existing PocketBase services.
9. Browse `src/features/` to understand the feature module pattern used in this project.

Do NOT start any work until you have read all of the above. You will waste time and create conflicts if you don't understand the architecture first.

---

## PHASE 1 — RESOLVE EXERCISE VIDEOS (Smallest, Do First)

**Branch**: `feat/exercise-videos` (commits `516368b`, `32bd152`)
**Estimated size**: ~10 files, 33 tests

### What it adds
- `video_url` field on exercises
- "Watch on YouTube" link in `ExerciseDetailScreen`
- Seed script update

### Critical conflict to resolve
The branch has a v2→v3 schema migration. Main is ALREADY at v3. You must:
1. Do NOT copy the migration block from the branch
2. Instead, create a **v3→v4 migration** that adds only what's new (the `video_url` column if it's a schema change, or just the seed data update if it's not)
3. If `video_url` is only in PocketBase records and not a local SQLite column, no schema bump is needed — just update types and UI

### Execution steps
1. `git diff main...feat/exercise-videos -- src/types/pocketbase.ts` — see what types changed
2. `git diff main...feat/exercise-videos -- src/lib/db/schema.ts` — see if local DB actually needs changes or if it's only PocketBase
3. `git diff main...feat/exercise-videos -- src/features/exercises/` — get the UI changes
4. Manually apply the changes (do NOT cherry-pick — it will conflict)
5. Migrate 3 test suites from vitest to Jest using the rules below
6. Run full test suite, fix any breakage
7. Commit: `feat(exercises): add video URL support and YouTube link`

### Vitest → Jest migration rules (apply to ALL phases)
```
vi.fn()                              → jest.fn()
vi.mock('module')                    → jest.mock('module')
vi.spyOn(obj, 'method')              → jest.spyOn(obj, 'method')
import { describe, it, expect } from 'vitest'  → delete the import line
import { beforeEach, afterEach } from 'vitest' → delete the import line
```

---

## PHASE 2 — ATHLETE FEEDBACK SYSTEM

**Branch**: `feat/athlete-feedback` (commit `824ae21`)
**Estimated size**: ~17 files, 4 test suites

### What it adds
- Post-workout feedback from athlete to coach (text + rating)
- Offline feedback queue (stores locally when offline, syncs when online)
- Feedback submission hook and PocketBase service
- Zod validation schema for feedback

### Critical conflict to resolve
This branch modifies `schema.ts`, `sync-engine.ts`, and `WorkoutCompleteScreen.tsx` — all three were also modified by the athlete-core-features port. You must:

1. **Schema**: Create v3→v4 (or v4→v5 if exercise-videos already bumped to v4) migration that adds the `feedback` table
2. **sync-engine.ts**: Carefully merge the feedback queue logic into the EXISTING sync-engine on main — do NOT overwrite, ADD to it
3. **WorkoutCompleteScreen.tsx**: This was already modified by athlete-core-features (summary stats, PR badge, self-assessment link). The feedback branch modifies it too. You need to COMBINE both sets of changes — the screen should show summary + PR badge + self-assessment link + feedback UI

### Execution steps
1. Read the full diff: `git diff main...feat/athlete-feedback`
2. Identify the 3 conflict files and understand what both sides changed
3. Apply feedback table to schema as a new migration step
4. Merge sync-engine changes additively
5. Merge WorkoutCompleteScreen changes additively
6. Port all new files (hooks, services, schemas)
7. Migrate 4 test suites to Jest
8. Run full test suite
9. Commit: `feat(workout): add post-workout athlete feedback with offline queue`

### Design consideration
The feedback UI should appear AFTER the self-assessment step. The flow should be:
```
Workout Complete → Summary (PRs, volume) → Self-Assessment (RPE, wellness) → Feedback (optional, text to coach) → Done
```
If the branch has a different flow, adapt it to match this order.

---

## PHASE 3 — COACH PLATFORM (Largest, Most Complex)

**Branch**: `feat/ba-coach-core` (commits `6a2db86`, `740c37b`)
**Estimated size**: ~50+ new files, 6 test suites, 150+ tests

### What it adds
An entire coach experience: dashboard, athlete list, athlete detail, athlete analytics, program assignment wizard, exercise library (coach view).

### This is TOO LARGE for a single PR. You MUST use the SDD (Spec-Driven Development) cycle:

#### Step 3.1 — Planning
1. Read the full branch diff to understand every file
2. Create an SDD proposal artifact documenting exactly what will be ported
3. Create a design document with architectural decisions (how coach routes work, how role switching works, how coach analytics data flows)
4. Create a task breakdown with at least 4 chained PRs

#### Step 3.2 — Suggested PR breakdown
```
PR1 - Coach Foundation:
  ├── app/(coach)/_layout.tsx
  ├── Auth role check (coach vs athlete detection)
  ├── Coach route types and navigation
  ├── src/features/coach/hooks/useCoachDashboard.ts (stub with types)
  └── Tests for auth role detection

PR2 - Coach Data Layer:
  ├── src/lib/pocketbase/services/coach-athletes.ts
  ├── src/lib/pocketbase/services/coach-analytics.ts
  ├── src/lib/pocketbase/services/program-assignments.ts
  ├── src/features/coach/hooks/useAthleteDetail.ts
  ├── src/features/coach/hooks/useCoachAnalytics.ts
  ├── src/features/coach/hooks/useCoachExercises.ts
  └── Tests for all services and hooks

PR3 - Coach Screens (List + Detail):
  ├── app/(coach)/dashboard.tsx
  ├── app/(coach)/athletes.tsx
  ├── app/(coach)/athlete/[id].tsx
  ├── app/(coach)/analytics/[athleteId].tsx
  └── Tests

PR4 - Coach Screens (Assignment + Library) + Integration:
  ├── app/(coach)/assign.tsx
  ├── app/(coach)/library.tsx + subroutes
  ├── src/features/coach/hooks/useProgramAssignment.ts
  ├── Navigation integration (how athlete tabs vs coach routes coexist)
  └── Tests
```

#### Step 3.3 — Auth role handling
The branch likely assumes some role-based routing. On main, there's an `auth-store.ts` and `session-store.ts`. You need to:
1. Check if `auth-store` has a `role` field (athlete vs coach)
2. If not, add it with a `UserRole` type in `pocketbase.ts`
3. The tab layout should conditionally show coach tabs OR athlete tabs based on role
4. OR: use separate route groups (`app/(tabs)/` for athlete, `app/(coach)/` for coach) with a root redirect based on role

#### Step 3.4 — PocketBase collections
The coach branch references collections that may not exist in the PocketBase instance:
- `program_assignments`
- Possibly `coach_profiles` or similar

You need to document what collections are required and either:
- Add migration scripts (like `scripts/migrate-coach-features.mjs` if it exists in the branch)
- Or document them clearly for manual PocketBase setup

---

## PHASE 4 — FILL GAPS vs TheHybridProject Reference

After all branches are merged, address these gaps identified in the analysis:

### 4.1 Wellness Metrics Dashboard ❌→✅
**What's missing**: Self-assessment data is saved but there's no dashboard showing wellness trends over time.
**What to build**:
- New screen or tab section: `src/features/wellness/screens/WellnessDashboardScreen.tsx`
- Hook: `useWellnessTrends()` — reads from `daily_wellness` table, computes rolling averages
- Chart component: line chart showing RPE, sleep quality, soreness over 7/30/90 days
- Reuse the `BarChart.tsx` pattern from analytics or create a `LineChart.tsx`
- Add entry point from Profile tab or as a sub-route of Analytics

### 4.2 Profile Enhancement ⚠️→✅
**What's missing**: ProfileScreen only has logout. Needs to be a real profile.
**What to build**:
- Edit name, email, bodyweight
- Display key metrics: total workouts, current streak, personal records count
- Photo upload (or placeholder avatar)
- Unit preference (kg/lbs) — check if this exists in session-store already
- Link to wellness dashboard
- Link to export data

### 4.3 Evolution/Progression Graphs ⚠️→✅
**What's missing**: PRs exist but there's no temporal progression chart.
**What to build**:
- For each exercise, show a line chart of max weight over time
- Data source: `exercise_sets` table filtered by exercise_id, grouped by date, take max weight
- Reuse or extend `ExerciseTimelineScreen` pattern
- Add trend line (simple linear regression or moving average)

### 4.4 Offline Resilience Enhancement
**What's missing**: Some features work offline, others don't gracefully.
**What to build**:
- Ensure all write operations go through the sync-engine queue
- Add visual indicators when offline (banner at top of screen)
- Add "pending sync" badges on recently created/modified items
- Conflict resolution strategy for simultaneous edits

---

## PHASE 5 — POLISH AND PRODUCTION READINESS

### 5.1 Error Handling
- Add error boundaries around each tab screen
- Add retry/fallback UI for failed PocketBase requests
- Add toast/snackbar for success/error feedback on all mutations
- Ensure no unhandled promise rejections

### 5.2 Loading States
- Every screen that fetches data should have a skeleton/loading state
- Use consistent loading patterns (check what exists in the project already)
- No flash of empty content

### 5.3 Empty States
- Calendar with no workouts: show encouraging message
- Analytics with no data: show "Complete your first workout to see analytics"
- Athlete list (coach) with no athletes: show "Invite your first athlete"
- Exercise library (coach) empty: show "Add exercises to your library"

### 5.4 Accessibility
- All touchable elements should have `accessibilityLabel`
- Charts should have `accessibilityRole="image"` with description
- Form inputs should have `accessibilityHint`
- Minimum touch target 44x44pt

### 5.5 Performance
- Lazy load coach screens (they're not needed for athletes)
- Memoize expensive computations in analytics hooks
- Virtualize long lists (FlatList with proper keyExtractor)
- Check for unnecessary re-renders in calendar grid

---

## HARD RULES — NEVER VIOLATE

1. **No vitest imports** — ever. Use Jest globals only.
2. **No Lingui/i18n** — this project uses plain English strings. No `t()`, no `<Trans>`, no `useLingui`.
3. **No version bumps** — do not modify package.json for Expo, React, or React Native versions.
4. **No "Co-Authored-By"** — no AI attribution in commits.
5. **No `any` types** — use proper TypeScript types. If you need a new type, add it to `pocketbase.ts`.
6. **Schema migrations are additive only** — never drop columns, never rename columns in migrations. New version = new migration block.
7. **Tests first for logic** — hooks, services, utils, strategies MUST have tests before the UI that uses them.
8. **Conventional commits** — `feat(scope):`, `fix(scope):`, `test(scope):`, `refactor(scope):`, `chore(scope):`
9. **NativeWind tokens** — use `text-surface-*`, `bg-surface-*`, `bg-card`, etc. Do NOT use hardcoded colors.
10. **Feature module pattern** — each feature gets its own directory under `src/features/` with `hooks/`, `components/`, `screens/`, `__tests__/`.

---

## QUALITY GATES — Check Before Every Commit

```bash
# 1. Tests pass
npx jest --passWithNoTests

# 2. TypeScript clean
npx tsc --noEmit

# 3. No vitest remnants
grep -r "from 'vitest'" src/ && echo "FAIL: vitest imports found" || echo "PASS"
grep -r "vi\." src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "__tests__" && echo "CHECK: possible vitest calls" || echo "PASS"

# 4. No Lingui remnants
grep -r "useLingui\|from '@lingui" src/ && echo "FAIL: lingui imports found" || echo "PASS"

# 5. No any types
grep -r ": any" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" && echo "CHECK: any types found" || echo "PASS"

# 6. Coverage check (on new/modified files)
npx jest --coverage --collectCoverageFrom='src/features/<your-feature>/**/*.{ts,tsx}' --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

---

## SUGGESTED WORKING ORDER (Summary)

```
Phase 0  → Read everything, confirm green baseline (30 min)
Phase 1  → Exercise videos — smallest, resolves schema conflict pattern (2-3 hrs)
Phase 2  → Athlete feedback — medium, establishes sync-engine pattern (4-6 hrs)
Phase 3  → Coach platform — large, requires SDD cycle with 4 chained PRs (2-3 days)
Phase 4  → Gap filling — wellness dashboard, profile, progression graphs (1-2 days)
Phase 5  → Polish — errors, loading, empty states, a11y, perf (1 day)
```

**Total estimated effort**: 5-8 days of focused AI work.

---

## FINAL NOTE

This app's architecture is clean and well-structured. The feature module pattern, the SQLite-first data layer, the PocketBase sync engine, and the type system are all solid foundations. Your job is NOT to redesign anything — it's to faithfully port the remaining branches, fill the identified gaps, and polish it to production quality. Resist the urge to refactor. Ship what's designed, then iterate.

The user wants a **very powerful app**. That means: complete athlete workflow, complete coach workflow, beautiful analytics, smooth offline experience, and production-grade error/loading/empty states. Every screen should feel finished, not like a prototype.

Go.
