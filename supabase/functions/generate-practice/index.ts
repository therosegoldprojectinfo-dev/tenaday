// supabase/functions/generate-practice/index.ts
// Numio — universal 4-step quiz, ONE Claude call (read page + pick what matters + write 20 questions).
//   Step 1  facts     Q1-3    Who/What/Where/When (only the ones the lesson has)
//   Step 2  fill      Q4-9    fill the blank
//   Step 3  spot      Q10-16  right or wrong / spot the mistake
//   Step 4  reallife  Q17-20  real-life story
//   "new"           : images -> 1 call -> quiz + key facts (saved)
//   "practice_more" : saved key facts (text only, no images) -> 1 call -> new quiz

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MODEL = 'claude-haiku-5-5'

const PRICE_INPUT_PER_MTOK = 0.10
const PRICE_OUTPUT_PER_MTOK = 0.50

// the quiz shape: same in every quiz
const LEVELS = ['facts', 'fill', 'spot', 'reallife'] as const
const COUNTS: Record<string, number> = { facts: 3, fill: 6, spot: 7, reallife: 4 }   // = 20
const ALLOWED_TYPES: Record<string, string[]> = {
  facts: ['mcq', 'fill_blank'],
  fill: ['fill_blank'],
  spot: ['true_false', 'mcq'],
  reallife: ['mcq'],
}
const MIN_FINAL_QUESTIONS = 14

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://numiomath.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ================= Claude call =================
type Usage = { input: number; output: number }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function callClaude<T = any>(opts: {
  system: string
  content: any[]
  schema: Record<string, unknown>
  maxTokens: number
}): Promise<{ data: T; usage: Usage }> {
  if (!API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
  let lastErr: unknown = null

  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: opts.maxTokens,
          system: opts.system,
          messages: [{ role: 'user', content: opts.content }],
          tools: [{ name: 'submit', description: 'Submit the quiz.', input_schema: opts.schema }],
          tool_choice: { type: 'tool', name: 'submit' },
        }),
        signal: AbortSignal.timeout(110_000),
      })
    } catch (e) {
      lastErr = new Error(`network/timeout: ${(e as Error).message}`)
      await sleep(1500)
      continue
    }
    if (res.status === 429 || res.status >= 500) {
      lastErr = new Error(`Claude ${res.status}: ${await res.text()}`)
      await sleep(1500)
      continue
    }
    if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`)

    const data = await res.json()
    if (data.stop_reason === 'max_tokens') throw new Error('truncated at max_tokens')
    const block = (data.content || []).find((b: any) => b.type === 'tool_use')
    if (!block) throw new Error('no tool output')
    return {
      data: block.input as T,
      usage: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
    }
  }
  throw lastErr ?? new Error('Claude call failed')
}

// ================= prompt =================
function buildSystem(readPage: boolean) {
  return `You are a veteran teacher who writes practice quizzes for children. ${readPage
    ? 'You look at a lesson page (or several) and, in ONE pass, you decide what matters and write the quiz.'
    : 'You receive the key facts of a lesson and write a NEW quiz for a child.'}

LANGUAGE: the page can be in ANY language (English, Afrikaans, isiZulu, isiXhosa, Sesotho, Arabic, French, Spanish...). Write the whole quiz in the language of the lesson. For a language lesson, write the questions in the language of the explanations and keep the words being studied in their own language. Never translate the lesson into another language.

FORGIVEN WORDS: fill forgiven_words with the small determiners and function words of the QUIZ's language that a child may leave out or add when typing an answer: articles, determiners and tiny words (for example le, la, les, un, une, des, de, du in French; the, a, an, of in English; die, n in Afrikaans; el, la, los, las, un, una in Spanish; der, die, das, ein in German). Include elided forms without the apostrophe (l, d). Lowercase, one word each, 25 words maximum, only words of the quiz's language. If the language has no such words, return an empty list.

${readPage ? `STEP 1 - READ the page(s): text, numbers, tables, diagrams, examples. Decide what is truly important. Fill subject, topic, lesson_language, grade_hint and key_facts = the 8-12 most important facts, rules or worked examples of the lesson, one short sentence each, in the lesson's language. Skip decoration and small details.

STEP 2 - ` : ''}WRITE exactly 20 questions, only from the key facts, in this order:

