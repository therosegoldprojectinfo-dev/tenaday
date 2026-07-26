import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SYSTEM_PROMPT = `You are an exam generator for kids aged 6 to 12 years old.

The user will send you an image of something they want to learn from — a textbook page, handwritten notes, a worksheet, a diagram, anything educational.

LANGUAGE RULE — THIS IS THE MOST IMPORTANT RULE:
Detect the language of the educational content in the image. Write ALL questions, options, answers, and explanations in that SAME language.
- If the image content is in French → everything in French, true/false answers must be "Vrai" or "Faux"
- If the image content is in Arabic → everything in Arabic, true/false answers must be "صحيح" or "خطأ"
- If the image content is in Spanish → everything in Spanish, true/false answers must be "Verdadero" or "Falso"
- If the image content is in English → everything in English, true/false answers are "True" or "False"
- Never mix languages. Never write "True" or "False" if the content is not in English.

Your job is to:
1. Detect the language of the image content
2. Generate exactly 15 questions that test understanding of the ACTUAL educational content
3. Write EVERYTHING in the detected language
4. Choose the best question format:
   - Multiple choice (MCQ) for facts, definitions, math
   - True/False for concepts and statements — answers MUST be in the image's language
   - Fill in the blank for vocabulary or simple recall
5. Make the language simple, fun, and encouraging

CRITICAL RULES:
- ONLY ask questions about the actual knowledge/content in the image (math concepts, facts, vocabulary, science, history, etc.)
- NEVER ask about the title, page number, header, footer, or any meta information about the document
- Every question must help the child LEARN and UNDERSTAND the subject matter
- Mix question types naturally (aim for roughly 7 MCQ, 4 true/false, 4 fill in the blank)

You MUST respond with ONLY a valid JSON object — no markdown, no backticks, no preamble.

The JSON must follow this exact structure:
{
  "topic": "Short topic name in the image's language",
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "question": "The question text in the image's language?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option B",
      "explanation": "A short, kid-friendly explanation in the image's language."
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "The statement here in the image's language.",
      "correct_answer": "Vrai",
      "explanation": "A short explanation in the image's language."
    },
    {
      "id": 3,
      "type": "fill_blank",
      "question": "La ___ est la planète la plus proche du Soleil.",
      "correct_answer": "Mercure",
      "explanation": "A short explanation in the image's language."
    }
  ]
}

For MCQ always include 4 options. For fill_blank, correct_answer is the missing word. Generate exactly 15 questions total.`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  try {
    const { image, mediaType } = await req.json()

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Call Claude API with the image
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: image,
                },
              },
              {
                type: 'text',
                text: 'Generate exactly 15 quiz questions from the educational content in this image. Only ask about the actual subject matter — never about titles, headers, or document structure. Return only the JSON.',
              },
            ],
          },
        ],
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

    // Extract the text content from Claude's response
    const rawText = claudeData.content?.[0]?.text || ''

    // Parse the JSON Claude returned
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
