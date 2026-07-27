-- ============================================================
-- NUMIO — REJECT CLAIM RPC
-- Run this in Supabase SQL editor AFTER security_hardening_v2.sql
-- ============================================================

-- Reject a claim and refund coins to kid atomically
CREATE OR REPLACE FUNCTION reject_claim_for_family(
  p_claim_id uuid,
  p_kid_id uuid,
  p_refund int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify claim belongs to this family and is still pending
  UPDATE claims
  SET status = 'rejected'
  WHERE id = p_claim_id
    AND user_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found, already processed, or unauthorized';
  END IF;

  -- Refund coins to kid atomically
  IF p_refund > 0 AND p_kid_id IS NOT NULL THEN
    UPDATE kid_profiles
    SET coin_balance = coin_balance + p_refund
    WHERE id = p_kid_id AND user_id = auth.uid();
  END IF;
END;
$$;

-- Also add 'rejected' as valid status to claims_insert policy
-- (claims are always inserted as 'pending', rejection is server-side only)

REVOKE ALL ON FUNCTION reject_claim_for_family(uuid, uuid, int) FROM anon;
GRANT EXECUTE ON FUNCTION reject_claim_for_family(uuid, uuid, int) TO authenticated;
