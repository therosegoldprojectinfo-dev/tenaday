// src/lib/performance.js
import { supabase } from './supabaseClient'

// Fire-and-forget from Quiz.jsx right when a question is revealed.
// Never throws — a failed log shouldn't interrupt a kid mid-quiz.
export async function logQuestionAttempt({ examId, kidId, question, isCorrect, givenAnswer, timeSeconds, hintUsed = false }) {
  if (!examId || !kidId || !question?.id) return
  try {
    await supabase.rpc('log_question_attempt', {
      p_exam_id: examId,
      p_kid_id: kidId,
      p_question_id: String(question.id),
      p_objective_id: question.objective_id || null,
      p_skill_key: question.skill_key || null,
      p_question_type: question.type || null,
      p_difficulty: question.difficulty ?? null,
      p_is_correct: isCorrect,
      p_given_answer: givenAnswer != null ? String(givenAnswer) : null,
      p_time_seconds: timeSeconds ?? null,
      p_hint_used: hintUsed,
    })
  } catch (e) {
    console.error('log_question_attempt failed (non-fatal):', e)
  }
}
