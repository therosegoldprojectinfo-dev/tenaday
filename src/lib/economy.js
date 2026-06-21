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
