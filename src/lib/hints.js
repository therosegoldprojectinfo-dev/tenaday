// ── hints.js — Smart hint engine v1 ──────────────────────────────────────
//
// Generates personalized hints based on:
//   - operation (addition, subtraction, multiplication, division)
//   - a, b (the actual numbers in the question)
//   - answer (the correct answer)
//   - wrongAnswer (what the kid typed/selected)
//
// Hints are specific, encouraging, and never reveal the answer directly.
// They guide the kid toward the right thinking process.

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Finger counting visual helper ─────────────────────────────────────────
// Shows counting steps like "1... 2... 3!"
function countUp(from, steps) {
  const parts = []
  for (let i = 1; i <= steps; i++) {
    parts.push(from + i)
  }
  return parts.map((n, i) => i === parts.length - 1 ? `${n}!` : `${n}...`).join(' ')
}

function countDown(from, steps) {
  const parts = []
  for (let i = 1; i <= steps; i++) {
    parts.push(from - i)
  }
  return parts.map((n, i) => i === parts.length - 1 ? `${n}!` : `${n}...`).join(' ')
}

function skipCount(step, times) {
  const parts = []
  for (let i = 1; i <= Math.min(times, 5); i++) {
    parts.push(step * i)
  }
  return parts.map((n, i) => i === parts.length - 1 ? `${n}!` : `${n}...`).join(' ')
}

// ── Diagnose the error type ────────────────────────────────────────────────
function diagnoseError(operation, a, b, answer, wrongAnswer) {
  if (wrongAnswer === null || wrongAnswer === undefined) return 'no_answer'
  const diff = wrongAnswer - answer
  switch (operation) {
    case 'addition':
      if (wrongAnswer === a)       return 'forgot_to_add'       // answered just a
      if (wrongAnswer === b)       return 'forgot_to_add'       // answered just b
      if (Math.abs(diff) === 1)    return 'off_by_one'
      if (wrongAnswer === a - b || wrongAnswer === b - a) return 'subtracted_instead'
      if (wrongAnswer === a * b)   return 'multiplied_instead'
      return 'general'

    case 'subtraction':
      if (Math.abs(diff) === 1)    return 'off_by_one'
      if (wrongAnswer === a + b)   return 'added_instead'
      if (wrongAnswer === b - a)   return 'reversed'            // subtracted backwards
      if (wrongAnswer === a * b)   return 'multiplied_instead'
      return 'general'

    case 'multiplication':
      if (Math.abs(diff) === a)    return 'off_by_one_group'    // one group too many/few
      if (Math.abs(diff) === b)    return 'off_by_one_group'
      if (wrongAnswer === a + b)   return 'added_instead'
      if (wrongAnswer === a * b + a || wrongAnswer === a * b - a) return 'off_by_one_group'
      return 'general'

    case 'division':
      if (Math.abs(diff) === 1)    return 'off_by_one'
      if (wrongAnswer === a - b)   return 'subtracted_instead'
      if (wrongAnswer === a * b)   return 'multiplied_instead'
      return 'general'

    default:
      return 'general'
  }
}

// ── Addition hints ─────────────────────────────────────────────────────────
function hintAddition(a, b, answer, wrongAnswer) {
  const errorType = diagnoseError('addition', a, b, answer, wrongAnswer)
  const bigger = Math.max(a, b)
  const smaller = Math.min(a, b)

  switch (errorType) {
    case 'off_by_one':
      return pick([
        `Almost! Start at ${bigger}, then count ${smaller} more finger${smaller > 1 ? 's' : ''}: ${countUp(bigger, smaller)}`,
        `So close! Put ${bigger} in your head, then count up ${smaller}: ${countUp(bigger, smaller)}`,
      ])

    case 'forgot_to_add':
      return pick([
        `Don't forget to add both numbers! ${a} + ${b} means ${a} AND ${b} more 🖐️`,
        `You need to combine both! Start at ${bigger} and count up ${smaller} more.`,
      ])

    case 'subtracted_instead':
      return pick([
        `The + sign means we ADD, not subtract! Start at ${bigger} and count UP ${smaller}: ${countUp(bigger, smaller)}`,
        `We're adding here — that means the answer will be BIGGER than ${bigger}! Count up ${smaller} more.`,
      ])

    case 'multiplied_instead':
      return `We're adding, not multiplying! Just count up ${smaller} from ${bigger}: ${countUp(bigger, smaller)}`

    default:
      return pick([
        `Start at ${bigger} and count up ${smaller} more on your fingers: ${countUp(bigger, smaller)}`,
        `Put ${bigger} in your head ✊ then add ${smaller} fingers: ${countUp(bigger, smaller)}`,
        `${bigger} + ${smaller}: start at ${bigger}, go up ${smaller} steps: ${countUp(bigger, smaller)}`,
      ])
  }
}

