// ── Progression ladder ───────────────────────────────────────────────────
// Encodes spec §5: one long, strictly linear staircase.
//   Operation (Addition → Subtraction → Multiplication → Division)
//     └─ Table (1–12)
//          └─ Stage (equation → word_problem → speed_round)
//
// Nothing here branches or lets a kid choose order — `nextStep` always
// returns exactly one place to go next, or null if the whole ladder (all
// 4 operations) is complete.

export const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division']

export const STAGES = ['equation', 'word_problem', 'speed_round']

export const TABLE_COUNT = 12

// era metadata lives in eraTheme.js — this file is pure sequencing logic,
// no colors/strings, so it stays easy to unit-test.

function stepIndex(operation, table, stage) {
  const opIdx = OPERATIONS.indexOf(operation)
  const stageIdx = STAGES.indexOf(stage)
  if (opIdx === -1 || stageIdx === -1 || table < 1 || table > TABLE_COUNT) return -1
  return opIdx * (TABLE_COUNT * STAGES.length) + (table - 1) * STAGES.length + stageIdx
}

function stepFromIndex(i) {
  const totalStagesPerOp = TABLE_COUNT * STAGES.length
  const opIdx = Math.floor(i / totalStagesPerOp)
  if (opIdx >= OPERATIONS.length) return null // finished the whole ladder
  const rem = i % totalStagesPerOp
  const table = Math.floor(rem / STAGES.length) + 1
  const stage = STAGES[rem % STAGES.length]
  return { operation: OPERATIONS[opIdx], table, stage }
}

/** Returns { operation, table, stage } for the step after the given one,
 *  or null if that was the very last step in the whole ladder. */
export function nextStep(operation, table, stage) {
  const i = stepIndex(operation, table, stage)
  if (i === -1) return null
  return stepFromIndex(i + 1)
}

/** True if (operation, table, stage) comes at or before the kid's current
 *  position — i.e. it's already unlocked/playable, not locked-ahead. */
export function isUnlocked(currentPos, targetPos) {
  const cur = stepIndex(currentPos.operation, currentPos.table, currentPos.stage)
  const target = stepIndex(targetPos.operation, targetPos.table, targetPos.stage)
  if (cur === -1 || target === -1) return false
  return target <= cur
}

/** True if the target step is strictly before the kid's current position
 *  — already completed. */
export function isCompleted(currentPos, targetPos) {
  const cur = stepIndex(currentPos.operation, currentPos.table, currentPos.stage)
  const target = stepIndex(targetPos.operation, targetPos.table, targetPos.stage)
  if (cur === -1 || target === -1) return false
  return target < cur
}

/** All 12 table numbers for a given operation, in order — used to lay out
 *  map nodes within one era. */
export function tablesForOperation() {
  return Array.from({ length: TABLE_COUNT }, (_, i) => i + 1)
}

/** Human label for a stage, used in headers/banners. */
export function stageLabel(stage) {
  if (stage === 'equation') return 'Equations'
  if (stage === 'word_problem') return 'Word Problems'
  if (stage === 'speed_round') return 'Speed Round'
  return stage
}

/** Whole-ladder progress, 0–1, for an optional overall progress display. */
export function overallProgress(operation, table, stage) {
  const i = stepIndex(operation, table, stage)
  const total = OPERATIONS.length * TABLE_COUNT * STAGES.length
  if (i === -1) return 0
  return i / total
}

/** Progress (0–1) within a single era/operation only — used for each
 *  chapter card's own progress bar. A kid not yet in this operation gets 0;
 *  a kid past this operation entirely gets 1 (fully complete). */
export function eraProgress(currentPos, operation) {
  const opIdx = OPERATIONS.indexOf(operation)
  const curOpIdx = OPERATIONS.indexOf(currentPos.operation)
  const stepsPerEra = TABLE_COUNT * STAGES.length

  if (curOpIdx > opIdx) return 1 // already moved past this era entirely
  if (curOpIdx < opIdx) return 0 // haven't reached this era yet

  // currently inside this exact era — count completed steps within it
  const stageIdx = STAGES.indexOf(currentPos.stage)
  const stepsDone = (currentPos.table - 1) * STAGES.length + stageIdx
  return stepsDone / stepsPerEra
}

/** 'locked' | 'active' | 'completed' for a whole era, used to decide which
 *  chapter card state to render. An era is 'active' if it's the kid's
 *  current operation (even if 0% in) or already partially/fully done but
 *  not yet superseded — i.e. exactly the operations at or before current. */
export function eraStatus(currentPos, operation) {
  const opIdx = OPERATIONS.indexOf(operation)
  const curOpIdx = OPERATIONS.indexOf(currentPos.operation)
  if (opIdx > curOpIdx) return 'locked'
  if (opIdx < curOpIdx) return 'completed'
  // opIdx === curOpIdx: the kid's current era. 'completed' only once they've
  // finished the very last step (table 12, speed_round) and the cursor has
  // moved on — which the curOpIdx > opIdx branch above already covers — so
  // landing here always means in-progress/active, including freshly started.
  return 'active'
}
