import { supabase } from './supabaseClient'
import { completeUnit } from './dayGate'

// ── Demo kid ─────────────────────────────────────────────────────────────
// No parent/login flow yet (that's next build phase per current scope), so
// every screen operates on this one seeded kid row. Swap this for a real
// kid_id (from a profile picker) once PIN login + kid profiles exist —
// nothing else in this file needs to change, every function already takes
// kidId as a parameter.
export const DEMO_KID_ID = '00000000-0000-0000-0000-000000000001'

/** Loads a kid's current progress + coin balance + daily-loop gating
 *  fields (last_advance_date, seen_chapter_intros) + placement_claim
 *  (affects pass threshold — see lib/economy.js's passThresholdFor). */
export async function fetchKid(kidId) {
  const { data, error } = await supabase
    .from('kids')
    .select('id, name, age, placement_claim, current_operation, current_table, current_batch, current_node, last_advance_date, next_unlock_at, timezone, seen_chapter_intros, coin_balance, heart_balance')
    .eq('id', kidId)
    .single()

  if (error) throw error
  return data
}

/** Updates the kid's progression cursor (called after a node PASS) and
 *  stamps last_advance_date to today — this is what the day-gate in
 *  lib/dayGate.js checks against to decide if the NEXT batch can unlock
 *  yet. Every actual advance (not replay) goes through this function, so
 *  the stamp only moves forward when real progress happens. */
export async function updatePlacementClaim(kidId, claim) {
  const { error } = await supabase
    .from('kids')
    .update({ placement_claim: claim })
    .eq('id', kidId)
  if (error) throw error
}

export async function updateProgress(kidId, { operation, table, batch, node }) {
  const { error } = await supabase
    .from('kids')
    .update({
      current_operation: operation,
      current_table: table,
      current_batch: batch,
      current_node: node,
    })
    .eq('id', kidId)

  if (error) throw error
}

/** Stamps the unit completion server-side via the complete_unit RPC.
 *  Called after the Review node passes — sets last_advance_date = now()
 *  and next_unlock_at = next midnight in the kid's timezone, without
 *  moving the cursor. */
export async function stampAdvanceDate(kidId) {
  await completeUnit(kidId)
}

/** Marks a chapter's one-time interactive concept intro as seen, so it
 *  doesn't show again for this kid. Appends rather than overwrites, since
 *  seen_chapter_intros accumulates across all 4 chapters over time. */
