-- ============================================================
-- NUMIO — create_kid_for_family RPC
-- Replaces direct client INSERT on kid_profiles.
-- After running this, REVOKE INSERT ON kid_profiles FROM authenticated.
-- ============================================================

CREATE OR REPLACE FUNCTION create_kid_for_family(p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kid_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  INSERT INTO kid_profiles (user_id, name, coin_balance, streak_count)
  VALUES (auth.uid(), trim(p_name), 0, 0)
  RETURNING id INTO v_kid_id;

  RETURN v_kid_id;
END;
$$;

REVOKE ALL ON FUNCTION create_kid_for_family(text) FROM anon;
GRANT EXECUTE ON FUNCTION create_kid_for_family(text) TO authenticated;

-- Close the coin_balance exploit:
-- Client can no longer INSERT directly into kid_profiles
-- All kid creation goes through this SECURITY DEFINER RPC
REVOKE INSERT ON kid_profiles FROM authenticated;
