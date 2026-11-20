import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

const NAV_ICONS = {
  chapters:    '/nav-chapters.png',
  rewards:     '/nav-gift.png',
  parent_zone: '/nav-parent.png',
  profile:     '/nav-profile.png',
}

const FR_LABELS = {
  chapters:    'Chapitres',
  rewards:     'Récompenses',
  parent_zone: 'Zone Parents',
  profile:     'Profil',
}

export default function Nav({ active, onChange }) {
  const lang = useLang()
  const TABS = [
    { id: 'chapters'    },
    { id: 'rewards'     },
    { id: 'parent_zone' },
    { id: 'profile'     },
  ]

  return (
    <>
      {/* Mobile bottom bar — icons only */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map(({ id }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex items-center justify-center py-3 transition-colors"
            >
              <div
                className="w-14 h-10 flex items-center justify-center rounded-2xl transition-all"
                style={{ background: isActive ? '#ede9fe' : 'transparent' }}
              >
                <img
                  src={NAV_ICONS[id]}
                  alt={FR_LABELS[id]}
                  className="w-9 h-9 object-contain"
                />
              </div>
            </button>
          )
        })}
      </nav>

      {/* Desktop sidebar — icons + French labels, no streak */}
      <aside className="hidden md:flex fixed top-0 bottom-0 bg-white border-e border-gray-100 flex-col z-40 overflow-hidden w-56"
        style={{ insetInlineStart: 0 }}>

        {/* Logo area */}
        <div className="flex items-center px-4 pt-5 pb-2 mb-4">
          <img
            src="/nav-logo.png"
            alt="Numio"
            style={{ height: 50, width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-1 px-3 flex-1">
          {TABS.map(({ id }) => {
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
                    className="w-full h-full object-contain"
                  />
                </div>
                {FR_LABELS[id]}
              </button>
            )
          })}
        </div>
      </aside>
    </>
  )
}
