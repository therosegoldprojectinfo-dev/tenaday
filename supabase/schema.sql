-- ============================================================================
-- Ten a Day — Supabase schema (v3: Numio Daily Loop)
-- ============================================================================
-- Supersedes the 5-node-per-unit model with the 6-node daily loop per
-- table (spec §6.5):
--   Chapter (operation) -> Table (1-12) -> Node (6 per table):
--     unlock -> learn -> what_happened -> practice -> real_life -> speed -> review
--
-- Two new behaviors this version adds support for:
--   1. Calendar-day gating: the NEXT node in the chain only unlocks on a
--      new real day, even if today's already-unlocked nodes are replayed.
--      Tracked via kids.last_advance_date.
--   2. One-time interactive chapter concept intro (e.g. "what is addition?")
--      shown once per chapter, before that chapter's table 1. Tracked via
--      kids.seen_chapter_intros (array of operation_type).
--
-- SAFE TO RE-RUN: drops and recreates the node enum and its dependent
-- columns, so it works whether fresh or migrating from the old 5-node
-- schema. Existing kid/attempt rows referencing old node values
-- ('equations', 'gift', etc.) will be reset — fine for dev/demo data, NOT
-- something to run against real user data without an explicit migration.
--
-- Run this whole file once in your Supabase project's SQL Editor.
-- ============================================================================

-- ── Extensions ───────────────────────────────────────────────────────────
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ── Enums ────────────────────────────────────────────────────────────────

do $$ begin
  create type operation_type as enum ('addition', 'subtraction', 'multiplication', 'division');
exception when duplicate_object then null;
end $$;

-- Drop the old 5-value node enum's dependent columns before recreating it,
-- since Postgres won't let you change an enum's values in place.
alter table if exists kids     drop column if exists current_node;
alter table if exists attempts drop column if exists node;

drop type if exists node_type;

create type node_type as enum ('unlock', 'learn', 'what_happened', 'practice', 'real_life', 'speed', 'review');

-- ── parents ──────────────────────────────────────────────────────────────
-- Phone + 4-digit PIN, no email (per spec §3). PIN is stored as a bcrypt-style
-- hash even though hashing happens client/edge-function side in a later
-- build phase — never store PIN as plaintext once auth is wired up.

create table if not exists parents (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null unique,
  pin_hash      text not null,
  created_at    timestamptz not null default now()
);

-- ── kids ─────────────────────────────────────────────────────────────────
-- One row per kid profile. current_operation/current_table/current_node
-- together encode "where am I in the chapter/table/node ladder" — this
-- triple IS the progression cursor.
--
-- last_advance_date: the calendar date (in the kid's local sense — stored
-- as a plain date, app layer handles timezone) the cursor last moved
-- forward by passing a node. The day-gating rule: the NEXT node beyond the
-- current one only unlocks once this date is in the past relative to
-- "today" — see lib/dayGate.js. Replaying already-unlocked nodes never
-- touches this column.
--
-- seen_chapter_intros: which operations' one-time concept intro (spec:
-- "what is addition?" etc.) this kid has already been shown. Checked
-- before rendering a chapter's table-1 content for the first time.
--
-- coin_balance can go negative (debt), floor enforced by application logic
-- per spec §7 (debt capped at -2x entry fee). Not enforced at the DB level
-- since entry_fee is tunable; the app computes the floor before writing.

