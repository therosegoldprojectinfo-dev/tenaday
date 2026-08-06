import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

function StreakBadge({ count }) {
  if (!count) return null
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100">
      <img src="/streak-mascot.png" alt="" className="w-4 h-4 object-contain" />
      <span className="font-display font-bold text-xs text-purple-600">{count}</span>
    </div>
  )
}

const NAV_ICONS = {
  chapters:    '/nav-chapters.png',
  rewards:     '/nav-gift.png',
  parent_zone: '/nav-parent.png',
  profile:     '/nav-profile.png',
}

export default function Nav({ active, onChange, streak = 0 }) {
  const lang = useLang()
  const TABS = [
    { id: 'chapters',    label: t(lang, 'nav_chapters')    },
    { id: 'rewards',     label: t(lang, 'nav_rewards')     },
    { id: 'parent_zone', label: t(lang, 'nav_parent_zone') },
    { id: 'profile',     label: lang === 'ar' ? 'الملف' : 'Profile' },
  ]

  return (
    <>
      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map(({ id, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex items-center justify-center py-3 transition-colors active:bg-gray-50"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <img
                  src={NAV_ICONS[id]}
                  alt={label}
                  className="w-full h-full object-contain transition-all"
                  style={{ opacity: isActive ? 1 : 0.35, filter: isActive ? 'none' : 'grayscale(0.3)' }}
                />
              </div>
            </button>
          )
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 bottom-0 bg-white border-e border-gray-100 flex-col z-40 overflow-hidden w-56"
        style={{ insetInlineStart: 0 }}>

        {/* Logo area */}
        <div className="relative flex items-center px-4 pt-4 pb-2 mb-4" style={{ height: 80 }}>
          <img
            src="/mascot.png"
            alt=""
            style={{
              position: 'absolute',
              insetInlineStart: -8,
              bottom: -16,
              height: 110,
              width: 'auto',
              objectFit: 'contain',
              zIndex: 0,
            }}
          />
          <span className="font-display font-extrabold text-2xl relative z-10 ms-14" style={{ color: '#7c3aed' }}>
            Numio
          </span>
          <div className="ms-auto relative z-10">
            <StreakBadge count={streak} />
          </div>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-1 px-3 flex-1">
          {TABS.map(({ id, label }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl font-body font-bold text-sm transition-all text-start w-full ${
                  isActive ? 'bg-purple-50 text-purple-700' : 'text-muted hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
                  <img
                    src={NAV_ICONS[id]}
                    alt=""
                    className="w-full h-full object-contain transition-all"
                    style={{ opacity: isActive ? 1 : 0.35 }}
                  />
                </div>
                {label}
              </button>
            )
          })}
        </div>

        {/* Streak widget */}
        {streak > 0 && (
          <div className="mt-auto px-2 pb-4">
            <div className="flex items-center gap-3 bg-purple-50 rounded-2xl px-3 py-3">
              <img src="/streak-mascot.png" alt="" className="w-10 h-10 object-contain" />
              <div>
                <p className="font-display font-bold text-lg text-purple-600">{t(lang, 'nav_streak_days', streak)}</p>
                <p className="font-body text-xs text-muted">{t(lang, 'nav_current_streak')}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
