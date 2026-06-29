// ── problems.js — Numio question engine v4 ────────────────────────────────
//
// Simplified question system aligned to the 7-node structure:
//
// WELCOME  (20 q) — MC + typed mix, yesterday's unit facts
// LEARN    — lesson presentation only, no questions
// PRACTICE (8 q)  — simple equations, MC only, no timer, current unit facts
// APPLY    (10 q) — word problems, MC only, no timer, current unit facts
// MASTER   (10 q) — mixed equations + word problems, MC, timed (10s), current unit facts
// DOUBLE REWARD   — mixed, timed (5s), typed answer only, current unit facts
// REVIEW   (20 q) — mixed types, MC + typed mix, timed 1/3, all seen units

import { factsForBatch, OPERATIONS } from './progression'

// ── Utilities ──────────────────────────────────────────────────────────────

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)]
}

// ── Math core ──────────────────────────────────────────────────────────────

const SYMBOL = {
  addition:       '+',
  subtraction:    '−',
  multiplication: '×',
  division:       '÷',
}

function factValues(operation, table, fact) {
  switch (operation) {
    case 'addition':       return { a: table, b: fact, answer: table + fact }
    case 'subtraction':    return { a: table + fact, b: table, answer: fact }
    case 'multiplication': return { a: table, b: fact, answer: table * fact }
    case 'division':       return { a: table * fact, b: table, answer: fact }
    default:               return { a: table, b: fact, answer: table + fact }
  }
}

// ── Smart distractors ──────────────────────────────────────────────────────

function smartDistractors(operation, table, fact, answer, count = 3) {
  const used = new Set([answer])
  const candidates = [answer + 1, answer - 1, answer + 2, answer - 2]
  if (operation === 'multiplication') {
    candidates.push(table + fact, (table + 1) * fact, table * (fact + 1))
  }
  if (operation === 'addition') candidates.push(table + fact - 1, table, fact)
  if (operation === 'subtraction') candidates.push(answer + table, answer + fact)
  if (operation === 'division') candidates.push(fact + 1, fact - 1, table * fact)
  const out = []
  for (const c of candidates) {
    if (c > 0 && !used.has(c) && Number.isInteger(c)) {
      used.add(c); out.push(c)
      if (out.length === count) break
    }
  }
  let pad = 3
  while (out.length < count) {
    const d = answer + pad
    if (!used.has(d)) { used.add(d); out.push(d) }
    pad++
  }
  return out.slice(0, count)
}

function safeChoices(answer, distractors) {
  const used = new Set([answer])
  const out = [answer]
  for (const d of distractors) {
    if (!used.has(d)) { used.add(d); out.push(d) }
    if (out.length === 4) break
  }
  let pad = 1
  while (out.length < 4) {
    const d = answer + pad
    if (!used.has(d)) { used.add(d); out.push(d) }
    pad++
  }
  return shuffle(out.slice(0, 4))
}

// ── Names & word problem templates ────────────────────────────────────────

const NAMES = ['Yassine', 'Lina', 'Omar', 'Sofia', 'Adam', 'Nora', 'Ziad', 'Mia', 'Karim', 'Aya']
function name() { return pick(NAMES) }
function name2(exclude) { let n; do { n = pick(NAMES) } while (n === exclude); return n }

const WORD_TEMPLATES = {
  addition: (a, b) => {
    const n = name(), n2 = name2(n)
    return pick([
      `${n} has ${a} books and gets ${b} more. How many now?`,
      `${n} collected ${a} coins and found ${b} more. Total?`,
      `${a} red balloons and ${b} blue ones. How many altogether?`,
      `${n} scored ${a} points, ${n2} scored ${b}. Combined score?`,
      `The bakery made ${a} croissants, then ${b} more. Total?`,
      `${n} walks ${a} steps, then ${b} more. Total steps?`,
      `A jar has ${a} red and ${b} blue marbles. Total marbles?`,
    ])
  },
  subtraction: (a, b) => {
    const n = name()
    return pick([
      `${n} had ${a} stickers and gave ${b} away. How many left?`,
      `${a} cookies on the plate. ${b} eaten. How many remain?`,
      `${n} has ${a} coins and spends ${b}. How many left?`,
      `The shelf had ${a} books. ${b} borrowed. How many still there?`,
      `${n} had ${a} balloons. ${b} popped. How many left?`,
    ])
  },
  multiplication: (a, b) => {
    const n = name()
    return pick([
      `${n} has ${a} bags, each with ${b} apples. Total apples?`,
      `${a} rows of chairs with ${b} each. Total chairs?`,
      `${n} buys ${a} packs of ${b} stickers each. Total stickers?`,
      `${n} saves ${b} coins a day for ${a} days. Total coins?`,
      `${a} boxes with ${b} crayons each. Total crayons?`,
    ])
  },
  division: (a, b) => {
    const n = name()
    return pick([
      `${n} shares ${a} candies equally among ${b} friends. How many each?`,
      `${a} students in ${b} equal rows. Students per row?`,
      `${a} apples in ${b} equal groups. Apples per group?`,
      `${a} cookies, ${b} per box. How many boxes?`,
    ])
  },
}

