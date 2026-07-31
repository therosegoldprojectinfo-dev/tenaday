import { supabase } from './supabaseClient'
import { updateKidStreak, getKidProfile } from './kids'

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

// Server-derives coin amount from exam's question count — client cannot supply amount
export async function completeQuiz(examId, kidId, { correct, total, wrongIds } = {}) {
  if (!examId) throw new Error('examId is required')
  if (!kidId) throw new Error('kidId is required')
  const { data, error } = await supabase.rpc('complete_quiz_and_award_coins', {
    p_exam_id:   examId,
    p_kid_id:    kidId,
    p_correct:   correct  ?? null,
    p_total:     total    ?? null,
    p_wrong_ids: wrongIds ? JSON.stringify(wrongIds) : '[]',
  })
  if (error) throw error
  return data // { coinsAwarded, newBalance, scorePct }
}

export async function getCoinBalance(kidId) {
  if (!kidId) throw new Error('kidId is required')
  const profile = await getKidProfile(kidId)
  return profile?.coin_balance || 0
}

// ── Rewards (shared across family) ───────────────────────────────

export async function getRewards() {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('user_id', user.id)
    .order('cost', { ascending: true })
  if (error) throw error
  return data
}

export async function createReward({ name, cost }) {
  const { data, error } = await supabase.rpc('create_reward_for_family', {
    p_name: name,
    p_cost: cost,
  })
  // FIX #2: preserve full error object
  if (error) throw error
  return { id: data, name, cost }
}

export async function deleteReward(id) {
  const { error } = await supabase.rpc('delete_reward_for_family', { p_reward_id: id })
  // FIX #2: preserve full error object
  if (error) throw error
}

// ── Claims (per kid) ─────────────────────────────────────────────

export async function getClaims(kidId) {
  const { data: { user } } = await supabase.auth.getUser()
  let query = supabase
    .from('claims')
    .select('*, rewards(name, cost)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (kidId) query = query.eq('kid_id', kidId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function claimReward(rewardId, kidId) {
  if (!kidId) throw new Error('kidId is required')
  const { data, error } = await supabase.rpc('claim_reward_for_kid', {
    p_reward_id: rewardId,
    p_kid_id: kidId,
  })
  // FIX #2: preserve full error object
  if (error) throw error
  const profile = await getKidProfile(kidId)
  return { claim: { id: data }, newBalance: profile.coin_balance }
}

export async function approveClaim(claimId) {
  const { error } = await supabase.rpc('approve_claim_for_family', { p_claim_id: claimId })
  // FIX #2: preserve full error object
  if (error) throw error
}

export async function rejectClaim(claimId) {
  const { error } = await supabase.rpc('reject_claim_for_family', { p_claim_id: claimId })
  // FIX #2: preserve full error object
  if (error) throw error
}

// ── Streak (per kid) ─────────────────────────────────────────────

export async function getStreak(kidId) {
  if (!kidId) throw new Error('kidId is required')
  const profile = await getKidProfile(kidId)
  return { count: profile?.streak_count || 0, lastDate: profile?.streak_last_date || null }
}

export async function updateStreak(kidId) {
  if (!kidId) throw new Error('kidId is required')
  return updateKidStreak(kidId)
}

// ── Parent session error helper ───────────────────────────────────

// Returns true if this error means the parent session expired
// Postgres RAISE EXCEPTION 'Parent verification required' comes through as:
//   error.message = 'Parent verification required'  (from the RPC)
//   error.code    = 'P0001'                          (Postgres raised_exception)
export function isParentSessionError(error) {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  const code = error.code || ''
  return code === 'P0001' && msg.includes('parent verification required')
}
