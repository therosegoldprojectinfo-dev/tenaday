// ── problems.js — Numio question engine v3 ────────────────────────────────
//
// 50 question formats across 4 difficulty tiers:
//
// EASY (13 types):
//   classic, word, missing_forward, missing_backward, numberline,
//   direct_answer, fact_family, equation_swap, split_number,
//   over_under, estimation, visual_groups, make_ten
//
// MEDIUM (15 types):
//   truefalse, comparison, hidden_operation, reverse_thinking,
//   context_switch, correct_pair, same_result, reorder_same,
//   doubles_check, story_missing, story_compare, before_after,
//   missing_middle, biggest_sum, story_leftover
//
// HARD (15 types):
//   fill_operation, multistep, error_detection, pattern_completion,
//   broken_equation, odd_one_out, chain_reverse, next_in_sequence,
//   confirm_all, closest_to, two_truths, missing_result,
//   story_share, times_check, opposite_trap
//
// DOUBLE REWARD (7 types):
//   speed_recall, rapid_fire, order_results, double_missing,
//   build_equation, which_faster, final_boss
//
// REVIEW: random mix of all 50
//
// Timed types: classic, direct_answer, fact_family, equation_swap,
//   over_under, make_ten, reorder_same, doubles_check,
//   speed_recall, rapid_fire, build_equation, which_faster, final_boss
//
// Font: same small size for all questions (set in Practice.jsx)

import { factsForBatch } from './progression'

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
  const candidates = []
  candidates.push(answer + 1, answer - 1, answer + 2, answer - 2)
  if (operation === 'multiplication') {
    candidates.push(table + fact, (table + 1) * fact, (table - 1) * fact,
      table * (fact + 1), table * (fact - 1))
  }
  if (operation === 'addition') candidates.push(table + fact - 1, table, fact)
  if (operation === 'subtraction') candidates.push(table + fact + fact, answer + table)
  if (operation === 'division') candidates.push(table * fact, fact + 1, fact - 1)
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

// ── Safe choices builder ───────────────────────────────────────────────────
// Always guarantees the correct answer is in the list, handles 0 answers,
// deduplicates, and returns exactly 4 choices.
function safeChoices(answer, distractors) {
  const used = new Set([answer])
  const out = [answer]
  for (const d of distractors) {
    if (!used.has(d)) { used.add(d); out.push(d) }
    if (out.length === 4) break
  }
  // Fallback padding
  let pad = 1
  while (out.length < 4) {
    const d = answer + pad
    if (!used.has(d)) { used.add(d); out.push(d) }
    pad++
  }
  return shuffle(out.slice(0, 4))
}


// ── Names & word templates ─────────────────────────────────────────────────

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

function randomWordProblem(operation, a, b) {
  return WORD_TEMPLATES[operation]?.(a, b) || `${a} ${SYMBOL[operation]} ${b} = ?`
}

const EMOJI_OBJECTS = ['⚽', '🍎', '⭐', '🎈', '🍕', '🐾', '🌸', '🎯', '🍦', '🦋']

// ── Fact sequence ──────────────────────────────────────────────────────────

function makeFactSequence(n = 12) {
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

// ══════════════════════════════════════════════════════════════════════════
// EASY (13 types)
// ══════════════════════════════════════════════════════════════════════════

// 1. classic ✅ timed
function q_classic(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `${a} ${sym} ${b} = ?`,
    answer, choiceType: 'number',
    choices: shuffle([answer, ...smartDistractors(operation, table, fact, answer)]),
    format: 'classic', isTimed: true,
  }
}

// 2. word ❌
function q_word(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  return {
    text: randomWordProblem(operation, a, b),
    answer, choiceType: 'number',
    choices: shuffle([answer, ...smartDistractors(operation, table, fact, answer)]),
    format: 'word', isTimed: false,
  }
}

// 3. missing_forward ❌
function q_missing_forward(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `${a} ${sym} ___ = ${answer}`,
    answer: b, choiceType: 'number',
    choices: shuffle([b, ...smartDistractors(operation, table, fact, b)]),
    format: 'missing_forward', isTimed: false,
  }
}

// 4. missing_backward ❌
function q_missing_backward(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `___ ${sym} ${b} = ${answer}`,
    answer: a, choiceType: 'number',
    choices: shuffle([a, ...smartDistractors(operation, table, fact, a)]),
    format: 'missing_backward', isTimed: false,
  }
}

// 5. numberline ❌
function q_numberline(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `Start at ${a}, move ${sym}${b}. Where do you land?`,
    answer, choiceType: 'number',
    choices: shuffle([answer, ...smartDistractors(operation, table, fact, answer)]),
    format: 'numberline', isTimed: false,
  }
}

// 6. direct_answer ✅ timed
function q_direct_answer(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `${a} ${sym} ${b} = ___`,
    answer, choiceType: 'number',
    choices: shuffle([answer, ...smartDistractors(operation, table, fact, answer)]),
    format: 'direct_answer', isTimed: true,
  }
}