function wordProblem(operation, a, b) {
  return WORD_TEMPLATES[operation]?.(a, b) || `${a} ${SYMBOL[operation]} ${b} = ?`
}

// ── Question builders ──────────────────────────────────────────────────────

// Simple equation — MC
function makeEquation(operation, table, fact, { isTimed = false, isTyped = false } = {}) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `${a} ${sym} ${b} = ?`,
    answer,
    choiceType: 'number',
    choices: isTyped ? [] : safeChoices(answer, smartDistractors(operation, table, fact, answer)),
    isTimed,
    isTyped,
  }
}

// Word problem — MC
function makeWord(operation, table, fact, { isTimed = false, isTyped = false } = {}) {
  const { a, b, answer } = factValues(operation, table, fact)
  return {
    text: wordProblem(operation, a, b),
    answer,
    choiceType: 'number',
    choices: isTyped ? [] : safeChoices(answer, smartDistractors(operation, table, fact, answer)),
    isTimed,
    isTyped,
  }
}

// Mixed = randomly equation or word problem
function makeMixed(operation, table, fact, opts = {}) {
  return Math.random() < 0.5
    ? makeEquation(operation, table, fact, opts)
    : makeWord(operation, table, fact, opts)
}

// ── Lesson generator ───────────────────────────────────────────────────────

function generateLesson(operation, table, batch) {
  const [f1, f2] = factsForBatch(batch)
  const { a: a1, b: b1, answer: ans1 } = factValues(operation, table, f1)
  const { a: a2, b: b2, answer: ans2 } = factValues(operation, table, f2)
  return {
    isLesson: true,
    facts: [
      { equation: `${a1} ${SYMBOL[operation]} ${b1}`, result: ans1 },
      { equation: `${a2} ${SYMBOL[operation]} ${b2}`, result: ans2 },
    ],
  }
}

// ── Bridge question builder ───────────────────────────────────────────────
// Two-step word problem bridge used in the last 3 Practice questions.
// Step 1: "How do we find the correct answer?" → pick the right equation
// Step 2: (triggered by Practice.jsx after step 1 correct) → solve the number

const ALL_OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division']

function makeBridgeStep1(operation, table, fact) {
  const { a, b } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const correctExpr = `${a} ${sym} ${b}`
  const wordText = wordProblem(operation, a, b)

  return {
    text: `${wordText}\n\nHow do we find the answer?\nType the formula:`,
    answer: correctExpr,
    choiceType: 'formula',
    choices: [],
    isTimed: false,
    isTyped: true,
    isBridgeStep1: true,
    // NO step2 — formula answer is the end
    bridgeOperation: operation,
    bridgeTable: table,
    bridgeFact: fact,
  }
}

export function makeBridgeStep2(operation, table, fact, wordText) {
  const { answer } = factValues(operation, table, fact)
  return {
    text: `${wordText}\n\nNow solve it! What is the answer?`,
    answer,
    choiceType: 'number',
    choices: safeChoices(answer, smartDistractors(operation, table, fact, answer)),
    isTimed: false,
    isTyped: false,
    isBridgeStep2: true,
  }
}

// ── Practice generator (8 q) ───────────────────────────────────────────────
// Q1-5: simple equations, MC, no timer
// Q6-8: two-step bridge (step1 only — step2 injected by Practice.jsx after correct)

function generatePractice(operation, table, batch) {
  const [f1, f2] = factsForBatch(batch)
  const facts = [f1, f2]

  const equations = Array.from({ length: 5 }, (_, i) =>
    makeEquation(operation, table, facts[i % 2], { isTimed: false, isTyped: false })
  )

  const bridges = Array.from({ length: 3 }, (_, i) =>
    makeBridgeStep1(operation, table, facts[i % 2])
  )

  return [...equations, ...bridges]
}

