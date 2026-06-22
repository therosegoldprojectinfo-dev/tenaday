// ── Problem generation ───────────────────────────────────────────────────
// Generates questions for each of the 6 daily-loop nodes, based on the
// 3 specific facts in today's batch (or yesterday's batch for Unlock).
//
// KEY RULES (confirmed spec):
//   - 12 questions per session (all nodes)
//   - Each of the 3 facts appears EXACTLY 4 times (3 × 4 = 12)
//   - NEVER consecutive — same fact never appears twice in a row
//   - Randomized order every session
//   - Practice choices are EQUATIONS (which equation happened?)
//   - All other nodes' choices are NUMBERS (what is the answer?)
//   - Rich, relatable word problem contexts — real names, real places

import { factsForBatch } from './progression'

// ── Utility ──────────────────────────────────────────────────────────────

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

/** Generates an array of 12 fact indices (0, 1, 2 for the 3 facts) where:
 *  - Each appears exactly 4 times
 *  - No two consecutive indices are the same
 *  This is the ordering backbone used by all 6 nodes. */
function makeFactSequence() {
  // Start with [0,0,0,0, 1,1,1,1, 2,2,2,2] and shuffle until no
  // consecutive duplicates — this almost always resolves in 1-2 tries.
  const pool = [0,0,0,0, 1,1,1,1, 2,2,2,2]
  let attempts = 0
  while (attempts < 200) {
    shuffle(pool)
    let valid = true
    for (let i = 1; i < pool.length; i++) {
      if (pool[i] === pool[i - 1]) { valid = false; break }
    }
    if (valid) return pool
    attempts++
  }
  // Fallback: build a valid sequence deterministically to guarantee
  // no infinite loop even in the (vanishingly rare) worst case.
  return [0,1,2,0,1,2,0,1,2,0,1,2]
}

// ── Core math: (operation, table, secondOperand) → answer ────────────────

function computeAnswer(operation, table, secondOperand) {
  if (operation === 'addition')       return table + secondOperand
  if (operation === 'subtraction')    return table + secondOperand // result is table, problem is (table+secondOperand) − secondOperand
  if (operation === 'multiplication') return table * secondOperand
  if (operation === 'division')       return secondOperand // table * secondOperand ÷ table = secondOperand
  return table + secondOperand
}

/** Builds the actual problem values for one fact. Returns { a, b, answer }
 *  where the displayed equation is "a OP b = ?". */
function factValues(operation, table, secondOperand) {
  if (operation === 'addition') {
    return { a: table, b: secondOperand, answer: table + secondOperand }
  }
  if (operation === 'subtraction') {
    // Table is the subtrahend; a = table + secondOperand ensures no
    // negative result (spec §4). The fact is: (table+secondOperand) − table = secondOperand.
    const a = table + secondOperand
    return { a, b: table, answer: secondOperand }
  }
  if (operation === 'multiplication') {
    return { a: table, b: secondOperand, answer: table * secondOperand }
  }
  if (operation === 'division') {
    // table × secondOperand ÷ table = secondOperand (always whole, spec §4)
    return { a: table * secondOperand, b: table, answer: secondOperand }
  }
  return { a: table, b: secondOperand, answer: table + secondOperand }
}

const SYMBOL = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' }

function equationStr(operation, a, b) {
  return `${a} ${SYMBOL[operation]} ${b} = ?`
}

// ── Distractor generation ─────────────────────────────────────────────────

/** NUMBER distractors — used for all nodes except Practice.
 *  3 wrong answers that are close to the real answer but never correct. */
function numberDistractors(answer, count = 3) {
  const used = new Set([answer])
  const out = []
  let tries = 0
  while (out.length < count && tries < 100) {
    tries++
    const offset = randInt(1, 4) * (Math.random() < 0.5 ? 1 : -1)
    const d = answer + offset
    if (d > 0 && !used.has(d)) { used.add(d); out.push(d) }
  }
  let pad = 1
  while (out.length < count) {
    const d = answer + count + pad++
    if (!used.has(d)) { used.add(d); out.push(d) }
  }
  return out
}

