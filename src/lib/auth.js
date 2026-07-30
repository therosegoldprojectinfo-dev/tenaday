import { supabase } from './supabaseClient'

/**
 * Returns existing session if present.
 * Only signs in anonymously if there is truly no session at all.
 */
export async function ensureAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  // No session — sign in anonymously for first-time visitors
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) console.error('Auth error:', error)
  return data?.session ?? null
}
