// supabase/functions/generate-practice-trial/index.ts
// Identical to generate-practice EXCEPT:
//   - No subscription check
//   - No daily rate limit
//   - Enforces one quiz per trial_session (quiz_used flag)
//   - Forces exactly 7 questions (the 7 most important)
//   - Saves no kid_skills / learner profiles (trial is stateless)
//   - CORS allows the trial page origin

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MODEL = 'claude-haiku-4-5-20251001'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // trial page can be on any origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ACTIVE_QUESTION_TYPES = ['mcq', 'true_false', 'fill_blank', 'visual_count', 'text_highlight'] as const
const OPENMOJI_ASSETS = ['bird','cow','cat','dog','fish','apple','banana','star','ball','tree','book','pencil','car','bus','flower']
const KNOWLEDGE_TYPES = ['factual','vocabulary','definition','conceptual','procedural','rule','classification','sequence','cause_effect','problem_solving','reading','production']

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

async function callClaude(system: string, content: any[], maxTokens = 3000) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
  })
  if (!res.ok) throw new Error(`Claude API error: ${await res.text()}`)
  const data = await res.json()
  const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
  const clean = text.replace(/^```(?:json)?[^\n]*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  return JSON.parse(clean)
}

async function analyzeLesson(images: { data: string; mediaType: string }[]) {
  const system = `You analyze a photo of a child's schoolwork for a practice app (ages 6-12).

1. Identify subject, topic, language, and grade/level if inferable.
2. Break the lesson into specific, observable LEARNING OBJECTIVES. Prioritize by importance — pick the 3 most important ones only.
3. Classify each objective's knowledge type, exactly one of: ${JSON.stringify(KNOWLEDGE_TYPES)}.
4. Mark priority: "core", "supporting", or "prerequisite".
5. Give each a stable skill_key like "math.fractions.add_same_denominator".

Extract only what's in the photo. Return ONLY this JSON:
{
  "subject": "...", "topic": "...", "language": "...", "grade_hint": "...",
  "page_text": "full extracted text",
  "objectives": [
    { "id": "obj1", "skill_key": "...", "description": "...", "knowledge_type": "procedural", "priority": "core" }
  ]
}`
  const content = images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data } }))
  content.push({ type: 'text', text: 'Analyze this lesson and return only the JSON.' })
  return callClaude(system, content, 1500)
}

async function generateTrialQuestions(lesson: any) {
  const system = `You are designing a 7-question trial quiz for a kids' learning app.

RULES:
- Generate EXACTLY 7 questions — no more, no less.
- Pick the 3 MOST IMPORTANT things to test from the lesson objectives.
- Use varied question types from: ${JSON.stringify(ACTIVE_QUESTION_TYPES)}
- Write everything in the SAME LANGUAGE as the lesson (language: "${lesson.language}").
- Questions must be clear, age-appropriate (6-12), and directly tied to the lesson.

QUESTION TYPE RULES:
- "mcq": 4 options, correct_answer must be exact option text.
- "true_false": correct_answer in lesson language.
- "fill_blank": question contains "___", correct_answer is the missing word/phrase.
- "visual_count": ONLY for counting. "asset" from ${JSON.stringify(OPENMOJI_ASSETS)}, "quantity" 1-12, 4 number options.
- "text_highlight": ONLY for language/grammar. "text" (a sentence), "target_words" (exact words from text to tap).

Every question needs: id, type, question, explanation, objective_id, skill_key, practice_method, purpose, difficulty (1-5).

Return ONLY this JSON:
{
  "topic": "...",
  "questions": [
    { "id": "q1", "type": "mcq", "question": "...", "options": [...], "correct_answer": "...", "explanation": "...", "objective_id": "obj1", "skill_key": "...", "practice_method": "recall", "purpose": "...", "difficulty": 2 }
  ]
}`

  const userText = `Lesson objectives:\n${JSON.stringify(lesson.objectives, null, 2)}\n\nGenerate exactly 7 questions. Return only the JSON.`
  return callClaude(system, [{ type: 'text', text: userText }], 4000)
}

function validateQuestions(questions: any[], objectiveIds: string[]) {
  if (!Array.isArray(questions)) return 'No questions array'
  if (questions.length !== 7) return `Expected 7 questions, got ${questions.length}`
  for (const q of questions) {
    if (!q.id || !q.type || !q.question || !q.explanation) return `Malformed question: ${q.id}`
    if (!ACTIVE_QUESTION_TYPES.includes(q.type)) return `Bad type: ${q.type}`
    if ((q.type === 'mcq' || q.type === 'visual_count') && (!q.correct_answer || !Array.isArray(q.options) || !q.options.includes(q.correct_answer))) return `MCQ bad options: ${q.id}`
    if ((q.type === 'true_false' || q.type === 'fill_blank') && !q.correct_answer) return `Missing correct_answer: ${q.id}`
    if (q.type === 'visual_count') {
      if (!OPENMOJI_ASSETS.includes(q.asset)) return `Bad asset: ${q.asset}`
      if (!Number.isInteger(q.quantity) || q.quantity < 1 || q.quantity > 12) return `Bad quantity: ${q.id}`
    }
    if (q.type === 'text_highlight') {
      if (!q.text?.trim()) return `Missing text: ${q.id}`
      if (!Array.isArray(q.target_words) || q.target_words.length === 0) return `Missing target_words: ${q.id}`
      for (const w of q.target_words) if (!q.text.includes(w)) return `Word "${w}" not in text: ${q.id}`
    }
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })

  try {
    // Auth — anon user via JWT
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authError } = await sb.auth.getUser(jwt)
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { images, trial_session_id } = body

    if (!images || !images.length) return jsonResponse({ error: 'No images provided' }, 400)
    if (!trial_session_id) return jsonResponse({ error: 'trial_session_id required' }, 400)

    // Check trial not already used
    const { data: trialRow, error: trialErr } = await sb
      .from('trial_sessions')
      .select('*')
      .eq('id', trial_session_id)
      .eq('anonymous_id', user.id)
      .single()

    if (trialErr || !trialRow) return jsonResponse({ error: 'Trial session not found' }, 404)
    if (trialRow.quiz_used) return jsonResponse({ error: 'TRIAL_USED' }, 403)

    // Validate images
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const MAX_B64 = 7_000_000
    if (images.length > 5) return jsonResponse({ error: 'Max 5 images' }, 400)
    for (const img of images) {
      if (!ALLOWED_TYPES.includes(img.mediaType)) return jsonResponse({ error: 'Invalid image type' }, 400)
      if (typeof img.data !== 'string' || img.data.length > MAX_B64) return jsonResponse({ error: 'Image too large' }, 400)
    }

    // Phase 1: analyze lesson
    const lesson = await analyzeLesson(images)
    const objectiveIds = (lesson.objectives || []).map((o: any) => o.id)

    // Phase 2: generate exactly 7 questions
    const phase2 = await generateTrialQuestions(lesson)
    const questions = phase2.questions

    const validationError = validateQuestions(questions, objectiveIds)
    if (validationError) {
      console.error('Validation failed:', validationError)
      return jsonResponse({ error: 'Quiz generation failed. Please try again.' }, 500)
    }

    // Mark trial used
    await sb.from('trial_sessions').update({ quiz_used: true }).eq('id', trial_session_id)

    return jsonResponse({
      id: `trial-${Date.now()}`,
      topic: phase2.topic || lesson.topic,
      page_text: lesson.page_text,
      questions,
    })
  } catch (err) {
    console.error('Trial edge function error:', err)
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