/** EQUATION distractors — used only for Practice.
 *  3 wrong equations that look plausible but use slightly different
 *  numbers, drawn from nearby values in the same table/batch so a kid
 *  can't trivially eliminate them. */
function equationDistractors(operation, table, correctA, correctB, count = 3) {
  const sym = SYMBOL[operation]
  const used = new Set([`${correctA}${sym}${correctB}`])
  const out = []
  const offsets = [-2,-1,1,2,-3,3]
  let i = 0
  while (out.length < count && i < offsets.length * 2) {
    const da = correctA + offsets[i % offsets.length]
    const db = correctB + offsets[Math.floor(i / offsets.length)]
    i++
    if (da <= 0 || db <= 0) continue
    const key = `${da}${sym}${db}`
    if (!used.has(key)) {
      used.add(key)
      out.push(`${da} ${sym} ${db} = ?`)
    }
  }
  // Fallback
  let pad = 1
  while (out.length < count) {
    const key = `${correctA + pad}${sym}${correctB}`
    if (!used.has(key)) { used.add(key); out.push(`${correctA + pad} ${sym} ${correctB} = ?`) }
    pad++
  }
  return out
}

// ── Word problem templates ────────────────────────────────────────────────
// Rich, relatable contexts organized by setting. Each template is a
// function (table, secondOperand, operation) → string. Using real names
// and real places — never generic "Tom has apples."

const NAMES = ['Yassine', 'Lina', 'Omar', 'Sofia', 'Adam', 'Nora', 'Ziad', 'Mia', 'Karim', 'Aya']
const name = () => NAMES[randInt(0, NAMES.length - 1)]
const name2 = (n1) => { let n; do { n = NAMES[randInt(0, NAMES.length - 1)] } while (n === n1); return n }

// Each context returns { text, a, b } where text is the word problem and
// a, b are the numbers embedded in it (used to build equation distractors
// for Practice questions).

function homeContext(operation, table, second) {
  const { a, b, answer } = factValues(operation, table, second)
  const n = name()
  const contexts = {
    addition: [
      { text: `${n} has ${a} books on the shelf and puts ${b} more there. How many books are on the shelf now?`, a, b },
      { text: `${n} found ${a} coins in their room and ${b} coins in their jacket. How many coins in total?`, a, b },
      { text: `${n}'s mom bought ${a} oranges and ${n}'s dad brought home ${b} more. How many oranges do they have?`, a, b },
    ],
    subtraction: [
      { text: `There were ${a} cookies on the plate. ${n} ate ${b}. How many cookies are left?`, a, b },
      { text: `${n} had ${a} stickers. They gave ${b} to their little brother. How many stickers does ${n} have now?`, a, b },
      { text: `The fridge had ${a} juice boxes. The family drank ${b}. How many are left?`, a, b },
    ],
    multiplication: [
      { text: `${n} has ${a} bags. Each bag holds ${b} apples. How many apples in total?`, a, b },
      { text: `There are ${a} shelves in the room. Each shelf has ${b} books. How many books are there altogether?`, a, b },
      { text: `${n} puts ${b} towels in each of the ${a} bathrooms. How many towels did they use?`, a, b },
    ],
    division: [
      { text: `${n} has ${a} candies to share equally among ${b} siblings. How many does each one get?`, a, b },
      { text: `There are ${a} socks in the laundry. If each pair needs ${b} socks, how many pairs are there?`, a, b },
      { text: `${n} splits ${a} grapes equally into ${b} bowls. How many grapes per bowl?`, a, b },
    ],
  }
  const list = contexts[operation]
  return list[randInt(0, list.length - 1)]
}

