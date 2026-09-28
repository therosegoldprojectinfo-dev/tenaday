// supabase/functions/generate-practice/index.ts
//
// Numio Universal Test Generation Framework implementation.
// 2 AI calls (both Haiku 4.5 — Sonnet was too expensive):
//   1. Lesson analysis → learning objectives (skipped in "practice_more" mode)
//   2. Framework-driven blueprint + questions, using the kid's
//      learner profile + per-skill stats for adaptation
//
// Plus a profile-refresh step (small Haiku call, only runs when
// there's new attempt data since the last refresh).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MODEL = 'claude-haiku-4-5-20251001'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://numiomath.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ACTIVE_QUESTION_TYPES = ['mcq', 'true_false', 'fill_blank', 'visual_count', 'text_highlight'] as const
const OPENMOJI_ASSETS = [
  'bird', 'cow', 'cat', 'dog', 'fish', 'apple', 'banana', 'star',
  'ball', 'tree', 'book', 'pencil', 'car', 'bus', 'flower',
]
const KNOWLEDGE_TYPES = [
  'factual', 'vocabulary', 'definition', 'conceptual', 'procedural',
  'rule', 'classification', 'sequence', 'cause_effect', 'problem_solving',
  'reading', 'production',
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

async function callClaude(system: string, content: any[], maxTokens = 4000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
  })
  if (!res.ok) throw new Error(`Claude API error: ${await res.text()}`)
  const data = await res.json()
  const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
  const usage = data.usage || {}
  const clean = text.replace(/^```(?:json)?[^\n]*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  return { parsed: JSON.parse(clean), usage }
}

// ============================================================
// PHASE 1 — Lesson analysis → learning objectives
// (Framework sections 1-3)
// ============================================================
async function analyzeLesson(images: { data: string; mediaType: string }[], existingSkills: { skill_key: string; skill_label: string }[]) {
  const system = `You analyze a photo of a child's schoolwork for a practice app (ages 6-12). Follow this process:

1. Identify subject, topic, language, and (if inferable from the material) grade/level.
2. Break the lesson into specific, observable LEARNING OBJECTIVES — not vague topics. "Add fractions with the same denominator" not "understand fractions". Prioritize by importance in the material; don't give every sentence equal weight.
3. Classify each objective's knowledge type, using exactly one of: ${JSON.stringify(KNOWLEDGE_TYPES)}.
4. Mark priority: "core" (the lesson's main point), "supporting", or "prerequisite".
5. Give each objective a stable "skill_key" — a short dotted id like "math.fractions.add_same_denominator". IMPORTANT: this kid already has these skill keys on record — if an objective is the SAME underlying skill as one below, reuse its exact skill_key. Only invent a new one for a genuinely new skill.

Existing skill keys for this kid:
${JSON.stringify(existingSkills)}

Extract only what's actually in the photo — don't invent content or assume advanced material wasn't shown.

Respond with ONLY this JSON:
{
  "subject": "...", "topic": "...", "language": "...", "grade_hint": "e.g. 'appears to be grade 2 level' or null",
  "page_text": "full extracted text, word for word",
  "objectives": [
    { "id": "obj1", "skill_key": "...", "description": "...", "knowledge_type": "procedural", "priority": "core" }
  ]
}`
  const content = images.map((img) => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data } }))
  content.push({ type: 'text', text: 'Analyze this lesson and return only the JSON.' })
  return callClaude(system, content, 2000)
}

// ============================================================
// PHASE 2 — Framework-driven blueprint + questions
// (Framework sections 4-19, 22)
// ============================================================
const FRAMEWORK_PROMPT = `You are designing a practice session for a kids' learning app, following the Numio Universal Test Generation Framework.

PRIMARY OBJECTIVE: help the child understand, retrieve, apply, recognize mistakes, and demonstrate mastery — not to generate as many questions as possible. Every question must have a clear purpose: before writing it, know exactly which objective and which practice method (recall/recognition/application/production) it serves.

SELECT PRACTICE METHODS BY KNOWLEDGE TYPE — don't use one pattern for everything:
- factual/vocabulary: recognition → recall → contextual use
- definition: recall → recognize examples/non-examples → apply
- conceptual: explain → compare → predict → apply
- procedural/rule: guided → independent → variation → error-correction
- classification: sort → compare → distinguish
- sequence: order → recall steps → predict next
- cause_effect: identify cause/effect → explain → predict
- problem_solving: interpret → select strategy → solve → apply to new context
- reading: recall → infer → interpret
- production: construct/apply independently (only if a supported question type can capture it)

COVERAGE: cover the lesson's core objectives meaningfully — not narrowly (all questions on one sub-skill) and not broadly (drifting into untaught material). Stay faithful to what was actually taught; use prerequisites only when needed; avoid extension material.

DIFFICULTY: progress from accessible → direct → varied → applied → challenging, but let difficulty come from the THINKING required, never from confusing wording or artificially large numbers.

VARIETY: vary format, wording, numbers, and representation when it's pedagogically useful — never just for novelty. Don't ask near-duplicate questions.

ADAPT TO PERFORMANCE (you'll be given per-skill stats and a learner profile):
- "mastered" skills: light retrieval only, or skip in favor of other objectives — don't over-practice what's already solid.
- "weak" skills: don't just repeat the same question — change the representation/format, reduce complexity, target the specific error pattern described in the profile if one is given.
- "developing": continue practicing, can vary format.
- "insufficient" / new: treat as unknown, start accessible.

QUALITY CHECK before including a question — relevance, clear purpose, accuracy, right level, clarity, answerable independently (not guessable from pattern), meaningfully different from other questions in this set.

QUESTION TYPES — you may ONLY use these exact values for "type": ${JSON.stringify(ACTIVE_QUESTION_TYPES)}. Pick whichever best serves the practice method — don't force every objective into "mcq".
- "mcq": "options" (4 strings), "correct_answer" (exact option text).
- "true_false": "correct_answer" in the lesson's language.
- "fill_blank": "question" contains "___"; "correct_answer" is the missing piece — good for recall/production-lite.
- "visual_count": ONLY for counting/comparison/small arithmetic skills. "asset" (exactly one of ${JSON.stringify(OPENMOJI_ASSETS)}), "quantity" (1-12), "options" (4 numbers), "correct_answer". If no asset fits, don't use this type.
- "text_highlight": ONLY for language/grammar/classification skills. "text" (a sentence, lesson's language), "target_words" (array of exact words copied verbatim from "text" to tap) — no options/correct_answer for this type.

Every question MUST include: id, type, question, explanation, objective_id (must match one of the given objectives' "id"), skill_key (copy from that objective), practice_method (one of: recall, recognition, application, production), purpose (one short sentence: what exactly will the child have practiced), difficulty (1-5).

QUESTION COUNT: decide this yourself, as part of the blueprint — do NOT default to a round number. Base it on how many objectives there are, their importance/complexity, and how much practice each genuinely needs per the framework (section 5). A lesson with 2 tight objectives might need 6-8 questions; a lesson with 5-6 objectives might need 16-20. Hard bounds: minimum 6, maximum 20 questions total.

Respond with ONLY this JSON:
{
  "topic": "...",
  "blueprint": {
    "objectives_covered": ["obj1", "obj3"],
    "question_count": 12,
    "notes": "1-2 sentences on the balance/adaptation decisions made, including why this many questions"
  },
  "questions": [ { "id": "q1", "type": "mcq", "question": "...", "options": [...], "correct_answer": "...", "explanation": "...", "objective_id": "obj1", "skill_key": "...", "practice_method": "recall", "purpose": "...", "difficulty": 1 } ]
}`

async function generateBlueprintAndQuestions(lesson: any, skillStats: any[], learnerProfile: any) {
  const userText = `LANGUAGE: write everything in "${lesson.language || 'the language of the lesson'}".

Lesson objectives for this session:
${JSON.stringify(lesson.objectives, null, 2)}

Per-skill stats for this kid (status is deterministic, computed from real attempts — trust it):
${JSON.stringify(skillStats, null, 2)}

Learner profile (narrative summary, may be null for a new kid):
${JSON.stringify(learnerProfile, null, 2)}

Decide the right number of questions yourself (minimum 6, maximum 20) based on the objectives and performance data. Return only the JSON.`
  return callClaude(FRAMEWORK_PROMPT, [{ type: 'text', text: userText }], 4500)
}

function validateQuestions(questions: any[], objectiveIds: string[]) {
  if (!Array.isArray(questions) || questions.length === 0) return 'No questions returned'
  if (questions.length < 6) return `Too few questions returned (${questions.length}, minimum 6)`
  if (questions.length > 20) return `Too many questions returned (${questions.length}, maximum 20)`
  for (const q of questions) {
    if (!q.id || !q.type || !q.question || !q.explanation || !q.objective_id || !q.skill_key || !q.practice_method || !q.purpose || !q.difficulty) {
      return `Malformed question (missing required field): ${JSON.stringify(q).slice(0, 200)}`
    }
    if (!objectiveIds.includes(q.objective_id)) return `Question references unknown objective_id "${q.objective_id}": ${q.id}`
    if (!ACTIVE_QUESTION_TYPES.includes(q.type)) return `Question used inactive type "${q.type}": ${q.id}`
    if ((q.type === 'mcq' || q.type === 'visual_count') && (!q.correct_answer || !Array.isArray(q.options) || !q.options.includes(q.correct_answer))) {
      return `${q.type} missing/invalid options or correct_answer: ${q.id}`
    }
    if ((q.type === 'true_false' || q.type === 'fill_blank') && !q.correct_answer) return `${q.type} missing correct_answer: ${q.id}`
    if (q.type === 'visual_count') {
      if (!OPENMOJI_ASSETS.includes(q.asset)) return `visual_count unapproved asset "${q.asset}": ${q.id}`
      if (!Number.isInteger(q.quantity) || q.quantity < 1 || q.quantity > 12) return `visual_count bad quantity: ${q.id}`
    }
    if (q.type === 'text_highlight') {
      if (typeof q.text !== 'string' || !q.text.trim()) return `text_highlight missing text: ${q.id}`
      if (!Array.isArray(q.target_words) || q.target_words.length === 0) return `text_highlight missing target_words: ${q.id}`
      for (const w of q.target_words) if (!q.text.includes(w)) return `text_highlight target_word "${w}" not in text: ${q.id}`
    }
  }
  return null
}

// ============================================================
// Learner profile refresh — small Haiku call, only when there's
// new attempt data since the last refresh.
// ============================================================
async function maybeRefreshLearnerProfile(sb: any, kidId: string) {
  const { count: totalAttempts } = await sb.from('question_attempts').select('id', { count: 'exact', head: true }).eq('kid_id', kidId)
  const { data: existing } = await sb.from('kid_learner_profiles').select('*').eq('kid_id', kidId).maybeSingle()

  const total = totalAttempts || 0
  if (existing && total - existing.attempts_at_last_update < 5) {
    return existing // not enough new data yet — don't spend a call
  }
  if (total < 5) return existing || null // too little data for any profile at all

  const { data: recentWrong } = await sb
    .from('question_attempts')
    .select('skill_key, question_type, given_answer, is_correct, created_at')
    .eq('kid_id', kidId).eq('is_correct', false)
    .order('created_at', { ascending: false }).limit(20)

  const { data: skills } = await sb.from('kid_skills').select('skill_key, skill_label, status, attempts, correct_count, format_stats').eq('kid_id', kidId)

  const system = `You update a short learning profile for a child, based ONLY on their practice data. Stay strictly about learning — skills, error patterns, formats they do better/worse with. NEVER comment on personality, character, effort, or behavior (no "lazy", "impatient", etc). If data is thin, say so honestly rather than overclaiming.

Respond with ONLY this JSON:
{
  "strengths": ["short phrases"], "weaknesses": ["short phrases"],
  "error_patterns": ["e.g. 'sometimes adds numerators and denominators separately when fractions have different denominators'"],
  "format_notes": "1 sentence, e.g. 'stronger with visual/mcq than fill_blank' or null if not enough evidence",
  "summary": "2-3 sentence narrative combining the above, written for another AI to use when designing the next practice session"
}`
  const userText = `Per-skill stats:\n${JSON.stringify(skills, null, 2)}\n\nRecent incorrect answers:\n${JSON.stringify(recentWrong, null, 2)}\n\nReturn only the JSON.`
  const { parsed } = await callClaude(system, [{ type: 'text', text: userText }], 800)

  const row = {
    kid_id: kidId, strengths: parsed.strengths || [], weaknesses: parsed.weaknesses || [],
    error_patterns: parsed.error_patterns || [], format_notes: parsed.format_notes || null,
    summary: parsed.summary || null, attempts_at_last_update: total, updated_at: new Date().toISOString(),
  }
  await sb.from('kid_learner_profiles').upsert(row)
  return row
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authError } = await sb.auth.getUser(jwt)
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { kid_id, mode, images, parent_exam_id, chapter_id } = body

    if (!kid_id) return jsonResponse({ error: 'kid_id required' }, 400)
    if (mode !== 'new' && mode !== 'practice_more') return jsonResponse({ error: 'mode must be "new" or "practice_more"' }, 400)
    if (mode === 'new' && (!images || !images.length)) return jsonResponse({ error: 'No images provided' }, 400)
    if (mode === 'practice_more' && !parent_exam_id) return jsonResponse({ error: 'parent_exam_id required for practice_more' }, 400)

    const { data: profileRow, error: profileErr } = await sb.from('profiles').select('subscription_status').eq('id', user.id).single()
    if (profileErr || !profileRow || profileRow.subscription_status !== 'active') return jsonResponse({ error: 'SUBSCRIPTION_ACTIVATING' }, 402)

    const { error: rateLimitErr } = await sb.rpc('increment_daily_quiz_count', { p_user_id: user.id })
    if (rateLimitErr) {
      const isRateLimit = rateLimitErr.message?.includes('Daily limit') || rateLimitErr.code === 'P0001'
      return jsonResponse({ error: isRateLimit ? 'RATE_LIMIT' : 'Service error. Please try again.' }, isRateLimit ? 429 : 500)
    }

    const { data: kid, error: kidErr } = await sb.from('kid_profiles').select('id, grade').eq('id', kid_id).eq('user_id', user.id).single()
    if (kidErr || !kid) return jsonResponse({ error: 'Kid not found' }, 404)

    let lessonAnalysisId: string
    let lesson: any
    let usageTotal = { input: 0, output: 0 }

    if (mode === 'new') {
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      const MAX_B64 = 7_000_000
      if (images.length > 5) return jsonResponse({ error: 'Max 5 images allowed' }, 400)
      for (const img of images) {
        if (!ALLOWED_TYPES.includes(img.mediaType)) return jsonResponse({ error: 'Invalid image type' }, 400)
        if (typeof img.data !== 'string' || img.data.length > MAX_B64) return jsonResponse({ error: 'Image too large' }, 400)
      }

      const { data: existingSkills } = await sb.from('kid_skills').select('skill_key, skill_label').eq('kid_id', kid_id)

      const phase1 = await analyzeLesson(images, existingSkills || [])
      lesson = phase1.parsed
      usageTotal.input += phase1.usage.input_tokens || 0
      usageTotal.output += phase1.usage.output_tokens || 0

      const { data: laRow, error: laErr } = await sb.from('lesson_analyses').insert({
        user_id: user.id, kid_id, subject: lesson.subject, topic: lesson.topic,
        language: lesson.language, grade_hint: lesson.grade_hint, page_text: lesson.page_text,
        objectives: lesson.objectives || [], raw: lesson,
      }).select('id').single()
      if (laErr) throw laErr
      lessonAnalysisId = laRow.id

      // Keep skill_label/knowledge_type fresh on kid_skills for any reused keys
      for (const obj of lesson.objectives || []) {
        try {
          await sb.from('kid_skills').upsert(
            { kid_id, skill_key: obj.skill_key, skill_label: obj.description, knowledge_type: obj.knowledge_type },
            { onConflict: 'kid_id,skill_key', ignoreDuplicates: false }
          )
        } catch (_) { /* best-effort label refresh, never blocks generation */ }
      }
    } else {
      const { data: parentExam, error: peErr } = await sb.from('exams').select('lesson_analysis_id, topic').eq('id', parent_exam_id).eq('kid_id', kid_id).single()
      if (peErr || !parentExam || !parentExam.lesson_analysis_id) return jsonResponse({ error: 'Parent exam has no linked lesson analysis' }, 400)
      lessonAnalysisId = parentExam.lesson_analysis_id
      const { data: laRow } = await sb.from('lesson_analyses').select('*').eq('id', lessonAnalysisId).single()
      lesson = { ...laRow.raw, objectives: laRow.objectives }
    }

    const objectiveIds = (lesson.objectives || []).map((o: any) => o.id)
    const skillKeys = (lesson.objectives || []).map((o: any) => o.skill_key)

    const { data: skillStats } = await sb.from('kid_skills').select('*').eq('kid_id', kid_id).in('skill_key', skillKeys)
    const learnerProfile = await maybeRefreshLearnerProfile(sb, kid_id)

    const phase2 = await generateBlueprintAndQuestions(lesson, skillStats || [], learnerProfile)
    usageTotal.input += phase2.usage.input_tokens || 0
    usageTotal.output += phase2.usage.output_tokens || 0

    const validationError = validateQuestions(phase2.parsed?.questions, objectiveIds)
    if (validationError) {
      console.error('Validation failed:', validationError)
      return jsonResponse({ error: 'Quiz generation failed' }, 500)
    }

    const { data: bpRow, error: bpErr } = await sb.from('practice_blueprints').insert({
      lesson_analysis_id: lessonAnalysisId, kid_id, blueprint: phase2.parsed.blueprint || {},
    }).select('id').single()
    if (bpErr) throw bpErr

    let revisionNumber = 0
    if (mode === 'practice_more') {
      const { count } = await sb.from('exams').select('id', { count: 'exact', head: true }).eq('parent_exam_id', parent_exam_id)
      revisionNumber = (count || 0) + 1
    }

    const { data: examRow, error: examErr } = await sb.from('exams').insert({
      user_id: user.id, kid_id, chapter_id: chapter_id || null,
      topic: phase2.parsed.topic || lesson.topic, questions: phase2.parsed.questions,
      page_text: lesson.page_text, is_revision: mode === 'practice_more', revision_number: revisionNumber,
      parent_exam_id: mode === 'practice_more' ? parent_exam_id : null,
      lesson_analysis_id: lessonAnalysisId, blueprint_id: bpRow.id,
    }).select('id, topic, page_text, questions').single()
    if (examErr) throw examErr

    // Haiku 4.5 pricing: $1/M in, $5/M out
    try {
      const costUsd = (usageTotal.input * 1 / 1_000_000) + (usageTotal.output * 5 / 1_000_000)
      await sb.from('usage_logs').insert({ user_id: user.id, image_count: mode === 'new' ? images.length : 0, input_tokens: usageTotal.input, output_tokens: usageTotal.output, cost_usd: costUsd })
    } catch (trackErr) { console.error('Usage tracking failed (non-fatal):', trackErr) }

    return jsonResponse({ id: examRow.id, topic: examRow.topic, page_text: examRow.page_text, questions: examRow.questions })
  } catch (err) {
    console.error('Edge Function error:', err)
    return jsonResponse({ error: 'Service error. Please try again.' }, 500)
  }
})
