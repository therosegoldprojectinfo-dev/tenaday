-- ============================================================
-- NUMIO — trial_logs table
-- Tracks anonymous trial quiz costs separately from real users.
-- Cannot be linked to accounts post-signup (different user.id).
-- Run AFTER rls_hardening_v3.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS trial_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id    uuid NOT NULL, -- auth.users id of the anonymous session
  image_count     int NOT NULL DEFAULT 1,
  input_tokens    int NOT NULL DEFAULT 0,
  output_tokens   int NOT NULL DEFAULT 0,
  cost_usd        numeric(10,6) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trial_logs ENABLE ROW LEVEL SECURITY;

-- No client access — service role only (edge function uses service key)
REVOKE ALL ON trial_logs FROM anon, authenticated;

-- Add unique index to prevent race conditions on trial limit
CREATE UNIQUE INDEX IF NOT EXISTS trial_logs_anonymous_id_unique ON trial_logs (anonymous_id);
