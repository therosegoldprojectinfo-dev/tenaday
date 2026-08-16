import { supabase } from './supabaseClient'

/**
 * Returns existing session if present.
 * No anonymous sign-in — everyone must pay first via the landing page.
 */
export async function ensureAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  return session ?? null
}
