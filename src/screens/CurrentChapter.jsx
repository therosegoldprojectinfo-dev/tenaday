import { useState, useEffect } from 'react'
import { getExamsForChapter } from '../lib/chapters'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

export default function CurrentChapter({ chapter, onNew, onRevision, onBack }) {
  const lang = useLang()
  const [exams, setExams]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadExams() }, [chapter.id])

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
      <div className="w-full max-w-2xl mx-auto px-5 flex flex-col flex-1 overflow-y-auto overflow-x-hidden pb-10 min-w-0">
        <div className="pt-12 pb-6">
          <button onClick={onBack} className="text-muted font-body font-bold text-sm mb-4 flex items-center gap-1 active:opacity-60">
            {t(lang, 'current_back')}
          </button>
          <div className="flex items-center gap-4">
            <span style={{ fontSize: 48 }}>{chapter.emoji}</span>
            <div>
              <h1 className="font-display font-extrabold text-3xl text-ink">{chapter.name}</h1>
              <p className="text-muted font-body text-sm">
                {loading ? '...' : t(lang, 'current_exams_saved', exams.length)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onNew(chapter)}
            className="w-full bg-duo text-white font-display font-extrabold text-2xl rounded-3xl py-10 transition-all flex flex-col items-center gap-2 active:translate-y-1"
            style={{ boxShadow: '0 5px 0 #46a302' }}
            onMouseDown={e => e.currentTarget.style.boxShadow = 'none'}
            onMouseUp={e => e.currentTarget.style.boxShadow = '0 5px 0 #46a302'}
            onTouchStart={e => e.currentTarget.style.boxShadow = 'none'}
            onTouchEnd={e => e.currentTarget.style.boxShadow = '0 5px 0 #46a302'}
          >
            <span style={{ fontSize: 40 }}>📸</span>
            {t(lang, 'current_new')}
          </button>

          <button
            onClick={() => onRevision(chapter, exams)}
            disabled={exams.length === 0}
            className="w-full bg-gray-100 disabled:opacity-40 text-gray-500 font-display font-extrabold text-2xl rounded-3xl py-10 transition-all flex flex-col items-center gap-2 disabled:cursor-not-allowed active:translate-y-1"
            style={{ boxShadow: exams.length === 0 ? 'none' : '0 5px 0 #d1d5db' }}
          >
            <span style={{ fontSize: 40 }}>📋</span>
            {t(lang, 'current_revision')}
            {exams.length === 0 && (
              <span className="font-body font-normal text-sm text-gray-400">{t(lang, 'current_no_exams')}</span>
            )}
          </button>
        </div>

        {!loading && exams.length > 0 && (
          <div className="mt-8">
            <p className="font-body font-bold text-xs text-muted uppercase tracking-widest mb-3">
              {t(lang, 'current_recent')}
            </p>
            <div className="flex flex-col gap-3">
              {exams.slice(0, 3).map(exam => (
                <ExamRow key={exam.id} exam={exam} lang={lang} />
              ))}
              {exams.length > 3 && (
                <p className="text-center text-muted font-body text-sm">
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

function ExamRow({ exam, lang }) {
  const date = new Date(exam.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en', {
    month: 'short', day: 'numeric'
  })
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 overflow-hidden">
      <span className="flex-shrink-0" style={{ fontSize: 24 }}>📝</span>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="font-display font-bold text-base text-ink truncate">{exam.topic}</p>
        <p className="font-body text-xs text-muted truncate">{t(lang, 'current_questions', exam.questions?.length)} · {date}</p>
      </div>
    </div>
  )
}
