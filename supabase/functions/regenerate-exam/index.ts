import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://numiomath.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `You are an exam generator for kids aged 6 to 12 years old.

You will receive the full extracted text from a textbook page or educational document, plus a list of questions that were already asked about this content.

LANGUAGE RULE — THIS IS THE MOST IMPORTANT RULE:
Detect the language of the provided text. Write ALL questions, options, answers, and explanations in that SAME language.
- If the text is in French → everything in French, true/false answers must be "Vrai" or "Faux"
- If the text is in Arabic → everything in Arabic, true/false answers must be "صحيح" or "خطأ"
- If the text is in Spanish → everything in Spanish, true/false answers must be "Verdadero" or "Falso"
- If the text is in English → everything in English, true/false answers are "True" or "False"
- Never mix languages.

Your job is to:
1. Read the full page text carefully
2. Look at the already-asked questions to understand what was already covered
3. Generate exactly 15 NEW questions about the SAME content
4. Prioritize concepts, angles, and details NOT covered in the already-asked questions
5. If the content is limited, it is OK to rephrase concepts differently — but never copy a question word for word
6. Choose the best question format:
   - Multiple choice (MCQ) for facts, definitions, math
   - True/False for concepts and statements
   - Fill in the blank for vocabulary or simple recall
7. Make the language simple, fun, and encouraging

CRITICAL RULES:
- For MCQ: correct_answer MUST be the exact full text of one of the options — NEVER a letter like "A" or "B"
- For true/false: correct_answer MUST be in the detected language
- ONLY ask questions about actual knowledge/content — never about titles, page numbers, headers, or document structure
- Every question must help the child LEARN and UNDERSTAND the subject matter
- Mix question types naturally (aim for roughly 7 MCQ, 4 true/false, 4 fill in the blank)
- Use different distractors (wrong options) than the ones already used

You MUST respond with ONLY a valid JSON object — no markdown, no backticks, no preamble.

{
  "topic": "Same topic name as the original",
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option B",
      "explanation": "Kid-friendly explanation."
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "Statement here.",
      "correct_answer": "Vrai",
      "explanation": "Explanation."
    },
    {
      "id": 3,
      "type": "fill_blank",
      "question": "The ___ is the closest planet.",
      "correct_answer": "Mercury",
      "explanation": "Explanation."
    }
  ]
}

