// ── Problem generation ────────────────────────────────────────────────────
// Generates 12 questions for each of the 6 daily-loop nodes.
//
// SESSION STRUCTURE (all nodes):
//   12 questions per session
//   2 facts per batch × 6 appearances each = 12 questions
//   Never two of the same fact consecutively
//   Randomized order every session
//
// CHOICE TYPES:
//   Practice     → EQUATION choices ("which equation describes this?")
//   All others   → NUMBER choices ("what is the answer?")
//
// MATH RULES:
//   Addition:       table N, fact F  → N + F = ?
//   Subtraction:    table N, fact F  → (N+F) − N = F  (never negative)
//   Multiplication: table N, fact F  → N × F = ?
//   Division:       table N, fact F  → (N×F) ÷ N = F  (always whole)

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

// ── Fact sequence ─────────────────────────────────────────────────────────

/** Returns a shuffled 12-item array of fact indices (0 or 1) where each
 *  index appears exactly 6 times and no two consecutive entries are equal.
 *  With only 2 distinct values this is always solvable in very few tries. */
function makeFactSequence() {
  const pool = [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]
  for (let attempt = 0; attempt < 200; attempt++) {
    shuffle(pool)
    let valid = true
    for (let i = 1; i < pool.length; i++) {
      if (pool[i] === pool[i - 1]) { valid = false; break }
    }
    if (valid) return pool
  }
  // Alternating fallback — always satisfies the no-consecutive constraint
  return [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
}

// ── Core math ─────────────────────────────────────────────────────────────

const SYMBOL = {
  addition:       '+',
  subtraction:    '−',
  multiplication: '×',
  division:       '÷',
}

/** Returns { a, b, answer } for the displayed equation "a OP b = ?".
 *
 *  Subtraction: b is always the table number; a = table + fact so the
 *  result is always positive (spec: never negative).
 *  Division: a = table × fact; b = table, so no remainder (spec: whole). */
function factValues(operation, table, fact) {
  switch (operation) {
    case 'addition':
      return { a: table, b: fact, answer: table + fact }
    case 'subtraction':
      return { a: table + fact, b: table, answer: fact }
    case 'multiplication':
      return { a: table, b: fact, answer: table * fact }
    case 'division':
      return { a: table * fact, b: table, answer: fact }
    default:
      return { a: table, b: fact, answer: table + fact }
  }
}

function equationStr(operation, a, b) {
  return `${a} ${SYMBOL[operation]} ${b} = ?`
}

// ── Distractor generation ─────────────────────────────────────────────────

/** Returns `count` wrong numbers close to `answer` but never equal to it. */
function numberDistractors(answer, count = 3) {
  const used = new Set([answer])
  const out  = []
  let tries  = 0
  while (out.length < count && tries < 100) {
    tries++
    const offset = randInt(1, 4) * (Math.random() < 0.5 ? 1 : -1)
    const d = answer + offset
    if (d > 0 && !used.has(d)) { used.add(d); out.push(d) }
  }
  // Deterministic fallback in case the random loop doesn't fill the quota
  let pad = 1
  while (out.length < count) {
    const d = answer + count + pad++
    if (!used.has(d)) { used.add(d); out.push(d) }
  }
  return out
}

/** Returns `count` wrong equations that look plausible — nearby operands in
 *  the same table so a kid can't trivially rule them out. Used only for the
 *  Practice node where choices are equations, not numbers.
 *
 *  @param {string} operation
 *  @param {number} a   - correct first operand
 *  @param {number} b   - correct second operand
 *  @param {number} count
 */
function equationDistractors(operation, a, b, count = 3) {
  const sym  = SYMBOL[operation]
  const used = new Set([`${a}${sym}${b}`])
  const out  = []
  const offsets = [-2, -1, 1, 2, -3, 3]

  let i = 0
  while (out.length < count && i < offsets.length * 2) {
    const da = a + offsets[i % offsets.length]
    const db = b + offsets[Math.floor(i / offsets.length)]
    i++
    if (da <= 0 || db <= 0) continue
    const key = `${da}${sym}${db}`
    if (!used.has(key)) {
      used.add(key)
      out.push(`${da} ${sym} ${db} = ?`)
    }
  }
  // Deterministic fallback
  let pad = 1
  while (out.length < count) {
    const key = `${a + pad}${sym}${b}`
    if (!used.has(key)) { used.add(key); out.push(`${a + pad} ${sym} ${b} = ?`) }
    pad++
  }
  return out
}

// ── Word problem templates ────────────────────────────────────────────────
// 5 rotating contexts, each returning { text } for the word problem.
// Real names, real situations — never generic "Tom has apples."

const NAMES = ['Yassine', 'Lina', 'Omar', 'Sofia', 'Adam', 'Nora', 'Ziad', 'Mia', 'Karim', 'Aya']

function name() { return NAMES[randInt(0, NAMES.length - 1)] }
function name2(exclude) {
  let n
  do { n = NAMES[randInt(0, NAMES.length - 1)] } while (n === exclude)
  return n
}

function homeContext(operation, a, b) {
  const n = name()
  const opts = {
    addition: [
      `${n} has ${a} books on the shelf and puts ${b} more there. How many books are on the shelf now?`,
      `${n} found ${a} coins in their room and ${b} coins in their jacket. How many coins in total?`,
      `${n}'s mom bought ${a} oranges and ${n}'s dad brought home ${b} more. How many oranges do they have?`,
    ],
    subtraction: [
      `There were ${a} cookies on the plate. ${n} ate ${b}. How many cookies are left?`,
      `${n} had ${a} stickers and gave ${b} to their little brother. How many stickers does ${n} have now?`,
      `The fridge had ${a} juice boxes. The family drank ${b}. How many are left?`,
    ],
    multiplication: [
      `${n} has ${a} bags. Each bag holds ${b} apples. How many apples in total?`,
      `There are ${a} shelves in the room. Each shelf has ${b} books. How many books are there altogether?`,
      `${n} puts ${b} towels in each of the ${a} bathrooms. How many towels did they use?`,
    ],
    division: [
      `${n} has ${a} candies to share equally among ${b} siblings. How many does each one get?`,
      `There are ${a} socks in the laundry. Each pair has ${b} socks — how many pairs are there?`,
      `${n} splits ${a} grapes equally into ${b} bowls. How many grapes per bowl?`,
    ],
  }
  const list = opts[operation]
  return list[randInt(0, list.length - 1)]
}

function schoolContext(operation, a, b) {
  const n = name()
  const opts = {
    addition: [
      `${n} scored ${a} points in the morning quiz and ${b} points in the afternoon quiz. What is their total score?`,
      `The class has ${a} red pencils and ${b} blue pencils. How many pencils altogether?`,
      `${n} read ${a} pages on Monday and ${b} pages on Tuesday. How many pages in total?`,
    ],
    subtraction: [
      `The classroom had ${a} crayons. ${b} of them broke. How many good crayons are left?`,
      `${n} brought ${a} sandwiches for lunch and gave ${b} to friends. How many sandwiches does ${n} have left?`,
      `There were ${a} kids at recess. ${b} went back inside. How many are still outside?`,
    ],
    multiplication: [
      `There are ${a} tables in the cafeteria. Each table seats ${b} students. How many students can sit altogether?`,
      `The teacher hands out ${b} stickers to each of the ${a} students. How many stickers in total?`,
      `${n}'s class has ${a} groups. Each group made ${b} paper planes. How many paper planes in total?`,
    ],
    division: [
      `The teacher has ${a} pencils to give equally to ${b} students. How many pencils does each student get?`,
      `${a} students form teams of ${b}. How many teams can they make?`,
      `The class collected ${a} books for ${b} shelves equally. How many books per shelf?`,
    ],
  }
  const list = opts[operation]
  return list[randInt(0, list.length - 1)]
}

function storeContext(operation, a, b) {
  const n = name()
  const opts = {
    addition: [
      `${n} puts ${a} apples and ${b} bananas in the cart. How many fruits are in the cart?`,
      `The bakery sold ${a} croissants in the morning and ${b} in the afternoon. How many croissants were sold?`,
      `${n} buys a toy for ${a} dollars and a book for ${b} dollars. How much did they spend in total?`,
    ],
    subtraction: [
      `The store had ${a} bottles of juice. They sold ${b}. How many bottles are still on the shelf?`,
      `${n} had ${a} coins and spent ${b} on a snack. How many coins does ${n} have left?`,
      `The toy store had ${a} teddy bears. ${b} were sold today. How many are left?`,
    ],
    multiplication: [
      `${n} buys ${a} packs of gum. Each pack has ${b} pieces. How many pieces of gum in total?`,
      `A store puts ${b} cans in each of ${a} boxes. How many cans is that?`,
      `${n} grabs ${a} bags of chips. Each bag costs ${b} dollars. How much does ${n} pay?`,
    ],
    division: [
      `${n} has ${a} coins and shares them equally into ${b} piggy banks. How many coins in each bank?`,
      `The bakery made ${a} muffins and packs them ${b} per box. How many boxes are there?`,
      `${a} stickers are packed equally into ${b} bags. How many stickers per bag?`,
    ],
  }
  const list = opts[operation]
  return list[randInt(0, list.length - 1)]
}

function vacationContext(operation, a, b) {
  const n = name()
  const opts = {
    addition: [
      `On the first day of vacation, ${n} collected ${a} shells at the beach. On the second day, they found ${b} more. How many shells altogether?`,
      `${n}'s family drove ${a} km before lunch and ${b} km after lunch. How many km did they drive in total?`,
      `At the water park, ${n} went down ${a} water slides and ${b} regular slides. How many slides in total?`,
    ],
    subtraction: [
      `${n} brought ${a} snacks for the road trip and ate ${b} before arriving. How many snacks are left?`,
      `The hotel pool had ${a} pool toys. ${b} were taken to the rooms. How many are left in the pool?`,
      `${n} took ${a} photos on vacation. ${b} of them were blurry. How many good photos does ${n} have?`,
    ],
    multiplication: [
      `${n}'s family stays at the hotel for ${a} nights. Each night costs ${b} dollars. What is the total cost?`,
      `On the beach, ${n} builds ${a} sandcastles. Each one has ${b} towers. How many towers in total?`,
      `${n} visits ${a} cities and takes ${b} photos in each. How many photos total?`,
    ],
    division: [
      `${n}'s family collected ${a} seashells and divides them equally among ${b} kids. How many shells each?`,
      `The tour guide splits ${a} people into ${b} equal groups. How many people in each group?`,
      `${n} walks ${a} km over ${b} days, the same distance each day. How many km per day?`,
    ],
  }
  const list = opts[operation]
  return list[randInt(0, list.length - 1)]
}

function partyContext(operation, a, b) {
  const n  = name()
  const n2 = name2(n)
  const opts = {
    addition: [
      `${n} brings ${a} balloons to the party and ${n2} brings ${b} more. How many balloons are there?`,
      `${n} got ${a} birthday gifts in the morning and ${b} more at dinner. How many gifts in total?`,
      `The party table has ${a} cupcakes and ${b} cookies. How many treats altogether?`,
    ],
    subtraction: [
      `There were ${a} pieces of cake. The guests ate ${b}. How many pieces are left?`,
      `${n} had ${a} party hats and gave ${b} out. How many hats are left?`,
      `${n} blew up ${a} balloons, but ${b} popped. How many are still floating?`,
    ],
    multiplication: [
      `There are ${a} tables at the party. Each table gets ${b} cupcakes. How many cupcakes in total?`,
      `${n} gives ${b} stickers to each of ${a} friends. How many stickers does ${n} hand out?`,
      `There are ${a} party bags. Each bag has ${b} sweets inside. How many sweets in total?`,
    ],
    division: [
      `There are ${a} candies to share equally among ${b} kids at the party. How many does each kid get?`,
      `${n} cuts a birthday cake into ${a} slices for ${b} friends equally. How many slices per friend?`,
      `${a} party balloons are tied into groups of ${b}. How many groups are there?`,
    ],
  }
  const list = opts[operation]
  return list[randInt(0, list.length - 1)]
}

const CONTEXT_FNS = [homeContext, schoolContext, storeContext, vacationContext, partyContext]

function randomWordProblem(operation, a, b) {
  const fn = CONTEXT_FNS[randInt(0, CONTEXT_FNS.length - 1)]
  return fn(operation, a, b)
}

// ── Question builders ─────────────────────────────────────────────────────

/** Plain equation + NUMBER choices. Used by: unlock, learn, speed. */
function plainEquationQuestion(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  return {
    text:       equationStr(operation, a, b),
    answer,
    choiceType: 'number',
    choices:    shuffle([answer, ...numberDistractors(answer)]),
  }
}

/** Word problem + EQUATION choices ("which equation matches?"). Used by: practice. */
function practiceQuestion(operation, table, fact) {
  const { a, b } = factValues(operation, table, fact)
  const text = randomWordProblem(operation, a, b)
  const correct = equationStr(operation, a, b)
  return {
    text,
    answer:     correct,
    choiceType: 'equation',
    choices:    shuffle([correct, ...equationDistractors(operation, a, b)]),
  }
}

/** Word problem + NUMBER choices. Used by: real_life. */
function realLifeQuestion(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  return {
    text:       randomWordProblem(operation, a, b),
    answer,
    choiceType: 'number',
    choices:    shuffle([answer, ...numberDistractors(answer)]),
  }
}

// ── Review generator ────────────────────────────────────────────────────
/** Generates 24 review questions from past batches — double the normal
 *  count since Review covers all 4 formats: plain equations, what_happened
 *  (equation choices), real_life word problems, and speed-style equations.
 *  6 of each format = 24 total. Each question independently picks from
 *  the pool for genuine variety. */
function generateReview(operation, table, batch, reviewPool) {
  const pool = reviewPool.length > 0 ? reviewPool : [{ operation, table, batch }]
  const formats = ['equation', 'what_happened', 'real_life', 'speed']
  const questions = []

  // 6 questions per format, each independently drawn from the pool
  for (const fmt of formats) {
    for (let i = 0; i < 6; i++) {
      const src = pool[randInt(0, pool.length - 1)]
      const [f1, f2] = factsForBatch(src.batch)
      const fact = Math.random() < 0.5 ? f1 : f2
      if (fmt === 'equation' || fmt === 'speed') {
        questions.push(plainEquationQuestion(src.operation, src.table, fact))
      } else if (fmt === 'what_happened') {
        questions.push(practiceQuestion(src.operation, src.table, fact))
      } else {
        questions.push(realLifeQuestion(src.operation, src.table, fact))
      }
    }
  }

  // Shuffle so formats are interleaved, not grouped
  return shuffle(questions)
}

// ── Main export ───────────────────────────────────────────────────────────

/** Generates questions for a daily-loop node.
 *
 *  SPECIAL CASES:
 *  - 'learn' returns { isLesson: true, facts: [{equation, result}] } — no
 *    questions, just the 2 facts to display as a pure lesson screen.
 *  - 'review' returns 24 questions (all 4 formats, 6 each, shuffled).
 *  - All other nodes return 12 questions (2 facts × 6 each, no consecutive).
 *
 *  Node → format mapping:
 *  unlock       → plain equations, NUMBER choices, tests YESTERDAY's facts
 *  learn        → pure lesson (no questions) — just shows today's 2 facts
 *  what_happened→ word problems, EQUATION choices ("which equation fits?")
 *  practice     → word problems, NUMBER choices
 *  real_life    → applied word problems, NUMBER choices
 *  speed        → plain equations, NUMBER choices, timed
 *  review       → all 4 formats mixed, 24 questions total
 */
// ── Diagnostic generator ──────────────────────────────────────────────────
// Generates a placement-test question set for a kid who claims to already
// know a given operation.
//
// Primary operation (claimed): all 12 tables × 3 types = 36 questions.
//   Questions tagged isPrimary: true — Diagnostic.jsx uses this to score
//   only the claimed section (threshold: 80% of 36 = 29 correct).
//
// Preceding operations: 6 randomly sampled tables × 3 types = 18 each.
//   These are informational — they don't gate the pass/fail decision.
//
// All questions shuffled together so the kid can't tell where one section
// ends and another begins.
//
// Scope by claim:
//   'addition'       → 36  (addition only)
//   'subtraction'    → 54  (36 sub + 18 add)
//   'multiplication' → 72  (36 mul + 18 sub + 18 add)
//   'division'       → 90  (36 div + 18 mul + 18 sub + 18 add)
/** Generates exactly 20 diagnostic questions for a placement claim.
 *  Always 20 — no more, no less. Covers all operations up to and including
 *  the claimed one, mixed together and shuffled. Each question tagged
 *  isPrimary: true so Diagnostic.jsx can track score on the claimed op.
 *
 *  Distribution: 20 questions split evenly across operations involved,
 *  all 3 question types (plain equation, what_happened, real_life), random
 *  tables and facts. */
export function generateDiagnostic(claimedOperation) {
  const OPS_ORDER = ['addition', 'subtraction', 'multiplication', 'division']
  const claimedIdx = OPS_ORDER.indexOf(claimedOperation)
  if (claimedIdx === -1) return []

  // All operations to cover (e.g. subtraction claim → [addition, subtraction])
  const ops = OPS_ORDER.slice(0, claimedIdx + 1)

  // 20 questions distributed as evenly as possible across ops
  const perOp = Math.floor(20 / ops.length)
  const remainder = 20 - perOp * ops.length
  const counts = ops.map((_, i) => perOp + (i === ops.length - 1 ? remainder : 0))
  // Give any remainder to the primary (claimed) operation so primary gets
  // slightly more weight — that's the one we're actually evaluating

  const allQuestions = []
  const TYPES = ['plain', 'what_happened', 'real_life']

  ops.forEach((op, opIdx) => {
    const isPrimary = op === claimedOperation
    const n = counts[opIdx]
    // Pick n random (table, fact) pairs, cycling through question types
    for (let i = 0; i < n; i++) {
      const table = randInt(1, 12)
      const fact  = randInt(1, 12)
      const type  = TYPES[i % TYPES.length]
      let q
      if (type === 'plain')         q = plainEquationQuestion(op, table, fact)
      else if (type === 'what_happened') q = practiceQuestion(op, table, fact)
      else                          q = realLifeQuestion(op, table, fact)
      allQuestions.push({ ...q, isPrimary })
    }
  })

  return shuffle(allQuestions)
}

export function generateBatch(operation, table, batch, node, { unlockBatch, reviewPool } = {}) {
  // Learn is a pure lesson — return the 2 facts directly, no questions
  if (node === 'learn') {
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

  // Review = 24 questions across all formats
  if (node === 'review') {
    return generateReview(operation, table, batch, reviewPool || [])
  }

  // Unlock node: mix all 3 question types (4 plain + 4 what_happened + 4 real_life)
  // so it's a genuine memory check, not just equation drills.
  if (node === 'unlock') {
    const src = unlockBatch || { operation, table, batch }
    const [f0, f1] = factsForBatch(src.batch)
    // Each fact appears twice per type = 6 appearances total across 12 questions
    const pair = [f0, f1, f0, f1]
    return shuffle([
      ...pair.map(f => plainEquationQuestion(src.operation, src.table, f)),
      ...pair.map(f => practiceQuestion(src.operation, src.table, f)),
      ...pair.map(f => realLifeQuestion(src.operation, src.table, f)),
    ])
  }

  // All other nodes: 12 questions, 2 facts × 6 each, no consecutive
  const rawSeq  = makeFactSequence()
  const sequence = rawSeq.map((factIdx, qIdx) => ({ factIdx, qIdx }))

  const src = { operation, table, batch }
  const [fact0, fact1] = factsForBatch(src.batch)
  const facts = [fact0, fact1]

  return sequence.map(({ factIdx }) => {
    const fact = facts[factIdx]
    if (node === 'what_happened') return practiceQuestion(src.operation, src.table, fact)
    if (node === 'practice')      return realLifeQuestion(src.operation, src.table, fact)
    if (node === 'real_life')     return realLifeQuestion(src.operation, src.table, fact)
    return plainEquationQuestion(src.operation, src.table, fact) // speed
  })
}
