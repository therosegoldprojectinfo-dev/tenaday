-- ============================================================================
-- Numio — Analytics dashboard RPC (v1)
-- ============================================================================
-- One RPC, aggregated numbers only (no row-level/PII data ever returned),
-- gated by a simple admin password check inside the function itself.
--
-- IMPORTANT: change the string 'CHANGE_ME_TO_YOUR_OWN_SECRET' below to your
-- own password before running this in Supabase. Use the SAME string in
-- admin-analytics.html's ADMIN_KEY constant. Treat it like a light gate,
-- not real security — the RPC is still reachable by anyone with your anon
-- key (which is already public), so don't put anything sensitive in here
-- beyond aggregate counts. This is fine for a solo-founder internal
-- dashboard; revisit with real auth if this ever needs to be more locked
-- down (e.g. multiple team members, sensitive figures).
-- ============================================================================

create or replace function get_dashboard_stats(p_admin_key text, p_days int default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - (p_days || ' days')::interval;
  v_result jsonb;
begin
  if p_admin_key is distinct from 'CHANGE_ME_TO_YOUR_OWN_SECRET' then
    raise exception 'unauthorized';
  end if;

  select jsonb_build_object(
    -- ── Acquisition ──────────────────────────────────────────────────
    'signups_total',       (select count(*) from analytics_events where event_name = 'signup_completed'),
    'signups_window',      (select count(*) from analytics_events where event_name = 'signup_completed' and created_at >= v_since),

    -- ── Activation funnel (counts of distinct parents/kids reaching each step) ──
    'kids_created',        (select count(distinct parent_id) from analytics_events where event_name = 'child_created'),
    'onboarding_started',  (select count(distinct kid_id) from analytics_events where event_name = 'onboarding_started'),
    'level_selected_total',(select count(distinct kid_id) from analytics_events where event_name = 'level_selected'),
    'level_just_starting', (select count(distinct kid_id) from analytics_events where event_name = 'level_selected' and props->>'just_starting' = 'true'),
    'level_picked_op',     (select count(distinct kid_id) from analytics_events where event_name = 'level_selected' and props->>'just_starting' = 'false'),
    'diagnostic_started',  (select count(distinct kid_id) from analytics_events where event_name = 'diagnostic_started'),
    'diagnostic_passed',   (select count(distinct kid_id) from analytics_events where event_name = 'diagnostic_completed' and props->>'passed' = 'true'),
    'diagnostic_failed',   (select count(distinct kid_id) from analytics_events where event_name = 'diagnostic_completed' and props->>'passed' = 'false'),
    'kids_completed_a_unit',(select count(distinct kid_id) from analytics_events where event_name = 'unit_completed'),

    -- ── Learning activity ────────────────────────────────────────────
    'units_started_total',   (select count(*) from analytics_events where event_name = 'unit_started'),
    'units_completed_total', (select count(*) from analytics_events where event_name = 'unit_completed'),
    'units_completed_window',(select count(*) from analytics_events where event_name = 'unit_completed' and created_at >= v_since),
    'kids_ever_played',      (select count(distinct kid_id) from analytics_events where event_name = 'unit_completed'),
    'active_kids_24h',       (select count(distinct kid_id) from analytics_events where event_name = 'unit_completed' and created_at >= now() - interval '24 hours'),

    -- ── Rewards ──────────────────────────────────────────────────────
    'rewards_created',  (select count(*) from analytics_events where event_name = 'reward_created'),
    'rewards_redeemed', (select count(*) from analytics_events where event_name = 'reward_redeemed'),

    -- ── Abandonment (3-way split) ────────────────────────────────────
    -- a) signed up, never created a kid
    'signup_no_kid', (
      select count(*) from (
        select distinct parent_id from analytics_events where event_name = 'signup_completed'
      ) s
      where s.parent_id not in (
        select distinct parent_id from analytics_events where event_name = 'child_created' and parent_id is not null
      )
    ),
    -- b) kid created, never completed a unit
    'kid_no_unit', (
      select count(*) from (
        select distinct kid_id from analytics_events where event_name = 'child_created' and kid_id is not null
      ) k
      where k.kid_id not in (
        select distinct kid_id from analytics_events where event_name = 'unit_completed' and kid_id is not null
      )
    ),
    -- c) churn: kid was active (unit_completed at least once), silent 14+ days
    'churned_kids', (
      select count(*) from (
        select kid_id, max(created_at) as last_active
        from analytics_events where event_name = 'unit_completed' and kid_id is not null
        group by kid_id
      ) la
      where la.last_active < now() - interval '14 days'
    ),

    'window_days', p_days,
    'generated_at', now()
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function get_dashboard_stats(text, int) to anon, authenticated;
