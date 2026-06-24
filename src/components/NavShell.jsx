import { useState } from 'react'

// ── Icons ────────────────────────────────────────────────────────────────
// Per project rule: Lucide-style icons get strokeWidth={2.5} for a
// chunkier, more Duolingo-like look matching Baloo 2's heavy roundness.
// All three nav icons (House, Rewards, Profile) are plain currentColor
// stroke icons with identical sizing/treatment, hand-drawn to match
// Lucide's actual shapes rather than imported, since the one icon this
// app needed from Lucide's separate @lucide/lab package (chest) isn't
// worth a second dependency for a single glyph.

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

// Medal/badge — same Lucide-style stroke-only treatment as House: no
// fill color, inherits color from the active/inactive state. Replaces an
// earlier vault icon that used zero-length "dot" sub-paths (M x y v0.01)
// to draw bolt details — that technique rendered as a broken/empty shape
// rather than dots, so this version uses only real strokes and a solid
// fill star, nothing that depends on a renderer interpreting a
// degenerate path correctly.
function RewardsIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="9" r="6" />
      <path
        d="M9.5 14.2L7.5 21l4.5-2.5 4.5 2.5-2-6.8"
        fill={active ? 'currentColor' : 'none'}
      />
      <path d="M12 6.5l1 2 2.2 0.3-1.6 1.5 0.4 2.2-2-1.1-2 1.1 0.4-2.2-1.6-1.5 2.2-0.3z" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Profile — circle-user (Lucide's standard profile icon shape: a person
// silhouette inside a circle), same stroke-only treatment as House and
// Rewards. Replaces the earlier flower mascot image — all three nav icons
// are now the same family, just swapped per request.
function ProfileIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" fill={active ? 'currentColor' : 'none'} />
      <path d="M6.2 18.5a6.5 6.5 0 0 1 11.6 0" />
    </svg>
  )
}

function FamilyIcon({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="3" fill={active ? 'currentColor' : 'none'} />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <circle cx="18" cy="8" r="2" />
      <path d="M21 21v-1.5a3 3 0 0 0-2-2.83" />
    </svg>
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
          <Icon active={isActive} />
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
        <Icon active={isActive} />
      </span>
      <span className="font-body font-bold text-sm">{label}</span>
    </button>
  )
}

/** Bottom tab bar on mobile, left sidebar on desktop — same 3 destinations
 *  (Home, Rewards, Profile), same active-state styling, just reflowed per
 *  viewport. Per current scope, only wraps Home and ChapterPath; Practice
 *  renders standalone without this shell (full-focus mode). */
export default function NavShell({ active, onNavigate, onParentZone, children }) {
  return (
    <div className="min-h-screen bg-white md:flex">

      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex md:flex-col md:w-56 md:flex-shrink-0 md:border-r md:border-gray-100 md:py-6 md:px-3 md:gap-1"
        aria-label="Primary"
      >
        {/* Logo */}
        <div className="px-3 mb-4">
          <img
            src="/logo.png"
            alt="Numio"
            className="h-9 w-auto object-contain object-left"
            draggable={false}
          />
        </div>
        {NAV_ITEMS.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={active === item.id}
            onPress={() => onNavigate(item.id)}
            orientation="sidebar"
          />
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onParentZone}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors text-gray-400 hover:bg-gray-50"
        >
          <span className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <FamilyIcon active={false} />
          </span>
          <span className="font-body font-bold text-sm">Parent Zone</span>
        </button>
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
        {/* Parent zone — same style as other nav buttons */}
        <button
          type="button"
          onClick={onParentZone}
          className="flex-1 flex items-center justify-center py-2.5"
          aria-label="Parent Zone"
        >
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center transition-colors text-gray-400">
            <FamilyIcon active={false} />
          </span>
        </button>
      </nav>
    </div>
  )
}
