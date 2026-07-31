# Numio — Supabase SQL Setup

Run these files **in order** in the Supabase SQL Editor.

## Setup Order

1. **`rls_setup.sql`** — Row Level Security policies for all tables
   (profiles, kid_profiles, chapters, exams, claims, rewards)

2. **`economy_rpcs.sql`** — Kid economy RPCs
   (add_coins_to_kid, deduct_coins_from_kid, update_kid_streak, claim_reward_for_kid, **complete_quiz_and_award_coins**)

3. **`security_hardening_v2.sql`** — Security hardening
   (daily_quiz_counts, increment_daily_quiz_count, pin_attempts, verify_parent_pin with rate limiting, parent-only RPCs v1)

4. **`reject_claim_rpc.sql`** — Parent session system + reject + PIN hash upgrade
   (parent_sessions, is_parent_verified(), upgrades all parent RPCs to require verified session, adds reject_claim_for_family, **upgrades verify_parent_pin to SHA-256 hash comparison**)

## Key Security Notes

- **Password hashing**: Client sends SHA-256("numio-pin:"+password). DB stores and compares the same hash. Plaintext password never leaves the device.
- **Auth password**: Derived via SHA-256("numio:"+username+":"+password+":v3") — entropy comes from the user's real password, not a PIN.
- **Coin awards**: `complete_quiz_and_award_coins(exam_id, kid_id)` derives coin amount server-side from `jsonb_array_length(questions)` — client cannot supply or inflate the amount.
- **Parent session**: 30-minute session stored in `parent_sessions` after PIN verification. All parent RPCs call `is_parent_verified()` server-side — PIN gate cannot be bypassed from devtools.
- **No negative balances**: `deduct_coins_from_kid` checks balance server-side. `claim_reward_for_kid` is fully atomic.
- **Reject refund**: `reject_claim_for_family` derives kid_id and refund amount server-side from DB join — no client values trusted.