function schoolContext(operation, table, second) {
  const { a, b } = factValues(operation, table, second)
  const n = name()
  const contexts = {
    addition: [
      { text: `${n} scored ${a} points in the morning quiz and ${b} points in the afternoon quiz. What is their total score?`, a, b },
      { text: `The class has ${a} red pencils and ${b} blue pencils. How many pencils altogether?`, a, b },
      { text: `${n} read ${a} pages on Monday and ${b} pages on Tuesday. How many pages did they read in total?`, a, b },
    ],
    subtraction: [
      { text: `The classroom had ${a} crayons. ${b} of them broke. How many good crayons are left?`, a, b },
      { text: `${n} brought ${a} sandwiches for lunch and gave ${b} to friends. How many sandwiches does ${n} have left?`, a, b },
      { text: `There were ${a} kids at recess. ${b} went back inside. How many are still outside?`, a, b },
    ],
    multiplication: [
      { text: `There are ${a} tables in the cafeteria. Each table seats ${b} students. How many students can sit altogether?`, a, b },
      { text: `The teacher hands out ${b} stickers to each of the ${a} students. How many stickers does the teacher give out?`, a, b },
      { text: `${n}'s class has ${a} groups. Each group made ${b} paper planes. How many paper planes in total?`, a, b },
    ],
    division: [
      { text: `The teacher has ${a} pencils to give equally to ${b} students. How many pencils does each student get?`, a, b },
      { text: `${a} students need to form teams of ${b}. How many teams can they make?`, a, b },
      { text: `The class collected ${a} books for ${b} shelves equally. How many books per shelf?`, a, b },
    ],
  }
  const list = contexts[operation]
  return list[randInt(0, list.length - 1)]
}

function storeContext(operation, table, second) {
  const { a, b } = factValues(operation, table, second)
  const n = name()
  const contexts = {
    addition: [
      { text: `${n} puts ${a} apples and ${b} bananas in the cart. How many fruits are in the cart?`, a, b },
      { text: `The bakery sold ${a} croissants in the morning and ${b} in the afternoon. How many croissants were sold?`, a, b },
      { text: `${n} buys a toy for ${a} dollars and a book for ${b} dollars. How much did they spend in total?`, a, b },
    ],
    subtraction: [
      { text: `The store had ${a} bottles of juice. They sold ${b}. How many bottles are still on the shelf?`, a, b },
      { text: `${n} had ${a} coins. They spent ${b} on a snack. How many coins does ${n} have left?`, a, b },
      { text: `The toy store had ${a} teddy bears. ${b} were sold today. How many are left?`, a, b },
    ],
    multiplication: [
      { text: `${n} buys ${a} packs of gum. Each pack has ${b} pieces. How many pieces of gum in total?`, a, b },
      { text: `A store puts ${b} cans in each of ${a} boxes. How many cans is that?`, a, b },
      { text: `${n} grabs ${a} bags of chips. Each bag costs ${b} dollars. How much does ${n} pay?`, a, b },
    ],
    division: [
      { text: `${n} has ${a} coins and wants to share them equally into ${b} piggy banks. How many coins in each bank?`, a, b },
      { text: `The bakery made ${a} muffins and packs them ${b} per box. How many boxes are there?`, a, b },
      { text: `${a} stickers are packed equally into ${b} bags. How many stickers per bag?`, a, b },
    ],
  }
  const list = contexts[operation]
  return list[randInt(0, list.length - 1)]
}

