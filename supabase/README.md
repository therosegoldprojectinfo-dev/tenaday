# Supabase setup — required run order

These files must be run **in this exact order** on a fresh Supabase project.
Skipping any one of them, especially #3, leaves real security holes — this
is not a style preference, it's how a production security exposure actually
happened once already (kids/parents data was world-readable via the public
anon key for several days before this was caught and fixed).

| # | File | What it does |
|---|------|---------------|
| 1 | `schema.sql` | Base tables. Creates permissive `dev_open_*` policies as a starting point — **every table is wide open after this step alone.** |
| 2 | `rls_security.sql` | Drops `dev_open_*`, adds baseline RLS + phone/PIN auth RPCs (`parent_sign_up`, `parent_log_in`, etc). |
| 3 | `rls_owner_lockdown.sql` | **The critical one.** Adds real per-parent ownership via Supabase anonymous auth (`auth_user_id`), so RLS has something a client can't forge to check against. Without this file, `kids`/`attempts`/`coin_transactions`/`gifts`/`gift_claims` are still readable by anyone holding the public anon key, full stop. |
| 4 | `analytics_schema.sql` | `analytics_events` table + `log_event()` RPC (7 event types). |
| 5 | `analytics_schema_v2.sql` | Widens `analytics_events` to 11 event types (onboarding funnel). |
| 6 | `analytics_dashboard_rpc.sql` | `get_dashboard_stats()` RPC powering `public/admin-analytics.html`. **Change the placeholder admin key inside this file before running it** — don't ship the default. |
| 7 | `purchase_gift_rpc.sql` | Atomic `purchase_gift()` RPC — replaces the old non-atomic client-side coin-deduction sequence. |
| — | `cleanup_orphan_kids.sql` | Not part of setup — a one-time manual query for cleaning up pre-existing junk "New Kid" rows. Safe to skip on a fresh project (there's nothing to clean up yet). |

## Also required — Supabase dashboard setting (not a SQL file)

**Authentication → Sign In / Providers → enable "Allow anonymous sign-ins"**

`rls_owner_lockdown.sql`'s entire security model depends on every parent
getting a real (anonymous) Supabase auth session at signup/login. If this
toggle is off, nobody can sign up or log in at all — the app hard-fails.

## How to verify it actually worked

After running all 7 files + enabling the dashboard toggle, confirm the lockdown
took effect (don't just trust the file ran without error):

```sql
-- Should return ZERO rows. If anything comes back, dev_open_* is still
-- live somewhere and the app is NOT actually secure yet.
select tablename, policyname, roles, cmd, qual
from pg_policies
where policyname like 'dev_open%';
```

Then, from a browser console on the live site (or any REST client), confirm
an anonymous session genuinely cannot read other people's data:

```js
// Get a fresh anonymous session with just the public anon key
const signupRes = await fetch('<YOUR_SUPABASE_URL>/auth/v1/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': '<YOUR_ANON_KEY>' },
  body: JSON.stringify({}),
})
const { access_token } = await signupRes.json()

// Try to read the kids table with that fresh, unrelated session
const kidsRes = await fetch('<YOUR_SUPABASE_URL>/rest/v1/kids?select=id,name&limit=10', {
  headers: { 'apikey': '<YOUR_ANON_KEY>', 'Authorization': `Bearer ${access_token}` },
})
console.log(await kidsRes.json())
// Should print an empty array []. If it prints real kids' names, something
// from files 2-3 above didn't apply correctly — stop and investigate before
// treating this instance as production-ready.
```
