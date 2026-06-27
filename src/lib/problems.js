// ── problems.js — Numio question engine v2 ────────────────────────────────
//
// 8 question formats, same math skill, different skin:
//   1. classic      — 3 + 2 = ?                         (40%)
//   2. word         — Tom has 3 apples…                  (20%)
//   3. missing      — 3 + ___ = 5                        (15%)
//   4. reverse      — ___ + 2 = 5                        (10%)
//   5. truefalse    — 3 + 2 = 6 → True/False             (10%)
//   6. comparison   — Which is bigger? A) 3+2  B) 4+1     (5%)
//   7. numberline   — Start at 3, move +2. Where?        (folded into classic)
//   8. fillbox      — [3] + [2] = [?]                    (folded into classic)
//
// Smart distractors: off-by-one, common multiplication confusion, table
// neighbours — so wrong answers are plausible traps, not random noise.
//
// Diagnostic: uses ONLY the tables the kid selected.
// Daily loop: all 8 formats, weighted distribution, 12 questions per session.
// Speed node: every question gets isTimed: true.

import { factsForBatch } from './progression'

// ── Utilities ─────────────────────────────────────────────────────────────

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

// ── Math core ─────────────────────────────────────────────────────────────

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

// ── Smart distractors ─────────────────────────────────────────────────────
// Generate wrong answers that feel plausible — common kid mistakes.

function smartDistractors(operation, table, fact, answer, count = 3) {
  const used = new Set([answer])
  const candidates = []

  // Off-by-one (most common mistake)
  candidates.push(answer + 1, answer - 1, answer + 2, answer - 2)

  // Operation-specific traps
  if (operation === 'multiplication') {
    // Confuse with addition (table + fact instead of table × fact)
    candidates.push(table + fact)
    // Adjacent table confusion
    candidates.push((table + 1) * fact, (table - 1) * fact)
    candidates.push(table * (fact + 1), table * (fact - 1))
  }
  if (operation === 'addition') {
    // Forget to carry, or add only one
    candidates.push(table + fact - 1, table, fact)
  }
  if (operation === 'subtraction') {
    // Common: add instead of subtract
    candidates.push(table + fact + fact, answer + table)
  }
  if (operation === 'division') {
    // Confuse with multiplication result
    candidates.push(table * fact, fact + 1, fact - 1)
  }

  // Filter: positive, not the answer, not duplicates
  const out = []
  for (const c of candidates) {
    if (c > 0 && !used.has(c) && Number.isInteger(c)) {
      used.add(c)
      out.push(c)
      if (out.length === count) break
    }
  }

  // Fallback: offset from answer
  let pad = 3
  while (out.length < count) {
    const d = answer + pad
    if (!used.has(d)) { used.add(d); out.push(d) }
    pad++
  }

  return out.slice(0, count)
}

// ── Word problem templates ────────────────────────────────────────────────

const NAMES = ['Yassine', 'Lina', 'Omar', 'Sofia', 'Adam', 'Nora', 'Ziad', 'Mia', 'Karim', 'Aya']

function name() { return pick(NAMES) }
function name2(exclude) {
  let n
  do { n = pick(NAMES) } while (n === exclude)
  return n
}

const WORD_TEMPLATES = {
  addition: (a, b) => {
    const n = name(), n2 = name2(n)
    return pick([
      `${n} has ${a} books and gets ${b} more. How many books now?`,
      `${n} collected ${a} coins and found ${b} more. How many in total?`,
      `There are ${a} red balloons and ${b} blue ones. How many balloons altogether?`,
      `${n} scored ${a} points and ${n2} scored ${b}. What's their combined score?`,
      `The bakery made ${a} croissants in the morning and ${b} more after lunch. How many total?`,
      `${n} walks ${a} steps forward, then ${b} more. How many steps altogether?`,
      `A jar has ${a} red marbles and ${b} blue marbles. How many marbles in all?`,
    ])
  },
  subtraction: (a, b) => {
    const n = name()
    return pick([
      `${n} had ${a} stickers and gave ${b} away. How many are left?`,
      `There were ${a} cookies on the plate. ${b} were eaten. How many remain?`,
      `${n} has ${a} coins and spends ${b}. How many coins left?`,
      `The shelf had ${a} books. ${b} were borrowed. How many are still there?`,
      `${n} had ${a} balloons. ${b} popped. How many are left?`,
      `A box has ${a} chocolates. ${b} are eaten. How many chocolates remain?`,
    ])
  },
  multiplication: (a, b) => {
    const n = name()
    return pick([
      `${n} has ${a} bags. Each bag has ${b} apples. How many apples total?`,
      `There are ${a} rows of chairs with ${b} chairs each. How many chairs in all?`,
      `${n} buys ${a} packs of stickers. Each pack has ${b} stickers. How many total?`,
      `A spider has ${b} legs. How many legs do ${a} spiders have?`,
      `${n} saves ${b} coins every day for ${a} days. How many coins total?`,
      `There are ${a} boxes with ${b} crayons in each. How many crayons altogether?`,
    ])
  },
  division: (a, b) => {
    const n = name()
    return pick([
      `${n} has ${a} candies to share equally among ${b} friends. How many each?`,
      `${a} students sit in ${b} equal rows. How many students per row?`,
      `${n} cuts ${a} apples into ${b} equal groups. How many apples in each group?`,
      `${a} cookies are packed ${b} per box. How many boxes?`,
      `${n} divides ${a} stickers equally among ${b} kids. How many does each get?`,
    ])
  },
}

