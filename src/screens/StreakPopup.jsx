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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6" style={{ height: '100dvh' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <img src="/streak-mascot.png" alt="Streak" className="w-64 h-auto" />
        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: Math.min(streakCount, 7) }).map((_, i) => (
            <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: i < streakCount ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : '#f3f4f6' }}>
              <span>⚡</span>
            </div>
          ))}
          {streakCount > 7 && (
            <span className="font-display font-extrabold text-2xl text-purple-500">+{streakCount - 7}</span>
          )}
        </div>
        <div>
          <h2 className="font-display font-extrabold text-3xl text-ink">{headline}</h2>
          <p className="font-body text-base text-muted mt-2">{sub}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
          style={{ boxShadow: '0 4px 0 #46a302' }}
        >
          {t(lang, 'streak_cta')}
        </button>
      </div>
    </div>
  )
}
