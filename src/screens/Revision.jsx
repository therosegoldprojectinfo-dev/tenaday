import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

const ACCENTS = ['#ede9fe', '#fce7f3', '#dbeafe', '#dcfce7', '#ffedd5', '#fef9c3']

export default function Revision({ chapter, exams, onSelectExam, onBack }) {
  const lang = useLang()
  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="flex-shrink-0 px-5 pt-12 pb-6">
        <button onClick={onBack} className="text-muted font-body font-bold text-sm mb-5 flex items-center gap-1 active:opacity-60">
          {t(lang, 'revision_back')}
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-2xl" style={{ width: 52, height: 52, background: '#ede9fe' }}>
            <span style={{ fontSize: 28 }}>{chapter.emoji}</span>
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-ink">{t(lang, 'revision_title')}</h1>
            <p className="text-muted font-body text-sm">{chapter.name} · {t(lang, 'revision_exam', exams.length)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-3">
        {exams.map((exam, i) => (
          <button
            key={exam.id}
            onClick={() => onSelectExam(exam)}
            className="w-full text-left rounded-2xl px-4 py-4 transition-all active:scale-95"
            style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex items-center justify-center rounded-xl font-display font-extrabold text-lg flex-shrink-0"
                style={{ width: 48, height: 48, background: ACCENTS[i % ACCENTS.length], color: '#7c3aed' }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-base text-ink truncate">{exam.topic}</p>
                <p className="font-body text-xs text-muted">
                  {t(lang, 'current_questions', exam.questions?.length)} · {new Date(exam.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <span className="text-muted text-xl flex-shrink-0">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