function randomWordProblem(operation, a, b) {
  return WORD_TEMPLATES[operation]?.(a, b) || `${a} ${SYMBOL[operation]} ${b} = ?`
}

// ── Fact sequence (no consecutive same fact) ──────────────────────────────

function makeFactSequence(n = 12) {
  if (n === 2) {
    const pool = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]
    for (let attempt = 0; attempt < 200; attempt++) {
      shuffle(pool)
      let valid = true
      for (let i = 1; i < pool.length; i++) {
        if (pool[i] === pool[i - 1]) { valid = false; break }
      }
      if (valid) return pool
    }
    return [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
  }
  // For diagnostic: just return random indices
  return Array.from({ length: n }, () => randInt(0, n - 1))
}

// ── Question builders ─────────────────────────────────────────────────────

/** 1. Classic equation: 3 + 2 = ? */
function classicQuestion(operation, table, fact, isTimed = false) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const style = pick(['plain', 'numberline', 'fillbox'])

  let text
  if (style === 'numberline' && operation === 'addition') {
    text = `Start at ${a}, move +${b}. Where do you land?`
  } else if (style === 'fillbox') {
    text = `[${a}] ${sym} [${b}] = [?]`
  } else {
    text = `${a} ${sym} ${b} = ?`
  }

  return {
    text,
    answer,
    choiceType: 'number',
    choices: shuffle([answer, ...smartDistractors(operation, table, fact, answer)]),
    format: 'classic',
    isTimed,
  }
}

/** 2. Word problem: Tom has 3 apples… */
function wordQuestion(operation, table, fact, isTimed = false) {
  const { a, b, answer } = factValues(operation, table, fact)
  return {
    text: randomWordProblem(operation, a, b),
    answer,
    choiceType: 'number',
    choices: shuffle([answer, ...smartDistractors(operation, table, fact, answer)]),
    format: 'word',
    isTimed,
  }
}

/** 3. Missing number: 3 + ___ = 5 */
function missingQuestion(operation, table, fact, isTimed = false) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]

  // The missing value is always `b` (the fact), shown as ___
  // answer to show is `b` itself
  const missingAnswer = b
  const text = `${a} ${sym} ___ = ${answer}`

  return {
    text,
    answer: missingAnswer,
    choiceType: 'number',
    choices: shuffle([missingAnswer, ...smartDistractors(operation, table, fact, missingAnswer)]),
    format: 'missing',
    isTimed,
  }
}

/** 4. Reverse format: ___ + 2 = 5 */
function reverseQuestion(operation, table, fact, isTimed = false) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]

  // Missing is `a` (the table)
  const missingAnswer = a
  const text = `___ ${sym} ${b} = ${answer}`

  return {
    text,
    answer: missingAnswer,
    choiceType: 'number',
    choices: shuffle([missingAnswer, ...smartDistractors(operation, table, fact, missingAnswer)]),
    format: 'reverse',
    isTimed,
  }
}

/** 5. True / False: 3 + 2 = 6 → True/False */
function trueFalseQuestion(operation, table, fact, isTimed = false) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]

  // 50% chance show correct answer, 50% show a wrong one
  const showCorrect = Math.random() < 0.5
  const shownAnswer = showCorrect
    ? answer
    : pick(smartDistractors(operation, table, fact, answer, 1))

  return {
    text: `${a} ${sym} ${b} = ${shownAnswer}`,
    answer: showCorrect ? 'True' : 'False',
    choiceType: 'truefalse',
    choices: ['True', 'False'],
    format: 'truefalse',
    isTimed,
  }
}

/** 6. Comparison: Which is bigger? A) 3+2  B) 4+1 */
function comparisonQuestion(operation, table, fact, isTimed = false) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]

  // Generate a second expression with a different result
  const offset = pick([-2, -1, 1, 2])
  const altAnswer = Math.max(1, answer + offset)

  // Pick how to express the alternate: a±1 op b, or a op b±1
  const altExpr = Math.random() < 0.5
    ? `${a + offset} ${sym} ${b}`
    : `${a} ${sym} ${b + offset}`

  const mainExpr = `${a} ${sym} ${b}`
  const mainBigger = answer > altAnswer

  const optA = mainExpr
  const optB = altExpr
  const correctAnswer = mainBigger ? optA : optB

  return {
    text: `Which is bigger?`,
    answer: correctAnswer,
    choiceType: 'comparison',
    choices: [optA, optB],
    format: 'comparison',
    isTimed,
  }
}

