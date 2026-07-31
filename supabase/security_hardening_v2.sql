-- ============================================================
-- NUMIO — RLS HARDENING v3
-- Run this in Supabase SQL editor AFTER all previous SQL files.
-- This closes the direct-write vectors that rls_setup.sql left open.
-- ============================================================

-- ============================================================
-- 1. kid_profiles — revoke direct UPDATE entirely
--    Problem: rls_setup.sql grants open UPDATE with no column
--    restriction. Any authenticated user can set coin_balance,
--    streak_count, streak_last_date to any value from devtools.
--    Fix: drop the open UPDATE policy, replace with a strict
--    column whitelist (only name and emoji — safe fields kids
--    can edit). All coin/streak mutations go through RPCs only.
-- ============================================================

DROP POLICY IF EXISTS "kid_profiles_update" ON kid_profiles;

-- Kids can only update their own display fields (name, emoji).
-- coin_balance, streak_count, streak_last_date are RPC-only.
CREATE POLICY "kid_profiles_update" ON kid_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Column-level: revoke UPDATE on sensitive columns entirely.
-- Only RPCs (SECURITY DEFINER) can touch these.
REVOKE UPDATE (coin_balance, streak_count, streak_last_date) ON kid_profiles FROM authenticated;


-- ============================================================
-- 2. profiles — revoke UPDATE on parent_pin and activated
--    Problem: rls_setup.sql grants open UPDATE on profiles.
--    A kid can compute SHA-256("numio-pin:1234"), write it to
--    profiles.parent_pin, and enter Parent Zone with PIN "1234".
--    Also: client can set activated=true to skip activation exam.
--    Fix: column-level REVOKE on the dangerous columns.
--    language, display_name remain client-writable (Profile.jsx).
-- ============================================================

REVOKE UPDATE (parent_pin, activated) ON profiles FROM authenticated;


-- ============================================================
-- 3. exams — revoke direct INSERT from client
--    Problem: rls_setup.sql grants client INSERT on exams.
--    Anyone can insert { questions: Array(500).fill({}) } and
--    call complete_quiz_and_award_coins → 1000 coins.
--    Fix: all exam creation goes through the edge function
--    (service role key). Client only needs SELECT.
-- ============================================================

DROP POLICY IF EXISTS "exams_insert" ON exams;
DROP POLICY IF EXISTS "exams_update" ON exams;

-- No direct insert/update from client — edge function uses service role.
-- Select and delete remain (kids read their own exams, can delete).


-- ============================================================
-- 4. claims — revoke direct INSERT from client
--    Problem: security_hardening_v2.sql dropped claims_update
--    and claims_delete but left claims_insert from rls_setup.sql.
--    A client can insert { status: 'approved' } directly,
--    bypassing coin deduction and parent approval entirely.
--    Fix: drop claims_insert. Only claim_reward_for_kid RPC
--    can create claims (it's SECURITY DEFINER).
-- ============================================================

DROP POLICY IF EXISTS "claims_insert" ON claims;

-- No direct insert on claims — claim_reward_for_kid RPC only.


-- ============================================================
-- 5. rewards — revoke direct INSERT (already dropped in v2,
--    but rls_setup.sql runs first and re-adds it if re-run).
--    Belt-and-suspenders: ensure insert is gone.
-- ============================================================

DROP POLICY IF EXISTS "rewards_insert" ON rewards;
DROP POLICY IF EXISTS "rewards_update" ON rewards;

-- create_reward_for_family and delete_reward_for_family RPCs only.


-- ============================================================
-- 6. saveExam: the edge function inserts exams via service role.
--    But chapters.js:saveExam() inserts exams from the client
--    using the anon/user key. We need to allow this specific
--    insert pattern (user_id = auth.uid()) while blocking
--    the forgery vector (arbitrary questions count).
--
--    Solution: re-add a restricted INSERT policy that enforces
--    user_id = auth.uid() AND question count <= 20.
--    This allows saveExam() to work while blocking 500-question
--    forgeries. The edge function still uses service role
--    (bypasses RLS entirely) so it's unaffected.
-- ============================================================

CREATE POLICY "exams_insert" ON exams
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND jsonb_array_length(questions) <= 20
  );


