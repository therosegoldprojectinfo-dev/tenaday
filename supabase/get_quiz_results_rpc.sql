-- ============================================================
-- NUMIO — get_quiz_results RPC
-- Returns quiz results for a specific kid, readable by parent.
-- Run AFTER quiz_results.sql
-- ============================================================

CREATE OR REPLACE FUNCTION get_quiz_results(p_kid_id uuid)
RETURNS TABLE (
  result_id   uuid,
  exam_id     uuid,
  topic       text,
  score_pct   int,
  correct     int,
  total       int,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify kid belongs to this family
  IF NOT EXISTS (
    SELECT 1 FROM kid_profiles kp WHERE kp.id = p_kid_id AND kp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
    SELECT
      qr.id        AS result_id,
      qr.exam_id,
      COALESCE(e.topic, 'Quiz') AS topic,
      qr.score_pct,
      qr.correct,
      qr.total,
      qr.created_at
    FROM quiz_results qr
    LEFT JOIN exams e ON e.id = qr.exam_id
    WHERE qr.kid_id = p_kid_id
      AND qr.user_id = auth.uid()
    ORDER BY qr.created_at DESC
    LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION get_quiz_results(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION get_quiz_results(uuid) TO authenticated;
