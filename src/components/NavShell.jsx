import { useState } from 'react'

// ── Icons ────────────────────────────────────────────────────────────────
// Per project rule: Lucide-style icons get strokeWidth={2.5} for a
// chunkier, more Duolingo-like look matching Baloo 2's heavy roundness.
// House and Rewards are both plain currentColor stroke icons, identical
// treatment — only Profile breaks that pattern, since it's a colored
// mascot image, not a line icon.

function HouseIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5L12 3l9 6.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      {active && <path d="M9 21v-6h6v6" />}
    </svg>
  )
}

// Vault — same Lucide-style stroke-only treatment as House, no fill color.
// A hand-drawn equivalent of Lucide's "vault" icon (door + handle + bolt
// circles), kept stroke-only/currentColor so it inherits the same
// active/inactive color logic as House rather than carrying its own fixed
// palette.
function RewardsIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 10v0.01M14.5 12h0.01M12 14v0.01M9.5 12h0.01" />
      {active && <path d="M7 7h0.01M17 7h0.01M7 17h0.01M17 17h0.01" />}
    </svg>
  )
}

function ProfileIcon() {
  return (
    <img
      src="/nav-icons/profile-flower.png"
      alt=""
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      className="w-9 h-9 object-contain select-none pointer-events-none"
    />
  )
}

const NAV_ITEMS = [
  { id: 'home',    label: 'Home',    Icon: HouseIcon },
  { id: 'rewards', label: 'Rewards', Icon: RewardsIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileIcon },
]

const ACTIVE_BG = '#DDF0FB' // same light-blue token as the chapter card top zone — shared chrome color
const ACTIVE_FG = '#1CB0F6'

function NavButton({ item, isActive, onPress, orientation }) {
  const { Icon, label } = item
  const isProfile = item.id === 'profile'

  if (orientation === 'bottom') {
    return (
      <button
        type="button"
        onClick={onPress}
        className="flex-1 flex items-center justify-center py-2.5"
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
      >
        <span
          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-colors"
          style={{
            backgroundColor: isActive ? ACTIVE_BG : 'transparent',
            color: isActive ? ACTIVE_FG : '#9CA3AF',
          }}
        >
          {isProfile ? <Icon /> : <Icon active={isActive} />}
        </span>
      </button>
    )
  }

  // Sidebar (desktop): icon + label, left-aligned, full-width row
  return (
    <button
      type="button"
      onClick={onPress}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors"
      style={{
        backgroundColor: isActive ? ACTIVE_BG : 'transparent',
        color: isActive ? ACTIVE_FG : '#6B7280',
      }}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="w-9 h-9 flex items-center justify-center flex-shrink-0">
        {isProfile ? <Icon /> : <Icon active={isActive} />}
      </span>
      <span className="font-body font-bold text-sm">{label}</span>
    </button>
  )
}

/** Bottom tab bar on mobile, left sidebar on desktop — same 3 destinations
 *  (Home, Rewards, Profile), same active-state styling, just reflowed per
 *  viewport. Per current scope, only wraps Home and ChapterPath; Practice
 *  renders standalone without this shell (full-focus mode). */
export default function NavShell({ active, onNavigate, children }) {
  return (
    <div className="min-h-screen bg-white md:flex">

      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex md:flex-col md:w-56 md:flex-shrink-0 md:border-r md:border-gray-100 md:py-6 md:px-3 md:gap-1"
        aria-label="Primary"
      >
        {NAV_ITEMS.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={active === item.id}
            onPress={() => onNavigate(item.id)}
            orientation="sidebar"
          />
        ))}
      </nav>

      {/* Page content */}
      <div className="flex-1 md:min-w-0 pb-16 md:pb-0">
        {children}
      </div>

      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Primary"
      >
        {NAV_ITEMS.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={active === item.id}
            onPress={() => onNavigate(item.id)}
            orientation="bottom"
          />
        ))}
      </nav>
    </div>
  )
}