Generate exactly 15 questions total.`


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })

  try {
    // ── Auth ─────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authError } = await sb.auth.getUser(jwt)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Parse body ───────────────────────────────────────────────
    const { exam_id, chapter_id, kid_id } = await req.json()

    if (!exam_id || !chapter_id || !kid_id) {
      return new Response(
        JSON.stringify({ error: 'exam_id, chapter_id, and kid_id are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Subscription check ───────────────────────────────────────
    {
      const { data: profile, error: profileErr } = await sb
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      if (profileErr || !profile || profile.subscription_status !== 'active') {
        return new Response(
          JSON.stringify({ error: 'SUBSCRIPTION_ACTIVATING' }),
          { status: 402, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── Fetch the root exam (always use the original for page_text) ──
    // Walk up to find the root: if this exam has a parent, fetch that instead
    const { data: sourceExam, error: examErr } = await sb
      .from('exams')
      .select('id, topic, questions, page_text, parent_exam_id, revision_number, user_id')
      .eq('id', exam_id)
      .single()

    if (examErr || !sourceExam) {
      return new Response(
        JSON.stringify({ error: 'Exam not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Security: make sure this exam belongs to this user
    if (sourceExam.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Resolve the root exam to get page_text and collect all already-asked questions
    let rootExamId = sourceExam.parent_exam_id || sourceExam.id
    let pageText = sourceExam.page_text
    let topic = sourceExam.topic

    if (sourceExam.parent_exam_id) {
      // This is already a revision — fetch the root
      const { data: rootExam } = await sb
        .from('exams')
        .select('id, topic, page_text')
        .eq('id', sourceExam.parent_exam_id)
        .single()
      if (rootExam) {
        pageText = rootExam.page_text || pageText
        topic = rootExam.topic || topic
        rootExamId = rootExam.id
      }
    }

    if (!pageText) {
      return new Response(
        JSON.stringify({ error: 'NO_PAGE_TEXT' }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch ALL exams in this chapter for this kid to collect already-asked questions
    const { data: allExams } = await sb
      .from('exams')
      .select('questions')
      .eq('chapter_id', chapter_id)
      .eq('kid_id', kid_id)

    const alreadyAsked: any[] = []
    if (allExams) {
      for (const e of allExams) {
        if (Array.isArray(e.questions)) {
          alreadyAsked.push(...e.questions)
        }
      }
    }

    // ── Rate limit ───────────────────────────────────────────────
    {
      const today = new Date().toISOString().split('T')[0]
      const { count: authCount, error: countErr } = await sb
        .from('usage_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`)
      if (countErr || authCount === null || authCount >= 500) {
        return new Response(
          JSON.stringify({ error: 'DAILY_LIMIT' }),
          { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      const { error: rateLimitErr } = await sb.rpc('increment_daily_quiz_count', { p_user_id: user.id })
      if (rateLimitErr) {
        const isRateLimit = rateLimitErr.message?.includes('Daily limit') || rateLimitErr.code === 'P0001'
        return new Response(
          JSON.stringify({ error: isRateLimit ? 'RATE_LIMIT' : 'Service error. Please try again.' }),
          { status: isRateLimit ? 429 : 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── Determine revision number ─────────────────────────────────
    const { count: revisionCount } = await sb
      .from('exams')
      .select('id', { count: 'exact', head: true })
      .eq('parent_exam_id', rootExamId)

    const newRevisionNumber = (revisionCount || 0) + 2 // +2 because original is v1

    // ── Call Claude ──────────────────────────────────────────────
    const userMessage = `Topic: ${topic}

Full page text:
${pageText}

Already asked questions (do NOT repeat these concepts word for word — cover new angles):
${JSON.stringify(alreadyAsked.map(q => ({ question: q.question, correct_answer: q.correct_answer })), null, 2)}

Generate 15 new questions about this content, focusing on angles and details not yet covered above.`

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text()
      console.error('Claude API error:', err)
      return new Response(
        JSON.stringify({ error: 'Quiz generation failed' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const claudeData = await claudeResponse.json()
    const rawText = claudeData.content?.[0]?.text || ''
    const usage = claudeData.usage || {}

    // ── Parse ────────────────────────────────────────────────────
    let newExamData
    try {
      const clean = rawText
        .replace(/^```(?:json)?[^\n]*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim()
      newExamData = JSON.parse(clean)

      if (!newExamData || !Array.isArray(newExamData.questions) || newExamData.questions.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Quiz generation failed' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
      for (const q of newExamData.questions) {
        if (!q.type || !q.question || !q.correct_answer) {
          return new Response(
            JSON.stringify({ error: 'Quiz generation failed' }),
            { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          )
        }
        if (q.type === 'mcq' && (!Array.isArray(q.options) || q.options.length < 2)) {
          return new Response(
            JSON.stringify({ error: 'Quiz generation failed' }),
            { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          )
        }
      }
    } catch {
      console.error('Failed to parse Claude JSON:', rawText)
      return new Response(
        JSON.stringify({ error: 'Quiz generation failed' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Save new exam row ────────────────────────────────────────
    const revisionTopic = `${topic} (v${newRevisionNumber})`

    const { data: savedExam, error: saveErr } = await sb
      .from('exams')
      .insert({
        user_id:         user.id,
        chapter_id:      chapter_id,
        kid_id:          kid_id,
        topic:           revisionTopic,
        questions:       newExamData.questions,
        page_text:       pageText, // carry over so future revisions can also use it
        is_revision:     true,
        revision_number: newRevisionNumber,
        parent_exam_id:  rootExamId,
      })
      .select()
      .single()

    if (saveErr || !savedExam) {
      console.error('Failed to save revision exam:', saveErr)
      return new Response(
        JSON.stringify({ error: 'Failed to save revision exam' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Usage tracking ───────────────────────────────────────────
    try {
      const costUsd =
        ((usage.input_tokens || 0) * 3 / 1_000_000) +
        ((usage.output_tokens || 0) * 15 / 1_000_000)

      await sb.from('usage_logs').insert({
        user_id:       user.id,
        image_count:   0,
        input_tokens:  usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cost_usd:      costUsd,
      })
    } catch (trackErr) {
      console.error('Usage tracking failed (non-fatal):', trackErr)
    }

    return new Response(
      JSON.stringify(savedExam),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Edge Function error:', err)
    return new Response(
      JSON.stringify({ error: 'Service error. Please try again.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