// ── Subtraction hints ──────────────────────────────────────────────────────
function hintSubtraction(a, b, answer, wrongAnswer) {
  const errorType = diagnoseError('subtraction', a, b, answer, wrongAnswer)

  switch (errorType) {
    case 'off_by_one':
      return pick([
        `Almost! Start at ${a} and count back ${b} steps: ${countDown(a, b)}`,
        `So close! Count backwards from ${a}, taking away ${b}: ${countDown(a, b)}`,
      ])

    case 'added_instead':
      return pick([
        `The − sign means we TAKE AWAY! Start at ${a} and count DOWN ${b}: ${countDown(a, b)}`,
        `Subtraction means the answer is SMALLER! Start at ${a}, go back ${b}: ${countDown(a, b)}`,
      ])

    case 'reversed':
      return pick([
        `Careful — we start at the BIG number! Start at ${a}, not ${b}: ${countDown(a, b)}`,
        `Always start with the first number (${a}) and take away the second (${b}): ${countDown(a, b)}`,
      ])

    case 'multiplied_instead':
      return `We're subtracting, not multiplying! Start at ${a} and count back ${b}: ${countDown(a, b)}`

    default:
      return pick([
        `Start at ${a} and count backwards ${b} steps: ${countDown(a, b)}`,
        `Put ${a} in your head, then take away ${b} fingers: ${countDown(a, b)}`,
        `${a} − ${b}: jump back ${b} from ${a}: ${countDown(a, b)}`,
      ])
  }
}

// ── Multiplication hints ───────────────────────────────────────────────────
function hintMultiplication(a, b, answer, wrongAnswer) {
  const errorType = diagnoseError('multiplication', a, b, answer, wrongAnswer)
  const smaller = Math.min(a, b)
  const bigger = Math.max(a, b)

  switch (errorType) {
    case 'off_by_one_group':
      return pick([
        `Almost! You had the right idea but missed one group. Try skip counting by ${smaller}: ${skipCount(smaller, bigger)}`,
        `So close! Count ${bigger} groups of ${smaller}: ${skipCount(smaller, bigger)}`,
      ])

    case 'added_instead':
      return pick([
        `${a} × ${b} isn't ${a} + ${b}! It means ${b} groups of ${a}. Skip count by ${smaller}: ${skipCount(smaller, bigger)}`,
        `Multiplication means GROUPS! ${a} × ${b} = ${b} lots of ${a}. Count: ${skipCount(smaller, bigger)}`,
      ])

    default:
      return pick([
        `Think of ${a} × ${b} as ${b} groups of ${a}. Count by ${smaller}s: ${skipCount(smaller, bigger)}`,
        `Skip count by ${smaller}, ${bigger} times: ${skipCount(smaller, bigger)}`,
        `Imagine ${b} bags with ${a} items in each. Count: ${skipCount(smaller, bigger)}`,
      ])
  }
}

// ── Division hints ─────────────────────────────────────────────────────────
function hintDivision(a, b, answer, wrongAnswer) {
  const errorType = diagnoseError('division', a, b, answer, wrongAnswer)

  switch (errorType) {
    case 'off_by_one':
      return pick([
        `Almost! How many times does ${b} fit into ${a}? Count: ${skipCount(b, answer)}... that's ${answer} times!`,
        `So close! Try sharing ${a} things equally into groups of ${b}: you get ${answer} each.`,
      ])

    case 'subtracted_instead':
      return `Division means sharing equally, not subtracting! How many groups of ${b} fit in ${a}? Count by ${b}s: ${skipCount(b, answer)}`

    case 'multiplied_instead':
      return `Division is the OPPOSITE of multiplication! What times ${b} gives you ${a}? Think: ${b} × ? = ${a}`

    default:
      return pick([
        `How many times does ${b} fit into ${a}? Count by ${b}s: ${skipCount(b, answer)}`,
        `Share ${a} equally into groups of ${b}. Count by ${b}s until you reach ${a}: ${skipCount(b, answer)}`,
        `Think backwards: what number × ${b} = ${a}? Try counting: ${skipCount(b, answer)}`,
      ])
  }
}

// ── Word problem hints ─────────────────────────────────────────────────────
function hintWordProblem(operation, a, b, answer, wrongAnswer) {
  const opHints = {
    addition: [
      `Read again — things are being ADDED together! Use ${a} + ${b}.`,
      `The story is combining things — that means addition! Count up from ${Math.max(a,b)}.`,
    ],
    subtraction: [
      `Read again — something is being TAKEN AWAY! Use ${a} − ${b}.`,
      `The story is removing things — that means subtraction! Count down from ${a}.`,
    ],
    multiplication: [
      `There are GROUPS of equal size — that means multiplication! Try ${a} × ${b}.`,
      `Equal groups = multiplication! Think: ${b} groups of ${a}.`,
    ],
    division: [
      `Things are being SHARED equally — that means division! Try ${a} ÷ ${b}.`,
      `Equal sharing = division! Split ${a} into ${b} equal groups.`,
    ],
  }
  return pick(opHints[operation] || opHints.addition)
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Generate a smart, personalized hint.
 *
 * @param {object} params
 * @param {string} params.operation  - 'addition' | 'subtraction' | 'multiplication' | 'division'
 * @param {number} params.a          - First number in the equation
 * @param {number} params.b          - Second number in the equation
 * @param {number} params.answer     - Correct answer
 * @param {*}      params.wrongAnswer - What the kid answered (null if no answer given)
 * @param {boolean} params.isWordProblem - Whether this was a word problem
 * @returns {string} A personalized hint string
 */
export function generateHint({ operation, a, b, answer, wrongAnswer, isWordProblem = false }) {
  // If it's a word problem, give a situational hint first
  if (isWordProblem) {
    return hintWordProblem(operation, a, b, answer, wrongAnswer)
  }

  switch (operation) {
    case 'addition':       return hintAddition(a, b, answer, wrongAnswer)
    case 'subtraction':    return hintSubtraction(a, b, answer, wrongAnswer)
    case 'multiplication': return hintMultiplication(a, b, answer, wrongAnswer)
    case 'division':       return hintDivision(a, b, answer, wrongAnswer)
    default:               return hintAddition(a, b, answer, wrongAnswer)
  }
}
