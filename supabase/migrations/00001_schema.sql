-- Schema: MVP Strength Training App
-- Migration 00001: Core tables, indexes, and triggers

-- 1. PROFILES
-- Extends auth.users via trigger
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  date_of_birth DATE,
  bio           TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. EXERCISES
CREATE TABLE exercises (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL UNIQUE,
  category            TEXT NOT NULL CHECK (category IN ('strength', 'olympic', 'bodyweight', 'cardio', 'accessory')),
  equipment           TEXT[] DEFAULT '{}',
  body_region         TEXT CHECK (body_region IN ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body')),
  description         TEXT,
  default_sets        INT2 DEFAULT 3,
  default_reps        INT2 DEFAULT 10,
  default_rest_seconds INT2 DEFAULT 90,
  is_public           BOOL DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- 3. PROGRAMS
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

-- 4. PROGRAM BLOCKS
CREATE TABLE program_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  week_count  INT2 DEFAULT 4,
  phase       TEXT CHECK (phase IN ('accumulation', 'intensification', 'realization', 'deload')),
  sort_order  INT2 NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 5. WORKOUT TEMPLATES
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

-- 6. WORKOUT TEMPLATE EXERCISES
CREATE TABLE workout_template_exercises (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id         UUID NOT NULL REFERENCES exercises(id),
  sort_order          INT2 NOT NULL,
  target_sets         INT2 NOT NULL DEFAULT 3,
  target_reps         INT2 NOT NULL DEFAULT 10,
  target_rpe_low      NUMERIC(3,1),
  target_rpe_high     NUMERIC(3,1),
  rest_seconds        INT2 NOT NULL DEFAULT 90,
  notes               TEXT
);

-- 7. WORKOUT SESSIONS
CREATE TABLE workout_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  program_block_id    UUID REFERENCES program_blocks(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'in_progress'
                      CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_at          TIMESTAMPTZ DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  duration_minutes    INT2,
  notes               TEXT
);

-- 8. EXERCISE SETS
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

-- 9. COACH RELATIONSHIPS
CREATE TABLE coach_relationships (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES profiles(id),
  athlete_id  UUID NOT NULL REFERENCES profiles(id),
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'active', 'declined')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coach_id, athlete_id)
);

-- 10. PERSONAL RECORDS
CREATE TABLE personal_records (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id        UUID NOT NULL REFERENCES exercises(id),
  pr_type            TEXT NOT NULL
                     CHECK (pr_type IN ('one_rep_max', 'estimated_one_rep_max', 'best_volume_set', 'best_tonnage', 'best_reps_at_weight')),
  value              NUMERIC(8,2) NOT NULL,
  reps               INT2,
  weight_kg          NUMERIC(6,2),
  workout_session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  achieved_at        TIMESTAMPTZ DEFAULT now(),
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_sessions_user_started ON workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_sets_session ON exercise_sets(workout_session_id);
CREATE INDEX idx_pr_user_exercise ON personal_records(user_id, exercise_id);
CREATE INDEX idx_templates_user ON workout_templates(user_id);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_body_region ON exercises(body_region);
CREATE INDEX idx_programs_user ON programs(user_id);
CREATE INDEX idx_program_blocks_program ON program_blocks(program_id);
CREATE INDEX idx_template_exercises_template ON workout_template_exercises(workout_template_id);
CREATE INDEX idx_coach_relationships_coach ON coach_relationships(coach_id);
CREATE INDEX idx_coach_relationships_athlete ON coach_relationships(athlete_id);
