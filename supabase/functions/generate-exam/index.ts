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

Generate exactly 15 questions total.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })

  try {
    // ── Auth: verify real user session JWT ───────────────────────
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

    // ── Rate limit: atomic increment via RPC (no race condition) ──
    try {
      await sb.rpc('increment_daily_quiz_count', { p_user_id: user.id })
    } catch (rateLimitErr) {
      return new Response(
        JSON.stringify({ error: 'Daily limit reached. Try again tomorrow.' }),
        { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const { images } = await req.json()

    if (!images || !images.length) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Validate image count and mediaType
    if (images.length > 5) {
      return new Response(
        JSON.stringify({ error: 'Max 5 images allowed' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    for (const img of images) {
      if (!ALLOWED_TYPES.includes(img.mediaType)) {
        return new Response(
          JSON.stringify({ error: `Invalid image type: ${img.mediaType}` }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
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
      text: `Generate exactly 15 quiz questions from the educational content in ${images.length > 1 ? `these ${images.length} pages` : 'this image'}. Only ask about the actual subject matter — never about titles, headers, or document structure. Return only the JSON.`,
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
        max_tokens: 1500, // Hard ceiling: ~$0.005/request max at Sonnet pricing
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    })

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text()
      console.error('Claude API error:', err)
      return new Response(
        JSON.stringify({ error: 'Claude API failed', detail: err }),
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

      await sb.from('usage_logs').insert({
        user_id: user.id, // verified server-side, never trust client
        image_count: images.length,
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cost_usd: costUsd,
      })
    } catch (trackErr) {
      console.error('Usage tracking failed (non-fatal):', trackErr)
    }

    // ── Parse exam JSON ───────────────────────────────────────────
    let exam
    try {
      exam = JSON.parse(rawText)
    } catch {
      console.error('Failed to parse Claude JSON:', rawText)
      return new Response(
        JSON.stringify({ error: 'Claude returned invalid JSON', raw: rawText }),
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
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
