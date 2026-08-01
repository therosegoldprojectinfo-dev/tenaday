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

The user will send you one or more images of pages they want to learn from — textbook pages, handwritten notes, worksheets, diagrams, anything educational. Treat all images as one coherent document.

LANGUAGE RULE — THIS IS THE MOST IMPORTANT RULE:
Detect the language of the educational content in the images. Write ALL questions, options, answers, and explanations in that SAME language.
- If the image content is in French → everything in French, true/false answers must be "Vrai" or "Faux"
- If the image content is in Arabic → everything in Arabic, true/false answers must be "صحيح" or "خطأ"
- If the image content is in Spanish → everything in Spanish, true/false answers must be "Verdadero" or "Falso"
- If the image content is in English → everything in English, true/false answers are "True" or "False"
- Never mix languages. Never write "True" or "False" if the content is not in English.

Your job is to:
1. Analyze ALL images together as one document
2. Detect the language of the content
3. Generate exactly 15 questions covering the content across all pages
4. Write EVERYTHING in the detected language
5. Choose the best question format:
   - Multiple choice (MCQ) for facts, definitions, math
   - True/False for concepts and statements — answers MUST be in the image's language
   - Fill in the blank for vocabulary or simple recall
6. Make the language simple, fun, and encouraging

CRITICAL RULES:
- ONLY ask questions about the actual knowledge/content (math concepts, facts, vocabulary, science, history, etc.)
- NEVER ask about titles, page numbers, headers, footers, or document structure
- Every question must help the child LEARN and UNDERSTAND the subject matter
- Mix question types naturally (aim for roughly 7 MCQ, 4 true/false, 4 fill in the blank)

You MUST respond with ONLY a valid JSON object — no markdown, no backticks, no preamble.

{
  "topic": "Short topic name in the image's language",
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "B",
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

Generate exactly {QUESTION_COUNT} questions total.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })

  try {
    // ── Auth: verify real user session JWT ───────────────────────
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authError } = await sb.auth.getUser(jwt)

    // P0 fix: block completely unauthenticated requests
    // Allow anonymous users for trial (1 call, 5 questions max — enforced below)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const isAnonymous = user.is_anonymous === true

    // ── Trial limit (anonymous users) ────────────────────────────
    if (isAnonymous) {
      // 1. Per-session limit: check if this anonymous_id already has a trial
      const { data: existingTrials, error: trialErr } = await sb
        .from('trial_logs')
        .select('id')
        .eq('anonymous_id', user.id)
        .limit(1)
      if (!trialErr && existingTrials && existingTrials.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Trial already used. Create a free account to continue.' }),
          { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      // 2. Global daily cap: max 100 trials per day across all anonymous users
      // Prevents mass abuse when running paid ads
      const today = new Date().toISOString().split('T')[0]
      const { count: dailyTrials } = await sb
        .from('trial_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`)
      if (dailyTrials && dailyTrials >= 100) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable. Please try again tomorrow.' }),
          { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── Parse body + validate BEFORE rate limit ───────────────────
    // So malformed requests don't burn the user's daily quota
    const { images, is_trial } = await req.json()

    // Trial mode: 5 questions, 1 image max
    const isTrial = is_trial === true || isAnonymous
    const questionCount = isTrial ? 5 : 15

    if (isTrial && images?.length > 1) {
      return new Response(
        JSON.stringify({ error: 'Trial mode allows 1 image only' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (!images || !images.length) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (images.length > 5) {
      return new Response(
        JSON.stringify({ error: 'Max 5 images allowed' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const MAX_B64 = 7_000_000 // ~5MB decoded
    for (const img of images) {
      if (!ALLOWED_TYPES.includes(img.mediaType)) {
        return new Response(
          JSON.stringify({ error: 'Invalid image type' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
      if (typeof img.data !== 'string' || img.data.length > MAX_B64) {
        return new Response(
          JSON.stringify({ error: 'Image too large' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── Rate limit (AFTER validation so bad requests don't burn quota) ──
    if (!isAnonymous) {
      const { error: rateLimitErr } = await sb.rpc('increment_daily_quiz_count', { p_user_id: user.id })
      if (rateLimitErr) {
        const isRateLimit = rateLimitErr.message?.includes('Daily limit') || rateLimitErr.code === 'P0001'
        return new Response(
          JSON.stringify({ error: isRateLimit ? 'RATE_LIMIT' : 'Service error. Please try again.' }),
          { status: isRateLimit ? 429 : 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Build content array — all images + instruction text
    const content: any[] = images.map((img: { data: string; mediaType: string }) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType || 'image/jpeg', data: img.data },
    }))

    content.push({
      type: 'text',
      text: `Generate exactly ${questionCount} quiz questions from the educational content in ${images.length > 1 ? `these ${images.length} pages` : 'this image'}. Only ask about the actual subject matter — never about titles, headers, or document structure. Return only the JSON.`,
    })

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: SYSTEM_PROMPT.replace('{QUESTION_COUNT}', String(questionCount)),
        messages: [{ role: 'user', content }],
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

    // ── Usage tracking ────────────────────────────────────────────
    try {
      // Sonnet 4.6 pricing: $3/M input, $15/M output
      const costUsd =
        ((usage.input_tokens || 0) * 3 / 1_000_000) +
        ((usage.output_tokens || 0) * 15 / 1_000_000)

      // Log usage — real users to usage_logs, anonymous trials to trial_logs
      if (isAnonymous) {
        await sb.from('trial_logs').insert({
          anonymous_id:  user.id,
          image_count:   images.length,
          input_tokens:  usage.input_tokens || 0,
          output_tokens: usage.output_tokens || 0,
          cost_usd:      costUsd,
        })
      } else {
        await sb.from('usage_logs').insert({
          user_id:       user.id,
          image_count:   images.length,
          input_tokens:  usage.input_tokens || 0,
          output_tokens: usage.output_tokens || 0,
          cost_usd:      costUsd,
        })
      }
    } catch (trackErr) {
      console.error('Usage tracking failed (non-fatal):', trackErr)
    }

    // ── Parse exam JSON ───────────────────────────────────────────
    let exam
    try {
      // Strip markdown code fences Claude sometimes adds around JSON
      const clean = rawText
        .replace(/^```(?:json)?[^\n]*\n?/i, '')  // opening fence
        .replace(/\n?```\s*$/i, '')                // closing fence
        .trim()
      exam = JSON.parse(clean)

      // Schema validation — reject malformed or empty output before it reaches Quiz.jsx
      if (!exam || !Array.isArray(exam.questions) || exam.questions.length === 0) {
        console.error('Claude returned invalid schema:', JSON.stringify(exam).slice(0, 200))
        return new Response(
          JSON.stringify({ error: 'Quiz generation failed' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
      // Validate each question has required fields
      for (const q of exam.questions) {
        if (!q.type || !q.question || !q.correct_answer) {
          console.error('Claude returned malformed question:', JSON.stringify(q).slice(0, 200))
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

    return new Response(
      JSON.stringify(exam),
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
