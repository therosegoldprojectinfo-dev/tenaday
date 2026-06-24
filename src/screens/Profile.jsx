import { useEffect, useState } from 'react'
import { fetchKid, fetchKidStats } from '../lib/kidData'
import { eraProgress, OPERATIONS } from '../lib/progression'
import { themeFor } from '../lib/eraTheme'

function FlameIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.3-2-1-3 2 1 3 3 3 5.5A6.5 6.5 0 0 1 13.5 18 6.5 6.5 0 0 1 7 11.5C7 7 12 6 12 2Z"
        fill="#FF9600"
      />
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFC700" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#FFB700" />
      <circle cx="10" cy="10" r="7" fill="#FFD700" />
      <path
        d="M10 5.5l1.1 3.4h3.6l-2.9 2.1 1.1 3.4L10 12.4 6.9 14.4l1.1-3.4-2.9-2.1h3.6z"
        fill="#CC7700"
      />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1CB0F6" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="#1CB0F6" stroke="none" />
    </svg>
  )
}

function StatCard({ icon, value, label, accent }) {
  return (
    <div
      className="flex-1 rounded-2xl px-4 py-4 flex items-center gap-3"
      style={{ backgroundColor: accent ? `${accent}14` : '#F9FAFB' }}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-display font-bold text-xl text-gray-900 leading-none tabular-nums">{value}</p>
        <p className="font-body text-xs text-gray-400 mt-1 leading-tight">{label}</p>
      </div>
    </div>
  )
}

export default function Profile({ kidId, onSwitchProfile }) {
  const [kid, setKid] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchKid(kidId), fetchKidStats(kidId)])
      .then(([kidData, statsData]) => {
        if (cancelled) return
        setKid(kidData)
        setStats(statsData)
      })
      .catch(err => {
        console.error('Failed to load profile:', err)
        if (!cancelled) setError(err)
      })
    return () => { cancelled = true }
  }, [kidId])

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-center">
        <p className="font-body text-gray-500">
          Couldn't load profile. Check your Supabase connection and .env file.
        </p>
      </div>
    )
  }

  if (!kid || !stats) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-body text-gray-400">Loading…</p>
      </div>
    )
  }

  const theme = themeFor(kid.current_operation)
  const overallPct = Math.round(
    (OPERATIONS.reduce((sum, op) => sum + eraProgress(
      { operation: kid.current_operation, table: kid.current_table, batch: kid.current_batch || 1, node: kid.current_node },
      op
    ), 0) / OPERATIONS.length) * 100
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-sm md:max-w-md mx-auto px-4 pt-6 pb-10">

        {/* Header zone — colored card matching the reference layout, no
            human avatar per spec (kid-facing app, near-zero admin chrome).
            Era-tinted to the kid's current chapter so it still feels
            personal/alive rather than a flat generic header. */}
        <div
          className="rounded-3xl px-6 py-8 flex flex-col items-center text-center mb-5"
          style={{ backgroundColor: `${theme.colors.primary}1A` }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <span className="font-display font-extrabold text-3xl text-white">
              {kid.name?.trim()?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl text-gray-900">{kid.name}</h1>
          {kid.age && (
            <p className="font-body text-sm text-gray-400 mt-0.5">{kid.age} years old</p>
          )}
        </div>

        {/* Current progress */}
        <div className="rounded-2xl border border-gray-100 px-4 py-4 mb-5">
          <p className="font-body font-bold text-xs tracking-widest uppercase mb-1" style={{ color: theme.colors.primary }}>
            {theme.operationLabel}
          </p>
          <p className="font-display font-bold text-lg text-gray-900 mb-2">
            Table {kid.current_table} · Day {kid.current_batch || 1} of 72 · {overallPct}% complete
          </p>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(overallPct, 2)}%`, backgroundColor: '#58cc02' }}
            />
          </div>
        </div>

        {/* Stats grid — only real, honestly-derived numbers. No
            fabricated streak/league/leaderboard placeholders, since
            those systems don't exist yet (spec explicitly puts social
            features/leaderboards out of scope). */}
        <p className="font-body font-bold text-xs text-gray-400 uppercase tracking-wide mb-2 px-1">Stats</p>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2.5">
            <StatCard icon={<FlameIcon />} value={stats.distinctDays} label="Days played" />
            <StatCard icon={<ZapIcon />} value={stats.totalCorrect} label="Correct answers" />
          </div>
          <div className="flex gap-2.5">
            <StatCard icon={<CoinIcon />} value={kid.coin_balance} label="Coin balance" />
            <StatCard icon={<TargetIcon />} value={stats.nodesPassed} label="Nodes passed" />
          </div>
        </div>

        {onSwitchProfile && (
          <button
            onClick={onSwitchProfile}
            className="w-full text-center mt-6 font-body font-bold text-sm py-3 rounded-2xl border-2 border-gray-200
                       transition-colors active:bg-gray-50"
            style={{ color: '#1CB0F6' }}
          >
            Switch profile
          </button>
        )}
      </div>
    </div>
  )
}
