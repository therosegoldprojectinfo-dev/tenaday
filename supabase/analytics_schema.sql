-- ============================================================================
-- Numio — Analytics schema (v1)
-- ============================================================================
-- Purely additive: does not touch parents/kids/attempts/gifts/etc.
-- Run this AFTER schema.sql + rls_security.sql.
--
-- Philosophy (per the V1 analytics plan): log a small, fixed set of raw
-- events with just enough context (kid_id/parent_id + a small json blob for
-- anything event-specific), and compute every dashboard metric — activation
-- rate, D1/D7 retention, reward redemption rate, abandonment/churn — as
-- SQL queries over this one table. No separate "sessions" or "presence"
-- tables in v1; timestamps on this table are enough for everything we
-- actually decided to track right now.
--
-- V1 event vocabulary (enforced via check constraint so a typo in app code
-- fails loudly instead of silently creating a new, uncounted event name):
--   signup_completed   — parent finishes signup       (parent_id only)
--   child_created       — parent creates a kid profile  (parent_id + kid_id)
--   reward_created      — parent creates a reward        (parent_id, + props.reward_id)
--   unit_started        — kid starts a node             (kid_id, + props.operation/table/batch/node)
--   unit_completed       — kid finishes a node            (kid_id, + props.operation/table/batch/node)
--   reward_unlocked      — kid has enough coins for a reward that exists (kid_id, + props.reward_id)
--   reward_redeemed      — kid/parent redeems a reward     (kid_id, + props.reward_id/coin_price)
-- ============================================================================

create table if not exists analytics_events (
  id          bigint generated always as identity primary key,
  event_name  text not null check (event_name in (
                'signup_completed',
                'child_created',
                'reward_created',
                'unit_started',
                'unit_completed',
                'reward_unlocked',
                'reward_redeemed'
              )),
  parent_id   uuid references parents(id) on delete set null,
  kid_id      uuid references kids(id) on delete set null,
  props       jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- Every retention/funnel/abandonment query below filters or groups by one
-- of these three, so index all three rather than guessing which matters more.
create index if not exists analytics_events_event_name_idx on analytics_events (event_name);
create index if not exists analytics_events_kid_id_idx      on analytics_events (kid_id);
create index if not exists analytics_events_parent_id_idx   on analytics_events (parent_id);
create index if not exists analytics_events_created_at_idx  on analytics_events (created_at);

-- ── Row Level Security ──────────────────────────────────────────────────
-- Same shape as the rest of the app: no client ever reads/writes this table
-- directly. Writes go through log_event() below (security definer), reads
-- go through the dashboard queries you run yourself in the SQL editor (or a
-- future admin-only view) — never from the kid/parent-facing app.

alter table analytics_events enable row level security;
-- No policies created on purpose — RLS on with zero policies means the
-- table is fully locked to anon/authenticated roles; only security definer
-- functions (which run as the function owner, bypassing RLS) can touch it.

-- ── Write path ───────────────────────────────────────────────────────────
-- One RPC for every event, mirroring parent_sign_up/parent_log_in etc. in
-- rls_security.sql. Kept deliberately dumb: validate nothing beyond what
-- the check constraint already validates, just record what happened.
-- Called via supabase.rpc('log_event', {...}) from src/lib/analytics.js.

create or replace function log_event(
  p_event_name text,
  p_parent_id  uuid default null,
  p_kid_id     uuid default null,
  p_props      jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into analytics_events (event_name, parent_id, kid_id, props)
  values (p_event_name, p_parent_id, p_kid_id, p_props);
end;
$$;

-- Let the app's normal (anon/authenticated) client call this RPC — the
-- function itself is the only thing allowed to touch the table.
grant execute on function log_event(text, uuid, uuid, jsonb) to anon, authenticated;

-- ============================================================================
-- Reference queries — not run automatically, just here so the shape of every
-- v1 dashboard number is on record next to the schema that produces it.
-- Swap the interval literals for 7-day / 30-day toggles in the actual UI.
-- ============================================================================

-- 1) Signups (today / this week)
-- select count(*) from analytics_events
--   where event_name = 'signup_completed' and created_at >= now() - interval '7 days';

-- 2) Activation funnel: signup -> child created -> first unit completed
-- with signups as (
--   select parent_id, min(created_at) as signed_up_at
--   from analytics_events where event_name = 'signup_completed'
--   group by parent_id
-- ),
-- kids_created as (
--   select parent_id, min(created_at) as first_kid_at
--   from analytics_events where event_name = 'child_created'
--   group by parent_id
-- ),
-- first_unit as (
--   select k.parent_id, min(e.created_at) as first_unit_at
--   from analytics_events e
--   join analytics_events k on k.kid_id = e.kid_id and k.event_name = 'child_created'
--   where e.event_name = 'unit_completed'
--   group by k.parent_id
-- )
-- select
--   count(*) as total_signups,
--   count(kc.parent_id) as created_a_kid,
--   count(fu.parent_id) as reached_first_unit
-- from signups s
-- left join kids_created kc using (parent_id)
-- left join first_unit fu using (parent_id);

-- 3) D1 / D7 retention (cohort-based, per kid's first unit_completed as "day 0")
-- with first_active as (
--   select kid_id, min(created_at)::date as day0
--   from analytics_events where event_name = 'unit_completed'
--   group by kid_id
-- ),
-- activity as (
--   select distinct kid_id, created_at::date as active_date
--   from analytics_events where event_name = 'unit_completed'
-- )
-- select
--   count(distinct fa.kid_id) as cohort_size,
--   count(distinct a1.kid_id) as returned_d1,
--   count(distinct a7.kid_id) as returned_d7
-- from first_active fa
-- left join activity a1 on a1.kid_id = fa.kid_id and a1.active_date = fa.day0 + 1
-- left join activity a7 on a7.kid_id = fa.kid_id and a7.active_date = fa.day0 + 7;

-- 4) Reward redemption rate
-- select
--   count(*) filter (where event_name = 'reward_unlocked') as unlocked,
--   count(*) filter (where event_name = 'reward_redeemed') as redeemed
-- from analytics_events;

-- 5) Abandonment (3-way split)
--   a) signup, no kid ever created           -> signup_completed with no matching child_created (by parent_id)
--   b) kid created, never completed a unit   -> child_created with no matching unit_completed (by kid_id)
--   c) churn: kid active before, silent 14d+ -> max(created_at) per kid_id < now() - interval '14 days'
