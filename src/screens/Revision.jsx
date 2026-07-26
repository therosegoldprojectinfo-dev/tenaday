import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

export default function Revision({ chapter, exams, onSelectExam, onBack }) {
  const lang = useLang()
  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden', maxWidth: '100vw' }}>
      <div className="flex-shrink-0 px-5 pt-12 pb-6">
        <button onClick={onBack} className="text-muted font-body font-bold text-sm mb-4 flex items-center gap-1 active:opacity-60">
          {t(lang, 'revision_back')}
        </button>
        <h1 className="font-display font-extrabold text-3xl text-ink">{t(lang, 'revision_title')}</h1>
        <p className="text-muted font-body text-sm mt-1">
          {chapter.emoji} {chapter.name} · {t(lang, 'revision_exam', exams.length)}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-10 flex flex-col gap-3" style={{ padding: '0 20px 40px' }}>
        {exams.map((exam, i) => (
          <button
            key={exam.id}
            onClick={() => onSelectExam(exam)}
            className="w-full text-left bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 transition-all active:translate-y-1 overflow-hidden block"
            style={{ boxShadow: '0 4px 0 #e5e7eb', boxSizing: 'border-box' }}
            onMouseDown={e => e.currentTarget.style.boxShadow = 'none'}
            onMouseUp={e => e.currentTarget.style.boxShadow = '0 4px 0 #e5e7eb'}
            onTouchStart={e => e.currentTarget.style.boxShadow = 'none'}
            onTouchEnd={e => e.currentTarget.style.boxShadow = '0 4px 0 #e5e7eb'}
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center font-display font-extrabold text-lg text-duo flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="font-display font-bold text-lg text-ink truncate">{exam.topic}</p>
                <p className="font-body text-sm text-muted truncate">
                  {t(lang, 'current_questions', exam.questions?.length)} ·{' '}
                  {new Date(exam.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
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
