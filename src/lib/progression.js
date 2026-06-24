// ── Progression ladder ───────────────────────────────────────────────────
// The Numio Daily Loop with the batch system:
//
//   Chapter (Operation: Addition → Subtraction → Multiplication → Division)
//     └─ Table (1–12)
//          └─ Batch (1–6): 2 specific facts per batch
//               └─ Node (6 per batch):
//                    unlock → learn → practice → real_life → speed → review
//
// Batch facts: table N, batch B → second operands (2B-1), 2B
//   e.g. addition table 1, batch 2: facts 1+3, 1+4
//
// Day-gate fires at the BATCH boundary — a kid completes all 6 nodes of
// today's batch in one sitting, then waits for the next calendar day to
// unlock the next batch. Replaying already-completed nodes is always free.
//
// Total ladder: 4 ops × 12 tables × 6 batches × 6 nodes = 1,728 nodes
// Per chapter: 12 tables × 6 batches = 72 day-sessions

export const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division']
export const NODES = ['unlock', 'learn', 'practice', 'what_happened', 'real_life', 'speed', 'review']
export const TABLE_COUNT = 12
export const BATCH_COUNT = 6
export const FACTS_PER_BATCH = 2 // always 2; 2 × 6 batches = 12 facts per table

// ── Fact resolution ──────────────────────────────────────────────────────

/** Returns the 2 second-operand values for a given table+batch.
 *  These are the specific facts a kid works on during one day-session.
 *  e.g. table 5, batch 2 → [3, 4] meaning 5+3, 5+4 for addition. */
export function factsForBatch(batch) {
  const start = (batch - 1) * FACTS_PER_BATCH + 1
  return [start, start + 1]
}

/** Returns the previous batch's (operation, table, batch) — used by the
 *  Unlock node to know which facts to test. Returns null only for the
 *  very first batch ever (addition, table 1, batch 1), which skips Unlock
 *  entirely since there's no "yesterday." */
export function previousBatch(operation, table, batch) {
  if (batch > 1) return { operation, table, batch: batch - 1 }
  if (table > 1) return { operation, table: table - 1, batch: BATCH_COUNT }
  const opIdx = OPERATIONS.indexOf(operation)
  if (opIdx <= 0) return null // addition/table1/batch1 — no previous batch
  return { operation: OPERATIONS[opIdx - 1], table: TABLE_COUNT, batch: BATCH_COUNT }
}

/** True if this position is the very first node a kid ever sees — the
 *  special case where Unlock is skipped (no prior batch to test).
 *  hasEverAdvanced: true once any node has been passed (last_advance_date
 *  is set), which means this is a replay of the first batch, not the
 *  first-ever session. */
export function shouldSkipUnlock(operation, table, batch, hasEverAdvanced) {
  if (hasEverAdvanced) return false
  return operation === OPERATIONS[0] && table === 1 && batch === 1
}

// ── Step indexing ────────────────────────────────────────────────────────
// The whole ladder is one flat sequence. A "step" is one (op, table, batch,
// node) position. We convert to/from integer indices to make ordering,
// comparison, and "next step" trivial.

function stepIndex(operation, table, batch, node) {
  const opIdx    = OPERATIONS.indexOf(operation)
  const nodeIdx  = NODES.indexOf(node)
  if (opIdx === -1 || nodeIdx === -1) return -1
  if (table < 1 || table > TABLE_COUNT) return -1
  if (batch < 1 || batch > BATCH_COUNT) return -1
  return (
    opIdx    * (TABLE_COUNT * BATCH_COUNT * NODES.length) +
    (table - 1) * (BATCH_COUNT * NODES.length) +
    (batch - 1) * NODES.length +
    nodeIdx
  )
}

