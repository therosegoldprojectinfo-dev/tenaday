import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

const ACCENTS = ['#ede9fe', '#fce7f3', '#dbeafe', '#fef9c3', '#dcfce7', '#ffedd5']

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
        {exams.map((exam, i) => {
          const n = exam.questions?.length ?? 0
          const date = new Date(exam.created_at).toLocaleDateString('fr', { day: 'numeric', month: 'short' })
          const version = exam.is_revision === true
            ? ` · ${t(lang, 'revision_version', exam.revision_number ?? 2)}`
            : ''

          return (
            <button
              key={exam.id}
              onClick={() => onSelectExam(exam)}
              className="w-full flex items-center gap-4 text-left bg-white active:scale-95 transition-all"
              style={{
                padding: 14,
                borderRadius: 28,
                border: '1.5px solid #eef0f3',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{ width: 56, height: 56, borderRadius: 18, background: ACCENTS[i % ACCENTS.length], fontSize: 28 }}
              >
                📝
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-extrabold text-base text-ink truncate">{exam.topic}</p>
                <p className="font-body text-sm truncate" style={{ color: '#6b7280' }}>
                  {n} question{n > 1 ? 's' : ''} · {date}{version}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