// 7. fact_family ✅ timed
function q_fact_family(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `${a} ${sym} ${b} = ${answer}. So ${b} ${sym} ___ = ${answer}`,
    answer: a, choiceType: 'number',
    choices: shuffle([a, ...smartDistractors(operation, table, fact, a)]),
    format: 'fact_family', isTimed: true,
  }
}

// 8. equation_swap ✅ timed
function q_equation_swap(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `${answer} = ${a} ${sym} ___`,
    answer: b, choiceType: 'number',
    choices: shuffle([b, ...smartDistractors(operation, table, fact, b)]),
    format: 'equation_swap', isTimed: true,
  }
}

// 9. split_number ❌
function q_split_number(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `${answer} = ${a} ${sym} ?`,
    answer: b, choiceType: 'number',
    choices: shuffle([b, ...smartDistractors(operation, table, fact, b)]),
    format: 'split_number', isTimed: false,
  }
}

// 10. over_under ✅ timed
function q_over_under(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const ref = Math.round(answer / 5) * 5 // nearest 5
  const isMore = answer >= ref
  return {
    text: `Is ${a} ${sym} ${b} more or less than ${ref}?`,
    answer: isMore ? 'More' : 'Less',
    choiceType: 'truefalse',
    choices: ['More', 'Less'],
    format: 'over_under', isTimed: true,
  }
}

// 11. estimation ❌
function q_estimation(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const low = Math.floor(answer / 10) * 10
  const high = low + 10
  const closer = (answer - low) <= (high - answer) ? low : high
  return {
    text: `Is ${a} ${sym} ${b} closer to ${low} or ${high}?`,
    answer: String(closer), choiceType: 'truefalse',
    choices: [String(low), String(high)],
    format: 'estimation', isTimed: false,
  }
}

// 12. visual_groups ❌
function q_visual_groups(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const emoji = pick(EMOJI_OBJECTS)
  const groupA = emoji.repeat(Math.min(a, 8))
  const groupB = emoji.repeat(Math.min(b, 8))
  return {
    text: `${groupA} ${sym} ${groupB} = ?`,
    answer, choiceType: 'number',
    choices: shuffle([answer, ...smartDistractors(operation, table, fact, answer)]),
    format: 'visual_groups', isTimed: false,
  }
}

// 13. make_ten ✅ timed
function q_make_ten(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  // Use the table as starting point, find what makes a round number
  const target = Math.ceil(answer / 10) * 10
  const missing = target - a
  if (missing <= 0 || missing > 12) {
    // fallback to classic if make_ten doesn't make sense
    return q_classic(operation, table, fact)
  }
  return {
    text: `${a} ${sym} ___ = ${target}`,
    answer: missing, choiceType: 'number',
    choices: shuffle([missing, ...smartDistractors(operation, table, fact, missing)]),
    format: 'make_ten', isTimed: true,
  }
}

// ══════════════════════════════════════════════════════════════════════════
// MEDIUM (15 types)
// ══════════════════════════════════════════════════════════════════════════

// 14. truefalse ❌
function q_truefalse(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const showCorrect = Math.random() < 0.5
  const shownAnswer = showCorrect ? answer : pick(smartDistractors(operation, table, fact, answer, 1))
  return {
    text: `${a} ${sym} ${b} = ${shownAnswer}`,
    answer: showCorrect ? 'True' : 'False',
    choiceType: 'truefalse', choices: ['True', 'False'],
    format: 'truefalse', isTimed: false,
  }
}

// 15. comparison ❌
function q_comparison(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const offset = pick([-2, -1, 1, 2])
  const altAnswer = Math.max(1, answer + offset)
  const altExpr = Math.random() < 0.5 ? `${a + offset} ${sym} ${b}` : `${a} ${sym} ${b + offset}`
  const mainExpr = `${a} ${sym} ${b}`
  const correctAnswer = answer > altAnswer ? mainExpr : altExpr
  return {
    text: `Which is bigger?`,
    answer: correctAnswer, choiceType: 'comparison',
    choices: [mainExpr, altExpr],
    format: 'comparison', isTimed: false,
  }
}

// 16. hidden_operation ❌
function q_hidden_operation(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `What number completes this?\n${answer} = ${b} ${sym} ___`,
    answer: a, choiceType: 'number',
    choices: shuffle([a, ...smartDistractors(operation, table, fact, a)]),
    format: 'hidden_operation', isTimed: false,
  }
}

// 17. reverse_thinking ❌
function q_reverse_thinking(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  // Always stays within the same operation — asks for the missing first number
  return {
    text: `If ___ ${sym} ${b} = ${answer}, what is ___?`,
    answer: a, choiceType: 'number',
    choices: shuffle([a, ...smartDistractors(operation, table, fact, a)]),
    format: 'reverse_thinking', isTimed: false,
  }
}

