// ── Coin economy ─────────────────────────────────────────────────────────
// Implements spec §7. Numbers below are the "tune during build" placeholders
// from spec §13 — change these constants to rebalance the whole economy,
// nothing else needs to change.

export const STARTING_BALANCE = 50
export const ENTRY_FEE        = 5
export const NODE_PAYOUT      = 20
export const REVIEW_PAYOUT    = 40
export const DEBT_CAP_MULT    = 2

export const DEBT_FLOOR = -(ENTRY_FEE * DEBT_CAP_MULT) // -10

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

/** The pass threshold for a given operation/chapter, scaled to the
 *  session's total question count (12 for most nodes, 24 for review).
 *  Normal = 67% (8/12 → 16/24), Claimed = 75% (9/12 → 18/24). */
export function passThresholdFor(operation, placementClaim, operationsOrder, sessionTotal = 12) {
  const normalPct  = NORMAL_PASS_THRESHOLD  / 12
  const claimedPct = CLAIMED_PASS_THRESHOLD / 12

  if (!placementClaim) return Math.round(normalPct * sessionTotal)

  const claimIdx = operationsOrder.indexOf(placementClaim)
  const opIdx    = operationsOrder.indexOf(operation)
  if (claimIdx === -1 || opIdx === -1) return Math.round(normalPct * sessionTotal)

  const pct = opIdx <= claimIdx ? claimedPct : normalPct
  return Math.round(pct * sessionTotal)
}
