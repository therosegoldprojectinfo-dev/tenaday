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

export async function addCoinsToKid(kidId, amount) {
  const profile = await getKidProfile(kidId)
  const newBalance = (profile?.coin_balance || 0) + amount
  const { data } = await supabase
    .from('kid_profiles')
    .update({ coin_balance: newBalance })
    .eq('id', kidId)
    .select()
    .single()
  return data
}

export async function deductCoinsFromKid(kidId, amount) {
  const profile = await getKidProfile(kidId)
  const newBalance = (profile?.coin_balance || 0) - amount
  if (newBalance < 0) throw new Error('Not enough coins')
  const { data } = await supabase
    .from('kid_profiles')
    .update({ coin_balance: newBalance })
    .eq('id', kidId)
    .select()
    .single()
  return { newBalance }
}

export async function updateKidStreak(kidId) {
  const profile = await getKidProfile(kidId)
  const today = new Date().toISOString().slice(0, 10)
  const lastDate = profile?.streak_last_date || null
  const currentStreak = profile?.streak_count || 0

  if (lastDate === today) {
    return { streakCount: currentStreak, isNewDay: false, previousStreak: currentStreak }
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const newStreak = lastDate === yesterdayStr ? currentStreak + 1 : 1

  await supabase
    .from('kid_profiles')
    .update({ streak_count: newStreak, streak_last_date: today })
    .eq('id', kidId)

  return { streakCount: newStreak, isNewDay: true, previousStreak: currentStreak }
}
