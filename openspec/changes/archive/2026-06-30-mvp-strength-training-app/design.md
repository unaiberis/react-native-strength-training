# Design: MVP — Strength Training App

## Technical Approach

Six features (auth, exercise library, routine builder, workout execution, history, PRs) built on Supabase backend + Expo React Native client. Supabase Auth + RLS for data isolation. TanStack Query for server-state caching; Zustand for transient UI (session in-progress, rest timer). Feature-first folder structure with shared primitives.

## Database Schema

```sql
-- Extends auth.users via trigger
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url  TEXT,
  date_of_birth DATE,
  bio         TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exercises (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL UNIQUE,
  category         TEXT NOT NULL,       -- strength | olympic | bodyweight | cardio | accessory
  equipment        TEXT[],              -- {barbell, dumbbell, cable, bands, bodyweight}
  body_region      TEXT,                -- chest | back | legs | shoulders | arms | core | full_body
  description      TEXT,
  default_sets     INT2 DEFAULT 3,
  default_reps     INT2 DEFAULT 10,
  default_rest_seconds INT2 DEFAULT 90,
  is_public        BOOL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE programs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE program_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  week_count  INT2 DEFAULT 4,
  phase       TEXT,                     -- accumulation | intensification | realization | deload
  sort_order  INT2 NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workout_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_block_id UUID REFERENCES program_blocks(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  is_public        BOOL DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workout_template_exercises (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id        UUID NOT NULL REFERENCES exercises(id),
  sort_order         INT2 NOT NULL,
  target_sets        INT2 NOT NULL DEFAULT 3,
  target_reps        INT2 NOT NULL DEFAULT 10,
  target_rpe_low     NUMERIC(3,1),
  target_rpe_high    NUMERIC(3,1),
  rest_seconds       INT2 NOT NULL DEFAULT 90,
  notes              TEXT
);

CREATE TABLE workout_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  program_block_id   UUID REFERENCES program_blocks(id) ON DELETE SET NULL,
  status             TEXT NOT NULL DEFAULT 'in_progress',  -- in_progress | completed | cancelled
  started_at         TIMESTAMPTZ DEFAULT now(),
  completed_at       TIMESTAMPTZ,
  duration_minutes   INT2,
  notes              TEXT
);

CREATE TABLE exercise_sets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id        UUID NOT NULL REFERENCES exercises(id),
  set_number         INT2 NOT NULL,
  weight_kg          NUMERIC(6,2) NOT NULL DEFAULT 0,
  reps               INT2 NOT NULL DEFAULT 1,
  rpe                NUMERIC(3,1),
  rir                INT2,
  is_warmup          BOOL DEFAULT false,
  logged_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE coach_relationships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES profiles(id),
  athlete_id  UUID NOT NULL REFERENCES profiles(id),
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | active | declined
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coach_id, athlete_id)
);

CREATE TABLE personal_records (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id        UUID NOT NULL REFERENCES exercises(id),
  pr_type            TEXT NOT NULL,  -- one_rep_max | estimated_one_rep_max | best_volume_set | best_tonnage | best_reps_at_weight
  value              NUMERIC(8,2) NOT NULL,
  reps               INT2,
  weight_kg          NUMERIC(6,2),
  workout_session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  achieved_at        TIMESTAMPTZ DEFAULT now(),
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sessions_user ON workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_sets_session ON exercise_sets(workout_session_id);
CREATE INDEX idx_pr_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX idx_templates_user ON workout_templates(user_id);
CREATE INDEX idx_exercises_category ON exercises(category);
```

### RLS Policies

| Table | Policy | Rule |
|-------|--------|------|
| profiles | Own only | `id = auth.uid()` — all operations |
| exercises | Read all | `is_public = true` — SELECT for all authenticated users |
| programs | Own | `user_id = auth.uid()` |
| workout_templates | Own | `user_id = auth.uid()` |
| workout_sessions | Own | `user_id = auth.uid()` |
| exercise_sets | Own via session | `workout_session_id IN (SELECT id FROM workout_sessions WHERE user_id = auth.uid())` |
| personal_records | Own | `user_id = auth.uid()` |
| program_blocks | Own via program | `program_id IN (SELECT id FROM programs WHERE user_id = auth.uid())` |
| workout_template_exercises | Own via template | via parent path |

## Architecture Decisions

| Option | Tradeoffs | Decision |
|--------|-----------|----------|
| **State split** TanStack Query vs all Zustand | TQ: auto-cache, stale-while-revalidate, dedup. Zustand: simpler but manual sync. | **Both**: TQ for server data, Zustand for transient UI (rest timer, session-in-progress) |
| **Navigation** Expo Router vs React Navigation | Expo Router: file-based, deep links, auth groups built-in. RN Nav: more mature but more config. | **Expo Router** — aligns with Expo managed workflow |
| **Forms** RHF + Zod vs Formik | Zod: TS-first schemas, composable, same validation on client+server. | **RHF + Zod** — shared schemas = single source of truth |
| **API layer** Direct Supabase client vs tRPC | tRPC: type-safe RPC, but Supabase SDK already typed. Extra abstraction cost for MVP. | **Supabase client via thin service wrappers** — tRPC if real-time needs grow |
| **Executed set storage** Single-row-per-set vs JSONB array | JSONB: fewer rows, harder to query (PR detection). Normalized: queryable, indexable. | **Normalized `exercise_sets`** — PR logic needs aggregate queries |
| **PR calculation** DB function vs app-level | DB: atomic, one call. App: testable, debuggable. | **App-level in service hook** — PR calc is business logic, not data access |

## Data Flow