create table if not exists kids (
  id                   uuid primary key default gen_random_uuid(),
  parent_id            uuid references parents(id) on delete cascade,
  name                 text not null,
  age                  int  check (age is null or (age between 3 and 17)),

  -- Parent's claim at profile creation: "my kid is already good at X".
  -- Does NOT change where the kid starts playing — every kid always
  -- begins at Addition table 1 and plays the full ladder, no skipping
  -- ("to make sure the foundation is actually there" — confirmed product
  -- decision). Instead, this raises the PASS THRESHOLD to 90% (9/10)
  -- instead of the normal 80% (8/10) for the claimed chapter AND every
  -- chapter before it in the ladder — see lib/economy.js's
  -- passThresholdFor(). Null means no claim was made; every chapter uses
  -- the normal 80% threshold.
  placement_claim      operation_type,

  current_operation    operation_type not null default 'addition',
  current_table        int  not null default 1 check (current_table between 1 and 12),
  current_batch        int  not null default 1 check (current_batch between 1 and 6),
  current_node         node_type not null default 'learn',

  last_advance_date    date,  -- null until the kid passes their very first node
  seen_chapter_intros  operation_type[] not null default '{}',

  coin_balance         int  not null default 50,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- If `kids` already existed from an earlier schema version, these add the
-- new columns back after the drop/recreate above.
alter table kids add column if not exists current_node node_type not null default 'learn';
alter table kids add column if not exists current_batch int not null default 1 check (current_batch between 1 and 6);
alter table kids drop constraint if exists kids_current_batch_check;
alter table kids add constraint kids_current_batch_check check (current_batch >= 1 and current_batch <= 6);
alter table kids add column if not exists last_advance_date date;
alter table kids add column if not exists seen_chapter_intros operation_type[] not null default '{}';
alter table kids add column if not exists age int check (age is null or (age between 3 and 17));
alter table kids add column if not exists placement_claim operation_type;

-- ── attempts ─────────────────────────────────────────────────────────────
-- One row per playthrough of a node (a batch of up to 10 questions).
-- Written once the attempt ends, either by dying or finishing the batch.

create table if not exists attempts (
  id              uuid primary key default gen_random_uuid(),
  kid_id          uuid not null references kids(id) on delete cascade,

  operation       operation_type not null,
  table_number    int  not null check (table_number between 1 and 12),
  node            node_type not null,

  questions_seen  int  not null default 0,
  correct_count   int  not null default 0,
  wrong_count     int  not null default 0,
  lives_used      int  not null default 0,

  result          text not null check (result in ('passed', 'retry', 'died')),
  coins_delta     int  not null default 0,  -- entry fee (negative) + payout (positive) net

  created_at      timestamptz not null default now()
);

alter table attempts add column if not exists node node_type;

create index if not exists attempts_kid_id_idx on attempts (kid_id, created_at desc);

-- ── coin_transactions ───────────────────────────────────────────────────
-- Ledger of every coin movement, so the parent dashboard (next phase) can
-- show a real history instead of just the current balance.

create table if not exists coin_transactions (
  id          uuid primary key default gen_random_uuid(),
  kid_id      uuid not null references kids(id) on delete cascade,
  attempt_id  uuid references attempts(id) on delete set null,
  amount      int  not null,            -- positive = earned, negative = spent
  reason      text not null,            -- 'entry_fee' | 'node_pass' | 'gift_purchase'
  balance_after int not null,
  created_at  timestamptz not null default now()
);

create index if not exists coin_transactions_kid_id_idx on coin_transactions (kid_id, created_at desc);

-- ── gifts (real-world rewards a parent defines, spec §8) ────────────────
-- parent_id is NULLABLE: null means a GLOBAL/shared reward, visible to
-- every kid regardless of parent — this is the seeded starter list below,
-- used since there's no parent-management UI yet to let each parent build
-- their own list (confirmed product decision for this build phase, not a
-- placeholder oversight). Once that UI exists, a parent's own gifts (with
-- a real parent_id) and the global list can coexist — kid-facing screens
-- should show both, parent_id IS NULL OR parent_id = <this kid's parent>.
--
-- icon is a small fixed vocabulary (not freeform/emoji input) so the
-- Rewards screen can render a consistent flat-icon-per-card style rather
-- than arbitrary parent-typed emoji — see lib/kidData.js's REWARD_ICONS
-- for the matching list on the client side.

create table if not exists gifts (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references parents(id) on delete cascade,
  name        text not null,
  coin_price  int  not null check (coin_price > 0),
  icon        text not null default 'gift',
  created_at  timestamptz not null default now()
);

-- If `gifts` already existed from an earlier schema version (parent_id
-- was NOT NULL before), this relaxes that constraint without dropping
-- the table or losing any rows a parent may have already created.
alter table gifts alter column parent_id drop not null;
alter table gifts add column if not exists icon text not null default 'gift';

create table if not exists gift_claims (
  id          uuid primary key default gen_random_uuid(),
  kid_id      uuid not null references kids(id) on delete cascade,
  gift_id     uuid not null references gifts(id) on delete cascade,
  claimed_at  timestamptz not null default now()
);

-- ── updated_at trigger for kids ─────────────────────────────────────────

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists kids_set_updated_at on kids;
create trigger kids_set_updated_at
  before update on kids
  for each row execute function set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────
-- Permissive policies for now — phone+PIN auth is enforced at the APP
-- layer (lib/parentAuth.js verifies the PIN before ever returning a
-- parent id to the client), not via Postgres RLS tied to auth.uid(),
-- since this app isn't using Supabase Auth proper for phone+PIN (see
-- lib/pinAuth.js's docs on that tradeoff). Lock these down to real
-- auth.uid()-scoped policies if/when this migrates to Supabase Auth.
--
-- IMPORTANT: every table the app writes to needs BOTH "enable row level
-- security" AND a matching open policy below — RLS enabled with no
-- policy silently blocks ALL access (a 401), and Supabase projects often
-- auto-enable RLS on new tables by default even before this script
-- explicitly does so. `parents` was missing from this block for a while
-- during development, which caused exactly that 401 on signup — if you
-- add new tables later, add them here too.

