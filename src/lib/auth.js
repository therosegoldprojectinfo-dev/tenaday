import { supabase } from './supabaseClient'

/**
 * Signs in anonymously so every user gets a user_id
 * without needing email/password. Called once on app load.
 */
export async function ensureAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) console.error('Auth error:', error)
  return data?.session ?? null
}
