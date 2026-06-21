import { useEffect, useState } from 'react'
import { OPERATIONS, eraStatus, eraProgress } from '../lib/progression'
import { fetchKid, DEMO_KID_ID } from '../lib/kidData'
import { DEBT_FLOOR } from '../lib/economy'

// ── Card visual spec ─────────────────────────────────────────────────────
// Per the Duolingo chapter-card reference: every card shares the SAME
// light-blue top zone and white bottom zone — no per-era color tinting.
// Duolingo green is the only accent color (progress fill, trophy), grey
// is the only "locked" treatment. This intentionally drops the earlier
// per-era palette idea for the card list (era color still lives on the
// Practice screen's banner).

const CARD_BLUE  = '#DDF0FB' // shared top-zone background, matches mascot art bg
const LOCK_GREY  = '#E5E7EB'
const LOCK_GREY_TEXT = '#9CA3AF'

const MASCOTS = {
  addition: '/mascots/flower-addition.png',
  subtraction: '/mascots/flower-subtraction.png',
  multiplication: '/mascots/flower-multiplication.png',
  division: '/mascots/flower-division.png',
}

const CHAPTER_LABEL = {
  addition: 'Chapter 1 · Addition',
  subtraction: 'Chapter 2 · Subtraction',
  multiplication: 'Chapter 3 · Multiplication',
  division: 'Chapter 4 · Division',
}

const BUBBLE_SYMBOL = {
  addition: '+ + +',
  subtraction: '− − −',
  multiplication: '× × ×',
  division: '÷ ÷ ÷',
}

function HeartStatIcon() {
  return (
    <svg width="18" height="16" viewBox="0 0 22 20" fill="#ef4444" aria-hidden="true">
      <path d="M11 18.5S1 12.3 1 6.5a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 5.8-10 12-10 12z" />
    </svg>
  )
}

function CoinStatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#FFB700" />
      <circle cx="10" cy="10" r="7"  fill="#FFD700" />
      <path
        d="M10 5.5l1.1 3.4h3.6l-2.9 2.1 1.1 3.4L10 12.4 6.9 14.4l1.1-3.4-2.9-2.1h3.6z"
        fill="#CC7700"
      />
    </svg>
  )
}

