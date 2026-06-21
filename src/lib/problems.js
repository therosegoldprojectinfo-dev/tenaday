// ── Problem generation ───────────────────────────────────────────────────
// Implements spec §4 (hard rules) and §5 (stage definitions: plain equation,
// situation/word problem, speed round). Speed round uses the exact same
// difficulty/generation as the table — only the UI (5s per-question
// countdown) differs, which lives in Practice.jsx, not here.

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
// Pure numeric core, shared by all 3 stages so the *difficulty* is always
// identical within a table — only the presentation differs (spec §5).

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
// Small rotating cast of names/objects so stage 2 doesn't feel repetitive.
// Kept simple/short on purpose — spec calls for near-zero reading load.

const NAMES = ['Tom', 'Mia', 'Sam', 'Lina', 'Eli', 'Noa', 'Zoe', 'Kai']
const OBJECTS = ['apples', 'stickers', 'marbles', 'coins', 'shells', 'blocks', 'cars', 'stars']

function wordProblemText(operation, a, b) {
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

function makeProblem(operation, table, stage) {
  const { a, b, answer } = coreValues(operation, table)
  const text =
    stage === 'word_problem'
      ? wordProblemText(operation, a, b)
      : equationText(operation, a, b) // 'equation' and 'speed_round' share plain-equation text

  return { text, answer }
}

/** Generates a 10-question batch for the given operation/table/stage.
 *  `stage` is one of 'equation' | 'word_problem' | 'speed_round'. */
export function generateBatch(operation = 'addition', table = 1, stage = 'equation', count = 10) {
  return Array.from({ length: count }, () => {
    const { text, answer } = makeProblem(operation, table, stage)
    return { text, answer, choices: shuffle([...buildDistractors(answer), answer]) }
  })
}
