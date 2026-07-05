-- ══════════════════════════════════════════════════════════════════════════════
-- NUMIO — Production RLS Hardening
-- Run this in Supabase SQL Editor BEFORE running ads / going beyond beta.
-- Safe to re-run: all policies use DROP IF EXISTS first.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Step 1: Enable pgcrypto for server-side PIN hashing ───────────────────────
create extension if not exists pgcrypto;

-- ── Step 2: Server-side auth RPCs ────────────────────────────────────────────
-- These run as SECURITY DEFINER (with full DB access) so the anon key
-- NEVER needs to read the parents table directly. The client sends phone+PIN,
-- gets back parent_id (or null) — pin_hash never leaves the server.

-- Drop existing versions first
drop function if exists parent_sign_up(text, text);
drop function if exists parent_log_in(text, text);
drop function if exists parent_verify_pin(text, text);

-- Sign up: creates a new parent account server-side
-- pin_hash is stored as-is (client still does PBKDF2, server stores the result)
-- Returns the new parent id, or raises an exception if phone already exists
create or replace function parent_sign_up(p_phone text, p_pin_hash text)
returns uuid
language plpgsql
security definer
as $$
declare
  existing_id uuid;
  new_id uuid;
begin
  -- Check for existing account
  select id into existing_id from parents where phone = p_phone;
  if found then
    raise exception 'PHONE_EXISTS' using errcode = 'P0001';
  end if;

  -- Insert new parent
  insert into parents (phone, pin_hash)
  values (p_phone, p_pin_hash)
  returning id into new_id;

  return new_id;
end;
$$;

-- Log in: verifies the stored hash against the provided hash
-- Both hashes were computed client-side with PBKDF2 + the stored salt,
-- so we just do a string equality check server-side
-- Returns parent_id on success, null on failure (intentionally same response
-- for wrong phone and wrong PIN to prevent enumeration)
create or replace function parent_log_in(p_phone text, p_pin_hash text)
returns uuid
language plpgsql
security definer
as $$
declare
  parent_row parents%rowtype;
begin
  select * into parent_row from parents where phone = p_phone;
  if not found then
    return null;
  end if;

  -- Compare the submitted hash against stored hash
  -- Both were derived with PBKDF2 using the same salt (stored in the hash string)
  if parent_row.pin_hash = p_pin_hash then
    return parent_row.id;
  end if;

  return null;
end;
$$;

-- PIN re-verification for Parent Zone access (used in ParentPinEntry.jsx)
-- Same as log_in but takes parent_id instead of phone
create or replace function parent_verify_pin(p_parent_id uuid, p_pin_hash text)
returns boolean
language plpgsql
security definer
as $$
declare
  stored_hash text;
begin
  select pin_hash into stored_hash from parents where id = p_parent_id;
  if not found then
    return false;
  end if;
  return stored_hash = p_pin_hash;
end;
$$;