1. "facts" (3 questions): a quick, easy win on memory and facts. Ask Who? What? Where? or When? Use ONLY the ones the lesson really has: a math page may only have "What", a history page may have Who and When. Mix them when the lesson allows it, never force a Who/Where/When that does not exist. Type: mcq.
2. "fill" (6 questions): fill the blank. A rule, fact or equation with ONE missing piece. Works for any subject: "x + ___ = y", "In 1780, ___ conquered Rome". Type: fill_blank.
3. "spot" (7 questions): right or wrong, spot the mistake. Use at least 3 true_false (a claim to judge: make about half of them look right but be wrong, using a mistake a child really makes) and at least 3 mcq ("Which sentence is correct?" or "Which one is wrong?"). 
4. "reallife" (4 questions): real-life story. Turn the lesson into a short everyday situation and ask what to do, or who/what matches. Type: mcq, 3 options, one clearly best answer. Example: "You play soccer every day and people follow you. Who in an army is like you?" -> "A commander".

APP RULES (the app only handles these, follow exactly)
- mcq: 3-4 different options. correct_answer is copied exactly from options. Wrong options are real mistakes a child makes. All options similar in length and form: the correct one is NOT the longest. Never number items inside the question.
- true_false: the question is a statement. options = exactly 2 items: the word for "true" then the word for "false" in the quiz's language (e.g. True/False, Vrai/Faux, Waar/Vals, Verdadero/Falso, Wahr/Falsch, Vero/Falso, صحيح/خطأ). correct_answer is exactly one of the two options.
- fill_blank: the question contains ___ . correct_answer is ONE answer of 1-3 words. Only one answer must be possible. No hints like "X or Y".

KIDS RULES
- Questions of steps 1-3: 12 words maximum. Step 4: 20 words maximum. Answer options: 6 words maximum. Short and clear.
- Write in the lesson's language, simple words for the child's grade. Use only what the lesson teaches.
- One defensible answer. No trick questions. Never "all/none of the above". Never ask the same fact twice.
- explanation: ONE short sentence that points back to the rule (shown to the child when wrong).
- difficulty 1-5: facts 1-2, fill 2-3, spot 3-4, reallife 3-4.`
}

// ================= schema =================
const str = { type: 'string' }
const strArr = { type: 'array', items: str }

function buildSchema(withLesson: boolean) {
  const question = {
    type: 'object',
    properties: {
      level: { type: 'string', enum: [...LEVELS] },
      type: { type: 'string', enum: ['mcq', 'true_false', 'fill_blank'] },
      question: str,
      options: strArr,
      correct_answer: str,
      explanation: str,
      difficulty: { type: 'integer' },
    },
    required: ['level', 'type', 'question', 'correct_answer', 'explanation', 'difficulty'],
  }
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  if (withLesson) {
    Object.assign(properties, { subject: str, topic: str, lesson_language: str, grade_hint: str, key_facts: strArr })
    required.push('subject', 'topic', 'lesson_language', 'key_facts')
  }
  properties.forgiven_words = strArr
  properties.questions = { type: 'array', items: question }
  required.push('forgiven_words', 'questions')
  return { type: 'object', properties, required }
}

// ================= validation (mechanical, free) =================
function normalize(s: unknown): string {
  return String(s ?? '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[-–—_''`]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ').trim()
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

function parseMaybeJson(v: any) {
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { /* ignore */ } }
  return v
}

