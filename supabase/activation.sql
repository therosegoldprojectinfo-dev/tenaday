-- ============================================================
-- NUMIO — ACTIVATION FLOW MIGRATION
-- Run in Supabase SQL Editor AFTER economy_rpcs.sql
-- ============================================================

-- 1. Add activated column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activated boolean DEFAULT false;

-- 2. Add language column to profiles (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';

-- 3. Create test_quizzes table
CREATE TABLE IF NOT EXISTS test_quizzes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_data  jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE test_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "test_quizzes_insert" ON test_quizzes;
CREATE POLICY "test_quizzes_insert" ON test_quizzes
  FOR INSERT WITH CHECK (user_id = auth.uid());

REVOKE SELECT ON test_quizzes FROM anon, authenticated;
GRANT INSERT ON test_quizzes TO authenticated;

-- 4. Add is_activation column to chapters
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS is_activation boolean DEFAULT false;

-- 5. quiz_completions table (idempotency for coin replay prevention)
-- Note: This is also added at the end of economy_rpcs.sql
-- Running both is safe (CREATE TABLE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS quiz_completions (
  exam_id    uuid NOT NULL,
  kid_id     uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, kid_id)
);

ALTER TABLE quiz_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON quiz_completions FROM anon, authenticated;
