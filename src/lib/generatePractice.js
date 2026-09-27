import { supabase } from './supabaseClient'

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-practice`

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function callGeneratePractice(body) {
  const { data: { session } } = await supabase.auth.getSession()
  const jwt = session?.access_token
  if (!jwt) throw new Error('Not authenticated')

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    if (response.status === 429) throw new Error('RATE_LIMIT')
    if (response.status === 503) throw new Error('DAILY_LIMIT')
    if (response.status === 402) throw new Error('SUBSCRIPTION_ACTIVATING')
    throw new Error(err.error || 'Failed to generate practice')
  }

  // The Edge Function already inserts the exam row server-side and
  // returns it in the exact shape screens expect (exam.id, topic,
  // page_text, questions) — no separate saveExam() call needed here,
  // unlike the old generateExam() flow.
  return response.json()
}

// ── First practice from a new photo (replaces generateExam + saveExam) ──
export async function generatePractice(files, { kidId, chapterId }) {
  if (!kidId) throw new Error('kidId is required')
  if (!chapterId) throw new Error('chapterId is required')

  const fileArray = Array.isArray(files) ? files : [files]
  const images = await Promise.all(
    fileArray.map(async (file) => ({
      data: await fileToBase64(file),
      mediaType: file.type || 'image/jpeg',
    }))
  )

  return callGeneratePractice({ mode: 'new', kid_id: kidId, chapter_id: chapterId, images })
}

// ── "Practice more" on the same lesson (replaces regenerateExam) ──
export async function practiceMore({ examId, kidId, chapterId }) {
  if (!examId) throw new Error('examId is required')
  if (!kidId) throw new Error('kidId is required')
  if (!chapterId) throw new Error('chapterId is required')

  return callGeneratePractice({ mode: 'practice_more', kid_id: kidId, chapter_id: chapterId, parent_exam_id: examId })
}
