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

/** Returns today's date as YYYY-MM-DD in the LOCAL timezone of whoever's
 *  device is running this — intentionally not UTC, since "today" should
 *  match the calendar day the kid is actually experiencing. */
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
 *
 *  The day-gate applies ONLY when the target node would cross into a NEW
 *  TABLE relative to the kid's current cursor — a kid can freely finish
 *  every remaining node of TODAY's table in one sitting (no per-node day
 *  lock within a table), but starting a new table requires a new
 *  calendar day. Five buckets, by comparing a target node's chain
 *  position to the kid's cursor position:
 *    - 'before'           (already completed) -> always playable, replay
 *    - 'current'          (their literal cursor spot) -> always playable
 *    - 'next_same_table'  (next node, same table as current) -> always
 *                          playable once reached via the normal chain,
 *                          no day check
 *    - 'next_new_table'   (next node, but it's the first node of a new
 *                          table) -> playable only if canAdvanceToday()
 *    - 'locked'           (further ahead than one step) -> never playable,
 *                          ordinary lock, not a day-gate question
 *
 *  `chainPosition` should be lib/progression.js's chainPosition(...)
 *  result for this target — passed in as a plain string so this module
 *  has zero dependency on progression.js's internals. */
export function isPlayableToday(chainPosition, lastAdvanceDate, now) {
  if (chainPosition === 'before' || chainPosition === 'current' || chainPosition === 'next_same_table') return true
  if (chainPosition === 'next_new_table') return canAdvanceToday(lastAdvanceDate, now)
  return false // 'locked'
}
