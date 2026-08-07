import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

export default function QuizIntro({ exam, kidName = 'Champ', onStart, onBack }) {
  const lang = useLang()
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
        <div style={{ animation: 'float 2s ease-in-out infinite' }}>
          <img src="/nav-profile.png" alt="" className="w-44 h-auto" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-display font-extrabold text-3xl text-ink leading-tight">
            {lang === 'ar'
              ? `${t(lang, 'quiz_intro_lets_start')} ${kidName}`
              : `${kidName}, ${t(lang, 'quiz_intro_lets_start')}`}
          </h1>
          <p className="font-display font-bold text-xl mt-1" style={{ color: '#7c3aed' }}>{exam.topic}</p>
          <p className="font-body text-base text-muted mt-1">{t(lang, 'quiz_intro_you_can')}</p>
        </div>

        <div className="flex items-center gap-2 rounded-full px-5 py-2" style={{ background: '#f5f3ff' }}>
          <span className="text-lg">📝</span>
          <span className="font-body font-bold text-sm text-muted">
            {t(lang, 'quiz_intro_questions', exam.questions?.length)}
          </span>
        </div>

        <button
          onClick={onStart}
          className="w-full text-white font-display font-extrabold text-xl rounded-2xl py-5 transition-all active:scale-95 mt-2"
          style={{ background: '#7c3aed', boxShadow: '0 6px 0 #5b21b6' }}
        >
          {t(lang, 'quiz_intro_start')}
        </button>
      </div>

      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
    </div>
  )
}
