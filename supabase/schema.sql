-- ============================================================================
-- Ten a Day — Supabase schema (v2: 5-node units)
-- ============================================================================
-- Supersedes the original 3-stage ladder (equation/word_problem/speed_round)
-- with the 5-node-per-unit model:
--   Chapter (operation) -> Unit (table 1-12) -> Node (5 per unit):
--     equations -> speed_round -> irl -> irl_timed -> gift
--
-- SAFE TO RE-RUN: this file drops and recreates the stage/node enum and the
-- columns that depend on it, so it works whether you're running it fresh
-- or migrating a database that already has the old 3-stage schema. Existing
-- kid/attempt rows referencing old stage values ('word_problem', etc.) will
-- be reset, since there's no automatic mapping from 3 old stages to 5 new
-- nodes — fine for a dev/demo database, NOT something to run against real
-- user data without writing an explicit data migration first.
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

-- Drop the old 3-value stage enum's dependent columns before recreating it,
-- since Postgres won't let you change an enum's values in place.
alter table if exists kids     drop column if exists current_stage;
alter table if exists attempts drop column if exists stage;

drop type if exists stage_type;

create type node_type as enum ('equations', 'speed_round', 'irl', 'irl_timed', 'gift');

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
-- together encode "where am I in the chapter/unit/node ladder" — this
-- triple IS the progression cursor.
--
-- coin_balance can go negative (debt), floor enforced by application logic
-- per spec §7 (debt capped at -2x entry fee). Not enforced at the DB level
-- since entry_fee is tunable; the app computes the floor before writing.

create table if not exists kids (
  id                 uuid primary key default gen_random_uuid(),
  parent_id          uuid references parents(id) on delete cascade,
  name               text not null,

  current_operation  operation_type not null default 'addition',
  current_table      int  not null default 1 check (current_table between 1 and 12),
  current_node       node_type not null default 'equations',

  coin_balance       int  not null default 50,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- If `kids` already existed from the old schema (without current_node),
-- this adds it back after the drop/recreate above.
alter table kids add column if not exists current_node node_type not null default 'equations';

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

-- ── gifts (parent-defined real-world rewards, next build phase) ──────────

create table if not exists gifts (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references parents(id) on delete cascade,
  name        text not null,
  coin_price  int  not null check (coin_price > 0),
  created_at  timestamptz not null default now()
);

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
-- Permissive policies for now since there's no parent auth wired up yet in
-- this build phase (kid/game screens only, per current scope). Lock these
-- down to auth.uid()-scoped policies once PIN login lands.

alter table kids enable row level security;
alter table attempts enable row level security;
alter table coin_transactions enable row level security;
alter table gifts enable row level security;
alter table gift_claims enable row level security;

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
-- flow exists. Safe to delete once real signup is built.

insert into kids (id, parent_id, name, current_operation, current_table, current_node, coin_balance)
values ('00000000-0000-0000-0000-000000000001', null, 'Demo Kid', 'addition', 1, 'equations', 50)
on conflict (id) do update set
  current_operation = excluded.current_operation,
  current_table = excluded.current_table,
  current_node = excluded.current_node;
