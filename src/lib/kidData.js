import { supabase } from './supabaseClient'

// ── Demo kid ─────────────────────────────────────────────────────────────
// No parent/login flow yet (that's next build phase per current scope), so
// every screen operates on this one seeded kid row. Swap this for a real
// kid_id (from a profile picker) once PIN login + kid profiles exist —
// nothing else in this file needs to change, every function already takes
// kidId as a parameter.
export const DEMO_KID_ID = '00000000-0000-0000-0000-000000000001'

/** Loads a kid's current progress + coin balance. */
export async function fetchKid(kidId) {
  const { data, error } = await supabase
    .from('kids')
    .select('id, name, current_operation, current_table, current_node, coin_balance')
    .eq('id', kidId)
    .single()

  if (error) throw error
  return data
}

/** Updates the kid's progression cursor (called after a node PASS). */
export async function updateProgress(kidId, { operation, table, node }) {
  const { error } = await supabase
    .from('kids')
    .update({
      current_operation: operation,
      current_table: table,
      current_node: node,
    })
    .eq('id', kidId)

  if (error) throw error
}

/** Sets the kid's coin balance directly (after computing it client-side
 *  via lib/economy.js, so the debt floor/payout math lives in one place). */
export async function setCoinBalance(kidId, newBalance) {
  const { error } = await supabase
    .from('kids')
    .update({ coin_balance: newBalance })
    .eq('id', kidId)

  if (error) throw error
}

/** Records a coin ledger entry — purely additive/history, safe to skip on
 *  failure without blocking gameplay (gameplay only depends on kids.coin_balance). */
export async function logCoinTransaction(kidId, { attemptId = null, amount, reason, balanceAfter }) {
  const { error } = await supabase.from('coin_transactions').insert({
    kid_id: kidId,
    attempt_id: attemptId,
    amount,
    reason,
    balance_after: balanceAfter,
  })
  if (error) console.error('coin_transactions insert failed (non-blocking):', error)
}

/** Records one finished attempt (passed / retry / died) and returns its id
 *  so it can be linked from coin_transactions. */
export async function logAttempt(kidId, {
  operation, table, node,
  questionsSeen, correctCount, wrongCount, livesUsed,
  result, coinsDelta,
}) {
  const { data, error } = await supabase
    .from('attempts')
    .insert({
      kid_id: kidId,
      operation,
      table_number: table,
      node,
      questions_seen: questionsSeen,
      correct_count: correctCount,
      wrong_count: wrongCount,
      lives_used: livesUsed,
      result,
      coins_delta: coinsDelta,
    })
    .select('id')
    .single()

  if (error) {
    console.error('attempts insert failed (non-blocking):', error)
    return null
  }
  return data.id
}
