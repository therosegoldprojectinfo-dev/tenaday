-- ============================================================================
-- Numio — RLS ownership lockdown (fixes: kids table world-readable via anon)
-- ============================================================================
-- THE PROBLEM: kids/attempts/coin_transactions/gifts/gift_claims currently
-- use `to anon using (true)` policies — meaning ANY holder of the public
-- anon key (i.e. anyone) can read/write every row in these tables, no login
-- required. This is possible because the app never used Supabase's real
-- auth system: "logged in" just means the client is holding a parent_id
-- string, which Postgres/RLS has no way to verify.
--
-- THE FIX: give each parent a real, cryptographically-backed Supabase
-- session (via Supabase Anonymous Auth) at signup/login time, bound to
-- their parents row via a new auth_user_id column. Every policy below then
-- checks auth.uid() — something the CLIENT CANNOT FORGE — instead of just
-- trusting a client-supplied id.
--
-- PREREQUISITE — do this in the Supabase dashboard BEFORE running this file:
--   Authentication → Sign In / Providers → enable "Allow anonymous sign-ins"
-- Without this, supabase.auth.signInAnonymously() in the updated
-- parentAuth.js will fail and NO ONE will be able to sign up or log in.
--
-- OPERATIONAL NOTE: existing parents (all ~64 current kids' families) do
-- not yet have an auth_user_id. The very next time each of them logs in
-- (not signs up — logIn()), parent_log_in binds their session automatically
-- (see below), so no manual backfill is needed — it self-heals on next
-- login. Until a given parent logs in again post-deploy, their kids rows
-- are inaccessible to them too (fails CLOSED, not open — the safe
-- direction for a bug like this).
-- ============================================================================

-- ── Step 1: give parents a slot for their real auth identity ────────────
alter table parents add column if not exists auth_user_id uuid unique;

-- ── Step 2: parent_sign_up / parent_log_in now require a real session ───
-- These now run as 'authenticated' (anonymous Supabase sessions still get
-- the 'authenticated' role) instead of 'anon', and bind auth.uid() to the
-- parents row atomically on success. A caller with no session at all
-- (auth.uid() is null) is rejected outright.

drop function if exists parent_sign_up(text, text);
create or replace function parent_sign_up(p_phone text, p_pin_hash text)
returns uuid
language plpgsql
security definer
as $$
declare
  existing_id uuid;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select id into existing_id from parents where phone = p_phone;
  if found then
    raise exception 'PHONE_EXISTS' using errcode = 'P0001';
  end if;

  insert into parents (phone, pin_hash, auth_user_id)
  values (p_phone, p_pin_hash, auth.uid())
  returning id into new_id;

  return new_id;
end;
$$;

drop function if exists parent_log_in(text, text);
create or replace function parent_log_in(p_phone text, p_pin_hash text)
returns uuid
language plpgsql
security definer
as $$
declare
  parent_row parents%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into parent_row from parents where phone = p_phone;
  if not found then
    return null;
  end if;

  if parent_row.pin_hash = p_pin_hash then
    -- Bind (or re-bind, e.g. new device) this session to the parent row.
    update parents set auth_user_id = auth.uid() where id = parent_row.id;
    return parent_row.id;
  end if;

  return null;
end;
$$;

-- These RPCs now require a real session, so anon can no longer call them.
revoke execute on function parent_sign_up(text, text) from anon;
revoke execute on function parent_log_in(text, text) from anon;
grant execute on function parent_sign_up(text, text) to authenticated;
grant execute on function parent_log_in(text, text) to authenticated;

-- get_parent_salt stays anon-callable — it only returns a non-secret salt,
-- and the client needs it BEFORE it has any session context. Unchanged.

-- ── Step 3: replace every "anon using (true)" policy with owner-scoped ──
-- ── ones on the authenticated role, and lock anon out entirely.        ──

-- kids ---------------------------------------------------------------------
drop policy if exists "kids_anon_select" on kids;
drop policy if exists "kids_anon_insert" on kids;
drop policy if exists "kids_anon_update" on kids;

create policy "kids_owner_select" on kids for select to authenticated
  using (parent_id in (select id from parents where auth_user_id = auth.uid()));
create policy "kids_owner_insert" on kids for insert to authenticated
  with check (parent_id in (select id from parents where auth_user_id = auth.uid()));
create policy "kids_owner_update" on kids for update to authenticated
  using (parent_id in (select id from parents where auth_user_id = auth.uid()))
  with check (parent_id in (select id from parents where auth_user_id = auth.uid()));
create policy "kids_no_anon" on kids as restrictive for all to anon using (false) with check (false);

-- attempts (owned via kids.parent_id) ---------------------------------------
drop policy if exists "attempts_anon_select" on attempts;
drop policy if exists "attempts_anon_insert" on attempts;

create policy "attempts_owner_select" on attempts for select to authenticated
  using (kid_id in (
    select k.id from kids k join parents p on p.id = k.parent_id
    where p.auth_user_id = auth.uid()
  ));
create policy "attempts_owner_insert" on attempts for insert to authenticated
  with check (kid_id in (
    select k.id from kids k join parents p on p.id = k.parent_id
    where p.auth_user_id = auth.uid()
  ));
create policy "attempts_no_anon" on attempts as restrictive for all to anon using (false) with check (false);

-- coin_transactions (owned via kids.parent_id) ------------------------------
drop policy if exists "coin_tx_anon_select" on coin_transactions;
drop policy if exists "coin_tx_anon_insert" on coin_transactions;

create policy "coin_tx_owner_select" on coin_transactions for select to authenticated
  using (kid_id in (
    select k.id from kids k join parents p on p.id = k.parent_id
    where p.auth_user_id = auth.uid()
  ));
create policy "coin_tx_owner_insert" on coin_transactions for insert to authenticated
  with check (kid_id in (
    select k.id from kids k join parents p on p.id = k.parent_id
    where p.auth_user_id = auth.uid()
  ));
create policy "coin_tx_no_anon" on coin_transactions as restrictive for all to anon using (false) with check (false);

-- gifts (parent_id is the reward's owner; parent_id IS NULL = legacy
-- global reward concept — none exist in prod anymore, but keep them
-- readable-by-anyone-authenticated if they ever reappear, matching old
-- behavior for that specific case only) -------------------------------------
drop policy if exists "gifts_anon_select" on gifts;
drop policy if exists "gifts_anon_insert" on gifts;
drop policy if exists "gifts_anon_update" on gifts;
drop policy if exists "gifts_anon_delete_own" on gifts;

create policy "gifts_owner_select" on gifts for select to authenticated
  using (
    parent_id is null
    or parent_id in (select id from parents where auth_user_id = auth.uid())
  );
create policy "gifts_owner_insert" on gifts for insert to authenticated
  with check (parent_id in (select id from parents where auth_user_id = auth.uid()));
create policy "gifts_owner_update" on gifts for update to authenticated
  using (parent_id in (select id from parents where auth_user_id = auth.uid()))
  with check (parent_id in (select id from parents where auth_user_id = auth.uid()));
create policy "gifts_owner_delete" on gifts for delete to authenticated
  using (parent_id in (select id from parents where auth_user_id = auth.uid()));
create policy "gifts_no_anon" on gifts as restrictive for all to anon using (false) with check (false);

-- gift_claims (owned via kids.parent_id) ------------------------------------
drop policy if exists "gift_claims_anon_select" on gift_claims;
drop policy if exists "gift_claims_anon_insert" on gift_claims;
drop policy if exists "gift_claims_anon_update" on gift_claims;
drop policy if exists "gift_claims_anon_delete" on gift_claims;

create policy "gift_claims_owner_select" on gift_claims for select to authenticated
  using (kid_id in (
    select k.id from kids k join parents p on p.id = k.parent_id
    where p.auth_user_id = auth.uid()
  ));
create policy "gift_claims_owner_insert" on gift_claims for insert to authenticated
  with check (kid_id in (
    select k.id from kids k join parents p on p.id = k.parent_id
    where p.auth_user_id = auth.uid()
  ));
create policy "gift_claims_owner_update" on gift_claims for update to authenticated
  using (kid_id in (
    select k.id from kids k join parents p on p.id = k.parent_id
    where p.auth_user_id = auth.uid()
  ))
  with check (kid_id in (
    select k.id from kids k join parents p on p.id = k.parent_id
    where p.auth_user_id = auth.uid()
  ));
create policy "gift_claims_owner_delete" on gift_claims for delete to authenticated
  using (kid_id in (
    select k.id from kids k join parents p on p.id = k.parent_id
    where p.auth_user_id = auth.uid()
  ));
create policy "gift_claims_no_anon" on gift_claims as restrictive for all to anon using (false) with check (false);
