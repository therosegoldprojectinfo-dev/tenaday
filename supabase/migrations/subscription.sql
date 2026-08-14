-- ============================================================
-- NUMIO SUBSCRIPTION — Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- RPC: get_subscription_status
-- Returns trial_days_left, subscription_status for the current user
CREATE OR REPLACE FUNCTION public.get_subscription_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_days_since int;
  v_trial_days_left int;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  v_days_since      := EXTRACT(DAY FROM now() - v_profile.created_at)::int;
  v_trial_days_left := GREATEST(0, 2 - v_days_since);

  -- Auto-expire trial if time is up and not active
  IF v_profile.subscription_status = 'trial' AND v_trial_days_left = 0 THEN
    UPDATE profiles SET subscription_status = 'expired' WHERE id = auth.uid();
    v_profile.subscription_status := 'expired';
  END IF;

  RETURN jsonb_build_object(
    'status',          v_profile.subscription_status,
    'trial_days_left', v_trial_days_left,
    'days_since',      v_days_since
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_status() TO authenticated;

-- RPC: set_stripe_customer (called by webhook edge function)
CREATE OR REPLACE FUNCTION public.set_stripe_data(
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET
    stripe_customer_id     = p_customer_id,
    stripe_subscription_id = p_subscription_id,
    subscription_status    = p_status
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_stripe_data(uuid, text, text, text) TO service_role;