// 18. context_switch ❌
function q_context_switch(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const templates = {
    addition: [`You spend ${a}€, then ${b}€ more. Total spent?`,
               `${a} km walked in the morning, ${b} km in afternoon. Total?`,
               `${a} points in round 1, ${b} in round 2. Total points?`],
    subtraction: [`You have ${a}€ and pay ${b}€. Change left?`,
                  `${a} seats, ${b} taken. Free seats?`,
                  `Started with ${a} lives, lost ${b}. Lives left?`],
    multiplication: [`${a} days, ${b} hours each. Total hours?`,
                     `${a} weeks, ${b} days each. Total days?`],
    division: [`${a}€ split ${b} ways. Each share?`,
               `${a} km in ${b} equal trips. Each trip?`],
  }
  const t = templates[operation] || templates.addition
  return {
    text: pick(t),
    answer, choiceType: 'number',
    choices: shuffle([answer, ...smartDistractors(operation, table, fact, answer)]),
    format: 'context_switch', isTimed: false,
  }
}

// 19. correct_pair ❌
function q_correct_pair(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  // One correct option + 3 wrong ones
  const correct = `${a} ${sym} ${b}`
  const wrongs = smartDistractors(operation, table, fact, answer, 3).map(w => {
    const offset = w - answer
    return `${a + Math.floor(offset/2)} ${sym} ${b + Math.ceil(offset/2)}`
  })
  const choices = shuffle([correct, ...wrongs])
  return {
    text: `Which equals ${answer}?`,
    answer: correct, choiceType: 'expression',
    choices,
    format: 'correct_pair', isTimed: false,
  }
}

// 20. same_result ❌
function q_same_result(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  // Different expression with same answer
  const altA = a + 1, altB = b - 1
  const correct = altB > 0 ? `${altA} ${sym} ${altB}` : `${a} ${sym} ${b}`
  const wrongs = smartDistractors(operation, table, fact, answer, 3).map(w => {
    return `${a + 1} ${sym} ${w - a - 1 > 0 ? w - a - 1 : b + 1}`
  })
  const choices = shuffle([correct, ...wrongs])
  return {
    text: `Which also equals ${answer}?`,
    answer: correct, choiceType: 'expression',
    choices,
    format: 'same_result', isTimed: false,
  }
}

// 21. reorder_same ✅ timed
function q_reorder_same(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `${a} ${sym} ${b} = ${answer}. Is ${b} ${sym} ${a} also ${answer}?`,
    answer: 'Yes', choiceType: 'truefalse',
    choices: ['Yes', 'No'],
    format: 'reorder_same', isTimed: true,
  }
}

// 22. doubles_check ✅ timed
function q_doubles_check(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const half = Math.floor(answer / 2)
  const doubleExpr = `${half} ${sym} ${half}`
  const sameResult = half + half === answer
  return {
    text: `Is ${doubleExpr} the same as ${a} ${sym} ${b}?`,
    answer: sameResult ? 'Yes' : 'No',
    choiceType: 'truefalse', choices: ['Yes', 'No'],
    format: 'doubles_check', isTimed: true,
  }
}

// 23. story_missing ❌
function q_story_missing(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const n = name()
  const templates = {
    addition: `${n} had ___ items and got ${b} more. Now has ${answer}. How many did ${n} start with?`,
    subtraction: `${n} had ${answer} and gave away ${b}. How many were left?`,
    multiplication: `${n} has ___ bags with ${b} items each. Total is ${answer}. How many bags?`,
    division: `${answer} items split into groups of ${b}. How many groups?`,
  }
  return {
    text: templates[operation] || templates.addition,
    answer: a, choiceType: 'number',
    choices: shuffle([a, ...smartDistractors(operation, table, fact, a)]),
    format: 'story_missing', isTimed: false,
  }
}

// 24. story_compare ❌
function q_story_compare(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const n = name(), n2 = name2(n)
  // Ensure a != b so diff > 0 and question makes sense
  const safeA = a === b ? a + 1 : a
  const diff = Math.abs(safeA - b)
  const bigger = safeA > b ? n : n2
  return {
    text: `${n} has ${safeA} points and ${n2} has ${b}. How many more does ${bigger} have?`,
    answer: diff, choiceType: 'number',
    choices: safeChoices(diff, [diff + 1, diff + 2, diff + 3]),
    format: 'story_compare', isTimed: false,
  }
}

// 25. before_after ❌
function q_before_after(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const prevA = a - 1
  const prevAnswer = prevA > 0 ? factValues(operation, prevA, b).answer : answer - 1
  return {
    text: `${a} ${sym} ${b} = ${answer}. What is ${prevA} ${sym} ${b}?`,
    answer: prevAnswer, choiceType: 'number',
    choices: safeChoices(prevAnswer, [prevAnswer + 1, prevAnswer + 2, prevAnswer + 3]),
    format: 'before_after', isTimed: false,
  }
}

