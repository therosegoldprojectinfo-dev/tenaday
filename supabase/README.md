# Numio — Supabase SQL Setup

Run these files **in order** in the Supabase SQL Editor.

## Setup Order

1. **`rls_setup.sql`** — Row Level Security policies for all tables
   (profiles, kid_profiles, chapters, exams, claims, rewards)

2. **`activation.sql`** — Activation flow columns and tables
   (adds `activated` and `language` to profiles, `is_activation` to exams, `test_quizzes` table)
   ⚠️ **Must run before economy_rpcs.sql** — App.jsx queries `activated` and `language` on first load.

3. **`economy_rpcs.sql`** — Kid economy RPCs
   (add_coins_to_kid, deduct_coins_from_kid, update_kid_streak, claim_reward_for_kid, **complete_quiz_and_award_coins**)

4. **`security_hardening_v2.sql`** — Security hardening
   (daily_quiz_counts, increment_daily_quiz_count, pin_attempts, verify_parent_pin with rate limiting, parent-only RPCs v1)

5. **`reject_claim_rpc.sql`** — Parent session system + reject + PIN hash upgrade
   (parent_sessions, is_parent_verified(), upgrades all parent RPCs to require verified session, adds reject_claim_for_family, **upgrades verify_parent_pin to SHA-256 hash comparison**)

6. **`rls_hardening_v3.sql`** — Column-level security (run this last)
   Closes direct-write vectors left open by rls_setup.sql:
   - Revokes client UPDATE on `coin_balance`, `streak_count`, `streak_last_date` (kid_profiles)
   - Revokes client UPDATE on `parent_pin`, `activated` (profiles)
   - Revokes client INSERT on claims and rewards (RPC-only)
   - Restricts exam INSERT to max 20 questions
   - Adds question-count cap to `complete_quiz_and_award_coins`

## Key Security Notes

- **Password hashing**: Client sends SHA-256("numio-pin:"+password). DB stores and compares the same hash. Plaintext password never leaves the device.
- **Auth password**: Derived via SHA-256("numio:"+username+":"+password+":v3") — entropy comes from the user's real password, not a PIN.
- **Coin awards**: `complete_quiz_and_award_coins(exam_id, kid_id)` derives coin amount server-side from `jsonb_array_length(questions)` — client cannot supply or inflate the amount. Capped at 20 questions max.
- **Parent session**: 30-minute session stored in `parent_sessions` after PIN verification. All parent RPCs call `is_parent_verified()` server-side — PIN gate cannot be bypassed from devtools.
- **No negative balances**: `deduct_coins_from_kid` checks balance server-side. `claim_reward_for_kid` is fully atomic.
- **Reject refund**: `reject_claim_for_family` derives kid_id and refund amount server-side from DB join — no client values trusted.
- **Column-level locks**: After v3, coin_balance, streak, parent_pin, and activated are only writable by SECURITY DEFINER RPCs — not directly from the client SDK or devtools.

## Verification after setup

Run these queries in the SQL editor to confirm v3 took effect:

```sql
-- Should return 0 rows (no update privilege on coin_balance for clients)
SELECT grantee, privilege_type, column_name
FROM information_schema.column_privileges
WHERE table_name = 'kid_profiles'
  AND column_name IN ('coin_balance','streak_count','streak_last_date')
  AND grantee = 'authenticated';

-- Should return 0 rows (no insert on claims)
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'claims' AND cmd = 'INSERT';

-- Should show exams_insert with question count restriction
SELECT policyname, with_check FROM pg_policies
WHERE tablename = 'exams' AND cmd = 'INSERT';
```
