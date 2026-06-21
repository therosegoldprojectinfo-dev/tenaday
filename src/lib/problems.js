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

function makeProblem(operation, table) {
  if (operation === 'addition') {
    const b = randInt(1, 12)
    return { text: `${table} + ${b} = ?`, answer: table + b }
  }
  if (operation === 'subtraction') {
    // table is the subtrahend; a >= table ensures non-negative result
    const a = table + randInt(0, 12)
    return { text: `${a} − ${table} = ?`, answer: a - table }
  }
  if (operation === 'multiplication') {
    const b = randInt(1, 12)
    return { text: `${table} × ${b} = ?`, answer: table * b }
  }
  if (operation === 'division') {
    // Pick a multiplier so the quotient is a whole number
    const b = randInt(1, 12)
    return { text: `${table * b} ÷ ${table} = ?`, answer: b }
  }
  const b = randInt(1, 12)
  return { text: `${table} + ${b} = ?`, answer: table + b }
}

export function generateBatch(operation = 'addition', table = 1, count = 10) {
  return Array.from({ length: count }, () => {
    const { text, answer } = makeProblem(operation, table)
    return { text, answer, choices: shuffle([...buildDistractors(answer), answer]) }
  })
}