// 26. missing_middle ❌
function q_missing_middle(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  // Always use a+1 on the left side so missing = b-1 (always > 0 since b >= 1)
  const altA = a + 1
  const missing = answer - altA  // = b - 1
  if (missing <= 0) {
    // fallback: use a-1 approach only if a > 1
    if (a > 1) {
      const altA2 = a - 1
      const missing2 = answer - altA2 // = b + 1
      return {
        text: `${a} ${sym} ${b} = ${altA2} ${sym} ___`,
        answer: missing2, choiceType: 'number',
        choices: safeChoices(missing2, [missing2 + 1, missing2 + 2, missing2 - 1]),
        format: 'missing_middle', isTimed: false,
      }
    }
    // If a=1 and b=1, just ask equation_swap style
    return q_equation_swap(operation, table, fact)
  }
  return {
    text: `${a} ${sym} ${b} = ${altA} ${sym} ___`,
    answer: missing, choiceType: 'number',
    choices: safeChoices(missing, [missing + 1, missing + 2, missing + 3]),
    format: 'missing_middle', isTimed: false,
  }
}

// 27. biggest_sum ❌
function q_biggest_sum(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const main = `${a} ${sym} ${b}`
  // Always use smaller values for the wrong options so main is clearly biggest
  const alt1 = `${Math.max(1, a - 1)} ${sym} ${b}`
  const alt2 = `${a} ${sym} ${Math.max(1, b - 1)}`
  const alt3 = `${Math.max(1, a - 1)} ${sym} ${Math.max(1, b - 1)}`
  // Dedupe: if any alt equals main (when a=1 or b=1), offset differently
  const safeAlt = (expr, fallbackOffset) => expr === main ? `${a} ${sym} ${b + fallbackOffset}` : expr
  const choices = shuffle([main, safeAlt(alt1, 2), safeAlt(alt2, 3), safeAlt(alt3, 4)])
  return {
    text: `Which gives the biggest answer?`,
    answer: main, choiceType: 'expression',
    choices: [...new Set(choices)].slice(0, 4), // dedupe just in case
    format: 'biggest_sum', isTimed: false,
  }
}

// 28. story_leftover ❌
function q_story_leftover(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const n = name()
  const item = pick(['seats', 'points', 'coins', 'cards'])
  const templates = {
    addition: `${n} has ${a} ${item} and gets ${b} more. Total ${item}?`,
    subtraction: `${n} had ${answer} ${item} and used ${b}. How many left?`,
    multiplication: `${a} rows of ${b} ${item}. Total?`,
    division: `${answer} ${item} split ${b} ways. Each share?`,
  }
  return {
    text: templates[operation] || templates.addition,
    answer: answer, choiceType: 'number',
    choices: safeChoices(answer, smartDistractors(operation, table, fact, answer)),
    format: 'story_leftover', isTimed: false,
  }
}

// ══════════════════════════════════════════════════════════════════════════
// HARD (15 types)
// ══════════════════════════════════════════════════════════════════════════

// 29. fill_operation ❌
function q_fill_operation(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const otherOps = Object.entries(SYMBOL).filter(([op]) => op !== operation).map(([,s]) => s)
  return {
    text: `${a} ___ ${b} = ${answer}`,
    answer: sym, choiceType: 'expression',
    choices: shuffle([sym, ...otherOps.slice(0, 3)]),
    format: 'fill_operation', isTimed: false,
  }
}

// 30. multistep ❌
function q_multistep(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const c = randInt(1, 5)
  const finalAnswer = operation === 'addition' ? answer + c
    : operation === 'subtraction' ? Math.max(1, answer - c)
    : answer
  const operator2 = operation === 'addition' ? '+' : operation === 'subtraction' ? '−' : '+'
  const displayC = operation === 'subtraction' ? c : c
  return {
    text: `${a} ${sym} ${b} ${operator2} ${displayC} = ?`,
    answer: finalAnswer, choiceType: 'number',
    choices: safeChoices(finalAnswer, [finalAnswer + 1, finalAnswer + 2, finalAnswer - 1, finalAnswer + 3]),
    format: 'multistep', isTimed: false,
  }
}

// 31. error_detection ❌
function q_error_detection(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  // Build 4 distinct equations using different fact combos, one has wrong answer
  const wrongIdx = randInt(0, 3)
  const variants = [
    { na: a, nb: b },
    { na: a + 1, nb: b },
    { na: a, nb: b + 1 },
    { na: a + 1, nb: b + 1 },
  ]
  const options = variants.map(({ na, nb }, i) => {
    const correctAns = factValues(operation, na, nb).answer
    const displayAns = i === wrongIdx ? correctAns + 1 : correctAns
    return `${na} ${sym} ${nb} = ${displayAns}`
  })
  const wrongAnswer = options[wrongIdx]
  return {
    text: `Which one is WRONG?`,
    answer: wrongAnswer, choiceType: 'expression',
    choices: options,
    format: 'error_detection', isTimed: false,
  }
}

// 32. pattern_completion ❌
function q_pattern_completion(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const next = factValues(operation, a + 1, b).answer
  const nextNext = factValues(operation, a + 2, b).answer
  return {
    text: `${a} ${sym} ${b} = ${answer}\n${a+1} ${sym} ${b} = ${next}\n${a+2} ${sym} ${b} = ?`,
    answer: nextNext, choiceType: 'number',
    choices: safeChoices(nextNext, [nextNext + 1, nextNext - 1, nextNext + 2]),
    format: 'pattern_completion', isTimed: false,
  }
}

