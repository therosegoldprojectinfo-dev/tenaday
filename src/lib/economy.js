// ── Coin economy ─────────────────────────────────────────────────────────
// Implements spec §7. Numbers below are the "tune during build" placeholders
// from spec §13 — change these three constants to rebalance the whole
// economy, nothing else needs to change.

export const STARTING_BALANCE = 50
export const ENTRY_FEE        = 10
export const STAGE_PAYOUT     = 15   // must stay > ENTRY_FEE per spec §7
export const DEBT_CAP_MULT    = 2    // debt floor = -(ENTRY_FEE * DEBT_CAP_MULT)

export const DEBT_FLOOR = -(ENTRY_FEE * DEBT_CAP_MULT)

/** Applies the entry fee to a balance, clamped at the debt floor.
 *  A kid is NEVER blocked from playing for lack of coins (spec §7) — if
 *  they're already at the floor, the fee is effectively free. */
export function applyEntryFee(balance) {
  const next = Math.max(balance - ENTRY_FEE, DEBT_FLOOR)
  return next
}

/** Applies a stage-pass payout. While in debt, earnings pay down the debt
 *  first — rewards/spending stay locked until balance >= 0 (spec §7), but
 *  that "locked" gate is enforced wherever gift-purchase happens, not here;
 *  this function just returns the correct resulting balance either way. */
export function applyPayout(balance) {
  return balance + STAGE_PAYOUT
}

export function isInDebt(balance) {
  return balance < 0
}
