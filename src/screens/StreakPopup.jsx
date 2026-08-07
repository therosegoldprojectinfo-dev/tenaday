import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

export default function StreakPopup({ streakCount, onClose }) {
  const lang = useLang()
  const isFirst     = streakCount === 1
  const isMilestone = [3, 5, 7, 10, 14, 21, 30].includes(streakCount)

  let headline, sub
  if (isFirst) {
    headline = t(lang, 'streak_first_headline')
    sub      = t(lang, 'streak_first_sub')
  } else if (isMilestone) {
    headline = t(lang, 'streak_milestone_headline', streakCount)
    sub      = t(lang, 'streak_milestone_sub')
  } else {
    headline = t(lang, 'streak_default_headline', streakCount)
    sub      = t(lang, 'streak_default_sub')
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6" style={{ height: '100dvh', background: '#1a0a14' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">

        {/* Fire mascot */}
        <div style={{ animation: 'float 2s ease-in-out infinite' }}>
          <img src="/streak-fire.png" alt="" className="w-48 h-auto" />
        </div>

        {/* Headline */}
        <div>
          <h2 className="font-display font-extrabold text-4xl text-white">{headline}</h2>
          <p className="font-body text-base mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{sub}</p>
        </div>

        {/* Streak dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: Math.min(streakCount, 7) }).map((_, i) => (
            <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white"
              style={{ background: '#ff2d78' }}>
              ✓
            </div>
          ))}
          {streakCount > 7 && (
            <span className="font-display font-extrabold text-2xl" style={{ color: '#ff2d78' }}>+{streakCount - 7}</span>
          )}
        </div>

        <button onClick={onClose}
          className="w-full font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95 text-white"
          style={{ background: '#ff2d78', boxShadow: '0 4px 0 #c4005a' }}>
          {t(lang, 'streak_cta')}
        </button>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}