// 33. broken_equation ❌
function q_broken_equation(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const wrongAnswer = pick(smartDistractors(operation, table, fact, answer, 1))
  const options = ['Change first number', 'Change second number', 'Change the answer', 'It is correct']
  return {
    text: `${a} ${sym} ${b} = ${wrongAnswer}\nHow to fix it?`,
    answer: 'Change the answer', choiceType: 'expression',
    choices: options,
    format: 'broken_equation', isTimed: false,
  }
}

// 34. odd_one_out ❌
function q_odd_one_out(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  // 3 equal results, 1 different
  const wrongAnswer = pick(smartDistractors(operation, table, fact, answer, 1))
  const eq1 = `${a} ${sym} ${b}`
  const eq2 = a > 0 && b > 1 ? `${a+1} ${sym} ${b-1}` : `${a} ${sym} ${b}`
  const eq3 = a > 1 ? `${a-1} ${sym} ${b+1}` : `${a} ${sym} ${b}`
  const eqWrong = `${a+1} ${sym} ${b+1}`
  const choices = shuffle([eq1, eq2, eq3, eqWrong])
  return {
    text: `Which does NOT equal ${answer}?`,
    answer: eqWrong, choiceType: 'expression',
    choices,
    format: 'odd_one_out', isTimed: false,
  }
}

// 35. chain_reverse ❌
function q_chain_reverse(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const invSym = operation === 'addition' ? '−' : operation === 'multiplication' ? '÷' : '+'
  return {
    text: `${answer} ${invSym} ___ = ${a}`,
    answer: b, choiceType: 'number',
    choices: shuffle([b, ...smartDistractors(operation, table, fact, b)]),
    format: 'chain_reverse', isTimed: false,
  }
}

// 36. next_in_sequence ❌
function q_next_in_sequence(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const v1 = factValues(operation, a, 2).answer
  const v2 = factValues(operation, a, 4).answer
  const v3 = factValues(operation, a, 6).answer
  return {
    text: `${a} ${sym} 2 = ${v1}\n${a} ${sym} 4 = ${v2}\n${a} ${sym} 6 = ?`,
    answer: v3, choiceType: 'number',
    choices: safeChoices(v3, [v3 + 1, v3 + 2, v3 - 1]),
    format: 'next_in_sequence', isTimed: false,
  }
}

// 37. confirm_all ❌
function q_confirm_all(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const eq1 = `${a} ${sym} ${b} = ${answer}` // correct
  const eq2 = b > 1 ? `${a+1} ${sym} ${b-1} = ${answer}` : `${a} ${sym} ${b} = ${answer}` // correct
  const eq3 = `${a+1} ${sym} ${b} = ${answer + 2}` // wrong
  const options = [eq1, eq2, eq3, 'Both A and B']
  return {
    text: `Which are correct?`,
    answer: 'Both A and B', choiceType: 'expression',
    choices: [eq1, eq2, eq3, 'Both A and B'],
    format: 'confirm_all', isTimed: false,
  }
}

// 38. closest_to ❌
function q_closest_to(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const target = Math.round(answer / 5) * 5
  const alt1 = factValues(operation, Math.max(1, a - 2), b).answer
  const alt2 = factValues(operation, a, Math.max(1, b - 2)).answer
  const expMain = `${a} ${sym} ${b}`
  const expAlt1 = `${Math.max(1,a-2)} ${sym} ${b}`
  const expAlt2 = `${a} ${sym} ${Math.max(1,b-2)}`
  const diffs = [[expMain, Math.abs(answer - target)], [expAlt1, Math.abs(alt1 - target)], [expAlt2, Math.abs(alt2 - target)]]
  const closest = diffs.sort((x,y) => x[1] - y[1])[0][0]
  return {
    text: `Which is closest to ${target}?`,
    answer: closest, choiceType: 'expression',
    choices: shuffle([expMain, expAlt1, expAlt2]),
    format: 'closest_to', isTimed: false,
  }
}

// 39. two_truths ❌
function q_two_truths(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const eq1 = `${a} ${sym} ${b}`
  const eq2 = b > 1 ? `${a+1} ${sym} ${b-1}` : `${a+2} ${sym} ${b-2 > 0 ? b-2 : b}`
  const eq3 = `${a+1} ${sym} ${b+1}` // wrong, gives answer+2 or answer*something
  const eq4 = `${a-1 > 0 ? a-1 : a+2} ${sym} ${b+2}` // wrong
  return {
    text: `Which TWO equal ${answer}?`,
    answer: `${eq1} and ${eq2}`, choiceType: 'expression',
    choices: [eq1, eq2, eq3, eq4],
    format: 'two_truths', isTimed: false,
    multiSelect: true,
    correctSet: [eq1, eq2],
  }
}

