import { supabase } from './supabaseClient'

const EDGE_FUNCTION_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

// ── Chapters (matières) ───────────────────────────────────────────

export async function getChapters(kidId) {
  // 1. Fetch this kid's subjects
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('kid_id', kidId)
    .or('is_activation.is.null,is_activation.eq.false')
    .order('created_at', { ascending: true })
  if (error) throw error

  // 2. Fetch this kid's completions, with each exam's chapter_id
  const { data: completions, error: compError } = await supabase
    .from('quiz_completions')
    .select('exam_id, exams!inner(chapter_id)')
    .eq('kid_id', kidId)
  if (compError) throw compError

  // 3. Count distinct exams per chapter (matière)
  const countMap = {}
  const seenExams = new Set()
  for (const row of completions ?? []) {
    const chapterId = row.exams?.chapter_id
    if (!chapterId || seenExams.has(row.exam_id)) continue
    seenExams.add(row.exam_id)
    countMap[chapterId] = (countMap[chapterId] ?? 0) + 1
  }

  // 4. Merge quiz_count into each subject
  return chapters.map(ch => ({
    ...ch,
    quiz_count: countMap[ch.id] ?? 0,
  }))
}

export async function createChapter({ name, emoji, kidId }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('chapters')
    .insert({ name, emoji, user_id: user.id, kid_id: kidId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteChapter(id) {
  const { error } = await supabase.from('chapters').delete().eq('id', id)
  if (error) throw error
}

export async function updateChapter(id, updates) {
  const { data, error } = await supabase
    .from('chapters')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Quiz completions ──────────────────────────────────────────────

// Call this when a kid finishes a quiz. Safe to call more than once
// for the same exam: the duplicate is ignored.
export async function markQuizCompleted({ examId, kidId }) {
  const { error } = await supabase
    .from('quiz_completions')
    .upsert(
      { exam_id: examId, kid_id: kidId },
      { onConflict: 'exam_id,kid_id', ignoreDuplicates: true }
    )
  if (error) throw error
}

// ── Exams ─────────────────────────────────────────────────────────

export async function getExamsForChapter(chapterId) {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function saveExam({ chapterId, topic, questions, kidId, pageText }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('exams')
    .insert({
      chapter_id:      chapterId,
      topic,
      questions,
      user_id:         user.id,
      kid_id:          kidId,
      page_text:       pageText || null,
      is_revision:     false,
      revision_number: 1,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExam(id) {
  const { error } = await supabase.from('exams').delete().eq('id', id)
  if (error) throw error
}

// ── Regenerate exam (revision) ────────────────────────────────────

export async function regenerateExam({ examId, chapterId, kidId }) {
  if (!examId)    throw new Error('examId is required')
  if (!chapterId) throw new Error('chapterId is required')
  if (!kidId)     throw new Error('kidId is required')

  const { data: { session } } = await supabase.auth.getSession()
  const jwt = session?.access_token
  if (!jwt) throw new Error('Not authenticated')

  const response = await fetch(`${EDGE_FUNCTION_BASE}/regenerate-exam`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      exam_id:    examId,
      chapter_id: chapterId,
      kid_id:     kidId,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    if (response.status === 429)  throw new Error('RATE_LIMIT')
    if (response.status === 422)  throw new Error('NO_PAGE_TEXT')
    if (response.status === 503)  throw new Error('DAILY_LIMIT')
    throw new Error(err.error || 'Failed to regenerate exam')
  }

  return response.json()
}
