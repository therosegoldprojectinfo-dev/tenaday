-- ============================================================
-- NUMIO HEROES LEADERBOARD
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.hero_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id          uuid NOT NULL REFERENCES public.kid_profiles(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Display info (set by parent at signup or profile)
  display_name    text NOT NULL,
  country_code    text NOT NULL DEFAULT 'SA',   -- ISO 2-letter e.g. 'SA', 'CA', 'MA'
  country_flag    text NOT NULL DEFAULT '🇸🇦',  -- emoji flag stored for fast reads

  -- Hero progression (permanent — never goes down)
  total_days      int  NOT NULL DEFAULT 0,      -- cumulative days completed (NOT streak)
  hero_level      text NOT NULL DEFAULT 'none', -- none | wood | silver | gold | platinum | diamond | legend
  total_points    int  NOT NULL DEFAULT 0,      -- cumulative coin_balance earned lifetime

  -- Opt-in to public wall (default true)
  is_public       boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for leaderboard queries (level + points DESC)
CREATE INDEX IF NOT EXISTS idx_hero_profiles_level_points
  ON public.hero_profiles (hero_level, total_points DESC);

-- Index for kid lookup
CREATE INDEX IF NOT EXISTS idx_hero_profiles_kid_id
  ON public.hero_profiles (kid_id);

-- ============================================================
-- 2. Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hero_profiles_updated_at ON public.hero_profiles;
CREATE TRIGGER hero_profiles_updated_at
  BEFORE UPDATE ON public.hero_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. Function to compute hero level from total_days
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_hero_level(days int)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  IF    days >= 300 THEN RETURN 'legend';
  ELSIF days >= 100 THEN RETURN 'diamond';
  ELSIF days >=  60 THEN RETURN 'platinum';
  ELSIF days >=  30 THEN RETURN 'gold';
  ELSIF days >=  14 THEN RETURN 'silver';
  ELSIF days >=   7 THEN RETURN 'wood';
  ELSE                    RETURN 'none';
  END IF;
END;
$$;

-- ============================================================
-- 4. RPC: increment_hero_days
--    Called server-side (from Edge Function) after a quiz day
--    Increments total_days and recomputes hero_level
--    SECURITY DEFINER so it bypasses RLS safely
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_hero_days(
  p_kid_id uuid,
  p_points_earned int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record  hero_profiles%ROWTYPE;
  v_level   text;
  v_new_days int;
  v_new_pts  int;
BEGIN
  -- Get current record
  SELECT * INTO v_record
  FROM hero_profiles
  WHERE kid_id = p_kid_id;

  -- If no record yet, nothing to do (upsert done separately)
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'hero_profile_not_found');
  END IF;

  v_new_days := v_record.total_days + 1;
  v_new_pts  := v_record.total_points + p_points_earned;
  v_level    := compute_hero_level(v_new_days);

  UPDATE hero_profiles
  SET
    total_days   = v_new_days,
    total_points = v_new_pts,
    hero_level   = v_level
  WHERE kid_id = p_kid_id;

  RETURN jsonb_build_object(
    'total_days',   v_new_days,
    'total_points', v_new_pts,
    'hero_level',   v_level,
    'leveled_up',   (v_level <> v_record.hero_level)
  );
END;
$$;

-- ============================================================
-- 5. RPC: upsert_hero_profile
--    Called once when kid is created or first time Heroes page loads
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_hero_profile(
  p_kid_id      uuid,
  p_user_id     uuid,
  p_display_name text,
  p_country_code text DEFAULT 'SA',
  p_country_flag text DEFAULT '🇸🇦'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record hero_profiles%ROWTYPE;
BEGIN
  INSERT INTO hero_profiles (
    kid_id, user_id, display_name, country_code, country_flag,
    total_days, hero_level, total_points, is_public
  )
  VALUES (
    p_kid_id, p_user_id, p_display_name, p_country_code, p_country_flag,
    0, 'none', 0, true
  )
  ON CONFLICT (kid_id) DO NOTHING;

  SELECT * INTO v_record FROM hero_profiles WHERE kid_id = p_kid_id;

  RETURN jsonb_build_object(
    'id',           v_record.id,
    'total_days',   v_record.total_days,
    'hero_level',   v_record.hero_level,
    'total_points', v_record.total_points
  );
END;
$$;

-- Unique constraint so upsert works
ALTER TABLE public.hero_profiles
  DROP CONSTRAINT IF EXISTS hero_profiles_kid_id_key;
ALTER TABLE public.hero_profiles
  ADD CONSTRAINT hero_profiles_kid_id_key UNIQUE (kid_id);

-- ============================================================
-- 6. RLS Policies
-- ============================================================
ALTER TABLE public.hero_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read public hero profiles (for the leaderboard wall)
DROP POLICY IF EXISTS "hero_profiles_public_read" ON public.hero_profiles;
CREATE POLICY "hero_profiles_public_read"
  ON public.hero_profiles
  FOR SELECT
  USING (is_public = true);

-- Authenticated users can read their own kids' profiles (even if private)
DROP POLICY IF EXISTS "hero_profiles_owner_read" ON public.hero_profiles;
CREATE POLICY "hero_profiles_owner_read"
  ON public.hero_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Authenticated users can update only their own profiles (display_name, country, is_public)
DROP POLICY IF EXISTS "hero_profiles_owner_update" ON public.hero_profiles;
CREATE POLICY "hero_profiles_owner_update"
  ON public.hero_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No direct inserts from client — use upsert_hero_profile RPC instead
-- No direct deletes — cascade handled by kid_profiles FK

-- ============================================================
-- 7. Leaderboard view (top 50 per level, public only)
-- ============================================================
CREATE OR REPLACE VIEW public.heroes_leaderboard AS
SELECT
  id,
  display_name,
  country_code,
  country_flag,
  hero_level,
  total_days,
  total_points,
  ROW_NUMBER() OVER (
    PARTITION BY hero_level
    ORDER BY total_points DESC, total_days DESC
  ) AS rank_in_level
FROM public.hero_profiles
WHERE is_public = true
  AND hero_level <> 'none'
ORDER BY hero_level, rank_in_level;

-- Grant anon + authenticated access to the view
GRANT SELECT ON public.heroes_leaderboard TO anon, authenticated;

-- ============================================================
-- 8. Grant RPC execution
-- ============================================================
GRANT EXECUTE ON FUNCTION public.increment_hero_days(uuid, int)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_hero_profile(uuid, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_hero_level(int)           TO authenticated, anon;