function validateQuestion(q: any): string | null {
  if (!q || typeof q !== 'object') return 'not an object'

  q.difficulty = Math.min(5, Math.max(1, Math.round(Number(q.difficulty) || 3)))
  q.options = parseMaybeJson(q.options)
  if (Array.isArray(q.options)) q.options = q.options.map((o: unknown) => String(o))
  if (Array.isArray(q.options) && isStr(q.correct_answer) && !q.options.includes(q.correct_answer)) {
    const hit = q.options.find((o: string) => normalize(o) === normalize(q.correct_answer))
    if (hit) q.correct_answer = hit
  }

  if (!(LEVELS as readonly string[]).includes(q.level)) return `bad level "${q.level}"`
  if (!ALLOWED_TYPES[q.level].includes(q.type)) return `type "${q.type}" not allowed in step "${q.level}"`
  if (!isStr(q.question)) return 'missing question'
  if (!isStr(q.explanation)) return 'missing explanation'
  if (!isStr(q.correct_answer)) return 'missing correct_answer'
  if (/\b1[.)]\s*.+?\s*2[.)]\s*/s.test(q.question)) return 'numbered list inside question'

  if (q.type === 'mcq') {
    if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) return 'mcq needs 3-4 options'
    if (!q.options.includes(q.correct_answer)) return 'correct_answer not exactly in options'
    const norm = q.options.map(normalize)
    if (new Set(norm).size !== norm.length) return 'duplicate options'
  } else if (q.type === 'true_false') {
    if (!Array.isArray(q.options) || q.options.length !== 2) return 'true_false needs exactly 2 options'
    if (normalize(q.options[0]) === normalize(q.options[1])) return 'true_false labels are identical'
    if (!q.options.includes(q.correct_answer)) return 'true_false answer must be one of the 2 labels'
  } else {
    delete q.options
  }

  if (q.type === 'fill_blank') {
    if (!q.question.includes('___')) return 'fill_blank needs ___'
    if (q.correct_answer.trim().length > 40) return 'fill_blank answer too long'
  }

  const maxWords = q.level === 'reallife' ? 26 : 16
  if (wordCount(q.question) > maxWords) console.log(`long question (${wordCount(q.question)} words):`, q.question)

  delete q.keywords
  delete q.min_groups
  return null
}

function arrangeOptions(q: any) {
  if (q.type !== 'mcq' || !Array.isArray(q.options)) return
  const opts: string[] = [...q.options]
  if (opts.every((o) => o.trim() !== '' && !isNaN(Number(o)))) {
    opts.sort((a, b) => Number(a) - Number(b))
  } else {
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[opts[i], opts[j]] = [opts[j], opts[i]]
    }
  }
  q.options = opts
}