-- ============================================================
-- 7. Update complete_quiz_and_award_coins to also validate
--    question count cap server-side (defense in depth).
-- ============================================================

CREATE OR REPLACE FUNCTION complete_quiz_and_award_coins(
  p_exam_id uuid,
  p_kid_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  question_count int;
  coins_to_award int;
  new_balance    int;
  MAX_QUESTIONS  int := 20;
  COINS_PER_Q    int := 2;
BEGIN
  -- Verify exam belongs to this authenticated user's family
  SELECT jsonb_array_length(questions) INTO question_count
  FROM exams
  WHERE id = p_exam_id AND user_id = auth.uid();

  IF NOT FOUND OR question_count IS NULL THEN
    RAISE EXCEPTION 'Exam not found or unauthorized';
  END IF;

  -- Cap question count — reject forged exams even if INSERT somehow passed
  IF question_count > MAX_QUESTIONS THEN
    RAISE EXCEPTION 'Invalid exam: question count exceeds maximum';
  END IF;

  -- Verify kid belongs to this family
  IF NOT EXISTS (
    SELECT 1 FROM kid_profiles WHERE id = p_kid_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Idempotency: if already completed, return current balance with 0 coins
  IF EXISTS (SELECT 1 FROM quiz_completions WHERE exam_id = p_exam_id AND kid_id = p_kid_id) THEN
    SELECT coin_balance INTO new_balance FROM kid_profiles WHERE id = p_kid_id AND user_id = auth.uid();
    RETURN jsonb_build_object('coinsAwarded', 0, 'newBalance', COALESCE(new_balance, 0));
  END IF;

  -- Mark as completed (ON CONFLICT DO NOTHING handles race conditions)
  INSERT INTO quiz_completions (exam_id, kid_id) VALUES (p_exam_id, p_kid_id)
  ON CONFLICT DO NOTHING;

  -- Derive coins server-side — client never supplies amount
  coins_to_award := question_count * COINS_PER_Q;

  UPDATE kid_profiles
  SET coin_balance = GREATEST(0, coin_balance + coins_to_award)
  WHERE id = p_kid_id
  RETURNING coin_balance INTO new_balance;

  RETURN jsonb_build_object(
    'coinsAwarded', coins_to_award,
    'newBalance',   new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION complete_quiz_and_award_coins(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION complete_quiz_and_award_coins(uuid, uuid) TO authenticated;


-- ============================================================
-- 8. Fix the regression from Round 33 Fix 4:
--    Home.jsx setError() calls for validation errors pass a
--    string, but getErrorMessage() reads err?.message which is
--    undefined on a string — falls through to generic copy.
--    Fix is in Home.jsx (see separate file), but document here.
-- ============================================================

-- No SQL needed — see Home.jsx fix below.


-- ============================================================
-- VERIFICATION QUERIES
-- Run these after applying to confirm everything took effect.
-- ============================================================

-- Should show NO update privilege on coin_balance for authenticated:
-- SELECT grantee, privilege_type, column_name
-- FROM information_schema.column_privileges
-- WHERE table_name = 'kid_profiles'
--   AND column_name IN ('coin_balance','streak_count','streak_last_date')
--   AND grantee = 'authenticated';

-- Should show NO insert policy on claims:
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'claims' AND cmd = 'INSERT';

-- Should show NO insert policy on rewards:
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'rewards' AND cmd = 'INSERT';

-- Should show exams_insert WITH CHECK includes question count:
-- SELECT policyname, with_check FROM pg_policies
-- WHERE tablename = 'exams' AND cmd = 'INSERT';
