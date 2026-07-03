import { useEffect, useState } from 'react'
import { OPERATIONS, eraStatus, eraProgress } from '../lib/progression'
import { fetchKid, fetchStreak } from '../lib/kidData'
import { DEBT_FLOOR } from '../lib/economy'

const CARD_BLUE  = '#DDF0FB'

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


function CoinStatIcon() {
  return <img src="/Cr%C3%A9ation%20sans%20titre%20(27).png" width="40" height="40" alt="" />
}

function TrophyIcon({ color = '#58cc02' }) {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h12v5a6 6 0 0 1-12 0V3Z" fill={color} />
      <path d="M6 5H3a1.5 1.5 0 0 0-1.5 1.5C1.5 8.5 3 10 5 10.5M18 5h3a1.5 1.5 0 0 1 1.5 1.5C22.5 8.5 21 10 19 10.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <rect x="9" y="14" width="6" height="4" fill={color} />
      <rect x="6" y="18" width="12" height="3" rx="1.5" fill={color} />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
      className="w-full text-left rounded-3xl border-2 overflow-hidden disabled:opacity-90 transition-all active:translate-y-1"
      style={{
        borderColor: locked ? '#E5E7EB' : '#D1D5DB',
        backgroundColor: '#FFFFFF',
        boxShadow: locked ? '0 4px 0 0 #E5E7EB' : '0 6px 0 0 #C4C4C4',
        // Grayscale the whole card when locked — same treatment as nodes
        filter: locked ? 'grayscale(1) opacity(0.6)' : 'none',
      }}
    >
      {/* Top zone */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: CARD_BLUE, height: 220 }}
      >
        <img
          src={MASCOTS[operation]}
          alt=""
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute bottom-0 right-0 select-none pointer-events-none"
          style={{ height: 200, width: 'auto', userSelect: 'none', WebkitUserDrag: 'none' }}
        />
      </div>

      {/* Bottom zone */}
      <div className="px-5 py-5">
        <p className="font-display font-bold text-xl leading-tight mb-3 text-gray-800">
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
              <p className="font-body font-bold text-xs uppercase tracking-wide mt-2.5" style={{ color: '#1CB0F6' }}>
                {pct === 0 ? 'Start here' : `Resume · ${resumeLabel}`}
              </p>
            )}
          </>
        )}
      </div>
    </button>
  )
}

