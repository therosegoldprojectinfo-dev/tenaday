// ── Day gating ───────────────────────────────────────────────────────────
// Implements the Numio Daily Loop's calendar-day lock: a kid can freely
// replay any node they've already unlocked, but the NEXT node in the
// chain only becomes available on a new real day — no amount of
// speed-running pulls "tomorrow's" content into today.
//
// Dates are compared as plain YYYY-MM-DD strings (no time-of-day, no
// timezone math) so "today" means the kid's local calendar day, not a
// rolling 24-hour window from their last play timestamp. This matches how
// a kid/parent would actually think about it ("I already did today's
// stuff") rather than punishing someone who plays at 11pm and again at
// 7am the same way a strict 24-hour cooldown would.

/** Returns today's date as YYYY-MM-DD using the LOCAL timezone of the
 *  kid's device — intentionally NOT UTC. "Today" should match the
 *  calendar day the kid is actually experiencing, so a kid in Morocco
 *  and a kid in Canada get different "todays" at the same moment, which
 *  is correct. The device clock can technically be manipulated, but this
 *  is a kids' math app, not a banking system — the right tradeoff is
 *  "feels natural" over "tamper-proof." */
export function todayString(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** True if the next node beyond the kid's current position is allowed to
 *  unlock yet. `lastAdvanceDate` is the kids.last_advance_date column
 *  value (YYYY-MM-DD string, or null/undefined if the kid has never
 *  passed a node before). Null means "never advanced" -> always allowed,
 *  since there's no prior day to wait out. */
export function canAdvanceToday(lastAdvanceDate, now = new Date()) {
  if (!lastAdvanceDate) return true
  return lastAdvanceDate < todayString(now)
}

/** Human-readable reason shown to a kid/parent when the next node is
 *  day-gated, kept simple and non-punishing per spec §11's feedback tone
 *  ("calm, not guilt-tripping"). */
export function nextUnlockMessage() {
  return "You've done today's learning! Come back tomorrow for more."
}

/** Combines the linear progression chain with calendar-day gating.
 *  The day-gate now fires at BATCH boundaries — a kid can complete all 6
 *  nodes of today's batch in one sitting, but the next BATCH (even within
 *  the same table) requires a new calendar day.
 *
 *  'before' | 'current' | 'next_same_batch' → always playable
 *  'next_new_batch' → playable only if canAdvanceToday()
 *  'locked' → normal progression lock, not a day-gate question */
export function isPlayableToday(chainPosition, lastAdvanceDate, now) {
  if (chainPosition === 'before' || chainPosition === 'current' || chainPosition === 'next_same_batch') return true
  if (chainPosition === 'next_new_batch') return canAdvanceToday(lastAdvanceDate, now)
  return false // 'locked'
}