function stepFromIndex(i) {
  const nodesPerBatch = NODES.length
  const nodesPerTable = BATCH_COUNT * nodesPerBatch
  const nodesPerOp    = TABLE_COUNT * nodesPerTable

  const opIdx    = Math.floor(i / nodesPerOp)
  if (opIdx >= OPERATIONS.length) return null // finished entire ladder
  const rem1   = i % nodesPerOp
  const table  = Math.floor(rem1 / nodesPerTable) + 1
  const rem2   = rem1 % nodesPerTable
  const batch  = Math.floor(rem2 / nodesPerBatch) + 1
  const node   = NODES[rem2 % nodesPerBatch]
  return { operation: OPERATIONS[opIdx], table, batch, node }
}

/** Returns the next (operation, table, batch, node) position, or null if
 *  this was the very last node in the whole ladder. */
export function nextStep(operation, table, batch, node) {
  const i = stepIndex(operation, table, batch, node)
  if (i === -1) return null
  return stepFromIndex(i + 1)
}

/** True if target comes at or before current — already unlocked/replayable. */
export function isUnlocked(currentPos, targetPos) {
  const cur    = stepIndex(currentPos.operation, currentPos.table, currentPos.batch, currentPos.node)
  const target = stepIndex(targetPos.operation,  targetPos.table,  targetPos.batch,  targetPos.node)
  if (cur === -1 || target === -1) return false
  return target <= cur
}

/** True if target is strictly before current — already completed. */
export function isCompleted(currentPos, targetPos) {
  const cur    = stepIndex(currentPos.operation, currentPos.table, currentPos.batch, currentPos.node)
  const target = stepIndex(targetPos.operation,  targetPos.table,  targetPos.batch,  targetPos.node)
  if (cur === -1 || target === -1) return false
  return target < cur
}

// ── Chain position for day-gating ────────────────────────────────────────
// The day-gate fires at BATCH boundaries. Within a batch, all 6 nodes are
// freely completable in one sitting. The next BATCH (even within the same
// table) requires a new calendar day.

/** Classifies a target node's position relative to the kid's current
 *  cursor:
 *  'before'           — already completed, always replayable
 *  'current'          — the kid's literal cursor position, always playable
 *  'next_same_batch'  — next node in the same batch, always playable
 *  'next_new_batch'   — first node of the next batch (day-gate applies)
 *  'locked'           — more than one step ahead, normal lock */
export function chainPosition(currentPos, targetPos) {
  const cur    = stepIndex(currentPos.operation, currentPos.table, currentPos.batch, currentPos.node)
  const target = stepIndex(targetPos.operation,  targetPos.table,  targetPos.batch,  targetPos.node)
  if (cur === -1 || target === -1) return 'locked'
  if (target < cur)  return 'before'
  if (target === cur) return 'current'
  if (target > cur + 1) return 'locked'

  // target === cur + 1: immediately next step
  const sameBatch =
    targetPos.operation === currentPos.operation &&
    targetPos.table     === currentPos.table &&
    targetPos.batch     === currentPos.batch
  return sameBatch ? 'next_same_batch' : 'next_new_batch'
}

// ── Era / table / batch status ───────────────────────────────────────────

/** 'locked' | 'active' | 'completed' for a whole chapter. */
export function eraStatus(currentPos, operation) {
  const opIdx    = OPERATIONS.indexOf(operation)
  const curOpIdx = OPERATIONS.indexOf(currentPos.operation)
  if (opIdx > curOpIdx) return 'locked'
  if (opIdx < curOpIdx) return 'completed'
  return 'active'
}

/** Progress (0–1) within a single chapter — used for the chapter card's
 *  progress bar. Now counts 48 day-sessions (batches) not 12 tables. */
export function eraProgress(currentPos, operation) {
  const opIdx    = OPERATIONS.indexOf(operation)
  const curOpIdx = OPERATIONS.indexOf(currentPos.operation)
  const totalBatches = TABLE_COUNT * BATCH_COUNT // 48

  if (curOpIdx > opIdx) return 1
  if (curOpIdx < opIdx) return 0

  const nodeIdx   = NODES.indexOf(currentPos.node)
  const batchesDone = (currentPos.table - 1) * BATCH_COUNT + (currentPos.batch - 1)
  // Partial credit within the current batch, proportional to node progress
  const nodeProgress = nodeIdx / NODES.length
  return (batchesDone + nodeProgress) / totalBatches
}

