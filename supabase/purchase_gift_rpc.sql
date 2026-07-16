-- ============================================================================
-- Numio — Fix: purchaseGift non-atomic writes (Round 12/13 backlog item #1/#2)
-- ============================================================================
-- THE PROBLEM: the client did 3 sequential, independent writes — update
-- kids.coin_balance, then insert gift_claims, then insert coin_transactions.
-- A network failure between the first and second write deducted a kid's
-- coins with no gift_claims row for the parent to ever see or approve.
--
-- THE FIX: one SECURITY DEFINER function that does all three writes inside
-- a single Postgres transaction (a plpgsql function body IS one transaction
-- unless it explicitly manages subtransactions) — either all three writes
-- happen, or none of them do. Also re-checks the balance and the gift's
-- price SERVER-SIDE (not trusting whatever the client passed in), and locks
-- the kid row for the duration so two rapid double-taps can't both succeed
-- and double-spend the same coins.
--
-- Also re-verifies kid ownership via the same auth_user_id chain as the
-- rest of rls_owner_lockdown.sql, so this RPC can't be called with a
-- kid_id that doesn't belong to the caller's session.
-- ============================================================================

create or replace function purchase_gift(p_kid_id uuid, p_gift_id uuid)
returns int  -- returns the new coin_balance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kid    kids%rowtype;
  v_gift   gifts%rowtype;
  v_new_balance int;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Lock the kid row for the rest of this transaction so a double-tap
  -- can't read the same starting balance twice and double-spend.
  select * into v_kid from kids where id = p_kid_id for update;
  if not found then
    raise exception 'KID_NOT_FOUND';
  end if;

  -- Ownership check: the caller's session must map to this kid's parent.
  if v_kid.parent_id not in (select id from parents where auth_user_id = auth.uid()) then
    raise exception 'NOT_YOUR_KID';
  end if;

  select * into v_gift from gifts where id = p_gift_id;
  if not found then
    raise exception 'GIFT_NOT_FOUND';
  end if;

  -- Global gifts (parent_id is null) are purchasable by anyone; a
  -- parent-specific gift must belong to THIS kid's parent.
  if v_gift.parent_id is not null and v_gift.parent_id != v_kid.parent_id then
    raise exception 'GIFT_NOT_YOURS';
  end if;

  if v_kid.coin_balance < v_gift.coin_price then
    raise exception 'NOT_ENOUGH_COINS';
  end if;

  v_new_balance := v_kid.coin_balance - v_gift.coin_price;

  update kids set coin_balance = v_new_balance where id = p_kid_id;

  insert into gift_claims (kid_id, gift_id) values (p_kid_id, p_gift_id);

  insert into coin_transactions (kid_id, amount, reason, balance_after)
  values (p_kid_id, -v_gift.coin_price, 'gift_purchase', v_new_balance);

  return v_new_balance;
end;
$$;

grant execute on function purchase_gift(uuid, uuid) to authenticated;
revoke execute on function purchase_gift(uuid, uuid) from anon;