```
=== AUTH ===
Supabase Auth ──→ onAuthStateChange ──→ Zustand(session store) ──→ TanStack Query(profile)
                      │                                              │
                      └── SecureStore (persist) ──────────────────────┘

=== WORKOUT EXECUTION ===
TrainScreen ──→ useTemplates() [TQ] ──→ selectTemplate() ──→ createSession() [Supabase]
  │                                                                       │
  └── Zustand(activeSession) ──→ logSet() ──→ exercise_sets INSERT ──────┘
        │                                                                    
        └── completeSession() ──→ UPDATE status=completed ──→ calculatePRs() ──→ INSERT personal_records
                │
                └── invalidateQueries([history, records, ...])

=== EXERCISE LIBRARY ===
ExercisesScreen ──→ useExercises(category?) [TQ] ──→ SELECT from exercises
                    │                                      │
                    └── stale-while-revalidate ────────────┘
```

## File Changes

| File | Action |
|------|--------|
| `supabase/migrations/00001_schema.sql` | Create — schema + indexes |
| `supabase/migrations/00002_rls.sql` | Create — RLS policies |
| `supabase/seed.sql` | Create — 50+ exercise seed |
| `src/lib/supabase/client.ts` | Create — Supabase init |
| `src/lib/supabase/services/auth.ts` | Create — signUp, signIn, signOut, getSession |
| `src/lib/supabase/services/exercises.ts` | Create — list, get, search |
| `src/lib/supabase/services/templates.ts` | Create — CRUD templates + exercises |
| `src/lib/supabase/services/sessions.ts` | Create — create, logSet, complete, list, get |
| `src/lib/supabase/services/prs.ts` | Create — calculate, list, get |
| `src/lib/supabase/services/programs.ts` | Create — CRUD programs + blocks |
| `src/stores/session-store.ts` | Create — Zustand: activeSession, restTimer |
| `src/stores/auth-store.ts` | Create — Zustand: sessionState, profile |
| `src/shared/schemas/auth.ts` | Create — Zod: login, register schemas |
| `src/shared/schemas/template.ts` | Create — Zod: template + exercise config |
| `src/shared/schemas/set.ts` | Create — Zod: set entry (weight, reps, RPE, RIR) |
| `src/shared/ui/Button.tsx` | Create — design system primitives |
| `src/shared/ui/Card.tsx` | Create |
| `src/shared/ui/Input.tsx` | Create |
| `src/shared/ui/RestTimer.tsx` | Create — countdown timer component |
| `src/shared/utils/pr-calc.ts` | Create — e1RM (Epley), volume, tonnage | 
| `src/features/auth/hooks/useAuth.ts` | Create — TQ-based auth mutations |
| `src/features/auth/screens/LoginScreen.tsx` | Create |
| `src/features/auth/screens/RegisterScreen.tsx` | Create |
| `src/features/exercises/hooks/useExercises.ts` | Create — TQ query |
| `src/features/exercises/screens/ExerciseListScreen.tsx` | Create |
| `src/features/exercises/screens/ExerciseDetailScreen.tsx` | Create |
| `src/features/routines/hooks/useTemplates.ts` | Create — TQ CRUD |
| `src/features/routines/screens/RoutineListScreen.tsx` | Create |
| `src/features/routines/screens/RoutineFormScreen.tsx` | Create |
| `src/features/workout/hooks/useWorkoutSession.ts` | Create — TQ + Zustand |
| `src/features/workout/hooks/useRestTimer.ts` | Create — Zustand timer |
| `src/features/workout/screens/ActiveWorkoutScreen.tsx` | Create |
| `src/features/workout/screens/WorkoutCompleteScreen.tsx` | Create |
| `src/features/history/hooks/useHistory.ts` | Create — TQ paginated |
| `src/features/history/screens/HistoryListScreen.tsx` | Create |
| `src/features/history/screens/HistoryDetailScreen.tsx` | Create |
| `src/features/records/hooks/usePersonalRecords.ts` | Create — TQ |
| `src/features/records/screens/ProgressScreen.tsx` | Create |
| `src/features/profile/screens/ProfileScreen.tsx` | Create |
| `app/(auth)/login.tsx` | Create — Expo Router route |
| `app/(auth)/register.tsx` | Create |
| `app/(tabs)/index.tsx` | Create — Home screen |
| `app/(tabs)/train.tsx` | Create — Train/start screen |
| `app/(tabs)/programs.tsx` | Create |
| `app/(tabs)/progress.tsx` | Create |
| `app/(tabs)/profile.tsx` | Create |
| `app/(workout)/active.tsx` | Create — modal overlay |
| `app/_layout.tsx` | Create — root layout |
| `app/(auth)/_layout.tsx` | Create |
| `app/(tabs)/_layout.tsx` | Create |
| `package.json` | Modify — add deps |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `pr-calc.ts` (Epley formula, volume, tonnage) | Pure function tests, edge cases (zero, negatives) |
| Unit | Zod schemas (auth, template, set) | Parse valid/invalid inputs |
| Unit | Zustand stores (session timer, auth state) | State transitions, timer start/pause/reset |
| Integration | Workout execution flow | createSession → logSet → complete → PR calc — mock Supabase, assert TQ invalidation |
| Integration | Auth flow | signUp → signIn → session restore → signOut — mock Supabase client |
| RLS | Policy enforcement | Authenticated vs anonymous queries using `supabase-js` against test DB |
| E2E | Login → create routine → execute → verify PR on progress | Detox or Maestro on Expo dev build |

## Migration / Rollout

No migration needed (greenfield). Seed 50+ exercises in `supabase/seed.sql`. All migrations are additive — rollback via `supabase migration down` or git revert.