alter table parents enable row level security;
alter table kids enable row level security;
alter table attempts enable row level security;
alter table coin_transactions enable row level security;
alter table gifts enable row level security;
alter table gift_claims enable row level security;

drop policy if exists "dev_open_parents" on parents;
create policy "dev_open_parents" on parents for all using (true) with check (true);

drop policy if exists "dev_open_kids" on kids;
create policy "dev_open_kids" on kids for all using (true) with check (true);

drop policy if exists "dev_open_attempts" on attempts;
create policy "dev_open_attempts" on attempts for all using (true) with check (true);

drop policy if exists "dev_open_coin_transactions" on coin_transactions;
create policy "dev_open_coin_transactions" on coin_transactions for all using (true) with check (true);

drop policy if exists "dev_open_gifts" on gifts;
create policy "dev_open_gifts" on gifts for all using (true) with check (true);

drop policy if exists "dev_open_gift_claims" on gift_claims;
create policy "dev_open_gift_claims" on gift_claims for all using (true) with check (true);

-- ── Seed: one demo kid so the app has something to load before the parent
-- flow exists. Safe to delete once real signup is built. Starts at the
-- very first node of the very first table — the Unlock node is skipped
-- in the APP LOGIC (not the schema) for this exact starting position,
-- since there is no "yesterday" to test on table 1 of Addition.

insert into kids (id, parent_id, name, current_operation, current_table, current_batch, current_node, last_advance_date, seen_chapter_intros, coin_balance)
values ('00000000-0000-0000-0000-000000000001', null, 'Demo Kid', 'addition', 1, 1, 'learn', null, '{}', 50)
on conflict (id) do update set
  current_operation = excluded.current_operation,
  current_table = excluded.current_table,
  current_batch = excluded.current_batch,
  current_node = excluded.current_node;

-- ── Seed: starter rewards (spec §8), global (parent_id null) ────────────
-- A small placeholder list so the Rewards screen has real content before
-- a parent-management UI exists to let each parent build their own list.
-- Prices are example values, same "tune during build" spirit as the
-- economy constants in lib/economy.js — easy to adjust once real kids are
-- actually playing and the numbers can be balanced against real coin
-- earn rates.
--
-- Guarded by "only insert if no global gifts exist yet" rather than an
-- ON CONFLICT clause, since gifts has no unique constraint for ON
-- CONFLICT to target (its only unique column is the auto-generated id,
-- which is different on every insert and so can never conflict) — without
-- this guard, re-running schema.sql would silently duplicate the seed
-- rewards on every run.

insert into gifts (name, coin_price, icon)
select * from (values
  ('20 minutes of TV',        120, 'tv'),
  ('Pick tonight''s dinner',  150, 'utensils'),
  ('Stay up 30 minutes late', 200, 'moon'),
  ('A trip to the park',      250, 'tree'),
  ('Choose a movie night',    300, 'film'),
  ('A small toy',             500, 'gift')
) as starter_gifts(name, coin_price, icon)
where not exists (select 1 from gifts where parent_id is null);

-- ── Server-time day gate (replaces device-clock last_advance_date check) ──
-- timezone: IANA timezone string detected from the kid's device at profile
-- creation, used to compute "next midnight" server-side so the gate never
-- relies on the device clock.
-- next_unlock_at: the exact server timestamp when the next batch unlocks —
-- set by complete_unit() RPC, checked by can_start_new_unit() RPC.

alter table kids add column if not exists timezone text not null default 'America/Toronto';
alter table kids add column if not exists next_unlock_at timestamptz;

-- Called after a kid finishes all 7 nodes of a batch (Review node passes).
-- Stamps last_advance_date and pre-computes next midnight in their timezone.
create or replace function complete_unit(kid_id uuid)
returns timestamptz
language plpgsql
security definer
as $$
declare
  kid_tz text;
  next_midnight timestamptz;
begin
  select timezone into kid_tz from kids where id = kid_id;

  -- Correctly compute next midnight in kid's local timezone.
  -- date_trunc gives local midnight as a timestamp without tz,
  -- then AT TIME ZONE interprets it as that zone and converts to UTC.
  next_midnight := (date_trunc('day', now() at time zone kid_tz) + interval '1 day') at time zone kid_tz;

  update kids
  set
    last_advance_date = now(),
    next_unlock_at = next_midnight
  where id = kid_id;

  return next_midnight;
end;
$$;

-- Called on the client before allowing a new batch to start.
-- Returns true if next_unlock_at is null (never locked) or already in the past.
create or replace function can_start_new_unit(kid_id uuid)
returns boolean
language sql
security definer
as $$
  select
    next_unlock_at is null or now() >= next_unlock_at
  from kids
  where id = kid_id;
$$;
