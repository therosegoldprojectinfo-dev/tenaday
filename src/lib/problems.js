// ── Problem generation ───────────────────────────────────────────────────
// Implements spec §4 (hard rules: no negative subtraction, no division
// remainders) across the 6-node Numio Daily Loop (spec §6.5):
//
//   unlock     — tests the PREVIOUS table's material (plain equations),
//                not the current table's. Caller must resolve the
//                previous table via lib/progression.js's previousTable()
//                and pass it in explicitly — this module never guesses.
//   learn      — 1–3 new facts for THIS table, plain equation form
//   practice   — same facts, word-problem phrasing (different format)
//   real_life  — applied/word problems, same phrasing style as practice
//                but framed as more clearly "real world" — kept as a
//                distinct text style so the two don't feel identical
//   speed      — plain equations, same as learn; the 5s/question
//                countdown is a Practice.jsx UI concern, not a content
//                difference
//   review     — spaced mix: caller passes a list of past (operation,
//                table) pairs to mix together, picked at the screen level
//                so this module doesn't need its own "history" concept

import { previousTable } from './progression'

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

function buildDistractors(answer, count = 3) {
  const used = new Set([answer])
  const out = []
  let tries = 0
  while (out.length < count && tries < 100) {
    tries++
    const offset = randInt(1, 5) * (Math.random() < 0.5 ? 1 : -1)
    const d = answer + offset
    if (d > 0 && !used.has(d)) {
      used.add(d)
      out.push(d)
    }
  }
  // Fallback for edge cases (very small answers with few valid distractors)
  let pad = 1
  while (out.length < count) {
    const d = answer + count + pad++
    if (!used.has(d)) { used.add(d); out.push(d) }
  }
  return out
}

// ── Core (operation, table) -> {a, b, answer} ──────────────────────────
// Pure numeric core, shared by every node type so the *difficulty* is
// always identical within a table — only the presentation differs.

function coreValues(operation, table) {
  if (operation === 'addition') {
    const b = randInt(1, 12)
    return { a: table, b, answer: table + b }
  }
  if (operation === 'subtraction') {
    // table is the subtrahend; a >= table ensures non-negative result (spec §4)
    const a = table + randInt(0, 12)
    return { a, b: table, answer: a - table }
  }
  if (operation === 'multiplication') {
    const b = randInt(1, 12)
    return { a: table, b, answer: table * b }
  }
  if (operation === 'division') {
    // Pick a multiplier so the quotient is always whole (spec §4)
    const b = randInt(1, 12)
    return { a: table * b, b: table, answer: b }
  }
  const b = randInt(1, 12)
  return { a: table, b, answer: table + b }
}

const SYMBOL = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' }

function equationText(operation, a, b) {
  return `${a} ${SYMBOL[operation]} ${b} = ?`
}

// ── Word problem phrasing ───────────────────────────────────────────────
// Two distinct phrasing pools — 'practice' format and 'real_life' format —
// so those two nodes don't feel like the exact same content twice, even
// though both ultimately test the same underlying facts (per spec: same
// facts, "shown in a different format").

const NAMES = ['Tom', 'Mia', 'Sam', 'Lina', 'Eli', 'Noa', 'Zoe', 'Kai']
const OBJECTS = ['apples', 'stickers', 'marbles', 'coins', 'shells', 'blocks', 'cars', 'stars']
const REAL_LIFE_PLACES = ['the store', 'school', 'the park', 'home', 'the market']

function practiceFormatText(operation, a, b) {
  const name = NAMES[randInt(0, NAMES.length - 1)]
  const obj = OBJECTS[randInt(0, OBJECTS.length - 1)]

  if (operation === 'addition') {
    return `${name} has ${a} ${obj} and gets ${b} more. How many ${obj} now?`
  }
  if (operation === 'subtraction') {
    return `${name} has ${a} ${obj} and gives away ${b}. How many ${obj} are left?`
  }
  if (operation === 'multiplication') {
    return `${name} has ${a} bags with ${b} ${obj} in each. How many ${obj} in total?`
  }
  if (operation === 'division') {
    return `${name} has ${a} ${obj} split evenly into ${b} bags. How many ${obj} per bag?`
  }
  return equationText(operation, a, b)
}

function realLifeFormatText(operation, a, b) {
  const name = NAMES[randInt(0, NAMES.length - 1)]
  const obj = OBJECTS[randInt(0, OBJECTS.length - 1)]
  const place = REAL_LIFE_PLACES[randInt(0, REAL_LIFE_PLACES.length - 1)]

  if (operation === 'addition') {
    return `At ${place}, ${name} buys ${a} ${obj}, then buys ${b} more. How many ${obj} did ${name} buy in total?`
  }
  if (operation === 'subtraction') {
    return `${name} brings ${a} ${obj} to ${place} and hands out ${b}. How many does ${name} still have?`
  }
  if (operation === 'multiplication') {
    return `At ${place}, ${a} friends each get ${b} ${obj}. How many ${obj} were given out altogether?`
  }
  if (operation === 'division') {
    return `At ${place}, ${a} ${obj} are shared equally among ${b} kids. How many ${obj} does each kid get?`
  }
  return equationText(operation, a, b)
}

function makeProblem(operation, table, node) {
  const { a, b, answer } = coreValues(operation, table)

  if (node === 'practice') return { text: practiceFormatText(operation, a, b), answer }
  if (node === 'real_life') return { text: realLifeFormatText(operation, a, b), answer }

  // 'unlock', 'learn', 'speed', or any unrecognized node falls back to
  // plain equation text — these are all "test the raw fact" nodes, not
  // word-problem nodes.
  return { text: equationText(operation, a, b), answer }
}

/** Generates a 10-question batch for the given operation/table/node.
 *
 *  IMPORTANT for 'unlock': the caller is responsible for resolving the
 *  PREVIOUS table via lib/progression.js's previousTable() and passing
 *  THAT operation/table here — this function does not look it up itself,
 *  so a caller that forgets will silently test the wrong table rather
 *  than fail loudly. (Kept this way rather than importing previousTable
 *  here directly, since the day-skip rule for table 1 of addition is a
 *  screen-level/product decision, not something this content-generation
 *  module should special-case on its own.)
 *
 *  For 'review': pass `reviewPool` — an array of {operation, table} pairs
 *  to mix together. Each of the 10 questions picks a random entry from
 *  the pool. If reviewPool is empty/omitted, falls back to the given
 *  operation/table alone (better than generating nothing). */
export function generateBatch(operation = 'addition', table = 1, node = 'learn', count = 10, reviewPool = []) {
  if (node === 'review' && reviewPool.length > 0) {
    return Array.from({ length: count }, () => {
      const pick = reviewPool[randInt(0, reviewPool.length - 1)]
      // Review mixes both presentation styles too, for variety across the
      // spaced-repetition mix (spec: "different formats of the same facts").
      const { a, b, answer } = coreValues(pick.operation, pick.table)
      const text = Math.random() < 0.5
        ? equationText(pick.operation, a, b)
        : practiceFormatText(pick.operation, a, b)
      return { text, answer, choices: shuffle([...buildDistractors(answer), answer]) }
    })
  }

  return Array.from({ length: count }, () => {
    const { text, answer } = makeProblem(operation, table, node)
    return { text, answer, choices: shuffle([...buildDistractors(answer), answer]) }
  })
}

// Re-exported here purely for convenience so screens that already import
// from lib/problems.js for batch generation don't need a second import
// just to resolve the Unlock node's target table.
export { previousTable }
