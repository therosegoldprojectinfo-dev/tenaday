// ── Progression ladder ───────────────────────────────────────────────────
// One long, strictly linear staircase, now with 5 nodes per unit instead
// of 3 stages (superseding the original spec §5 ladder):
//
//   Chapter (Operation: Addition → Subtraction → Multiplication → Division)
//     └─ Unit (Table 1–12)
//          └─ Node (5 per unit):
//               1. equations     — all combinations, random order
//               2. speed_round   — same content, 5s/question timer
//               3. irl           — word/situation problems
//               4. irl_timed     — word problems + countdown
//               5. gift          — recap of all 4, bonus coins
//
// Within a unit, nodes unlock linearly (node 2 unlocks once node 1 is
// passed, etc.) but any already-unlocked node stays replayable out of
// order. Once a unit's gift node is passed, the next unit unlocks. Once
// unit 12's gift node is passed, the whole chapter is complete and the
// next chapter unlocks (handled by eraStatus/eraProgress below, which
// operate one level up from individual nodes).

export const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division']

export const NODES = ['equations', 'speed_round', 'irl', 'irl_timed', 'gift']

export const TABLE_COUNT = 12

function stepIndex(operation, table, node) {
  const opIdx = OPERATIONS.indexOf(operation)
  const nodeIdx = NODES.indexOf(node)
  if (opIdx === -1 || nodeIdx === -1 || table < 1 || table > TABLE_COUNT) return -1
  return opIdx * (TABLE_COUNT * NODES.length) + (table - 1) * NODES.length + nodeIdx
}

function stepFromIndex(i) {
  const totalNodesPerOp = TABLE_COUNT * NODES.length
  const opIdx = Math.floor(i / totalNodesPerOp)
  if (opIdx >= OPERATIONS.length) return null // finished the whole ladder
  const rem = i % totalNodesPerOp
  const table = Math.floor(rem / NODES.length) + 1
  const node = NODES[rem % NODES.length]
  return { operation: OPERATIONS[opIdx], table, node }
}

/** Returns { operation, table, node } for the step after the given one,
 *  or null if that was the very last node in the whole ladder. */
export function nextStep(operation, table, node) {
  const i = stepIndex(operation, table, node)
  if (i === -1) return null
  return stepFromIndex(i + 1)
}

/** True if (operation, table, node) comes at or before the kid's current
 *  position — i.e. it's already unlocked/playable, not locked-ahead. */
export function isUnlocked(currentPos, targetPos) {
  const cur = stepIndex(currentPos.operation, currentPos.table, currentPos.node)
  const target = stepIndex(targetPos.operation, targetPos.table, targetPos.node)
  if (cur === -1 || target === -1) return false
  return target <= cur
}

/** True if the target node is strictly before the kid's current position
 *  — already completed (and thus replayable, per spec). */
export function isCompleted(currentPos, targetPos) {
  const cur = stepIndex(currentPos.operation, currentPos.table, currentPos.node)
  const target = stepIndex(targetPos.operation, targetPos.table, targetPos.node)
  if (cur === -1 || target === -1) return false
  return target < cur
}

/** All 12 table numbers for a given operation, in order — used to lay out
 *  units within one chapter. */
export function tablesForOperation() {
  return Array.from({ length: TABLE_COUNT }, (_, i) => i + 1)
}

/** Human label for a node type, used in headers/banners/node tooltips. */
export function nodeLabel(node) {
  if (node === 'equations')   return 'Equations'
  if (node === 'speed_round') return 'Speed Round'
  if (node === 'irl')         return 'Real-World'
  if (node === 'irl_timed')   return 'Real-World · Timed'
  if (node === 'gift')        return 'Bonus Round'
  return node
}

/** Whole-ladder progress, 0–1, for an optional overall progress display. */
export function overallProgress(operation, table, node) {
  const i = stepIndex(operation, table, node)
  const total = OPERATIONS.length * TABLE_COUNT * NODES.length
  if (i === -1) return 0
  return i / total
}

/** Progress (0–1) within a single chapter/operation only — used for each
 *  chapter card's own progress bar. A kid not yet in this chapter gets 0;
 *  a kid past this chapter entirely gets 1 (fully complete). */
export function eraProgress(currentPos, operation) {
  const opIdx = OPERATIONS.indexOf(operation)
  const curOpIdx = OPERATIONS.indexOf(currentPos.operation)
  const stepsPerEra = TABLE_COUNT * NODES.length

  if (curOpIdx > opIdx) return 1 // already moved past this chapter entirely
  if (curOpIdx < opIdx) return 0 // haven't reached this chapter yet

  // currently inside this exact chapter — count completed nodes within it
  const nodeIdx = NODES.indexOf(currentPos.node)
  const stepsDone = (currentPos.table - 1) * NODES.length + nodeIdx
  return stepsDone / stepsPerEra
}

/** 'locked' | 'active' | 'completed' for a whole chapter, used to decide
 *  which chapter card state to render on the card-list screen. */
export function eraStatus(currentPos, operation) {
  const opIdx = OPERATIONS.indexOf(operation)
  const curOpIdx = OPERATIONS.indexOf(currentPos.operation)
  if (opIdx > curOpIdx) return 'locked'
  if (opIdx < curOpIdx) return 'completed'
  return 'active'
}

/** 'locked' | 'active' | 'completed' for a single unit (table) within a
 *  chapter — used by the in-chapter node-path screen to decide whether to
 *  render a unit's nodes as playable, the kid's current unit, or done. */
export function unitStatus(currentPos, operation, table) {
  const eStatus = eraStatus(currentPos, operation)
  if (eStatus === 'locked') return 'locked'
  if (eStatus === 'completed') return 'completed' // whole chapter done -> every unit in it is done

  // eStatus === 'active': compare table position within this chapter
  if (table < currentPos.table) return 'completed'
  if (table > currentPos.table) return 'locked'
  return 'active'
}
