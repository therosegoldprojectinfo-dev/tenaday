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
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('kid_profiles')
    .insert({ user_id: user.id, name, coin_balance: 0, streak_count: 0 })
    .select()
    .single()
  if (error) throw error
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