// ── Distribution engine ───────────────────────────────────────────────────
// 40% classic, 20% word, 15% missing, 10% truefalse, 10% reverse, 5% comparison

function buildFormatPool(total) {
  const pool = []
  const counts = {
    classic:    Math.round(total * 0.40),
    word:       Math.round(total * 0.20),
    missing:    Math.round(total * 0.15),
    truefalse:  Math.round(total * 0.10),
    reverse:    Math.round(total * 0.10),
    comparison: Math.round(total * 0.05),
  }

  // Adjust rounding to hit exactly `total`
  let sum = Object.values(counts).reduce((a, b) => a + b, 0)
  while (sum < total) { counts.classic++; sum++ }
  while (sum > total) { counts.classic--; sum-- }

  for (const [fmt, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) pool.push(fmt)
  }
  return shuffle(pool)
}

function makeQuestion(format, operation, table, fact, isTimed = false) {
  switch (format) {
    case 'classic':    return classicQuestion(operation, table, fact, isTimed)
    case 'word':       return wordQuestion(operation, table, fact, isTimed)
    case 'missing':    return missingQuestion(operation, table, fact, isTimed)
    case 'reverse':    return reverseQuestion(operation, table, fact, isTimed)
    case 'truefalse':  return trueFalseQuestion(operation, table, fact, isTimed)
    case 'comparison': return comparisonQuestion(operation, table, fact, isTimed)
    default:           return classicQuestion(operation, table, fact, isTimed)
  }
}

// ── Diagnostic generator ──────────────────────────────────────────────────
// Uses ONLY the tables the kid selected. 25 questions, all formats.

export function generateDiagnostic(claimedOperation, selectedTables) {
  const tables = (selectedTables && selectedTables.length > 0)
    ? selectedTables
    : Array.from({ length: 12 }, (_, i) => i + 1) // fallback: all tables

  const TOTAL = 25
  const formats = buildFormatPool(TOTAL)
  const questions = []

  for (let i = 0; i < TOTAL; i++) {
    const table = pick(tables)
    const fact  = randInt(1, 12)
    questions.push({
      ...makeQuestion(formats[i], claimedOperation, table, fact),
      isPrimary: true,
    })
  }

  return shuffle(questions)
}

// ── Lesson generator ──────────────────────────────────────────────────────

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

// ── Review generator ──────────────────────────────────────────────────────

function generateReview(operation, table, batch, reviewPool) {
  const pool = reviewPool.length > 0 ? reviewPool : [{ operation, table, batch }]
  const TOTAL = 24
  const formats = buildFormatPool(TOTAL)
  const questions = []

  for (let i = 0; i < TOTAL; i++) {
    const src  = pick(pool)
    const [f1, f2] = factsForBatch(src.batch)
    const fact = Math.random() < 0.5 ? f1 : f2
    questions.push(makeQuestion(formats[i], src.operation, src.table, fact))
  }

  return shuffle(questions)
}

// ── Main export ───────────────────────────────────────────────────────────

export function generateBatch(operation, table, batch, node, { unlockBatch, reviewPool } = {}) {
  if (node === 'learn') return generateLesson(operation, table, batch)
  if (node === 'review') return generateReview(operation, table, batch, reviewPool || [])

  const isTimed = node === 'double_reward' || node === 'speed'
  const TOTAL = 12

  const src = (node === 'unlock' && unlockBatch)
    ? { operation: unlockBatch.operation, table: unlockBatch.table, batch: unlockBatch.batch }
    : { operation, table, batch }

  const [sf0, sf1] = factsForBatch(src.batch)
  const srcFacts = [sf0, sf1]

  // Per-node difficulty distribution
  let nodeFormats
  if (node === 'easy') {
    nodeFormats = shuffle([
      ...Array(8).fill('classic'),
      ...Array(2).fill('missing'),
      ...Array(1).fill('truefalse'),
      ...Array(1).fill('reverse'),
    ])
  } else if (node === 'medium') {
    nodeFormats = shuffle([
      ...Array(4).fill('classic'),
      ...Array(3).fill('word'),
      ...Array(2).fill('missing'),
      ...Array(2).fill('reverse'),
      ...Array(1).fill('truefalse'),
    ])
  } else if (node === 'hard') {
    nodeFormats = shuffle([
      ...Array(2).fill('classic'),
      ...Array(2).fill('word'),
      ...Array(2).fill('missing'),
      ...Array(2).fill('reverse'),
      ...Array(2).fill('truefalse'),
      ...Array(2).fill('comparison'),
    ])
  } else {
    // unlock, double_reward, legacy nodes → balanced default
    nodeFormats = buildFormatPool(TOTAL)
  }

  const factSeq = makeFactSequence(2)

  return nodeFormats.map((fmt, i) => {
    const fact = srcFacts[factSeq[i] % 2]
    return makeQuestion(fmt, src.operation, src.table, fact, isTimed)
  })
}