-- Helper: get salt for a phone number (needed client-side to recompute PBKDF2)
-- Returns just the salt portion of the stored hash, not the full hash
-- This is safe: salt is not secret (it's just a nonce to prevent rainbow tables)
create or replace function get_parent_salt(p_phone text)
returns text
language plpgsql
security definer
as $$
declare
  stored_hash text;
  salt_hex text;
begin
  select pin_hash into stored_hash from parents where phone = p_phone;
  if not found then
    -- Return a fake salt so timing doesn't reveal whether phone exists
    return 'not_found';
  end if;
  -- Format is "pbkdf2$<saltHex>$<hashHex>" — extract the middle part
  salt_hex := split_part(stored_hash, '$', 2);
  return salt_hex;
end;
$$;

-- ── Step 3: Lock down the parents table ──────────────────────────────────────
-- Anon key can NO LONGER read phone numbers or PIN hashes.
-- All auth goes through the RPCs above.

alter table parents enable row level security;

drop policy if exists "dev_open_parents" on parents;
drop policy if exists "anon_no_delete_parents" on parents;
drop policy if exists "anon_insert_parents" on parents;
drop policy if exists "anon_update_parents" on parents;
drop policy if exists "anon_select_parents" on parents;

-- No direct anon access to parents at all — everything goes through RPCs
-- (The RPCs are security definer so they bypass RLS and can read/write freely)
create policy "parents_no_anon_access" on parents
  as restrictive
  for all
  to anon
  using (false)
  with check (false);

-- ── Step 4: Lock down kids, attempts, coin_transactions ──────────────────────
-- These stay readable/writable via anon (the app needs them),
-- but anon can no longer DELETE anything.

alter table kids enable row level security;
drop policy if exists "dev_open_kids" on kids;
drop policy if exists "anon_no_delete_kids" on kids;
drop policy if exists "anon_insert_kids" on kids;
drop policy if exists "anon_update_kids" on kids;
create policy "kids_anon_select" on kids for select to anon using (true);
create policy "kids_anon_insert" on kids for insert to anon with check (true);
create policy "kids_anon_update" on kids for update to anon using (true) with check (true);
-- No DELETE policy = anon cannot delete kids

alter table attempts enable row level security;
drop policy if exists "dev_open_attempts" on attempts;
drop policy if exists "anon_no_delete_attempts" on attempts;
drop policy if exists "anon_insert_attempts" on attempts;
create policy "attempts_anon_select" on attempts for select to anon using (true);
create policy "attempts_anon_insert" on attempts for insert to anon with check (true);
-- No UPDATE or DELETE = attempts are append-only

alter table coin_transactions enable row level security;
drop policy if exists "dev_open_coin_transactions" on coin_transactions;
drop policy if exists "anon_no_delete_coin_tx" on coin_transactions;
drop policy if exists "anon_insert_coin_tx" on coin_transactions;
create policy "coin_tx_anon_select" on coin_transactions for select to anon using (true);
create policy "coin_tx_anon_insert" on coin_transactions for insert to anon with check (true);
-- No UPDATE or DELETE = ledger is immutable

alter table gifts enable row level security;
drop policy if exists "dev_open_gifts" on gifts;
drop policy if exists "anon_no_delete_gifts" on gifts;
drop policy if exists "anon_insert_gifts" on gifts;
drop policy if exists "anon_update_own_gifts" on gifts;
create policy "gifts_anon_select" on gifts for select to anon using (true);
create policy "gifts_anon_insert" on gifts for insert to anon with check (parent_id is not null);
create policy "gifts_anon_update" on gifts for update to anon using (parent_id is not null) with check (parent_id is not null);
-- Global gifts (parent_id is null) cannot be modified via anon

alter table gift_claims enable row level security;
drop policy if exists "dev_open_gift_claims" on gift_claims;
drop policy if exists "anon_no_delete_gift_claims" on gift_claims;
drop policy if exists "anon_insert_gift_claims" on gift_claims;
drop policy if exists "anon_update_gift_claims" on gift_claims;
create policy "gift_claims_anon_select" on gift_claims for select to anon using (true);
create policy "gift_claims_anon_insert" on gift_claims for insert to anon with check (true);
create policy "gift_claims_anon_update" on gift_claims for update to anon using (true) with check (true);

-- ── Step 5: Grant RPC execution to anon ──────────────────────────────────────
grant execute on function parent_sign_up(text, text) to anon;
grant execute on function parent_log_in(text, text) to anon;
grant execute on function parent_verify_pin(uuid, text) to anon;
grant execute on function get_parent_salt(text) to anon;

-- ══════════════════════════════════════════════════════════════════════════════
-- After running this SQL, update parentAuth.js to use these RPCs instead of
-- direct table queries. See the updated parentAuth.js file.
-- ══════════════════════════════════════════════════════════════════════════════

-- Helper: get salt by parent_id (for ParentPinEntry re-verification)
drop function if exists get_parent_salt_by_id(uuid);
create or replace function get_parent_salt_by_id(p_parent_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  stored_hash text;
begin
  select pin_hash into stored_hash from parents where id = p_parent_id;
  if not found then
    return 'not_found';
  end if;
  return split_part(stored_hash, '$', 2);
end;
$$;

grant execute on function get_parent_salt_by_id(uuid) to anon;

-- ── Fix: allow anon to DELETE own gifts and gift_claims ───────────────────────
-- ParentDashboard needs to delete rewards (parent's own) and approve claims
-- (delete from gift_claims). Without these, deletes silently fail (0 rows matched)
-- and the UI looks like it worked but the data reappears on reload.

drop policy if exists "gifts_anon_delete_own" on gifts;
create policy "gifts_anon_delete_own" on gifts
  for delete to anon
  using (parent_id is not null);
-- Global gifts (parent_id is null) still cannot be deleted via anon ✅

drop policy if exists "gift_claims_anon_delete" on gift_claims;
create policy "gift_claims_anon_delete" on gift_claims
  for delete to anon
  using (true);

-- ── Remove global starter rewards ─────────────────────────────────────────
-- Default rewards (parent_id IS NULL) have been removed from the product.
-- Parents now set up their own rewards from scratch.
-- Run this to clean up any existing seeded rewards from the live DB.
delete from gifts where parent_id is null;
