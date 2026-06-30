-- RLS Policies: MVP Strength Training App
-- Migration 00002: Enable RLS and create policies per table

-- 1. PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (id = auth.uid());

-- 2. EXERCISES
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public exercises"
  ON exercises FOR SELECT
  USING (is_public = true);

-- Admin insert/update/delete can be added later; for MVP exercises are seed-only

-- 3. PROGRAMS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own programs"
  ON programs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own programs"
  ON programs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own programs"
  ON programs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own programs"
  ON programs FOR DELETE
  USING (user_id = auth.uid());

-- 4. PROGRAM BLOCKS
ALTER TABLE program_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blocks from their programs"
  ON program_blocks FOR SELECT
  USING (
    program_id IN (
      SELECT id FROM programs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create blocks in their programs"
  ON program_blocks FOR INSERT
  WITH CHECK (
    program_id IN (
      SELECT id FROM programs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update blocks in their programs"
  ON program_blocks FOR UPDATE
  USING (
    program_id IN (
      SELECT id FROM programs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete blocks in their programs"
  ON program_blocks FOR DELETE
  USING (
    program_id IN (
      SELECT id FROM programs WHERE user_id = auth.uid()
    )
  );

-- 5. WORKOUT TEMPLATES
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON workout_templates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON workout_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON workout_templates FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON workout_templates FOR DELETE
  USING (user_id = auth.uid());

-- 6. WORKOUT TEMPLATE EXERCISES
ALTER TABLE workout_template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template exercises from their templates"
  ON workout_template_exercises FOR SELECT
  USING (
    workout_template_id IN (
      SELECT id FROM workout_templates WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add exercises to their templates"
  ON workout_template_exercises FOR INSERT
  WITH CHECK (
    workout_template_id IN (
      SELECT id FROM workout_templates WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update template exercises in their templates"
  ON workout_template_exercises FOR UPDATE
  USING (
    workout_template_id IN (
      SELECT id FROM workout_templates WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete template exercises from their templates"
  ON workout_template_exercises FOR DELETE
  USING (
    workout_template_id IN (
      SELECT id FROM workout_templates WHERE user_id = auth.uid()
    )
  );

-- 7. WORKOUT SESSIONS
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON workout_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
  ON workout_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
  ON workout_sessions FOR DELETE
  USING (user_id = auth.uid());

-- 8. EXERCISE SETS
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sets from their sessions"
  ON exercise_sets FOR SELECT
  USING (
    workout_session_id IN (
      SELECT id FROM workout_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can log sets in their sessions"
  ON exercise_sets FOR INSERT
  WITH CHECK (
    workout_session_id IN (
      SELECT id FROM workout_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sets in their sessions"
  ON exercise_sets FOR UPDATE
  USING (
    workout_session_id IN (
      SELECT id FROM workout_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sets from their sessions"
  ON exercise_sets FOR DELETE
  USING (
    workout_session_id IN (
      SELECT id FROM workout_sessions WHERE user_id = auth.uid()
    )
  );

-- 9. COACH RELATIONSHIPS
ALTER TABLE coach_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach relationships"
  ON coach_relationships FOR SELECT
  USING (coach_id = auth.uid() OR athlete_id = auth.uid());

CREATE POLICY "Coaches can create relationships"
  ON coach_relationships FOR INSERT
  WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Athletes can update relationship status"
  ON coach_relationships FOR UPDATE
  USING (athlete_id = auth.uid());

CREATE POLICY "Users can delete their own relationships"
  ON coach_relationships FOR DELETE
  USING (coach_id = auth.uid() OR athlete_id = auth.uid());

-- 10. PERSONAL RECORDS
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own records"
  ON personal_records FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert records on behalf of user"
  ON personal_records FOR INSERT
  WITH CHECK (user_id = auth.uid());
