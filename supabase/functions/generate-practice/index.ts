// supabase/functions/generate-practice/index.ts
//
// Replaces generate-exam. Runs all 4 phases of the Numio Practice
// Protocol in one Edge Function call:
//   A. Lesson analysis   (photo → what's being taught)      — skipped in "practice_more" mode
//   B. Curriculum alignment (+ profile → what they should know) — skipped in "practice_more" mode
//   C. Practice plan      (+ performance → what to practise, how)
//   D. Question generation (plan + allowed types → structured questions)
//
// "practice_more" mode reuses the parent exam's lesson_analysis_id
// and curriculum_alignment_id (Phase A/B don't change) and only
// re-runs Phase C/D with fresh performance data.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MODEL = 'claude-sonnet-5'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://numiomath.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================================
// LOCKED REGISTRY — the AI may only use a type that has a real
// frontend component already built. Add to ACTIVE as components
// ship; never let the AI use anything not in ACTIVE.
// ============================================================
const ACTIVE_QUESTION_TYPES = ['mcq', 'true_false', 'fill_blank'] as const

// Full target roster from the master plan — NOT yet active.
// Move an entry up to ACTIVE_QUESTION_TYPES only once its
// frontend component exists in src/components/questions/.
// const PLANNED_QUESTION_TYPES = [
//   'multi_select', 'order', 'match', 'sort', 'drag_drop',
//   'text_highlight', 'number_line', 'visual_count',
//   'visual_compare', 'fraction_visual', 'image_label', 'word_problem',
// ]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function callClaude(system: string, content: any[], maxTokens = 4000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error: ${err}`)
  }
  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  const usage = data.usage || {}
  const clean = text.replace(/^```(?:json)?[^\n]*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  return { parsed: JSON.parse(clean), usage }
}

// ── Phase A — Lesson analysis (multimodal) ────────────────────
async function analyzeLesson(images: { data: string; mediaType: string }[]) {
  const system = `You analyze photos of a child's schoolwork (textbook page, worksheet, handwritten notes) for a practice app for kids aged 6-12.

Extract ONLY what is actually visible. Do not invent content.

Respond with ONLY this JSON, no markdown, no preamble:
{
  "subject": "e.g. Mathematics",
  "topic": "short topic name, in the detected language",
  "subtopics": ["..."],
  "concepts": ["..."],
  "skills": ["specific, testable skills, e.g. 'compare two 2-digit numbers using < > ='"],
  "language": "detected language of the content",
  "difficulty": "as implied by the material (e.g. beginner/intermediate)",
  "vocabulary": ["important terms shown"],
  "notation": "any special math/grammar/science notation present, or null",
  "page_text": "full extracted text, word for word, preserving structure"
}`
  const content = images.map((img) => ({
    type: 'image',
    source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data },
  }))
  content.push({ type: 'text', text: 'Analyze this lesson content and return only the JSON.' })
  return callClaude(system, content, 2000)
}

// ── Phase B — Curriculum alignment (text only) ────────────────
async function alignCurriculum(lesson: any, profile: { country?: string; region?: string; grade?: string }) {
  const system = `You determine what a child is expected to know/do for a given skill, based on their country/region/grade.

Prioritize, in order: (1) official government curriculum for that country/region/grade if you know it, (2) well-established educational standards/organizations, (3) general age-appropriate pedagogy if neither is known with confidence. Be honest in "confidence" — don't fabricate a specific curriculum code you're not sure exists.

Respond with ONLY this JSON:
{
  "expected_knowledge": ["what the child should know/be able to do at this grade, for this skill"],
  "source_tier": "official_curriculum" | "educational_standards" | "general_pedagogy",
  "confidence": "high" | "medium" | "low",
  "notes": "short note on any grade-level adjustment made"
}`
  const userText = `Country: ${profile.country || 'unknown'}
Region: ${profile.region || 'none specified'}
Grade: ${profile.grade || 'unknown'}

Lesson analysis:
${JSON.stringify(lesson, null, 2)}

Return only the JSON.`
  return callClaude(system, [{ type: 'text', text: userText }], 1200)
}

// ── Phase C — Practice plan ────────────────────────────────────
async function buildPracticePlan(lesson: any, alignment: any, performance: any[]) {
  const system = `You design a practice plan following the Numio Practice Protocol:
1. Identify the exact target skill being practised.
2. Break it into 4-8 concrete subskills.
3. Determine a starting difficulty (1-5) and how it should progress, using the performance data given — go easier on skills marked "weak", push harder on skills marked "mastered".
4. Select a varied SET of exercise forms so the child doesn't just get the same question shape repeated. Only choose forms from ACTIVE_QUESTION_TYPES (given below) — never invent a form with no matching type.

ACTIVE_QUESTION_TYPES: ${JSON.stringify(ACTIVE_QUESTION_TYPES)}

Respond with ONLY this JSON:
{
  "target_skill": "...",
  "subskills": ["...", "..."],
  "starting_difficulty": 1,
  "exercise_forms": ["mcq", "true_false"],
  "plan_notes": "1-2 sentences on why this mix, referencing the performance data if relevant"
}`
  const userText = `Lesson analysis:
${JSON.stringify(lesson, null, 2)}

Curriculum alignment:
${JSON.stringify(alignment, null, 2)}

Recent performance for this kid (compact summary, may be empty for a first-ever session):
${JSON.stringify(performance, null, 2)}

Return only the JSON.`
  return callClaude(system, [{ type: 'text', text: userText }], 1200)
}

// ── Phase D — Question generation ──────────────────────────────
async function generateQuestions(plan: any, lesson: any, questionCount: number) {
  const system = `You generate practice questions for a kids' learning app, following the practice plan exactly.

LANGUAGE: write everything in "${lesson.language || 'the language of the lesson'}". True/false answers must be in that language too (e.g. French: "Vrai"/"Faux").

Only use question types from this exact list — never any other value for "type": ${JSON.stringify(ACTIVE_QUESTION_TYPES)}.

Every question MUST include: id, type, question, correct_answer, explanation, skill (one of the plan's subskills, or the target_skill), difficulty (1-5, following the plan's progression).
- type "mcq": include "options" (array of 4 strings); correct_answer must be the exact text of one option, never a letter.
- type "true_false": correct_answer must be in the lesson's language.
- type "fill_blank": question contains "___"; correct_answer is the missing word/value.

Generate exactly ${questionCount} questions. Vary the exercise form across the plan's exercise_forms — do not just repeat one shape. Every question must genuinely practise one of the plan's subskills, not just look different.

Respond with ONLY this JSON:
{
  "topic": "...",
  "questions": [ { "id": "q1", "type": "mcq", "question": "...", "options": ["...","...","...","..."], "correct_answer": "...", "explanation": "...", "skill": "...", "difficulty": 1 } ]
}`
  const userText = `Practice plan:
${JSON.stringify(plan, null, 2)}

Return only the JSON.`
  return callClaude(system, [{ type: 'text', text: userText }], 4000)
}

function validateQuestions(questions: any[]) {
  if (!Array.isArray(questions) || questions.length === 0) return 'No questions returned'
  for (const q of questions) {
    if (!q.id || !q.type || !q.question || !q.correct_answer || !q.skill || !q.difficulty) {
      return `Malformed question: ${JSON.stringify(q).slice(0, 200)}`
    }
    if (!ACTIVE_QUESTION_TYPES.includes(q.type)) {
      return `Question used inactive type "${q.type}": ${JSON.stringify(q).slice(0, 150)}`
    }
    if (q.type === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length < 2) return `MCQ without options: ${q.id}`
      if (!q.options.includes(q.correct_answer)) return `MCQ correct_answer not in options: ${q.id}`
    }
  }
  return null
}

// ── Compact performance summary for this kid ──────────────────
async function getPerformanceSummary(sb: any, kidId: string) {
  const { data, error } = await sb
    .from('question_attempts')
    .select('skill, is_correct')
    .eq('kid_id', kidId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error || !data || data.length === 0) return []

  const bySkill: Record<string, { correct: number; total: number }> = {}
  for (const row of data) {
    if (!row.skill) continue
    bySkill[row.skill] ||= { correct: 0, total: 0 }
    bySkill[row.skill].total++
    if (row.is_correct) bySkill[row.skill].correct++
  }
  return Object.entries(bySkill).map(([skill, s]) => {
    const acc = s.correct / s.total
    const status = s.total < 2 ? 'new' : acc >= 0.8 ? 'mastered' : acc < 0.5 ? 'weak' : 'developing'
    return { skill, accuracy: Math.round(acc * 100), attempts: s.total, status }
  })
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

    // Subscription check
    const { data: profileRow, error: profileErr } = await sb
      .from('profiles').select('subscription_status').eq('id', user.id).single()
    if (profileErr || !profileRow || profileRow.subscription_status !== 'active') {
      return jsonResponse({ error: 'SUBSCRIPTION_ACTIVATING' }, 402)
    }

    // Rate limit — same RPC as before
    const { error: rateLimitErr } = await sb.rpc('increment_daily_quiz_count', { p_user_id: user.id })
    if (rateLimitErr) {
      const isRateLimit = rateLimitErr.message?.includes('Daily limit') || rateLimitErr.code === 'P0001'
      return jsonResponse({ error: isRateLimit ? 'RATE_LIMIT' : 'Service error. Please try again.' }, isRateLimit ? 429 : 500)
    }

    // Kid profile — education context
    const { data: kid, error: kidErr } = await sb
      .from('kid_profiles').select('id, country, region, grade').eq('id', kid_id).eq('user_id', user.id).single()
    if (kidErr || !kid) return jsonResponse({ error: 'Kid not found' }, 404)

    let lessonAnalysisId: string
    let curriculumAlignmentId: string
    let lesson: any
    let alignment: any
    let usageTotal = { input: 0, output: 0 }

    if (mode === 'new') {
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      const MAX_B64 = 7_000_000
      if (images.length > 5) return jsonResponse({ error: 'Max 5 images allowed' }, 400)
      for (const img of images) {
        if (!ALLOWED_TYPES.includes(img.mediaType)) return jsonResponse({ error: 'Invalid image type' }, 400)
        if (typeof img.data !== 'string' || img.data.length > MAX_B64) return jsonResponse({ error: 'Image too large' }, 400)
      }

      const phaseA = await analyzeLesson(images)
      lesson = phaseA.parsed
      usageTotal.input += phaseA.usage.input_tokens || 0
      usageTotal.output += phaseA.usage.output_tokens || 0

      const { data: laRow, error: laErr } = await sb.from('lesson_analyses').insert({
        user_id: user.id, kid_id,
        subject: lesson.subject, topic: lesson.topic, subtopics: lesson.subtopics || [],
        concepts: lesson.concepts || [], skills: lesson.skills || [], language: lesson.language,
        difficulty: lesson.difficulty, vocabulary: lesson.vocabulary || [], notation: lesson.notation,
        page_text: lesson.page_text, raw: lesson,
      }).select('id').single()
      if (laErr) throw laErr
      lessonAnalysisId = laRow.id

      const phaseB = await alignCurriculum(lesson, kid)
      alignment = phaseB.parsed
      usageTotal.input += phaseB.usage.input_tokens || 0
      usageTotal.output += phaseB.usage.output_tokens || 0

      const { data: caRow, error: caErr } = await sb.from('curriculum_alignments').insert({
        lesson_analysis_id: lessonAnalysisId, kid_id,
        country: kid.country, region: kid.region, grade: kid.grade,
        expected_knowledge: alignment.expected_knowledge || [], source_tier_used: alignment.source_tier, raw: alignment,
      }).select('id').single()
      if (caErr) throw caErr
      curriculumAlignmentId = caRow.id
    } else {
      // practice_more — reuse Phase A/B from the parent exam
      const { data: parentExam, error: peErr } = await sb
        .from('exams').select('lesson_analysis_id, curriculum_alignment_id, topic')
        .eq('id', parent_exam_id).eq('kid_id', kid_id).single()
      if (peErr || !parentExam || !parentExam.lesson_analysis_id || !parentExam.curriculum_alignment_id) {
        return jsonResponse({ error: 'Parent exam has no linked lesson analysis — cannot practice_more on it' }, 400)
      }
      lessonAnalysisId = parentExam.lesson_analysis_id
      curriculumAlignmentId = parentExam.curriculum_alignment_id

      const { data: laRow } = await sb.from('lesson_analyses').select('*').eq('id', lessonAnalysisId).single()
      const { data: caRow } = await sb.from('curriculum_alignments').select('*').eq('id', curriculumAlignmentId).single()
      lesson = laRow.raw
      alignment = caRow.raw
    }

    // Phase C
    const performance = await getPerformanceSummary(sb, kid_id)
    const phaseC = await buildPracticePlan(lesson, alignment, performance)
    const plan = phaseC.parsed
    usageTotal.input += phaseC.usage.input_tokens || 0
    usageTotal.output += phaseC.usage.output_tokens || 0

    const { data: ppRow, error: ppErr } = await sb.from('practice_plans').insert({
      lesson_analysis_id: lessonAnalysisId, curriculum_alignment_id: curriculumAlignmentId, kid_id,
      target_skill: plan.target_skill, subskills: plan.subskills || [],
      starting_difficulty: plan.starting_difficulty, exercise_forms: plan.exercise_forms || [],
      performance_used: performance, raw: plan,
    }).select('id').single()
    if (ppErr) throw ppErr

    // Phase D
    const phaseD = await generateQuestions(plan, lesson, 15)
    usageTotal.input += phaseD.usage.input_tokens || 0
    usageTotal.output += phaseD.usage.output_tokens || 0

    const validationError = validateQuestions(phaseD.parsed?.questions)
    if (validationError) {
      console.error('Validation failed:', validationError)
      return jsonResponse({ error: 'Quiz generation failed' }, 500)
    }

    // Determine revision chaining (mirrors old regenerate-exam behavior)
    let revisionNumber = 0
    if (mode === 'practice_more') {
      const { count } = await sb.from('exams').select('id', { count: 'exact', head: true }).eq('parent_exam_id', parent_exam_id)
      revisionNumber = (count || 0) + 1
    }

    const { data: examRow, error: examErr } = await sb.from('exams').insert({
      user_id: user.id, kid_id, chapter_id: chapter_id || null,
      topic: phaseD.parsed.topic || lesson.topic,
      questions: phaseD.parsed.questions,
      page_text: lesson.page_text,
      is_revision: mode === 'practice_more',
      revision_number: revisionNumber,
      parent_exam_id: mode === 'practice_more' ? parent_exam_id : null,
      lesson_analysis_id: lessonAnalysisId,
      curriculum_alignment_id: curriculumAlignmentId,
      practice_plan_id: ppRow.id,
    }).select('id, topic, page_text, questions').single()
    if (examErr) throw examErr

    // Usage tracking — Sonnet 5 pricing: $3/M in, $15/M out per existing convention
    try {
      const costUsd = (usageTotal.input * 3 / 1_000_000) + (usageTotal.output * 15 / 1_000_000)
      await sb.from('usage_logs').insert({
        user_id: user.id, image_count: mode === 'new' ? images.length : 0,
        input_tokens: usageTotal.input, output_tokens: usageTotal.output, cost_usd: costUsd,
      })
    } catch (trackErr) {
      console.error('Usage tracking failed (non-fatal):', trackErr)
    }

    return jsonResponse({ id: examRow.id, topic: examRow.topic, page_text: examRow.page_text, questions: examRow.questions })
  } catch (err) {
    console.error('Edge Function error:', err)
    return jsonResponse({ error: 'Service error. Please try again.' }, 500)
  }
})
