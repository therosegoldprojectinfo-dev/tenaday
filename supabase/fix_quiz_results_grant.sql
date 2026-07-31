-- Fix quiz_results read access
-- quiz_results.sql:24 did REVOKE ALL which killed the SELECT policy.
-- The get_quiz_results RPC is SECURITY DEFINER so it bypasses RLS anyway,
-- but we need EXECUTE granted and table accessible to the function.
-- The RPC already works via SECURITY DEFINER — just ensure it's granted.

-- Re-grant SELECT to authenticated so RLS policy can fire
-- (needed for the RPC's RETURN QUERY to work)
GRANT SELECT ON quiz_results TO authenticated;
