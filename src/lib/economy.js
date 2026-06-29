// ── Coin economy ─────────────────────────────────────────────────────────
// v4: No entry fee, no debt, no hearts. Kids only ever earn coins.
// Wrong answers give half coins. Retries give double coins.

export const STARTING_BALANCE  = 50
export const ENTRY_FEE         = 0   // removed — playing is always free
export const NODE_PAYOUT       = 20
export const REVIEW_PAYOUT     = 40
export const DEBT_FLOOR        = 0   // can never go below 0
export const RETRY_MULT        = 2   // correct on retry → double coins
export const WRONG_MULT        = 0.5 // wrong twice → half coins

/** Entry fee is 0 — kept for API compatibility, always a no-op. */
export function applyEntryFee(balance) {
  return balance
}

/** Coin payout for passing a node. */
export function payoutForNode(node) {
  if (node === 'review')        return REVIEW_PAYOUT
  if (node === 'double_reward') return NODE_PAYOUT * 2
  return NODE_PAYOUT
}

/** Applies a node-pass payout. Balance never goes below 0. */
export function applyPayout(balance, node = 'learn') {
  return Math.max(0, balance + payoutForNode(node))
}

export function isInDebt() { return false }

/** Pass threshold scaled to session total. */
export function passThresholdFor(operation, placementClaim, operationsOrder, sessionTotal = 12) {
  const normalPct  = 8 / 12
  const claimedPct = 9 / 12
  if (!placementClaim) return Math.round(normalPct * sessionTotal)
  const claimIdx = operationsOrder.indexOf(placementClaim)
  const opIdx    = operationsOrder.indexOf(operation)
  if (claimIdx === -1 || opIdx === -1) return Math.round(normalPct * sessionTotal)
  const pct = opIdx <= claimIdx ? claimedPct : normalPct
  return Math.round(pct * sessionTotal)
}