function TrophyIcon({ color = '#58cc02' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4h10v4a5 5 0 0 1-10 0V4Z"
        fill={color}
      />
      <path
        d="M7 5H4a2 2 0 0 0-2 2c0 2.2 1.8 4 4 4M17 5h3a2 2 0 0 1 2 2c0 2.2-1.8 4-4 4"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="10" y="13" width="4" height="4" fill={color} />
      <rect x="7" y="17" width="10" height="3" rx="1.5" fill={color} />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function ChapterCard({ operation, status, progress, resumeLabel, onPress }) {
  const locked = status === 'locked'
  const pct = Math.round(progress * 100)

  return (
    <button
      type="button"
      disabled={locked}
      onClick={onPress}
      className="w-full text-left rounded-2xl border overflow-hidden disabled:opacity-90"
      style={{
        borderColor: locked ? '#E5E7EB' : '#E5E7EB',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Top zone: shared light-blue (or grey if locked), mascot bleeding off
          the edge, speech bubble with the operation symbol. */}
      <div
        className="relative h-44 overflow-hidden"
        style={{ backgroundColor: locked ? LOCK_GREY : CARD_BLUE }}
      >
        <div
          className="absolute top-4 left-4 bg-white rounded-2xl px-4 py-2.5 max-w-[70%]"
          style={{ borderBottomLeftRadius: 4 }}
        >
          <p
            className="font-display font-extrabold text-xl tracking-wide"
            style={{ color: locked ? '#C4C9D1' : '#3C3C3C' }}
          >
            {BUBBLE_SYMBOL[operation]}
          </p>
        </div>

        <img
          src={MASCOTS[operation]}
          alt=""
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute bottom-0 right-0 h-40 w-40 object-contain object-bottom select-none pointer-events-none"
          style={{
            filter: locked ? 'grayscale(1) opacity(0.45)' : 'none',
            userSelect: 'none',
            WebkitUserDrag: 'none',
          }}
        />
      </div>

      {/* Bottom zone: white, chapter title + either progress bar or lock state */}
      <div className="px-4 py-4">
        <p
          className="font-display font-bold text-lg leading-tight mb-2"
          style={{ color: locked ? LOCK_GREY_TEXT : '#3C3C3C' }}
        >
          {CHAPTER_LABEL[operation]}
        </p>

        {locked ? (
          <div className="flex items-center gap-2">
            <LockIcon />
            <span className="font-body font-semibold text-sm text-gray-400">Locked</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden relative">
                <div
                  className="h-full rounded-full origin-left"
                  style={{
                    backgroundColor: '#58cc02',
                    transform: `scaleX(${Math.max(progress, 0.04)})`,
                    transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center font-body font-bold text-xs text-gray-500">
                  {pct}%
                </span>
              </div>
              <TrophyIcon color={pct >= 100 ? '#58cc02' : '#D1D5DB'} />
            </div>
            {status === 'active' && resumeLabel && (
              <p className="font-body font-bold text-xs uppercase tracking-wide mt-2" style={{ color: '#1CB0F6' }}>
                {pct === 0 ? 'Start here' : `Resume · ${resumeLabel}`}
              </p>
            )}
          </>
        )}
      </div>
    </button>
  )
}

export default function Map({ onOpenChapter, kidId = DEMO_KID_ID }) {
  const [kid, setKid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchKid(kidId)
      .then(data => { if (!cancelled) setKid(data) })
      .catch(err => {
        console.error('Failed to load kid progress:', err)
        if (!cancelled) setError(err)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [kidId])

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <p className="font-body text-gray-400">Loading…</p>
      </div>
    )
  }

  if (error || !kid) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center px-6 text-center">
        <p className="font-body text-gray-500">
          Couldn't load progress. Check your Supabase connection and .env file.
        </p>
      </div>
    )
  }

  const currentPos = {
    operation: kid.current_operation,
    table: kid.current_table,
    node: kid.current_node,
  }

  function handleCardPress(operation) {
    const status = eraStatus(currentPos, operation)
    if (status === 'locked') return
    // Card tap now opens the in-chapter unit/node path screen — it no
    // longer charges the entry fee or jumps straight into Practice. The
    // entry fee is charged per-node, inside that new screen, right before
    // a specific node is actually started.
    onOpenChapter(operation)
  }

  const inDebt = kid.coin_balance < 0
  const atDebtFloor = kid.coin_balance <= DEBT_FLOOR

  return (
    <div className="min-h-screen bg-white">

      {/* Top stats bar */}
      <div className="sticky top-0 bg-white z-20 border-b border-gray-100">
        <div className="flex items-center justify-end px-5 py-3 max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-red-50 rounded-full px-3 py-2 border border-red-100">
              <HeartStatIcon />
              <span className="font-body font-bold text-base text-red-500 leading-none tabular-nums">4</span>
            </div>
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 border ${
                inDebt ? 'border-red-200' : 'border-amber-200'
              }`}
              style={{ backgroundColor: inDebt ? 'rgba(239,68,68,0.06)' : 'rgba(255,183,0,0.08)' }}
            >
              <CoinStatIcon />
              <span
                className={`font-body font-bold text-base leading-none tabular-nums ${
                  inDebt ? 'text-red-500' : 'text-amber-700'
                }`}
              >
                {kid.coin_balance}
              </span>
            </div>
          </div>
        </div>
      </div>

      {atDebtFloor && (
        <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 max-w-sm md:max-w-3xl lg:max-w-5xl md:mx-auto">
          <p className="font-body text-xs text-red-500 font-semibold">
            Coins are low — retries are free until you earn some back. Keep playing!
          </p>
        </div>
      )}

      {/* Chapter card list — single column on phone, 2 columns on tablet,
          3 on desktop, per standard responsive card-grid practice. */}
      <div className="max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {OPERATIONS.map(operation => {
          const status = eraStatus(currentPos, operation)
          const progress = eraProgress(currentPos, operation)
          const resumeLabel =
            status === 'active' ? `Unit ${currentPos.table}` : null

          return (
            <ChapterCard
              key={operation}
              operation={operation}
              status={status}
              progress={progress}
              resumeLabel={resumeLabel}
              onPress={() => handleCardPress(operation)}
            />
          )
        })}
      </div>

    </div>
  )
}