function cleanForgiven(v: unknown): string[] {
  const arr = parseMaybeJson(v)
  if (!Array.isArray(arr)) return []
  const out = new Set<string>()
  for (const w of arr) {
    const word = String(w ?? '').trim().toLowerCase().replace(/[''`]/g, '')
    if (word && word.length <= 12 && !/\s/.test(word)) out.add(word)
    if (out.size >= 30) break
  }
  return [...out]
}

// ================= the one call =================
type Meta = { subject?: string; topic?: string; lesson_language?: string; grade_hint?: string; key_facts?: string[] }

async function generateQuiz(opts: {
  images?: { data: string; mediaType: string }[]
  keyFacts?: string
  topic?: string
  kidGrade: string | null
  avoid: string[]
  language?: string
}): Promise<{ meta: Meta; questions: any[]; usage: Usage }> {
  const readPage = !!opts.images?.length
  const content: any[] = []

  if (readPage) {
    for (const img of opts.images!) {
      content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data } })
    }
    content.push({ type: 'text', text: `Read this lesson page and write the quiz.${opts.kidGrade ? ` The child's grade is: ${opts.kidGrade}.` : ''}` })
  } else {
    const avoid = opts.avoid.length
      ? `\n\nALREADY ASKED (do not repeat; test the same ideas with new examples and new angles):\n${opts.avoid.map((t) => `- ${t}`).join('\n')}`
      : ''
    content.push({
      type: 'text',
      text: `${opts.language ? `Lesson language: ${opts.language}. Write the quiz in this language.\n\n` : ''}KEY FACTS OF THE LESSON${opts.topic ? ` (${opts.topic})` : ''}:\n${opts.keyFacts}${opts.kidGrade ? `\n\nThe child's grade is: ${opts.kidGrade}.` : ''}${avoid}`,
    })
  }

  const { data, usage } = await callClaude<any>({
    system: buildSystem(readPage),
    content,
    schema: buildSchema(readPage),
    maxTokens: readPage ? 8000 : 6500,
  })

  let qs = parseMaybeJson(data.questions)
  if (!Array.isArray(qs)) qs = []

  const seen = new Set<string>()
  const byLevel: Record<string, any[]> = { facts: [], fill: [], spot: [], reallife: [] }
  for (const q of qs) {
    const err = validateQuestion(q)
    if (err) { console.log('dropped question:', err); continue }
    const key = normalize(q.question)
    if (seen.has(key)) continue
    seen.add(key)
    if (byLevel[q.level].length < COUNTS[q.level]) byLevel[q.level].push(q)
  }

  const questions = LEVELS.flatMap((l) => byLevel[l])
  if (questions.length < MIN_FINAL_QUESTIONS) throw new Error(`Only ${questions.length} valid questions`)

  const forgiven = cleanForgiven(data.forgiven_words)
  questions.forEach((q, i) => {
    q.id = `q${i + 1}`
    q.objective_id = q.level
    q.skill_key = q.level
    if (q.type === 'fill_blank' && forgiven.length) q.forgiven = forgiven
    arrangeOptions(q)
  })

  const meta: Meta = readPage
    ? {
        subject: data.subject, topic: data.topic, lesson_language: data.lesson_language,
        grade_hint: data.grade_hint,
        key_facts: Array.isArray(data.key_facts) ? data.key_facts.map(String) : [],
      }
    : {}
  return { meta, questions, usage }
}

const STEP_OBJECTIVES = [
  { id: 'facts', skill_key: 'facts', description: 'Remember the key facts', knowledge_type: 'facts', priority: 'core' },
  { id: 'fill', skill_key: 'fill', description: 'Complete rules and statements', knowledge_type: 'fill', priority: 'core' },
  { id: 'spot', skill_key: 'spot', description: 'Spot what is right or wrong', knowledge_type: 'spot', priority: 'core' },
  { id: 'reallife', skill_key: 'reallife', description: 'Use the lesson in real life', knowledge_type: 'reallife', priority: 'supporting' },
]

// ================= handler =================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })

  const t0 = Date.now()
  try {
    // ---------- auth ----------
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authError } = await sb.auth.getUser(jwt)
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    // ---------- input ----------
    const body = await req.json()
    const { kid_id, mode, images, parent_exam_id, chapter_id } = body

    if (!kid_id) return jsonResponse({ error: 'kid_id required' }, 400)
    if (mode !== 'new' && mode !== 'practice_more') return jsonResponse({ error: 'mode must be "new" or "practice_more"' }, 400)
    if (mode === 'new' && (!images || !images.length)) return jsonResponse({ error: 'No images provided' }, 400)
    if (mode === 'practice_more' && !parent_exam_id) return jsonResponse({ error: 'parent_exam_id required for practice_more' }, 400)

    if (mode === 'new') {
      const ALLOWED_IMG = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      const MAX_B64 = 7_000_000
      if (images.length > 5) return jsonResponse({ error: 'Max 5 images allowed' }, 400)
      for (const img of images) {
        if (!ALLOWED_IMG.includes(img.mediaType)) return jsonResponse({ error: 'Invalid image type' }, 400)
        if (typeof img.data !== 'string' || img.data.length > MAX_B64) return jsonResponse({ error: 'Image too large' }, 400)
      }
    }

    // ---------- subscription check — allows paid (active) AND free trial (trial, within 7 days) ----------
    const { data: profileRow, error: profileErr } = await sb
      .from('profiles')
      .select('subscription_status, trial_started_at')
      .eq('id', user.id)
      .single()
    if (profileErr || !profileRow) return jsonResponse({ error: 'SUBSCRIPTION_ACTIVATING' }, 402)
    const isActive = profileRow.subscription_status === 'active'
    const isTrial =
      profileRow.subscription_status === 'trial' &&
      !!profileRow.trial_started_at &&
      Date.now() - new Date(profileRow.trial_started_at).getTime() < 7 * 24 * 60 * 60 * 1000
    if (!isActive && !isTrial) return jsonResponse({ error: 'SUBSCRIPTION_ACTIVATING' }, 402)

    // ---------- kid + rate limit ----------
    const { data: kid, error: kidErr } = await sb.from('kid_profiles').select('id, grade').eq('id', kid_id).eq('user_id', user.id).single()
    if (kidErr || !kid) return jsonResponse({ error: 'Kid not found' }, 404)

    const { error: rateLimitErr } = await sb.rpc('increment_daily_quiz_count', { p_user_id: user.id })
    if (rateLimitErr) {
      const isRateLimit = rateLimitErr.message?.includes('Daily limit') || rateLimitErr.code === 'P0001'
      return jsonResponse({ error: isRateLimit ? 'RATE_LIMIT' : 'Service error. Please try again.' }, isRateLimit ? 429 : 500)
    }

    const kidGrade: string | null = kid.grade != null ? String(kid.grade) : null

    let result: { meta: Meta; questions: any[]; usage: Usage }
    let topic = 'Quiz'
    let pageText = ''
    let lessonAnalysisId: string | null = null

    if (mode === 'new') {
      result = await generateQuiz({ images, kidGrade, avoid: [] })
      topic = result.meta.topic || 'Quiz'
      pageText = (result.meta.key_facts || []).join('\n')

      const { data: laRow, error: laErr } = await sb.from('lesson_analyses').insert({
        user_id: user.id, kid_id,
        subject: result.meta.subject, topic,
        language: result.meta.lesson_language, grade_hint: result.meta.grade_hint,
        page_text: pageText,
        content_items: result.meta.key_facts || [],
        objectives: STEP_OBJECTIVES,
        raw: { ...result.meta, page_text: pageText },
      }).select('id').single()
      if (laErr) throw laErr
      lessonAnalysisId = laRow.id
    } else {
      const { data: parentExam, error: peErr } = await sb.from('exams')
        .select('lesson_analysis_id, topic').eq('id', parent_exam_id).eq('kid_id', kid_id).single()
      if (peErr || !parentExam?.lesson_analysis_id) return jsonResponse({ error: 'Parent exam has no linked lesson analysis' }, 400)
      lessonAnalysisId = parentExam.lesson_analysis_id

      const { data: laRow, error: laErr } = await sb.from('lesson_analyses')
        .select('raw, page_text, topic, language').eq('id', lessonAnalysisId).single()
      if (laErr || !laRow) return jsonResponse({ error: 'Lesson analysis not found' }, 404)

      const keyFacts =
        (Array.isArray(laRow.raw?.key_facts) && laRow.raw.key_facts.length ? laRow.raw.key_facts.map((f: string) => `- ${f}`).join('\n') : '') ||
        laRow.raw?.lesson_summary || laRow.raw?.page_text || laRow.page_text
      if (!keyFacts) return jsonResponse({ error: 'LESSON_NEEDS_RESCAN' }, 409)
      topic = parentExam.topic || laRow.topic || 'Quiz'
      pageText = keyFacts

      const { data: prev } = await sb.from('exams').select('questions').eq('lesson_analysis_id', lessonAnalysisId)
        .order('created_at', { ascending: false }).limit(5)
      const avoid = (prev || [])
        .flatMap((e: any) => (Array.isArray(e.questions) ? e.questions : []))
        .map((q: any) => String(q?.question || '').slice(0, 100))
        .filter(Boolean)
        .slice(0, 30)

      result = await generateQuiz({ keyFacts, topic, kidGrade, avoid, language: laRow.language || laRow.raw?.lesson_language })
    }

    let revisionNumber = 0
    if (mode === 'practice_more') {
      const { count: c } = await sb.from('exams').select('id', { count: 'exact', head: true }).eq('parent_exam_id', parent_exam_id)
      revisionNumber = (c || 0) + 1
    }

    const { data: examRow, error: examErr } = await sb.from('exams').insert({
      user_id: user.id, kid_id, chapter_id: chapter_id || null,
      topic,
      questions: result.questions,
      page_text: pageText,
      is_revision: mode === 'practice_more',
      revision_number: revisionNumber,
      parent_exam_id: mode === 'practice_more' ? parent_exam_id : null,
      lesson_analysis_id: lessonAnalysisId,
    }).select('id, topic, page_text, questions').single()
    if (examErr) throw examErr

    try {
      const costUsd =
        (result.usage.input * PRICE_INPUT_PER_MTOK / 1_000_000) +
        (result.usage.output * PRICE_OUTPUT_PER_MTOK / 1_000_000)
      await sb.from('usage_logs').insert({
        user_id: user.id,
        image_count: mode === 'new' ? images.length : 0,
        input_tokens: result.usage.input, output_tokens: result.usage.output, cost_usd: costUsd,
      })
    } catch (trackErr) { console.error('Usage tracking failed (non-fatal):', trackErr) }

    console.log(`done in ${Date.now() - t0}ms  in=${result.usage.input} out=${result.usage.output} q=${result.questions.length}`)
    return jsonResponse({ id: examRow.id, topic: examRow.topic, page_text: examRow.page_text, questions: examRow.questions })

  } catch (err) {
    console.error('Edge Function error after', Date.now() - t0, 'ms:', err)
    return jsonResponse({ error: 'Service error. Please try again.' }, 500)
  }
})
