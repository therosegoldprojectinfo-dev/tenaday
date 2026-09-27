-- ============================================================
-- NUMIO — Practice Engine schema
-- Adds the 4-phase pipeline storage (lesson analysis → curriculum
-- alignment → practice plan → questions) plus per-question
-- performance tracking, which is what makes real adaptation
-- possible (quiz_results only ever stored an aggregate score_pct).
--
-- Run AFTER education_profile.sql.
-- Safe to re-run (IF NOT EXISTS / OR REPLACE throughout).
-- ============================================================

-- ── Phase A output ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_analyses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kid_id       uuid NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  subject      text,
  topic        text,
  subtopics    jsonb NOT NULL DEFAULT '[]',
  concepts     jsonb NOT NULL DEFAULT '[]',
  skills       jsonb NOT NULL DEFAULT '[]',
  language     text,
  difficulty   text,
  vocabulary   jsonb NOT NULL DEFAULT '[]',
  notation     text,
  page_text    text,
  raw          jsonb NOT NULL,  -- full untouched model output, for debugging/future re-parsing
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Phase B output ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS curriculum_alignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_analysis_id  uuid NOT NULL REFERENCES lesson_analyses(id) ON DELETE CASCADE,
  kid_id              uuid NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  country             text,   -- snapshot at generation time (profile can change later)
  region              text,
  grade               text,
  expected_knowledge  jsonb NOT NULL DEFAULT '[]',
  source_tier_used     text,  -- 'model_knowledge' for now — 'web_search' once that's wired in
  raw                 jsonb NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Phase C output ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS practice_plans (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_analysis_id      uuid NOT NULL REFERENCES lesson_analyses(id) ON DELETE CASCADE,
  curriculum_alignment_id uuid NOT NULL REFERENCES curriculum_alignments(id) ON DELETE CASCADE,
  kid_id                  uuid NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  target_skill            text,
  subskills               jsonb NOT NULL DEFAULT '[]',
  starting_difficulty     int,
  exercise_forms          jsonb NOT NULL DEFAULT '[]',
  performance_used        jsonb NOT NULL DEFAULT '[]',  -- compact weak/mastered snapshot fed to the model
  raw                     jsonb NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ── Link exams to the pipeline that produced them ────────────
-- Lets "practice more" reuse lesson_analysis_id / curriculum_alignment_id
-- from parent_exam_id and skip re-running Phase A/B.
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS lesson_analysis_id      uuid REFERENCES lesson_analyses(id),
  ADD COLUMN IF NOT EXISTS curriculum_alignment_id uuid REFERENCES curriculum_alignments(id),
  ADD COLUMN IF NOT EXISTS practice_plan_id         uuid REFERENCES practice_plans(id);

-- ── Phase E-ish: per-question performance (the missing piece) ─
CREATE TABLE IF NOT EXISTS question_attempts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id        uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  kid_id         uuid NOT NULL REFERENCES kid_profiles(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id    text NOT NULL,   -- matches the "id" inside exams.questions jsonb
  skill          text,
  subskill       text,
  question_type  text,
  difficulty     int,
  is_correct     boolean NOT NULL,
  time_seconds   int,
  attempts       int NOT NULL DEFAULT 1,
  hint_used      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_attempts_kid_skill
  ON question_attempts (kid_id, skill);

-- ── RLS: same pattern as everything else — client reads own data,
-- nothing gets written directly by the client. Edge Function uses
-- the service role key and bypasses RLS entirely, which is correct
-- here since these rows are 100% model-derived, not user input. ──
ALTER TABLE lesson_analyses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_analyses_select" ON lesson_analyses;
CREATE POLICY "lesson_analyses_select" ON lesson_analyses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "curriculum_alignments_select" ON curriculum_alignments;
CREATE POLICY "curriculum_alignments_select" ON curriculum_alignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM kid_profiles kp WHERE kp.id = curriculum_alignments.kid_id AND kp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "practice_plans_select" ON practice_plans;
CREATE POLICY "practice_plans_select" ON practice_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM kid_profiles kp WHERE kp.id = practice_plans.kid_id AND kp.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "question_attempts_select" ON question_attempts;
CREATE POLICY "question_attempts_select" ON question_attempts
  FOR SELECT USING (auth.uid() = user_id);

REVOKE ALL ON lesson_analyses, curriculum_alignments, practice_plans FROM anon, authenticated;
REVOKE ALL ON question_attempts FROM anon;
GRANT SELECT ON lesson_analyses, curriculum_alignments, practice_plans, question_attempts TO authenticated;

-- ============================================================
-- log_question_attempt RPC — SECURITY DEFINER so the kid's
-- correct/incorrect answer can't be spoofed by the client, same
-- pattern as complete_quiz_and_award_coins. Call this once per
-- question right after reveal, from Quiz.jsx.
-- ============================================================
CREATE OR REPLACE FUNCTION log_question_attempt(
  p_exam_id       uuid,
  p_kid_id        uuid,
  p_question_id   text,
  p_skill         text,
  p_subskill      text,
  p_question_type text,
  p_difficulty    int,
  p_is_correct    boolean,
  p_time_seconds  int DEFAULT NULL,
  p_hint_used     boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM kid_profiles WHERE id = p_kid_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM exams WHERE id = p_exam_id AND kid_id = p_kid_id
  ) THEN
    RAISE EXCEPTION 'Exam does not belong to this kid';
  END IF;

  INSERT INTO question_attempts (
    exam_id, kid_id, user_id, question_id, skill, subskill,
    question_type, difficulty, is_correct, time_seconds, hint_used
  ) VALUES (
    p_exam_id, p_kid_id, v_user_id, p_question_id, p_skill, p_subskill,
    p_question_type, p_difficulty, p_is_correct, p_time_seconds, p_hint_used
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION log_question_attempt(uuid, uuid, text, text, text, text, int, boolean, int, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION log_question_attempt(uuid, uuid, text, text, text, text, int, boolean, int, boolean) TO authenticated;

-- Sanity checks after running:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('lesson_analyses','curriculum_alignments','practice_plans','question_attempts');
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'exams' AND column_name LIKE '%_id';