export async function markChapterIntroSeen(kidId, operation, currentSeenList = []) {
  if (currentSeenList.includes(operation)) return // already recorded, avoid a redundant write
  const { error } = await supabase
    .from('kids')
    .update({ seen_chapter_intros: [...currentSeenList, operation] })
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
  operation, table, batch, node,
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

/** Aggregates a kid's real gameplay history for the Profile page —
 *  deliberately only counts data that genuinely exists (spec explicitly
 *  puts leaderboards/streaks/social features out of scope for now), so
 *  this returns honest numbers rather than fabricated placeholders for
 *  things like "current league" that have no underlying system yet. */
export async function fetchKidStats(kidId) {
  const { data, error } = await supabase
    .from('attempts')
    .select('result, correct_count, questions_seen, created_at')
    .eq('kid_id', kidId)

  if (error) throw error

  const nodesPassed = data.filter(a => a.result === 'passed').length
  const totalCorrect = data.reduce((sum, a) => sum + a.correct_count, 0)
  const totalQuestions = data.reduce((sum, a) => sum + a.questions_seen, 0)
  const totalAttempts = data.length

  // Distinct calendar days the kid has played at all (any attempt,
  // passed or not) — a simple, honest "days active" count. Not the same
  // thing as a maintained day-streak (which would need to track
  // consecutive days and reset on a missed day), but truthful as-is.
  const distinctDays = new Set(
    data.map(a => new Date(a.created_at).toISOString().slice(0, 10))
  ).size

  return { nodesPassed, totalCorrect, totalQuestions, totalAttempts, distinctDays }
}

// ── Rewards (spec §8) ───────────────────────────────────────────────────

/** Fetches every gift available to a kid — global rewards (parent_id is
 *  null, the seeded starter list) plus any the kid's own parent has
 *  created (parent_id matches). Ordered cheapest-first so a kid scanning
 *  the list sees achievable goals before aspirational ones. */
export async function fetchAvailableGifts(parentId) {
  const { data, error } = await supabase
    .from('gifts')
    .select('id, name, coin_price, icon, parent_id')
    .or(parentId ? `parent_id.is.null,parent_id.eq.${parentId}` : 'parent_id.is.null')
    .order('coin_price', { ascending: true })

  if (error) throw error
  return data
}

/** Fetches the set of gift ids a kid has already claimed — used to mark
 *  already-bought items distinctly rather than letting a kid buy the same
 *  reward an unlimited number of times in one sitting by mistake. (Spec
 *  doesn't explicitly forbid re-buying the same reward — e.g. "20 minutes
 *  of TV" is reasonably repeatable — so this is informational/history,
 *  not a hard block; see Rewards.jsx for how it's actually used.) */
export async function fetchClaimedGiftIds(kidId) {
  const { data, error } = await supabase
    .from('gift_claims')
    .select('gift_id')
    .eq('kid_id', kidId)

  if (error) throw error
  return data.map(c => c.gift_id)
}

/** Purchases a gift for a kid: deducts the price from their coin balance,
 *  records the claim, and logs the coin transaction — all three in
 *  sequence. Re-validates affordability against the FRESH balance passed
 *  in (the caller should fetch a current kid row immediately before
 *  calling this, not trust stale client state), since coins could have
 *  changed between when the Rewards screen loaded and when the kid taps
 *  Buy. Per spec §7, while in debt a kid's rewards stay LOCKED until the
 *  balance is back to >= 0 — that gate is enforced by the caller (the
 *  Rewards screen disables every buy button while in debt), not here;
 *  this function only re-checks raw affordability (balance >= price). */
export async function purchaseGift(kidId, gift, currentBalance) {
  if (currentBalance < gift.coin_price) {
    throw new Error('Not enough coins for this reward.')
  }

  const newBalance = currentBalance - gift.coin_price

  const { error: balanceError } = await supabase
    .from('kids')
    .update({ coin_balance: newBalance })
    .eq('id', kidId)
  if (balanceError) throw balanceError

  const { error: claimError } = await supabase
    .from('gift_claims')
    .insert({ kid_id: kidId, gift_id: gift.id })
  if (claimError) {
    // Coin balance already moved — log but don't throw, since the
    // purchase itself (the part that matters to the kid) succeeded; a
    // missing claims-history row is a minor bookkeeping gap, not a
    // reason to show the kid an error after their coins were already
    // correctly deducted.
    console.error('gift_claims insert failed (non-blocking):', claimError)
  }

  await logCoinTransaction(kidId, {
    amount: -gift.coin_price,
    reason: 'gift_purchase',
    balanceAfter: newBalance,
  })

  return newBalance
}

/** Computes the kid's current consecutive-day streak from their attempt history.
 *  A "day" counts only if the kid COMPLETED a full unit on that calendar day —
 *  meaning they passed the 'review' node (the last node of a batch).
 *  The streak resets to 0 if they missed yesterday.
 *  Returns an integer ≥ 0.
 */
export async function fetchStreak(kidId) {
  const { data, error } = await supabase
    .from('attempts')
    .select('created_at, result, node')
    .eq('kid_id', kidId)
    .eq('result', 'passed')
    .eq('node', 'review')

  if (error || !data || data.length === 0) return 0

  // Use the DB timestamp in UTC, then convert to kid's local date string
  // by fetching the kid's timezone from the DB
  const { data: kidRow } = await supabase
    .from('kids')
    .select('timezone')
    .eq('id', kidId)
    .single()
  const tz = kidRow?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  function toLocalDate(isoString) {
    return new Date(isoString).toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD
  }

  // Collect distinct local-date strings where kid completed a full unit
  const completedDays = new Set(data.map(a => toLocalDate(a.created_at)))

  // Walk backwards from today (in kid's timezone) counting consecutive completed days
  let streak = 0
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  const today = new Date(todayStr)
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toLocaleDateString('en-CA', { timeZone: tz })
    if (completedDays.has(key)) {
      streak++
    } else {
      if (i > 0) break
    }
  }

  return streak
}

/** Sets the kid's heart balance. Clamped between 0 and 5. */
export async function setHeartBalance(kidId, newBalance) {
  const clamped = Math.max(0, Math.min(5, newBalance))
  const { error } = await supabase
    .from('kids')
    .update({ heart_balance: clamped })
    .eq('id', kidId)
  if (error) throw error
  return clamped
}

/** Recharges 1 heart for 10 coins. Returns { newHearts, newCoins }.
 *  Throws if kid can't afford it or already at max hearts. */
export async function rechargeHeart(kidId, currentHearts, currentCoins) {
  const HEART_COST = 10
  if (currentHearts >= 5) throw new Error('Already at max hearts.')
  if (currentCoins < HEART_COST) throw new Error('Not enough coins.')
  const newCoins  = currentCoins - HEART_COST
  const newHearts = currentHearts + 1
  await setCoinBalance(kidId, newCoins)
  await setHeartBalance(kidId, newHearts)
  await logCoinTransaction(kidId, {
    amount: -HEART_COST,
    reason: 'heart_recharge',
    balanceAfter: newCoins,
  })
  return { newHearts, newCoins }
}
