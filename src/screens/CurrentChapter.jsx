import { useState, useEffect } from 'react'
import { getExamsForChapter } from '../lib/chapters'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

export default function CurrentChapter({ chapter, onNew, onRevision, onBack }) {
  const lang = useLang()
  const [exams, setExams]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (chapter?.id) loadExams() }, [chapter?.id])

  async function loadExams() {
    try {
      const data = await getExamsForChapter(chapter.id)
      setExams(data)
    } catch (err) {
      console.error('Failed to load exams:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="w-full max-w-2xl mx-auto px-5 flex flex-col flex-1 overflow-y-auto pb-10 min-w-0">

        {/* Back */}
        <button onClick={onBack} className="flex-shrink-0 text-muted font-body font-bold text-sm mt-12 mb-6 flex items-center gap-1 active:opacity-60 self-start">
          {t(lang, 'current_back')}
        </button>

        {/* Chapter header */}
        <div className="flex-shrink-0 flex items-center gap-4 mb-8">
          <div
            className="flex items-center justify-center rounded-2xl flex-shrink-0"
            style={{ width: 64, height: 64, background: '#ede9fe' }}
          >
            <span style={{ fontSize: 36 }}>{chapter.emoji}</span>
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-ink">{chapter.name}</h1>
            <p className="text-muted font-body text-sm mt-0.5">
              {loading ? '...' : t(lang, 'current_exams_saved', exams.length)}
            </p>
          </div>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0 mb-8">

          {/* New quiz */}
          <button
            onClick={() => onNew(chapter)}
            className="flex flex-col items-center justify-center gap-3 rounded-3xl py-8 transition-all active:scale-95"
            style={{ background: '#7c3aed', boxShadow: '0 6px 24px rgba(124,58,237,0.3)' }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.2)' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <span className="font-display font-extrabold text-xl text-white">{t(lang, 'current_new')}</span>
          </button>

          {/* Revision */}
          <button
            onClick={() => onRevision(chapter, exams)}
            disabled={exams.length === 0}
            className="flex flex-col items-center justify-center gap-3 rounded-3xl py-8 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 52, height: 52, background: '#ede9fe' }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <span className="font-display font-extrabold text-xl text-ink">{t(lang, 'current_revision')}</span>
            {exams.length === 0 && (
              <span className="font-body text-xs text-muted">{t(lang, 'current_no_exams')}</span>
            )}
          </button>
        </div>

        {/* Recent exams */}
        {!loading && exams.length > 0 && (
          <div className="flex-shrink-0">
            <p className="font-body font-bold text-xs text-muted uppercase tracking-widest mb-3">
              {t(lang, 'current_recent')}
            </p>
            <div className="flex flex-col gap-3">
              {exams.slice(0, 3).map((exam, i) => (
                <ExamRow key={exam.id} exam={exam} lang={lang} index={i} />
              ))}
              {exams.length > 3 && (
                <p className="text-center text-muted font-body text-sm py-1">
                  {t(lang, 'current_more', exams.length - 3)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ExamRow({ exam, lang, index }) {
  const date = new Date(exam.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en', {
    month: 'short', day: 'numeric'
  })

  const ACCENTS = ['#ede9fe', '#fce7f3', '#dbeafe', '#dcfce7']
  const accent = ACCENTS[index % ACCENTS.length]

  return (
    <div
      className="flex items-center gap-4 rounded-2xl px-4 py-3"
      style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{ width: 44, height: 44, background: accent }}
      >
        <span style={{ fontSize: 20 }}>📝</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-base text-ink truncate">{exam.topic}</p>
        <p className="font-body text-xs text-muted">{t(lang, 'current_questions', exam.questions?.length)} · {date}</p>
      </div>
    </div>
  )
}
