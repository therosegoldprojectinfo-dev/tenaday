// grading.js — human-like correction for quiz.jsx
// Forgives: hyphens, apostrophes, accents, capitals, plurals, articles, small typos.
//   "attaque-surprise" = "attaque surprise" = "attaques surprises" = "attaque surprize"

const STOP = new Set([
  'the', 'a', 'an', 'of', 'to', 'is', 'are',
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du', 'd',
  'el', 'los', 'las', 'una', 'der', 'die', 'das', 'il', 'lo',
])

export function norm(s) {
  return String(s ?? '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0629/g, '\u0647').replace(/\u0649/g, '\u064a')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[-–—_'’`]/g, ' ')                 // hyphen / apostrophe = space
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ').trim()
}

// plural -> singular (eaux, animaux, chats, flowers...), Arabic "ال" removed
const stem = (w) => {
  w = w.replace(/^\u0627\u0644(?=.{2,})/, '')
  return w.length > 3 ? w.replace(/[sx]$/, '') : w
}

// The small words to ignore come from the AI for THIS quiz's language (q.forgiven).
// Old quizzes without that list fall back to the built-in STOP list.
function stopSet(list) {
  if (Array.isArray(list) && list.length) return new Set(list.map((w) => norm(w)).filter(Boolean))
  return STOP
}

const tokens = (s, stop = STOP) =>
  norm(s).split(' ').filter((w) => w && !stop.has(w)).map(stem)

function lev(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1, d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return d[m][n]
}

// same word, with mercy for typos (never for numbers)
function sameWord(a, b) {
  if (a === b) return true
  if (/\d/.test(a) || /\d/.test(b)) return false
  const n = Math.max(a.length, b.length)
  if (n < 5) return false
  return lev(a, b) <= (n >= 9 ? 2 : 1)
}

// fill_blank: 1-3 word answer
export function gradeFill(input, correct, forgiven) {
  const stop = stopSet(forgiven)
  let a = tokens(input, stop), b = tokens(correct, stop)
  if (!b.length) { a = tokens(input, new Set()); b = tokens(correct, new Set()) }  // lesson is ABOUT the small words (le/la...): compare them
  if (!a.length || !b.length) return false
  if (a.length === b.length && a.every((w, i) => sameWord(w, b[i]))) return true
  return sameWord(a.join(''), b.join(''))      // "attaquesurprise" = "attaque surprise"
}

// short_answer + reason part of choice_reason
// keywords = [["water","watering"],["sun","light"]], need = min_groups
export function gradeKeywords(input, keywords, need = 1, forgiven) {
  const stop = stopSet(forgiven)
  const inTok = tokens(input, stop)
  const inJoined = inTok.join('')
  let hits = 0
  for (const group of keywords || []) {
    const found = group.some((syn) => {
      const st = tokens(syn, stop)
      if (!st.length) return false
      for (let i = 0; i + st.length <= inTok.length; i++) {
        if (st.every((w, k) => sameWord(inTok[i + k], w))) return true
      }
      const sj = st.join('')
      return sj.length >= 4 && inJoined.includes(sj)
    })
    if (found) hits++
  }
  return { hits, ok: hits >= need, score: Math.min(1, hits / Math.max(1, need)) }
}

// Main entry. Returns { score: 0..1, correct: boolean, ... }
//   answer = string, or { choice, reason } for choice_reason
export function gradeAnswer(q, answer) {
  switch (q.type) {
    case 'mcq':
    case 'true_false': {
      const ok = norm(answer) === norm(q.correct_answer)
      return { score: ok ? 1 : 0, correct: ok }
    }
    case 'fill_blank': {
      const ok = gradeFill(answer, q.correct_answer, q.forgiven)
      return { score: ok ? 1 : 0, correct: ok }
    }
    case 'short_answer': {
      const g = gradeKeywords(answer, q.keywords, q.min_groups || 1, q.forgiven)
      return { score: g.score, correct: g.ok, partial: !g.ok && g.hits > 0 }
    }
    case 'choice_reason': {
      const choiceOk = answer?.choice === q.correct_answer
      const g = gradeKeywords(answer?.reason, q.keywords, q.min_groups || 1, q.forgiven)
      const score = (choiceOk ? 0.5 : 0) + (g.ok ? 0.5 : 0)
      return { score, correct: score === 1, partial: score > 0 && score < 1, choiceOk, reasonOk: g.ok }
    }
    default:
      return { score: 0, correct: false }
  }
}

/* ---------- how to wire it in quiz.jsx ----------
 * short_answer : one text input        -> gradeAnswer(q, text)
 * choice_reason: option buttons, then a text input "Why?"
 *                                        -> gradeAnswer(q, { choice, reason })
 * fill_blank   : replace your old comparison with gradeAnswer(q, text)
 * After answering, show q.correct_answer + q.explanation.
 * partial === true  -> show "Almost!" and count score (0.5), not 0.
 * Remove old handling of text_highlight / visual_count (the new function no longer sends them).
 */
