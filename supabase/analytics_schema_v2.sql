-- ============================================================================
-- Numio — Analytics schema migration v2: onboarding funnel events
-- ============================================================================
-- Run this AFTER analytics_schema.sql (v1). Purely additive: widens the
-- event_name check constraint to allow 4 new events, nothing else changes.
--
-- New events, covering the full onboarding funnel:
--   onboarding_started    — ChildOnboarding mounts (hello screen shown)
--                           (parent_id + kid_id)
--   level_selected        — parent finishes the "what does the kid know"
--                           step — props: { just_starting: bool, known_ops }
--                           (parent_id + kid_id)
--   diagnostic_started    — Diagnostic screen mounts (only reached when
--                           level_selected had just_starting = false)
--                           (kid_id, + props.operation)
--   diagnostic_completed  — Diagnostic screen resolves — props: { passed }
--                           (kid_id)
--
-- reward_created already existed (v1) — no schema change needed there,
-- it's now just fired from a second call site (ChildOnboarding's reward
-- step) in addition to ParentDashboard's "Add reward" button.
-- ============================================================================

alter table analytics_events drop constraint if exists analytics_events_event_name_check;

alter table analytics_events add constraint analytics_events_event_name_check check (event_name in (
  'signup_completed',
  'child_created',
  'reward_created',
  'unit_started',
  'unit_completed',
  'reward_unlocked',
  'reward_redeemed',
  'onboarding_started',
  'level_selected',
  'diagnostic_started',
  'diagnostic_completed'
));

-- ============================================================================
-- Reference queries for the onboarding funnel
-- ============================================================================

-- Full onboarding funnel: kid created -> onboarding started -> level
-- selected -> (if diagnostic) diagnostic started -> diagnostic completed
-- with kids_created as (
--   select kid_id, min(created_at) as t from analytics_events where event_name = 'child_created' group by kid_id
-- ),
-- started as (
--   select kid_id, min(created_at) as t from analytics_events where event_name = 'onboarding_started' group by kid_id
-- ),
-- leveled as (
--   select kid_id, min(created_at) as t from analytics_events where event_name = 'level_selected' group by kid_id
-- ),
-- diag_started as (
--   select kid_id, min(created_at) as t from analytics_events where event_name = 'diagnostic_started' group by kid_id
-- ),
-- diag_done as (
--   select kid_id, min(created_at) as t from analytics_events where event_name = 'diagnostic_completed' group by kid_id
-- )
-- select
--   count(kc.kid_id)  as kids_created,
--   count(s.kid_id)   as onboarding_started,
--   count(l.kid_id)   as level_selected,
--   count(ds.kid_id)  as diagnostic_started,
--   count(dd.kid_id)  as diagnostic_completed
-- from kids_created kc
-- left join started      s  using (kid_id)
-- left join leveled      l  using (kid_id)
-- left join diag_started ds using (kid_id)
-- left join diag_done    dd using (kid_id);

-- Just-starting-out vs. diagnostic-path split, and diagnostic pass rate
-- select
--   props->>'just_starting' as just_starting,
--   count(*) as n
-- from analytics_events where event_name = 'level_selected'
-- group by 1;

-- select
--   count(*) filter (where props->>'passed' = 'true')  as passed,
--   count(*) filter (where props->>'passed' = 'false') as failed
-- from analytics_events where event_name = 'diagnostic_completed';