// 40. missing_result ❌
function q_missing_result(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const c = randInt(1, 5)
  const rightSide = answer - c
  return {
    text: `${a} ${sym} ${b} = ? ${'+' } ${c}`,
    answer: rightSide, choiceType: 'number',
    choices: safeChoices(rightSide, [rightSide + 1, rightSide + 2, rightSide - 1]),
    format: 'missing_result', isTimed: false,
  }
}

// 41. story_share ❌
function q_story_share(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const item = pick(['apples', 'coins', 'stickers', 'books'])
  const templates = {
    addition: `${a} kids each bring ${b} ${item}. ${name()} brings ${a} more. Total with ${name2(name())}?`,
    subtraction: `${answer} ${item} total, ${b} used. How many remain?`,
    multiplication: `${a} groups of ${b} ${item}. What is ${a} ${sym} ${b}?`,
    division: `${answer} ${item} shared equally among ${b} kids. How many each?`,
  }
  return {
    text: templates[operation] || templates.addition,
    answer: a, choiceType: 'number',
    choices: safeChoices(a, smartDistractors(operation, table, fact, a)),
    format: 'story_share', isTimed: false,
  }
}

// 42. times_check ❌
function q_times_check(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  // For addition: "how many times add b to reach answer?" = a (the table value)
  // e.g. table=2, fact=3 → 2+3=5, add 3 twice → answer is a=2
  // For multiplication: "how many groups of b in answer?" = a
  const timesAnswer = a
  const templates = {
    addition: `${a} ${sym} ${b} = ${answer}. How many times do you add ${b} to reach ${answer}?`,
    subtraction: `Starting at ${answer}, subtract ${b} each time. How many steps to reach 0?`,
    multiplication: `${answer} ÷ ${b} = ${a}. How many groups of ${b} fit in ${answer}?`,
    division: `${answer} ÷ ${b} = ${a}. How many times does ${b} go into ${answer}?`,
  }
  return {
    text: templates[operation] || templates.addition,
    answer: timesAnswer, choiceType: 'number',
    choices: safeChoices(timesAnswer, [timesAnswer + 1, timesAnswer + 2, timesAnswer - 1 >= 0 ? timesAnswer - 1 : timesAnswer + 3]),
    format: 'times_check', isTimed: false,
  }
}

// 43. opposite_trap ❌
function q_opposite_trap(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  // Stay within the same operation — ask what happens if you swap the numbers
  return {
    text: `${a} ${sym} ${b} = ${answer}\nNow what is ${b} ${sym} ${a}?`,
    answer: answer, choiceType: 'number',
    choices: safeChoices(answer, [answer + 1, answer + 2, answer - 1]),
    format: 'opposite_trap', isTimed: false,
  }
}

// ══════════════════════════════════════════════════════════════════════════
// DOUBLE REWARD (7 types) — all timed
// ══════════════════════════════════════════════════════════════════════════

// 44. speed_recall ✅
function q_speed_recall(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  return {
    text: `${a} ${sym} ${b} = ?`,
    answer, choiceType: 'number',
    choices: shuffle([answer, ...smartDistractors(operation, table, fact, answer)]),
    format: 'speed_recall', isTimed: true,
  }
}

// 45. rapid_fire ✅
function q_rapid_fire(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const f2 = { a: a+1, b, answer: factValues(operation, table+1 <= 12 ? table+1 : table, fact).answer }
  return {
    text: `${a} ${sym} ${b} = ?\n(Answer fast — timer is running!)`,
    answer, choiceType: 'number',
    choices: shuffle([answer, ...smartDistractors(operation, table, fact, answer)]),
    format: 'rapid_fire', isTimed: true,
  }
}

// 46. order_results ❌
function q_order_results(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const v1 = factValues(operation, Math.max(1, a-1), b).answer
  const v2 = answer
  const v3 = factValues(operation, a+1, b).answer
  const exprs = shuffle([
    { expr: `${a-1>0?a-1:a+2} ${sym} ${b}`, val: v1 },
    { expr: `${a} ${sym} ${b}`, val: v2 },
    { expr: `${a+1} ${sym} ${b}`, val: v3 },
  ])
  const sorted = [...exprs].sort((x,y) => x.val - y.val).map(e => e.expr)
  return {
    text: `Order smallest to biggest result:\n${exprs.map(e=>e.expr).join(' · ')}`,
    answer: sorted.join(' < '), choiceType: 'expression',
    choices: [
      sorted.join(' < '),
      [...sorted].reverse().join(' < '),
      [sorted[1], sorted[0], sorted[2]].join(' < '),
      [sorted[0], sorted[2], sorted[1]].join(' < '),
    ],
    format: 'order_results', isTimed: true,
  }
}

// 47. double_missing ❌
function q_double_missing(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const half = Math.floor(answer / 2)
  return {
    text: `___ ${sym} ___ = ${answer}\n(Both numbers are equal)`,
    answer: half, choiceType: 'number',
    choices: safeChoices(half, [half + 1, half + 2, half - 1]),
    format: 'double_missing', isTimed: true,
  }
}