function vacationContext(operation, table, second) {
  const { a, b } = factValues(operation, table, second)
  const n = name()
  const contexts = {
    addition: [
      { text: `On the first day of vacation, ${n} collected ${a} shells at the beach. On the second day, they found ${b} more. How many shells altogether?`, a, b },
      { text: `${n}'s family drove ${a} km before lunch and ${b} km after lunch. How many km did they drive in total?`, a, b },
      { text: `At the water park, ${n} went down ${a} water slides and ${b} regular slides. How many slides in total?`, a, b },
    ],
    subtraction: [
      { text: `${n} brought ${a} snacks for the road trip. They ate ${b} before arriving. How many snacks are left?`, a, b },
      { text: `The hotel pool had ${a} pool toys. ${b} were taken to the rooms. How many are left in the pool?`, a, b },
      { text: `${n} took ${a} photos on vacation. ${b} of them were blurry. How many good photos does ${n} have?`, a, b },
    ],
    multiplication: [
      { text: `${n}'s family stays at the hotel for ${a} nights. Each night costs ${b} dollars. What is the total cost?`, a, b },
      { text: `On the beach, ${n} builds ${a} sandcastles. Each one has ${b} towers. How many towers in total?`, a, b },
      { text: `During the trip, ${n} visits ${a} cities and takes ${b} photos in each. How many photos total?`, a, b },
    ],
    division: [
      { text: `${n}'s family collected ${a} seashells and divides them equally among ${b} kids. How many shells each?`, a, b },
      { text: `The tour guide splits ${a} people into ${b} equal groups. How many people in each group?`, a, b },
      { text: `${n} walks ${a} km over ${b} days, the same distance each day. How many km per day?`, a, b },
    ],
  }
  const list = contexts[operation]
  return list[randInt(0, list.length - 1)]
}

function partyContext(operation, table, second) {
  const { a, b } = factValues(operation, table, second)
  const n = name()
  const n2 = name2(n)
  const contexts = {
    addition: [
      { text: `${n} brings ${a} balloons to the party and ${n2} brings ${b} more. How many balloons are there?`, a, b },
      { text: `${n} got ${a} birthday gifts in the morning and ${b} more at dinner. How many gifts in total?`, a, b },
      { text: `The party table has ${a} cupcakes and ${b} cookies. How many treats altogether?`, a, b },
    ],
    subtraction: [
      { text: `There were ${a} pieces of cake. The guests ate ${b}. How many pieces are left?`, a, b },
      { text: `${n} had ${a} party hats. ${b} were given out. How many hats are left?`, a, b },
      { text: `${n} blew up ${a} balloons, but ${b} popped. How many balloons are still floating?`, a, b },
    ],
    multiplication: [
      { text: `There are ${a} tables at the party. Each table gets ${b} cupcakes. How many cupcakes in total?`, a, b },
      { text: `${n} gives ${b} stickers to each of ${a} friends at the party. How many stickers does ${n} hand out?`, a, b },
      { text: `There are ${a} party bags. Each bag has ${b} sweets inside. How many sweets in total?`, a, b },
    ],
    division: [
      { text: `There are ${a} candies to share equally among ${b} kids at the party. How many does each kid get?`, a, b },
      { text: `${n} cuts a birthday cake into ${a} slices for ${b} friends equally. How many slices per friend?`, a, b },
      { text: `${a} party balloons are tied into groups of ${b}. How many groups are there?`, a, b },
    ],
  }
  const list = contexts[operation]
  return list[randInt(0, list.length - 1)]
}

const CONTEXT_FNS = [homeContext, schoolContext, storeContext, vacationContext, partyContext]

function randomWordProblem(operation, table, second) {
  const fn = CONTEXT_FNS[randInt(0, CONTEXT_FNS.length - 1)]
  return fn(operation, table, second)
}

// ── Question builders ────────────────────────────────────────────────────

/** Plain equation question with NUMBER choices.
 *  Used by: Unlock, Learn, Speed */
function plainEquationQuestion(operation, table, second) {
  const { a, b, answer } = factValues(operation, table, second)
  return {
    text: equationStr(operation, a, b),
    answer,
    choiceType: 'number',
    choices: shuffle([answer, ...numberDistractors(answer)]),
  }
}

/** Word problem with EQUATION choices.
 *  Used by: Practice — "which equation describes this situation?" */