/** 'locked' | 'active' | 'completed' for a single table. */
export function tableStatus(currentPos, operation, table) {
  const eStatus = eraStatus(currentPos, operation)
  if (eStatus === 'locked') return 'locked'
  if (eStatus === 'completed') return 'completed'
  if (table < currentPos.table) return 'completed'
  if (table > currentPos.table) return 'locked'
  return 'active'
}

/** 'locked' | 'active' | 'completed' for a single batch within a table. */
export function batchStatus(currentPos, operation, table, batch) {
  const tStatus = tableStatus(currentPos, operation, table)
  if (tStatus === 'locked') return 'locked'
  if (tStatus === 'completed') return 'completed'
  // tStatus === 'active': compare batch within this table
  if (batch < currentPos.batch) return 'completed'
  if (batch > currentPos.batch) return 'locked'
  return 'active'
}

/** Returns how many batches (0–4) are fully completed for a given table.
 *  Used to render the circular progress ring on each table circle in the
 *  TableSelector — each quarter of the ring represents one completed batch. */
export function batchesCompletedForTable(currentPos, operation, table) {
  const tStatus = tableStatus(currentPos, operation, table)
  if (tStatus === 'locked') return 0
  if (tStatus === 'completed') return BATCH_COUNT // all 4 done

  // tStatus === 'active': count how many batches are fully completed
  // (the current batch is not yet complete unless cursor is past it)
  if (currentPos.operation !== operation || currentPos.table !== table) return 0

  // Batches strictly before current batch are completed.
  // Current batch: completed only if cursor is past its last node (review).
  const curBatchDone = NODES.indexOf(currentPos.node) >= NODES.length - 1
    ? currentPos.batch
    : currentPos.batch - 1
  return Math.max(0, curBatchDone)
}


export function tablesForOperation() {
  return Array.from({ length: TABLE_COUNT }, (_, i) => i + 1)
}

export function nodeLabel(node) {
  if (node === 'unlock')        return 'Unlock'
  if (node === 'learn')         return 'Learn'
  if (node === 'practice')      return 'Practice'
  if (node === 'what_happened') return 'What Happened?'
  if (node === 'real_life')     return 'Real Life'
  if (node === 'speed')         return 'Speed'
  if (node === 'review')        return 'Review'
  return node
}

export function nodePurpose(node) {
  if (node === 'unlock')        return 'Remember yesterday?'
  if (node === 'learn')         return 'Today\'s new facts'
  if (node === 'practice')      return 'Drill today\'s facts'
  if (node === 'what_happened') return 'Which equation fits?'
  if (node === 'real_life')     return 'Use it for real'
  if (node === 'speed')         return 'Answer fast'
  if (node === 'review')        return 'Remember everything'
  return ''
}

/** Builds the review pool for a given position: all facts seen so far,
 *  capped at the most recent 8 batches (= 24 facts) so early material
 *  doesn't dominate as the kid progresses deep into the ladder. Each
 *  pool entry is { operation, table, batch } — problems.js resolves
 *  the actual fact values from batch number. */
export function reviewPoolFor(operation, table, batch, maxBatches = 8) {
  const curIdx = stepIndex(operation, table, batch, 'learn')
  if (curIdx === -1) return []

  const pool = []
  for (const op of OPERATIONS) {
    for (let t = 1; t <= TABLE_COUNT; t++) {
      for (let b = 1; b <= BATCH_COUNT; b++) {
        const idx = stepIndex(op, t, b, 'learn')
        if (idx < curIdx) pool.push({ operation: op, table: t, batch: b })
        if (op === operation && t === table && b === batch) break
      }
      if (op === operation && t === table) break
    }
    if (op === operation) break
  }

  return pool.slice(-maxBatches)
}