// 48. build_equation ✅
function q_build_equation(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const choices = shuffle([
    `${a} ${sym} ${b} = ${answer}`,
    `${a} ${sym} ${b} = ${answer + 1}`,
    `${b} ${sym} ${a + 1} = ${answer}`,
    `${a + 1} ${sym} ${b} = ${answer}`,
  ])
  return {
    text: `Use ${a}, ${b}, ${answer} to make a correct equation:`,
    answer: `${a} ${sym} ${b} = ${answer}`, choiceType: 'expression',
    choices,
    format: 'build_equation', isTimed: true,
  }
}

// 49. which_faster ✅
function q_which_faster(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const half = Math.floor(answer / 2)
  const isDouble = half + half === answer
  const doubleExpr = `${half} ${sym} ${half}`
  const mainExpr = `${a} ${sym} ${b}`
  const easierIsDouble = isDouble
  return {
    text: `Which is easier to solve mentally?`,
    answer: easierIsDouble ? doubleExpr : mainExpr,
    choiceType: 'expression',
    choices: [mainExpr, doubleExpr],
    format: 'which_faster', isTimed: true,
  }
}

// 50. final_boss ✅
function q_final_boss(operation, table, fact) {
  const { a, b, answer } = factValues(operation, table, fact)
  const sym = SYMBOL[operation]
  const c = randInt(1, Math.min(a - 1, 5))
  const split1 = c, split2 = a - c
  const choices = [
    `${split1} ${sym} ${split2} ${sym} ${b} = ${answer}`,
    `${split1} ${sym} ${split2 + 1} ${sym} ${b} = ${answer + 1}`,
    `${split1 + 1} ${sym} ${split2} ${sym} ${b} = ${answer + 1}`,
    `${split1} ${sym} ${split2} ${sym} ${b + 1} = ${answer + 1}`,
  ]
  return {
    text: `${answer} = ___ ${sym} ___ ${sym} ___\nWhich breakdown is correct?`,
    answer: choices[0], choiceType: 'expression',
    choices: shuffle(choices),
    format: 'final_boss', isTimed: true,
  }
}

// ══════════════════════════════════════════════════════════════════════════
// FORMAT MAPS
// ══════════════════════════════════════════════════════════════════════════

const EASY_FORMATS = [
  'classic', 'word', 'missing_forward', 'missing_backward', 'numberline',
  'direct_answer', 'fact_family', 'equation_swap', 'split_number',
  'over_under', 'estimation', 'visual_groups', 'make_ten',
]

const MEDIUM_FORMATS = [
  'truefalse', 'comparison', 'hidden_operation', 'reverse_thinking',
  'context_switch', 'correct_pair', 'same_result', 'reorder_same',
  'doubles_check', 'story_missing', 'story_compare', 'before_after',
  'missing_middle', 'biggest_sum', 'story_leftover',
]

const HARD_FORMATS = [
  'fill_operation', 'multistep', 'error_detection', 'pattern_completion',
  'broken_equation', 'odd_one_out', 'chain_reverse', 'next_in_sequence',
  'confirm_all', 'closest_to', 'two_truths', 'missing_result',
  'story_share', 'times_check', 'opposite_trap',
]

const DOUBLE_REWARD_FORMATS = [
  'speed_recall', 'rapid_fire', 'order_results', 'double_missing',
  'build_equation', 'which_faster', 'final_boss',
]

const ALL_FORMATS = [...EASY_FORMATS, ...MEDIUM_FORMATS, ...HARD_FORMATS, ...DOUBLE_REWARD_FORMATS]