function practiceQuestion(operation, table, second) {
  const { a, b, answer } = factValues(operation, table, second)
  const { text } = randomWordProblem(operation, table, second)
  const correctEquation = `${a} ${SYMBOL[operation]} ${b} = ?`
  const distractors = equationDistractors(operation, table, a, b)
  return {
    text,
    answer: correctEquation,
    choiceType: 'equation',
    choices: shuffle([correctEquation, ...distractors]),
  }
}

/** Word problem with NUMBER choices.
 *  Used by: Real Life — "what is the answer in this real situation?" */
function realLifeQuestion(operation, table, second) {
  const { a, b, answer } = factValues(operation, table, second)
  const { text } = randomWordProblem(operation, table, second)
  return {
    text,
    answer,
    choiceType: 'number',
    choices: shuffle([answer, ...numberDistractors(answer)]),
  }
}

// ── Main export ───────────────────────────────────────────────────────────

/** Generates exactly 12 questions for a daily-loop node:
 *  - Each of the 3 facts in `batch` appears exactly 4 times
 *  - Never two of the same fact consecutively
 *  - Randomized order every call
 *
 *  `unlockBatch` is only needed for the 'unlock' node — it's the
 *  PREVIOUS batch's (operation, table, batch), resolved by the caller
 *  (lib/progression.js's previousBatch()), since the Unlock node tests
 *  yesterday's material, not today's.
 *
 *  `reviewPool` is only needed for the 'review' node — an array of
 *  { operation, table, batch } objects, typically built by
 *  lib/progression.js's reviewPoolFor(). */
export function generateBatch(operation, table, batch, node, { unlockBatch, reviewPool } = {}) {
  const sequence = makeFactSequence() // [0,1,2,0,2,1,...] — 12 items, each 4x, no consecutive

  if (node === 'review') {
    return generateReview(operation, table, batch, reviewPool || [], sequence)
  }

  // Resolve which (operation, table, batch) to pull facts FROM
  const sourceBatch = (node === 'unlock' && unlockBatch)
    ? unlockBatch
    : { operation, table, batch }

  const facts = factsForBatch(sourceBatch.batch)

  return sequence.map(factIdx => {
    const second = facts[factIdx]
    if (node === 'practice') {
      return practiceQuestion(sourceBatch.operation, sourceBatch.table, second)
    } else {
      // 'unlock', 'learn', 'speed', 'real_life' → appropriate question type
      if (node === 'real_life') {
        return realLifeQuestion(sourceBatch.operation, sourceBatch.table, second)
      }
      return plainEquationQuestion(sourceBatch.operation, sourceBatch.table, second)
    }
  })
}

/** Review generates 12 questions from the accumulated pool of past batches,
 *  mixing both plain-equation and word-problem formats for variety.
 *  If the pool is empty (very first session), falls back to today's facts. */
function generateReview(operation, table, batch, reviewPool, sequence) {
  const allBatches = reviewPool.length > 0
    ? reviewPool
    : [{ operation, table, batch }]

  // Pick 3 "review facts" drawn from the pool: distribute the 3 fact slots
  // across different past batches where possible for maximum variety.
  const pickedBatches = [
    allBatches[randInt(0, allBatches.length - 1)],
    allBatches[randInt(0, allBatches.length - 1)],
    allBatches[randInt(0, allBatches.length - 1)],
  ]

  const reviewFacts = pickedBatches.map(b => {
    const facts = factsForBatch(b.batch)
    return { operation: b.operation, table: b.table, second: facts[randInt(0, 2)] }
  })

  // Alternate question format: even index = plain equation, odd = real-life
  // word problem. Gives exactly 6 of each across 12 questions, so review
  // genuinely feels like a MIX and not just more equations.
  return sequence.map((factIdx, i) => {
    const { operation: op, table: t, second } = reviewFacts[factIdx]
    if (i % 2 === 0) {
      return plainEquationQuestion(op, t, second)
    } else {
      return realLifeQuestion(op, t, second)
    }
  })
}
