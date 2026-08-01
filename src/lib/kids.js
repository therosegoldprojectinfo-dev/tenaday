import { supabase } from './supabaseClient'

export async function getKids() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('kid_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createKid(name) {
  // Uses SECURITY DEFINER RPC — client cannot supply coin_balance
  const { data: kidId, error } = await supabase.rpc('create_kid_for_family', { p_name: name })
  if (error) throw error
  // Fetch the full kid row after creation
  const { data, error: fetchErr } = await supabase
    .from('kid_profiles')
    .select('*')
    .eq('id', kidId)
    .single()
  if (fetchErr) throw fetchErr
  return data
}

export async function getKidProfile(kidId) {
  const { data, error } = await supabase
    .from('kid_profiles')
    .select('*')
    .eq('id', kidId)
    .single()
  if (error) throw error
  return data
}

export async function updateKidStreak(kidId) {
  const { data, error } = await supabase.rpc('update_kid_streak', { kid_id: kidId })
  if (error) throw error
  return data
}