// ── Apply generator (10 q) ────────────────────────────────────────────────
// Word problems only, MC, no timer, current unit facts

function generateApply(operation, table, batch) {
  const [f1, f2] = factsForBatch(batch)
  const facts = [f1, f2]
  return Array.from({ length: 10 }, (_, i) =>
    makeWord(operation, table, facts[i % 2], { isTimed: false, isTyped: false })
  )
}

// ── Master generator (10 q) ───────────────────────────────────────────────
// Mixed equations + word problems, MC, timed 10s, current unit facts

function generateMaster(operation, table, batch) {
  const [f1, f2] = factsForBatch(batch)
  const facts = [f1, f2]
  return Array.from({ length: 10 }, (_, i) =>
    makeMixed(operation, table, facts[i % 2], { isTimed: true, isTyped: false })
  )
}

// ── Double Reward generator ────────────────────────────────────────────────
// Mixed, timed 5s, typed answer only, current unit facts

function generateDoubleReward(operation, table, batch) {
  const [f1, f2] = factsForBatch(batch)
  const facts = [f1, f2]
  // How many questions? Use 10 (same as master) — can tune later
  return Array.from({ length: 10 }, (_, i) =>
    makeMixed(operation, table, facts[i % 2], { isTimed: true, isTyped: true })
  )
}

// ── Welcome generator (20 q) ──────────────────────────────────────────────
// Mixed types, MC + typed mix, no timer, yesterday's unit facts

function generateWelcome(operation, table, batch, unlockBatch) {
  const src = unlockBatch || { operation, table, batch }
  const [f1, f2] = factsForBatch(src.batch)
  const facts = [f1, f2]
  return Array.from({ length: 20 }, (_, i) => {
    // Every 3rd question is typed, rest are MC
    const isTyped = (i % 3 === 2)
    return makeMixed(src.operation, src.table, facts[i % 2], { isTimed: false, isTyped })
  })
}

// ── Review generator (20 q) ───────────────────────────────────────────────
// Mixed types, MC + typed mix, 1/3 timed (10s), all seen units

function generateReview(operation, table, batch, reviewPool) {
  const pool = reviewPool && reviewPool.length > 0
    ? reviewPool
    : [{ operation, table, batch }]

  return Array.from({ length: 20 }, (_, i) => {
    const src = pick(pool)
    const [f1, f2] = factsForBatch(src.batch)
    const fact = Math.random() < 0.5 ? f1 : f2
    // Every 3rd question is typed, 1/3 are timed
    const isTyped = (i % 3 === 2)
    const isTimed = (i % 3 === 1)
    return makeMixed(src.operation, src.table, fact, { isTimed, isTyped })
  })
}

// ── Diagnostic generator ───────────────────────────────────────────────────
// Like review but covers ALL operations up to and including the claimed one.
// MC + typed mix, 1/3 timed, 25 questions.

export function generateDiagnostic(claimedOperation, selectedTables) {
  const tables = (selectedTables && selectedTables.length > 0)
    ? selectedTables
    : Array.from({ length: 12 }, (_, i) => i + 1)

  // All operations up to and including the claimed one
  const claimedIdx = OPERATIONS.indexOf(claimedOperation)
  const operations = claimedIdx >= 0
    ? OPERATIONS.slice(0, claimedIdx + 1)
    : [claimedOperation]

  return Array.from({ length: 25 }, (_, i) => {
    const operation = pick(operations)
    const table     = pick(tables)
    const fact      = randInt(1, 12)
    // Every 3rd question is typed, 1/3 are timed (same pattern as review)
    const isTyped = (i % 3 === 2)
    const isTimed = (i % 3 === 1)
    return makeMixed(operation, table, fact, { isTimed, isTyped })
  })
}

// ── Main export ────────────────────────────────────────────────────────────

export function generateBatch(operation, table, batch, node, { unlockBatch, reviewPool } = {}) {
  if (node === 'learn')         return generateLesson(operation, table, batch)
  if (node === 'practice')      return generatePractice(operation, table, batch)
  if (node === 'apply')         return generateApply(operation, table, batch)
  if (node === 'master')        return generateMaster(operation, table, batch)
  if (node === 'double_reward') return generateDoubleReward(operation, table, batch)
  if (node === 'welcome')       return generateWelcome(operation, table, batch, unlockBatch)
  if (node === 'review')        return generateReview(operation, table, batch, reviewPool)
  // fallback
  return generatePractice(operation, table, batch)
}