function makeQuestion(format, operation, table, fact) {
  switch (format) {
    case 'classic':           return q_classic(operation, table, fact)
    case 'word':              return q_word(operation, table, fact)
    case 'missing_forward':   return q_missing_forward(operation, table, fact)
    case 'missing_backward':  return q_missing_backward(operation, table, fact)
    case 'numberline':        return q_numberline(operation, table, fact)
    case 'direct_answer':     return q_direct_answer(operation, table, fact)
    case 'fact_family':       return q_fact_family(operation, table, fact)
    case 'equation_swap':     return q_equation_swap(operation, table, fact)
    case 'split_number':      return q_split_number(operation, table, fact)
    case 'over_under':        return q_over_under(operation, table, fact)
    case 'estimation':        return q_estimation(operation, table, fact)
    case 'visual_groups':     return q_visual_groups(operation, table, fact)
    case 'make_ten':          return q_make_ten(operation, table, fact)
    case 'truefalse':         return q_truefalse(operation, table, fact)
    case 'comparison':        return q_comparison(operation, table, fact)
    case 'hidden_operation':  return q_hidden_operation(operation, table, fact)
    case 'reverse_thinking':  return q_reverse_thinking(operation, table, fact)
    case 'context_switch':    return q_context_switch(operation, table, fact)
    case 'correct_pair':      return q_correct_pair(operation, table, fact)
    case 'same_result':       return q_same_result(operation, table, fact)
    case 'reorder_same':      return q_reorder_same(operation, table, fact)
    case 'doubles_check':     return q_doubles_check(operation, table, fact)
    case 'story_missing':     return q_story_missing(operation, table, fact)
    case 'story_compare':     return q_story_compare(operation, table, fact)
    case 'before_after':      return q_before_after(operation, table, fact)
    case 'missing_middle':    return q_missing_middle(operation, table, fact)
    case 'biggest_sum':       return q_biggest_sum(operation, table, fact)
    case 'story_leftover':    return q_story_leftover(operation, table, fact)
    case 'fill_operation':    return q_fill_operation(operation, table, fact)
    case 'multistep':         return q_multistep(operation, table, fact)
    case 'error_detection':   return q_error_detection(operation, table, fact)
    case 'pattern_completion':return q_pattern_completion(operation, table, fact)
    case 'broken_equation':   return q_broken_equation(operation, table, fact)
    case 'odd_one_out':       return q_odd_one_out(operation, table, fact)
    case 'chain_reverse':     return q_chain_reverse(operation, table, fact)
    case 'next_in_sequence':  return q_next_in_sequence(operation, table, fact)
    case 'confirm_all':       return q_confirm_all(operation, table, fact)
    case 'closest_to':        return q_closest_to(operation, table, fact)
    case 'two_truths':        return q_two_truths(operation, table, fact)
    case 'missing_result':    return q_missing_result(operation, table, fact)
    case 'story_share':       return q_story_share(operation, table, fact)
    case 'times_check':       return q_times_check(operation, table, fact)
    case 'opposite_trap':     return q_opposite_trap(operation, table, fact)
    case 'speed_recall':      return q_speed_recall(operation, table, fact)
    case 'rapid_fire':        return q_rapid_fire(operation, table, fact)
    case 'order_results':     return q_order_results(operation, table, fact)
    case 'double_missing':    return q_double_missing(operation, table, fact)
    case 'build_equation':    return q_build_equation(operation, table, fact)
    case 'which_faster':      return q_which_faster(operation, table, fact)
    case 'final_boss':        return q_final_boss(operation, table, fact)
    default:                  return q_classic(operation, table, fact)
  }
}

// Build a pool of N formats from a given tier, no consecutive repeats
function buildPool(formats, total) {
  const pool = []
  while (pool.length < total) {
    pool.push(...shuffle([...formats]))
  }
  return pool.slice(0, total)
}

// ── Diagnostic generator ───────────────────────────────────────────────────

export function generateDiagnostic(claimedOperation, selectedTables) {
  const tables = (selectedTables && selectedTables.length > 0)
    ? selectedTables
    : Array.from({ length: 12 }, (_, i) => i + 1)
  const TOTAL = 25
  const formats = buildPool([...EASY_FORMATS, ...MEDIUM_FORMATS], TOTAL)
  return formats.map(fmt => {
    const table = pick(tables)
    const fact  = randInt(1, 12)
    return { ...makeQuestion(fmt, claimedOperation, table, fact), isPrimary: true }
  })
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

// ── Review generator ───────────────────────────────────────────────────────

function generateReview(operation, table, batch, reviewPool) {
  const pool = reviewPool.length > 0 ? reviewPool : [{ operation, table, batch }]
  const TOTAL = 24
  const formats = buildPool(ALL_FORMATS, TOTAL)
  return formats.map(fmt => {
    const src  = pick(pool)
    const [f1, f2] = factsForBatch(src.batch)
    const fact = Math.random() < 0.5 ? f1 : f2
    return makeQuestion(fmt, src.operation, src.table, fact)
  })
}

// ── Main export ────────────────────────────────────────────────────────────

export function generateBatch(operation, table, batch, node, { unlockBatch, reviewPool } = {}) {
  if (node === 'learn') return generateLesson(operation, table, batch)
  if (node === 'review') return generateReview(operation, table, batch, reviewPool || [])

  const TOTAL = 12

  const src = (node === 'unlock' && unlockBatch)
    ? { operation: unlockBatch.operation, table: unlockBatch.table, batch: unlockBatch.batch }
    : { operation, table, batch }

  const [sf0, sf1] = factsForBatch(src.batch)
  const srcFacts = [sf0, sf1]
  const factSeq = [0,1,0,1,0,1,0,1,0,1,0,1]

  let formats
  if (node === 'easy') {
    formats = buildPool(EASY_FORMATS, TOTAL)
  } else if (node === 'medium') {
    formats = buildPool(MEDIUM_FORMATS, TOTAL)
  } else if (node === 'hard') {
    formats = buildPool(HARD_FORMATS, TOTAL)
  } else if (node === 'double_reward') {
    // Cycle through all 7 double reward types + fill rest with speed_recall
    formats = buildPool(DOUBLE_REWARD_FORMATS, TOTAL)
  } else {
    // unlock — balanced mix of easy
    formats = buildPool(EASY_FORMATS, TOTAL)
  }

  return formats.map((fmt, i) => {
    const fact = srcFacts[factSeq[i] % 2]
    return makeQuestion(fmt, src.operation, src.table, fact)
  })
}
