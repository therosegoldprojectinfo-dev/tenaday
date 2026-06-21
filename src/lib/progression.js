// ── Progression ladder ───────────────────────────────────────────────────
// The Numio Daily Loop (spec §6.5): one long, strictly linear staircase,
// now with 6 nodes per TABLE instead of 5 nodes per unit:
//
//   Chapter (Operation: Addition → Subtraction → Multiplication → Division)
//     └─ Table (1–12)
//          └─ Node (6 per table):
//               1. unlock     — tests PREVIOUS table's material (hard gate;
//                                must pass to reach 'learn'). SKIPPED
//                                entirely on the very first table of the
//                                very first chapter — there's no "yesterday"
//                                to test yet. See firstEverNode().
//               2. learn      — 1–3 new facts for this table
//               3. practice   — same facts, different format
//               4. real_life  — applied/word problems
//               5. speed      — fast mixed recall, timed
//               6. review     — spaced mix of past tables/days/formats
//
// Within a table, nodes unlock linearly, but any already-unlocked node
// stays replayable out of order. On top of that linear chain, the NEXT
// node also requires a new calendar day (see lib/dayGate.js) — that
// day-gating is layered on by the screens that call isUnlocked, not baked
// into this file's pure step-sequencing math.

export const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division']

export const NODES = ['unlock', 'learn', 'practice', 'real_life', 'speed', 'review']

export const TABLE_COUNT = 12

/** The very first node a kid ever sees in the whole app — Unlock is
 *  skipped here since there's no prior table to test (confirmed product
 *  decision, not a default/guess). Every screen that needs to know "is
 *  this the special no-unlock-yet position" should compare against this
 *  rather than hardcoding the literal values inline. */
export function firstEverNode() {
  return { operation: OPERATIONS[0], table: 1, node: 'learn' }
}

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
 *  or null if that was the very last node in the whole ladder.
 *  Does NOT skip 'unlock' nodes — that skip only applies to the single
 *  very-first-ever position (handled at the kid-seed/init level, see
 *  firstEverNode), not to every table's unlock node in general. */
export function nextStep(operation, table, node) {
  const i = stepIndex(operation, table, node)
  if (i === -1) return null
  return stepFromIndex(i + 1)
}

/** True if (operation, table, node) comes at or before the kid's current
 *  position — i.e. it's already unlocked/playable, not locked-ahead.
 *  This is the LINEAR-CHAIN check only; calendar-day gating for the very
 *  next node is a separate, additional check layered on by the calling
 *  screen (see lib/dayGate.js's canAdvanceToday). */
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

/** All 12 table numbers for a given operation, in order. */
export function tablesForOperation() {
  return Array.from({ length: TABLE_COUNT }, (_, i) => i + 1)
}

/** Human label for a node type, used in headers/banners/node tooltips. */
export function nodeLabel(node) {
  if (node === 'unlock')    return 'Unlock'
  if (node === 'learn')     return 'Learn'
  if (node === 'practice')  return 'Practice'
  if (node === 'real_life') return 'Real Life'
  if (node === 'speed')     return 'Speed'
  if (node === 'review')    return 'Review'
  return node
}

/** Short purpose line per node — used as subtext under the node's name in
 *  the path/list UI, keeps the pedagogical intent visible to kids/parents
 *  without requiring them to already know the system. */
