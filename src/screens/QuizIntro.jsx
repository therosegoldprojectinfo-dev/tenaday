import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

export default function QuizIntro({ exam, kidName = 'Champ', onStart }) {
  const lang = useLang()
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center" style={{ height: '100dvh' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div style={{ animation: 'mascot-float 2s ease-in-out infinite' }}>
          <img src="/mascot-run.png" alt="Numio mascot" className="w-52 h-auto" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-display font-extrabold text-3xl text-ink leading-tight">
            {kidName}, {t(lang, 'quiz_intro_lets_start')}
          </h1>
          <p className="font-display font-bold text-xl text-duo">{exam.topic}</p>
          <p className="font-body text-base text-muted mt-1">{t(lang, 'quiz_intro_you_can')}</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-full px-5 py-2">
          <span className="text-lg">📝</span>
          <span className="font-body font-bold text-sm text-muted">
            {t(lang, 'quiz_intro_questions', exam.questions?.length)}
          </span>
        </div>
        <button
          onClick={onStart}
          className="w-full bg-duo text-white font-display font-extrabold text-xl rounded-2xl py-5 transition-all active:translate-y-1 mt-2"
          style={{ boxShadow: '0 5px 0 #46a302' }}
        >
          {t(lang, 'quiz_intro_start')}
        </button>
      </div>
      <style>{`
        @keyframes mascot-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  )
}
