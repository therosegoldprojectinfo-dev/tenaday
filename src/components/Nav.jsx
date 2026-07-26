import { BookOpen, Gift, Users, User } from 'lucide-react'
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

export default function Nav({ active, onChange, streak = 0 }) {
  const lang = useLang()
  const TABS = [
    { id: 'chapters',    label: t(lang, 'nav_chapters'),    Icon: BookOpen },
    { id: 'rewards',     label: t(lang, 'nav_rewards'),     Icon: Gift     },
    { id: 'parent_zone', label: t(lang, 'nav_parent_zone'), Icon: Users    },
    { id: 'profile',     label: lang === 'ar' ? 'الملف' : 'Profile', Icon: User },
  ]

  return (
    <>
      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors active:bg-gray-50"
            >
              <Icon size={24} strokeWidth={2.5} color={isActive ? '#58cc02' : '#AFAFAF'} />
              <span className="font-body font-bold text-xs" style={{ color: isActive ? '#58cc02' : '#AFAFAF' }}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-56 bg-white border-r border-gray-100 flex-col z-40 overflow-hidden">
        {/* Logo + mascot */}
        <div className="relative flex items-center px-4 pt-4 pb-2 mb-4" style={{ height: 80 }}>
          <img
            src="/mascot.png"
            alt=""
            style={{
              position: 'absolute',
              left: -8,
              bottom: -16,
              height: 110,
              width: 'auto',
              objectFit: 'contain',
              zIndex: 0,
            }}
          />
          <span className="font-display font-extrabold text-2xl text-duo relative z-10 ml-14">
            Numio
          </span>
          <div className="ml-auto relative z-10">
            <StreakBadge count={streak} />
          </div>
        </div>

        <div className="flex flex-col gap-1 px-3 flex-1">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-2xl font-body font-bold text-sm transition-all text-left w-full ${
                  isActive ? 'bg-green-50 text-duo' : 'text-muted hover:bg-gray-50'
                }`}
              >
                <Icon size={20} strokeWidth={2.5} color={isActive ? '#58cc02' : '#AFAFAF'} />
                {label}
              </button>
            )
          })}
        </div>

        {streak > 0 && (
          <div className="mt-auto px-2">
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
