-- ============================================================
-- NUMIO — PIN HASH MIGRATION (Run AFTER reject_claim_rpc.sql)
-- ============================================================
-- Context: The client now stores parent_pin as SHA-256 hash
-- (prefix "numio-pin:" + raw PIN), not plaintext.
-- verify_parent_pin receives the hash from the client and
-- does a direct hash comparison — never sees plaintext PIN.
-- ============================================================

-- Update verify_parent_pin to compare hashed values directly
-- (client sends hashPin(pin), we compare to stored hash)
CREATE OR REPLACE FUNCTION verify_parent_pin(input_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_pin text;
  recent_attempts int;
BEGIN
  -- Rate limit: max 5 attempts in last 15 minutes
  SELECT COUNT(*) INTO recent_attempts
  FROM pin_attempts
  WHERE user_id = auth.uid()
    AND attempt_time > now() - interval '15 minutes';

  IF recent_attempts >= 5 THEN
    RAISE EXCEPTION 'Too many attempts. Try again in 15 minutes.';
  END IF;

  INSERT INTO pin_attempts (user_id) VALUES (auth.uid());

  SELECT parent_pin INTO stored_pin
  FROM profiles WHERE id = auth.uid();

  -- input_pin is now a SHA-256 hex digest sent by the client
  -- stored_pin is also a SHA-256 hex digest — direct comparison
  IF stored_pin IS NOT NULL AND stored_pin = input_pin THEN
    DELETE FROM pin_attempts WHERE user_id = auth.uid();
    INSERT INTO parent_sessions (user_id, verified_until)
    VALUES (auth.uid(), now() + interval '30 minutes')
    ON CONFLICT (user_id) DO UPDATE SET verified_until = now() + interval '30 minutes';
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION verify_parent_pin(text) FROM anon;
GRANT EXECUTE ON FUNCTION verify_parent_pin(text) TO authenticated;