export function nodePurpose(node) {
  if (node === 'unlock')    return 'Remember yesterday?'
  if (node === 'learn')     return 'Something new'
  if (node === 'practice')  return 'Try it your way'
  if (node === 'real_life') return 'Use it for real'
  if (node === 'speed')     return 'Answer fast'
  if (node === 'review')    return 'Keep it fresh'
  return ''
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

/** 'locked' | 'active' | 'completed' for a single table within a chapter
 *  — used by the in-chapter node-path screen to decide whether to render
 *  a table's nodes as playable, the kid's current table, or done. */
export function tableStatus(currentPos, operation, table) {
  const eStatus = eraStatus(currentPos, operation)
  if (eStatus === 'locked') return 'locked'
  if (eStatus === 'completed') return 'completed' // whole chapter done -> every table in it is done

  if (table < currentPos.table) return 'completed'
  if (table > currentPos.table) return 'locked'
  return 'active'
}

/** Classifies a target node's position relative to the kid's current
 *  cursor, as 'before' | 'current' | 'next_same_table' | 'next_new_table'
 *  | 'locked'. This is the input lib/dayGate.js's isPlayableToday expects.
 *
 *  The distinction between 'next_same_table' and 'next_new_table' is what
 *  the day-gate actually keys off: a kid can freely finish every
 *  remaining node of TODAY's table in one sitting, but cannot cross into
 *  a new table until a new calendar day. So only 'next_new_table' is ever
 *  day-gated; 'next_same_table' is always playable once reached via the
 *  normal linear chain (confirmed product decision — see conversation
 *  history, not the original spec's literal "tomorrow's activities" text
 *  taken as one-node-per-day). */
export function chainPosition(currentPos, targetPos) {
  const cur = stepIndex(currentPos.operation, currentPos.table, currentPos.node)
  const target = stepIndex(targetPos.operation, targetPos.table, targetPos.node)
  if (cur === -1 || target === -1) return 'locked'
  if (target < cur) return 'before'
  if (target === cur) return 'current'
  if (target > cur + 1) return 'locked'

  const sameTable = targetPos.operation === currentPos.operation && targetPos.table === currentPos.table
  return sameTable ? 'next_same_table' : 'next_new_table'
}

/** Returns the (operation, table) that comes immediately before the given
 *  one in the whole ladder — used by the Unlock node, which always tests
 *  the PREVIOUS table's material (spec: "Unlock... checks the previous
 *  table's content, even if the kid played multiple days on that same
 *  table"). Correctly spans chapter boundaries: subtraction's table 1
 *  "previous" is addition's table 12. Returns null only for addition's
 *  table 1, which has no previous table at all (the one case Unlock is
 *  skipped entirely — see shouldSkipUnlock). */
export function previousTable(operation, table) {
  if (table > 1) return { operation, table: table - 1 }
  const opIdx = OPERATIONS.indexOf(operation)
  if (opIdx <= 0) return null // addition, table 1 -> no previous table exists
  return { operation: OPERATIONS[opIdx - 1], table: TABLE_COUNT }
}

/** Builds the list of past (operation, table) pairs available for a
 *  Review node's spaced-repetition mix — every table strictly before the
 *  given position, across all chapters reached so far. Capped at a
 *  reasonable pool size (most-recent-N) rather than every table ever,
 *  since early tables become less relevant to review the further a kid
 *  progresses, and an unbounded pool would dilute review of genuinely
 *  recent material. */
export function reviewPoolFor(operation, table, maxPoolSize = 8) {
  const targetIdx = stepIndex(operation, table, 'unlock') // any node in this table works as the boundary
  if (targetIdx === -1) return []

  const pool = []
  for (const op of OPERATIONS) {
    for (let t = 1; t <= TABLE_COUNT; t++) {
      const idx = stepIndex(op, t, 'unlock')
      if (idx < targetIdx) pool.push({ operation: op, table: t })
      if (op === operation && t === table) break
    }
    if (op === operation) break
  }

  // Most-recent-N: keep the tail end of the chronological list, so a kid
  // deep into the ladder reviews their recent tables, not table 1 forever.
  return pool.slice(-maxPoolSize)
}

/** True if this exact (operation, table, node) position is the one
 *  special case where the Unlock node should be skipped — the very first
 *  node a kid ever sees in the entire app. Every other table's Unlock
 *  node (including table 1 of every OTHER chapter) behaves normally,
 *  since by then the kid genuinely has "yesterday's" material (the
 *  previous chapter's last table) to be tested on. */
export function shouldSkipUnlock(operation, table, hasEverAdvanced) {
  if (hasEverAdvanced) return false
  return operation === OPERATIONS[0] && table === 1
}
