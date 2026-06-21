import { useState } from 'react'

// ── Icons ────────────────────────────────────────────────────────────────
// Per project rule: Lucide-style icons get strokeWidth={2.5} for a
// chunkier, more Duolingo-like look matching Baloo 2's heavy roundness.
// 'House' is genuinely available in core Lucide; the treasure-chest glyph
// lives only in the separate @lucide/lab package, so rather than add a
// second icon dependency for one icon, it's hand-built here as a flat-fill
// SVG matching the style of the coin/trophy icons already used elsewhere
// in the app (Map.jsx, ChapterPath.jsx).

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

function TreasureChestIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="10" width="18" height="10" rx="2" fill="#C8821A" />
      <rect x="3" y="10" width="18" height="4" fill="#A8690F" />
      <path d="M3 10c0-3.5 4-6 9-6s9 2.5 9 6" fill="#E0993C" />
      <rect x="10" y="12.5" width="4" height="4" rx="0.5" fill="#FFD24C" />
      <circle cx="12" cy="14.5" r="0.9" fill="#A8690F" />
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
      className="w-7 h-7 object-contain select-none pointer-events-none"
    />
  )
}

const NAV_ITEMS = [
  { id: 'home',    label: 'Home',    Icon: HouseIcon },
  { id: 'rewards', label: 'Rewards', Icon: TreasureChestIcon },
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
      <span className="w-7 h-7 flex items-center justify-center flex-shrink-0">
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