function StreakTooltip({ streak }) {
  const DAYS = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa']
  const todayIdx = new Date().getDay()
  const circles = Array.from({ length: 5 }, (_, i) => {
    const offset = -2 + i
    const dayIdx = ((todayIdx + offset) % 7 + 7) % 7
    const isCurrent = offset === 0
    const daysBack = -offset
    const filled = offset < 0 ? daysBack < streak : offset === 0 ? streak > 0 : false
    return { label: DAYS[dayIdx], filled, isCurrent }
  })
  return (
    <div style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      zIndex: 999, background: 'white', borderRadius: 20,
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #f3f4f6',
      padding: '16px 16px 12px', width: 200, textAlign: 'center',
    }} onClick={e => e.stopPropagation()}>
      <p style={{ fontFamily: "\'Baloo 2\', sans-serif", fontWeight: 800, fontSize: 28, color: '#1a1a1a', margin: '0 0 2px' }}>{streak}</p>
      <p style={{ fontFamily: "\'Baloo 2\', sans-serif", fontWeight: 600, fontSize: 12, color: '#9ca3af', margin: '0 0 12px' }}>
        {streak === 0 ? 'Play today to start a streak!' : `day${streak === 1 ? '' : 's'} in a row`}
      </p>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {circles.map((c, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              backgroundColor: c.filled ? '#d4f000' : '#f3f4f6',
              border: c.isCurrent ? '2px solid #d4f000' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: c.filled ? '0 2px 6px rgba(212,240,0,0.4)' : 'none',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill={c.filled ? '#1a1a1a' : '#d1d5db'} />
              </svg>
            </div>
            <span style={{ fontFamily: "\'Baloo 2\', sans-serif", fontWeight: c.isCurrent ? 800 : 600, fontSize: 10, color: c.isCurrent ? '#1a1a1a' : '#9ca3af' }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Map({ onOpenChapter, kidId }) {
  const [kid, setKid] = useState(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchKid(kidId), fetchStreak(kidId)])
      .then(([kidData, streakData]) => {
        if (!cancelled) { setKid(kidData); setStreak(streakData) }
      })
      .catch(err => { if (!cancelled) setError(err) })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [kidId])

  if (loading) return <div className="bg-white min-h-screen flex items-center justify-center"><p className="font-body text-gray-400">Loading…</p></div>
  if (error || !kid) return <div className="bg-white min-h-screen flex items-center justify-center px-6 text-center"><p className="font-body text-gray-500">Couldn't load progress.</p></div>

  const currentPos = {
    operation: kid.current_operation,
    table: kid.current_table,
    batch: kid.current_batch || 1,
    node: kid.current_node,
  }

  function handleCardPress(operation) {
    if (eraStatus(currentPos, operation) === 'locked') return
    onOpenChapter(operation)
  }


  const inDebt = kid.coin_balance < 0
  const atDebtFloor = kid.coin_balance <= DEBT_FLOOR

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white z-20 border-b border-gray-100">
        {tooltip && <div className="fixed inset-0 z-40" onClick={() => setTooltip(null)} />}
        <div className="flex items-center justify-between px-5 py-3 max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto">
          <div className="relative">
            <button onClick={() => setTooltip(t => t === 'streak' ? null : 'streak')} className="flex items-center gap-1.5 active:scale-95 transition-transform">
              <img src="/Cr%C3%A9ation%20sans%20titre%20(29).png" width="32" height="32" alt="" />
              <span className="font-body font-bold text-base text-orange-500 leading-none tabular-nums">{streak}</span>
            </button>
            {tooltip === 'streak' && <StreakTooltip streak={streak} />}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setTooltip(t => t === 'coins' ? null : 'coins')} className="flex items-center gap-1.5 active:scale-95 transition-transform">
                <CoinStatIcon />
                <span className={`font-body font-bold text-base leading-none tabular-nums ${inDebt ? 'text-red-500' : 'text-amber-700'}`}>{kid.coin_balance}</span>
              </button>
              {tooltip === 'coins' && (
                <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 w-44 text-center" onClick={e => e.stopPropagation()}>
                  <p className="mb-1"><img src="/Cr%C3%A9ation%20sans%20titre%20(27).png" width="56" height="56" alt="" /></p>
                  <p className="font-display font-bold text-gray-900 text-sm">Coins</p>
                  <p className={`font-body font-bold text-lg mt-1 tabular-nums ${inDebt ? 'text-red-500' : 'text-amber-600'}`}>{kid.coin_balance}</p>
                  <p className="font-body text-xs text-gray-400 mt-1">{inDebt ? "You're in debt — keep playing to earn coins back!" : 'Earn coins by completing activities.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {atDebtFloor && (
        <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 max-w-sm md:max-w-3xl lg:max-w-5xl md:mx-auto">
          <p className="font-body text-xs text-red-500 font-semibold">Coins are low — retries are free until you earn some back. Keep playing!</p>
        </div>
      )}

      <div className="max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {OPERATIONS.map(operation => {
          const status = eraStatus(currentPos, operation)
          const progress = eraProgress(currentPos, operation)
          const resumeLabel = status === 'active'
            ? `Unit ${(currentPos.table - 1) * 6 + (currentPos.batch || 1)}`
            : null
          return (
            <ChapterCard key={operation} operation={operation} status={status} progress={progress} resumeLabel={resumeLabel} onPress={() => handleCardPress(operation)} />
          )
        })}
      </div>
    </div>
  )
}
