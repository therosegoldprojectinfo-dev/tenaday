import { supabase } from './supabaseClient'
import { addCoinsToKid, deductCoinsFromKid, updateKidStreak, getKidProfile } from './kids'

// ── Profile (parent-level) ────────────────────────────────────────

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error && error.code === 'PGRST116') {
    const { data: created } = await supabase
      .from('profiles')
      .insert({ id: user.id, coin_balance: 0 })
      .select()
      .single()
    return created
  }
  return data
}

// ── Coins (per kid) ───────────────────────────────────────────────

export async function addCoins(amount, kidId) {
  if (kidId) return addCoinsToKid(kidId, amount)
  // fallback legacy
  const { data: { user } } = await supabase.auth.getUser()
  const profile = await getProfile()
  const newBalance = (profile?.coin_balance || 0) + amount
  const { data } = await supabase.from('profiles').update({ coin_balance: newBalance }).eq('id', user.id).select().single()
  return data
}

export async function getCoinBalance(kidId) {
  if (kidId) {
    const profile = await getKidProfile(kidId)
    return profile?.coin_balance || 0
  }
  const profile = await getProfile()
  return profile?.coin_balance || 0
}

// ── Rewards (shared across family) ───────────────────────────────

export async function getRewards() {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('cost', { ascending: true })
  if (error) throw error
  return data
}

export async function createReward({ name, cost }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('rewards')
    .insert({ name, cost, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteReward(id) {
  const { error } = await supabase.from('rewards').delete().eq('id', id)
  if (error) throw error
}

// ── Claims (per kid) ─────────────────────────────────────────────

export async function getClaims(kidId) {
  const { data: { user } } = await supabase.auth.getUser()
  let query = supabase
    .from('claims')
    .select('*, rewards(name, cost)')
    .order('created_at', { ascending: false })
  if (kidId) {
    query = query.eq('kid_id', kidId)
  } else {
    query = query.eq('user_id', user.id)
  }
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function claimReward(rewardId, rewardCost, kidId) {
  const { data: { user } } = await supabase.auth.getUser()

  // Deduct coins from kid
  if (kidId) {
    await deductCoinsFromKid(kidId, rewardCost)
    const kidBalance = await getKidProfile(kidId)
    const { data, error } = await supabase
      .from('claims')
      .insert({ reward_id: rewardId, user_id: user.id, kid_id: kidId, status: 'pending' })
      .select()
      .single()
    if (error) throw error
    return { claim: data, newBalance: kidBalance.coin_balance }
  }

  // Legacy fallback
  const profile = await getProfile()
  const newBalance = (profile?.coin_balance || 0) - rewardCost
  if (newBalance < 0) throw new Error('Not enough coins')
  await supabase.from('profiles').update({ coin_balance: newBalance }).eq('id', user.id)
  const { data, error } = await supabase
    .from('claims')
    .insert({ reward_id: rewardId, user_id: user.id, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return { claim: data, newBalance }
}

export async function approveClaim(claimId) {
  const { error } = await supabase.from('claims').update({ status: 'approved' }).eq('id', claimId)
  if (error) throw error
}

// ── Streak (per kid) ─────────────────────────────────────────────

export async function getStreak(kidId) {
  if (kidId) {
    const profile = await getKidProfile(kidId)
    return { count: profile?.streak_count || 0, lastDate: profile?.streak_last_date || null }
  }
  const profile = await getProfile()
  return { count: profile?.streak_count || 0, lastDate: profile?.streak_last_date || null }
}

export async function updateStreak(kidId) {
  if (kidId) return updateKidStreak(kidId)

  // Legacy fallback
  const { data: { user } } = await supabase.auth.getUser()
  const profile = await getProfile()
  const today = new Date().toISOString().slice(0, 10)
  const lastDate = profile?.streak_last_date || null
  const currentStreak = profile?.streak_count || 0
  if (lastDate === today) return { streakCount: currentStreak, isNewDay: false, previousStreak: currentStreak }
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)
  const newStreak = lastDate === yesterdayStr ? currentStreak + 1 : 1
  await supabase.from('profiles').update({ streak_count: newStreak, streak_last_date: today }).eq('id', user.id)
  return { streakCount: newStreak, isNewDay: true, previousStreak: currentStreak }
}
