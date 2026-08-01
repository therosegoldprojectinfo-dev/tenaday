# Numio — Supabase SQL Setup

Run these files **in order** in the Supabase SQL Editor.

## Setup Order

1. **`rls_setup.sql`** — Row Level Security policies for all tables
   (profiles, kid_profiles, chapters, exams, claims, rewards, usage_logs)

2. **`economy_rpcs.sql`** — Kid economy RPCs
   (add_coins_to_kid, deduct_coins_from_kid, update_kid_streak, claim_reward_for_kid, complete_quiz_and_award_coins, quiz_completions idempotency)

3. **`activation.sql`** — Activation flow columns
   (adds `activated` and `language` to profiles, `is_activation` to exams)
   ⚠️ Run AFTER economy_rpcs.sql per the file's own header.

4. **`security_hardening_v2.sql`** — Security hardening
   (daily_quiz_counts, increment_daily_quiz_count, pin_attempts, verify_parent_pin with rate limiting, parent-only RPCs, rewards/claims RLS tightening)

5. **`reject_claim_rpc.sql`** — Parent session system + reject claim + PIN hash upgrade
   (parent_sessions, is_parent_verified(), upgrades all parent RPCs to require verified session, adds reject_claim_for_family, upgrades verify_parent_pin to SHA-256)

6. **`rls_hardening_v3.sql`** — Column-level security
   Closes direct-write vectors left open by rls_setup.sql:
   - Revokes table-level UPDATE on kid_profiles, re-grants only `name`
   - Revokes table-level UPDATE on profiles, re-grants only `display_name`, `language`
   - Drops client INSERT on claims and rewards (RPC-only)
   - Restricts exam INSERT to max 20 questions
   - Adds set_profile_activated() RPC (used by App.jsx instead of direct update)
   - Updates complete_quiz_and_award_coins with MAX_QUESTIONS = 20 server-side cap

7. **`set_parent_pin.sql`** — PIN write RPC (run after rls_hardening_v3.sql)
   Adds set_parent_pin(p_pin_hash, p_old_pin_hash) SECURITY DEFINER function.
   Required because v3 revoked direct UPDATE on parent_pin.
   Called once at signup from Onboarding.jsx after the profile INSERT.
   Requires old PIN to change after signup (prevents child overwriting parent PIN).

8. **`quiz_results.sql`** — Quiz results table + updated RPC
   Creates quiz_results table (score_pct, correct, total per exam per kid).
   Updates complete_quiz_and_award_coins to 5-arg signature — stores score server-side.
   Coins remain flat (effort-based). Old 2-arg function dropped.

9. **`trial_logs.sql`** — Anonymous trial cost tracking
   Stores cost per trial quiz (anonymous_id, tokens, cost_usd).
   Unique index on anonymous_id prevents race conditions on trial limit.
   Service role only — no client access.
   Run AFTER rls_hardening_v3.sql.

10. **`get_quiz_results_rpc.sql`** — Parent progress RPC
    SECURITY DEFINER function returns quiz results per kid for parent visibility.
    Called by ParentZone.jsx Progress tab.
    Run AFTER quiz_results.sql.

12. **`security_patch_v1.sql`** — Parent PIN column security
    REVOKE SELECT (parent_pin) ON profiles FROM authenticated.
    Prevents client from reading the PIN hash and replaying it to
    verify_parent_pin to bypass the Parent Zone gate.
    Run AFTER rls_hardening_v3.sql.

13. **`fix_quiz_results_grant.sql`** — quiz_results SELECT grant
    Grants SELECT on quiz_results to authenticated.
    Run AFTER get_quiz_results_rpc.sql.

14. **`security_patch_v2.sql`** — Correct parent_pin SELECT revoke
    Revokes table-level SELECT on profiles, re-grants only safe columns.
    parent_pin is now unreadable by any client.
    Run AFTER security_patch_v1.sql.
    Verify: SELECT privilege_type FROM information_schema.role_table_grants
    WHERE table_name='profiles' AND grantee='authenticated' AND privilege_type='SELECT';
    Must return 0 rows.

15. **`create_kid_rpc.sql`** — Secure kid creation RPC
    Creates create_kid_for_family(p_name) SECURITY DEFINER function.
    REVOKES INSERT ON kid_profiles FROM authenticated.
    Closes the coin_balance exploit (client could previously INSERT with arbitrary balance).
    Run AFTER rls_hardening_v3.sql.

## Key Security Notes

- **Password hashing**: Client sends SHA-256("numio-pin:"+password). DB stores and compares the same hash. Plaintext password never leaves the device.
- **Auth password**: Derived via SHA-256("numio:"+username+":"+password+":v3").
- **Coin awards**: complete_quiz_and_award_coins derives amount server-side, capped at 20 questions. Client cannot supply or inflate.
- **Parent session**: 30-min session in parent_sessions. All parent RPCs call is_parent_verified() server-side.
- **Activated flag**: Set via set_profile_activated() RPC only — not directly writable by client after v3.
- **Column locks**: After v3, coin_balance, streak, parent_pin, activated are RPC-only. Client UPDATE is restricted to name, display_name, language.
- **Trial mode**: Anonymous users get 1 quiz (5 questions, 1 image). Cost logged to trial_logs. Real users use usage_logs.

## Verification after running v3

Run these in the SQL editor to confirm everything took effect:

```sql
-- 1. Should return 0 rows (no table-level UPDATE on kid_profiles for authenticated)
SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_name = 'kid_profiles' AND grantee = 'authenticated' AND privilege_type = 'UPDATE';

-- 2. Should show only 'name' column
SELECT grantee, column_name, privilege_type FROM information_schema.column_privileges
WHERE table_name = 'kid_profiles' AND grantee = 'authenticated' AND privilege_type = 'UPDATE';

-- 3. Should return 0 rows (no INSERT on claims)
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'claims' AND cmd = 'INSERT';

-- 4. Should show WITH CHECK including question count
SELECT policyname, with_check FROM pg_policies WHERE tablename = 'exams' AND cmd = 'INSERT';
```

## Useful analytics queries

```sql
-- Total trial usage and cost
SELECT COUNT(*) as trials, SUM(cost_usd) as total_cost FROM trial_logs;

-- Real user usage and cost
SELECT COUNT(*) as quizzes, SUM(cost_usd) as total_cost FROM usage_logs;

-- Cost per user (top spenders)
SELECT user_id, COUNT(*) as quizzes, SUM(cost_usd) as total_cost
FROM usage_logs GROUP BY user_id ORDER BY total_cost DESC LIMIT 10;
```
