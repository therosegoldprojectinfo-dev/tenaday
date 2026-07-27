# Numio — Supabase SQL Setup

Run these files **in order** in the Supabase SQL Editor.

## Setup Order

1. **`rls_setup.sql`** — Row Level Security policies for all tables  
   (profiles, kid_profiles, chapters, exams, claims, rewards)

2. **`economy_rpcs.sql`** — Kid economy RPCs  
   (add_coins_to_kid, deduct_coins_from_kid, update_kid_streak, claim_reward_for_kid)

3. **`security_hardening_v2.sql`** — Security hardening  
   (daily_quiz_counts table, increment_daily_quiz_count RPC, pin_attempts table, verify_parent_pin with rate limiting, parent-only RPCs v1)

4. **`reject_claim_rpc.sql`** — Parent session system + reject claim RPC  
   (parent_sessions table, is_parent_verified(), upgrades verify_parent_pin to set sessions, upgrades create/delete/approve RPCs to require parent session, adds reject_claim_for_family)

## File Descriptions

| File | Purpose |
|------|---------|
| `rls_setup.sql` | Locks all tables: only authenticated users can access their own data |
| `economy_rpcs.sql` | Atomic coin/streak operations for kids — all server-side |
| `security_hardening_v2.sql` | Rate limiting, daily quiz cap, CORS lock foundations |
| `reject_claim_rpc.sql` | True parent/kid trust boundary via DB-level session verification |
| `functions/` | Supabase Edge Functions (generate-exam) |

## Key Security Notes

- **Parent session**: After PIN verification, a 30-minute session is recorded in `parent_sessions`. All parent-only RPCs (`create_reward_for_family`, `delete_reward_for_family`, `approve_claim_for_family`, `reject_claim_for_family`) call `is_parent_verified()` server-side — the PIN gate cannot be bypassed from the browser console.
- **No negative balances**: `deduct_coins_from_kid` checks balance server-side before deducting. `claim_reward_for_kid` is fully atomic.
- **Reject refund**: `reject_claim_for_family` derives kid_id and refund amount server-side from the DB — no client-supplied values trusted.
