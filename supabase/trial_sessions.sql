-- ============================================================
-- NUMIO TRIAL SESSIONS TABLE
-- One row per anonymous user (browser = anon supabase user)
-- ============================================================

CREATE TABLE IF NOT EXISTS trial_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id    text NOT NULL UNIQUE,   -- supabase anon user.id
  quiz_used       boolean NOT NULL DEFAULT false,
  streak          int NOT NULL DEFAULT 0,
  coins           int NOT NULL DEFAULT 0,
  chapters        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE trial_sessions ENABLE ROW LEVEL SECURITY;

-- Anon users can only read/write their own row (matched by anon user id)
CREATE POLICY "trial_sessions_select_own" ON trial_sessions
  FOR SELECT TO anon, authenticated
  USING (anonymous_id = auth.uid()::text);

CREATE POLICY "trial_sessions_insert_own" ON trial_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (anonymous_id = auth.uid()::text);

CREATE POLICY "trial_sessions_update_own" ON trial_sessions
  FOR UPDATE TO anon, authenticated
  USING (anonymous_id = auth.uid()::text)
  WITH CHECK (anonymous_id = auth.uid()::text);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_trial_sessions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trial_sessions_updated_at
  BEFORE UPDATE ON trial_sessions
  FOR EACH ROW EXECUTE FUNCTION update_trial_sessions_updated_at();
