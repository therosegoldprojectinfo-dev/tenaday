import { useState } from 'react'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'
import { practiceMore } from '../lib/generatePractice'

export default function QuizIntro({ exam, kidName = 'Champ', chapterId, kidId, onStart, onNewExamReady, onBack }) {
  const lang = useLang()
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState(null)

  const canRegenerate = !!exam.page_text

  async function handleNewQuestions() {
    setError(null)
    setGenerating(true)
    try {
      const newExam = await practiceMore({
        examId:    exam.id,
        chapterId: chapterId,
        kidId:     kidId,
      })
      onNewExamReady(newExam)
    } catch (err) {
      if (err.message === 'RATE_LIMIT' || err.message === 'DAILY_LIMIT') {
        setError(t(lang, 'quiz_intro_rate_limit'))
      } else {
        setError(t(lang, 'quiz_intro_error'))
      }
    } finally {
      setGenerating(false)
    }
  }

  if (generating) {
    return (
      <div className="bg-white flex flex-col items-center justify-center px-6 text-center" style={{ height: '100dvh' }}>
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-12 flex items-center gap-1 text-muted font-body font-bold text-sm active:opacity-60"
          style={{ insetInlineStart: 20 }}
        >
          {lang === 'ar' ? '→' : '←'} {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>

        <p className="font-display font-bold text-muted" style={{ fontSize: '1rem', letterSpacing: '0.04em' }}>
          Quiz
        </p>
        <svg viewBox="0 0 400 120" width="300" height="90" style={{ overflow: 'visible' }}>
          <defs>
            <path id="curve2" d="M 30,90 Q 200,30 370,90" />
          </defs>
          <text fontFamily="inherit" fontWeight="800" fontSize="46" fill="#1a1a2e">
            <textPath href="#curve2" startOffset="50%" textAnchor="middle">
              Chargement
            </textPath>
          </text>
        </svg>
        <div className="flex items-center gap-3 mt-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#7c3aed',
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); opacity: 0.4; }
            50% { transform: translateY(-12px); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="bg-white flex flex-col items-center justify-center px-6 text-center" style={{ height: '100dvh' }}>
      <button
        onClick={onBack}
        className="absolute top-12 flex items-center gap-1 text-muted font-body font-bold text-sm active:opacity-60"
        style={{ insetInlineStart: 20 }}
      >
        {lang === 'ar' ? '→' : '←'} {lang === 'ar' ? 'رجوع' : 'Back'}
      </button>

      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        <div className="flex flex-col gap-2">
          <h1 className="font-display font-extrabold text-3xl text-ink leading-tight">
            {lang === 'ar'
              ? `!${kidName} ,ابدأ`
              : `${kidName}, Débutons !`}
          </h1>
          <p className="font-display font-bold text-xl mt-1" style={{ color: '#7c3aed' }}>{exam.topic}</p>
        </div>

        {error && (
          <div className="w-full rounded-2xl px-4 py-3 text-center" style={{ background: '#fef2f2' }}>
            <p className="font-body text-sm" style={{ color: '#dc2626' }}>{error}</p>
          </div>
        )}

        <button
          onClick={onStart}
          className="w-full text-white font-display font-extrabold text-xl rounded-2xl py-5 transition-all active:scale-95 flex items-center justify-center gap-3"
          style={{ background: '#7c3aed', boxShadow: '0 6px 0 #5b21b6' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
          Débutez
        </button>

        {canRegenerate && (
          <button
            onClick={handleNewQuestions}
            className="w-full font-display font-bold text-base rounded-2xl py-4 transition-all active:scale-95 flex items-center justify-center gap-3"
            style={{ background: '#f5f3ff', color: '#7c3aed', border: '2px solid #ede9fe' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.36-3.36L23 10M1 14l5.13 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Régénérez
          </button>
        )}
      </div>
    </div>
  )
}
