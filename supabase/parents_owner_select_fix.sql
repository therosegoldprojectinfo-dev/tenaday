-- ============================================================================
-- Numio — Fix: authenticated role had ZERO visibility into parents,
-- silently breaking every owner-check subquery (kids, attempts,
-- coin_transactions, gifts, gift_claims — all of them, not just kids)
-- ============================================================================
-- THE BUG: parents_no_anon_access (rls_security.sql) only restricts the
-- anon role. No policy ever granted the authenticated role permission to
-- see ANY row in parents — not even their own. Since RLS with zero
-- permissive policies for a role means that role sees nothing, EVERY
-- subquery like:
--
--   parent_id in (select id from parents where auth_user_id = auth.uid())
--
-- (used by kids/attempts/coin_transactions/gifts/gift_claims' owner
-- policies) always evaluated against an empty set — because the subquery
-- itself runs AS the authenticated role, which had no visibility into
-- parents at all. Every single insert/select on those 5 tables was
-- silently broken for every real user, all the way back to when
-- rls_owner_lockdown.sql first shipped — it just took Turnstile's own bug
-- getting fixed for people to reliably reach this step and expose it.
--
-- THE FIX: let an authenticated session see ONLY their own row in
-- parents — scoped strictly by auth_user_id match, so this doesn't
-- reopen the original phone/PIN-hash exposure to other parents' data.
-- ============================================================================

create policy "parents_owner_select" on parents for select to authenticated
  using (auth_user_id = auth.uid());
