// ── Coin economy ─────────────────────────────────────────────────────────
// Implements spec §7. Numbers below are the "tune during build" placeholders
// from spec §13 — change these constants to rebalance the whole economy,
// nothing else needs to change.

export const STARTING_BALANCE = 50
export const ENTRY_FEE        = 10
export const NODE_PAYOUT      = 15   // must stay > ENTRY_FEE per spec §7
export const REVIEW_PAYOUT    = 30   // 'review' is the table's 6th/capstone node — pays extra, like the old "gift" bonus round
export const DEBT_CAP_MULT    = 2    // debt floor = -(ENTRY_FEE * DEBT_CAP_MULT)

export const DEBT_FLOOR = -(ENTRY_FEE * DEBT_CAP_MULT)

// Pass thresholds, out of 10 questions per attempt (spec §6: "8, 9, or
// 10 correct -> PASS"). NORMAL is the default everywhere. CLAIMED applies
// only to chapters covered by a kid's placement_claim (see schema.sql) —
// raised to 90% so a parent's "my kid is already good at X" claim is
// self-verifying: genuinely solid material stays easy to clear, an
// optimistic claim gets caught by the higher bar.
export const NORMAL_PASS_THRESHOLD  = 8
export const CLAIMED_PASS_THRESHOLD = 9

/** Applies the entry fee to a balance, clamped at the debt floor.
 *  A kid is NEVER blocked from playing for lack of coins (spec §7) — if
 *  they're already at the floor, the fee is effectively free. */
export function applyEntryFee(balance) {
  const next = Math.max(balance - ENTRY_FEE, DEBT_FLOOR)
  return next
}

/** The coin payout for passing a given node type — 'review' (the table's
 *  capstone node) pays out more, every other node pays the standard
 *  amount. The 'unlock' node, despite being first in the chain rather
 *  than last, still pays the standard rate — it's a real test (spec:
 *  "must reach a small success threshold to continue"), not a freebie. */
export function payoutForNode(node) {
  return node === 'review' ? REVIEW_PAYOUT : NODE_PAYOUT
}

/** Applies a node-pass payout. While in debt, earnings pay down the debt
 *  first — rewards/spending stay locked until balance >= 0 (spec §7), but
 *  that "locked" gate is enforced wherever gift-purchase happens, not here;
 *  this function just returns the correct resulting balance either way. */
export function applyPayout(balance, node = 'learn') {
  return balance + payoutForNode(node)
}

export function isInDebt(balance) {
  return balance < 0
}

/** The pass threshold (out of 10) for a given operation/chapter, given a
 *  kid's placement_claim (or null/undefined if no claim was made).
 *
 *  Raised to CLAIMED_PASS_THRESHOLD for the claimed chapter AND every
 *  chapter before it in the ladder (e.g. claiming "good at multiplication"
 *  raises the bar for addition, subtraction, AND multiplication — division,
 *  which comes after, stays at the normal threshold). Chapters after the
 *  claim were never claimed to be already-known, so they keep the normal
 *  bar.
 *
 *  Takes OPERATIONS (the ladder order) as a parameter rather than
 *  importing it directly from lib/progression.js, so this module has no
 *  circular/cross-module import dependency — callers already have
 *  OPERATIONS in scope wherever they'd call this. */
export function passThresholdFor(operation, placementClaim, operationsOrder) {
  if (!placementClaim) return NORMAL_PASS_THRESHOLD

  const claimIdx = operationsOrder.indexOf(placementClaim)
  const opIdx = operationsOrder.indexOf(operation)
  if (claimIdx === -1 || opIdx === -1) return NORMAL_PASS_THRESHOLD

  return opIdx <= claimIdx ? CLAIMED_PASS_THRESHOLD : NORMAL_PASS_THRESHOLD
}
