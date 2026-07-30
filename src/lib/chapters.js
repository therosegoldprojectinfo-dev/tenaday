import { supabase } from './supabaseClient'

// ── Chapters ──────────────────────────────────────────────────────

export async function getChapters(kidId) {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('kid_id', kidId)
    .not('is_activation', 'eq', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
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

export async function saveExam({ chapterId, topic, questions, kidId }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('exams')
    .insert({ chapter_id: chapterId, topic, questions, user_id: user.id, kid_id: kidId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteExam(id) {
  const { error } = await supabase.from('exams').delete().eq('id', id)
  if (error) throw error
}
