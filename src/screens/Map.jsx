import { useEffect, useState } from 'react'
import { themeFor } from '../lib/eraTheme'
import {
  OPERATIONS,
  tablesForOperation,
  isUnlocked,
  isCompleted,
  stageLabel,
} from '../lib/progression'
import { fetchKid, setCoinBalance, logCoinTransaction, DEMO_KID_ID } from '../lib/kidData'
import { applyEntryFee, DEBT_FLOOR } from '../lib/economy'

const NODE_SIZE = 84
const V_STEP    = 104
const TOP_PAD   = 60

// Organic wavy path instead of a strict left/right zigzag — x position
// follows a sine curve so the path drifts and curves the way Duolingo's
// does, rather than snapping between two fixed columns.
const CENTER_X  = 50   // %
const WAVE_AMPL = 28   // % — how far the path swings from center
function xForIndex(i) {
  return CENTER_X + WAVE_AMPL * Math.sin(i * 0.9)
}

function puckShadow(darkHex) {
  return [
    `0 5px 0 0 ${darkHex}`,
    '0 10px 20px rgba(0,0,0,0.18)',
    'inset 0 3px 0 rgba(255,255,255,0.30)',
    'inset 0 -2px 0 rgba(0,0,0,0.12)',
  ].join(', ')
}

function StarIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
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

// Landmark teardrop icon removed per design feedback — was reading as
// clutter, not as a landmark. Era visual variety will come from a real
// illustration pass later, not a floating shape next to nodes.

export default function Map({ onStartStage, kidId = DEMO_KID_ID }) {
  const [kid, setKid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeEra, setActiveEra] = useState(null) // which era panel is expanded; defaults to kid's current

  useEffect(() => {
    let cancelled = false
    fetchKid(kidId)
      .then(data => {
        if (cancelled) return
        setKid(data)
        setActiveEra(data.current_operation)
      })
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
    stage: kid.current_stage,
  }
  const theme = themeFor(activeEra ?? kid.current_operation)
  const eraOperations = OPERATIONS
  const eraIndex = eraOperations.indexOf(activeEra ?? kid.current_operation)
  const tables = tablesForOperation()

  const H = TOP_PAD + (tables.length - 1) * V_STEP + TOP_PAD

  async function handleNodePress(table) {
    const targetPos = { operation: activeEra, table, stage: 'equation' }
    const unlocked = isUnlocked(currentPos, targetPos)
    if (!unlocked) return

    // If this table was already fully completed, replay from 'equation';
    // otherwise resume exactly where the kid's cursor is (could be on
    // word_problem or speed_round within this same table).
    const resumeStage =
      currentPos.operation === activeEra && currentPos.table === table
        ? currentPos.stage
        : 'equation'

    // Charge entry fee up front (spec §7), clamped at the debt floor.
    const newBalance = applyEntryFee(kid.coin_balance)
    try {
      await setCoinBalance(kidId, newBalance)
      await logCoinTransaction(kidId, {
        amount: newBalance - kid.coin_balance,
        reason: 'entry_fee',
        balanceAfter: newBalance,
      })
      setKid(k => ({ ...k, coin_balance: newBalance }))
    } catch (err) {
      console.error('Failed to charge entry fee (continuing anyway):', err)
    }

    onStartStage({
      operation: activeEra,
      table,
      stage: resumeStage,
      coinBalance: newBalance,
    })
  }

  const inDebt = kid.coin_balance < 0
  const atDebtFloor = kid.coin_balance <= DEBT_FLOOR

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>

      {/* Sticky header: stats bar + era tabs + era banner */}
      <div className="sticky top-0 bg-white z-30">

        {/* Stats bar: lives + coins */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
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

        {/* Era tabs — lets a kid/parent jump back to a completed era to replay,
            but pressing a locked-ahead era tab does nothing (spec: no skipping). */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
          {eraOperations.map(op => {
            const t = themeFor(op)
            const opIdx = eraOperations.indexOf(op)
            const reachable = opIdx <= eraOperations.indexOf(kid.current_operation)
            const isActive = op === (activeEra ?? kid.current_operation)
            return (
              <button
                key={op}
                disabled={!reachable}
                onClick={() => reachable && setActiveEra(op)}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 font-body font-bold text-xs tracking-wide transition-colors ${
                  isActive
                    ? 'text-white'
                    : reachable
                      ? 'text-gray-500 bg-gray-100'
                      : 'text-gray-300 bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: t.colors.primary } : {}}
              >
                {t.era}
              </button>
            )
          })}
        </div>

        {/* Era banner */}
        <div
          className="mx-4 mb-3 rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.colors.primary, boxShadow: `0 3px 0 0 ${theme.colors.dark}` }}
        >
          <div>
            <p className="font-body font-bold text-xs text-white/70 tracking-widest uppercase leading-none mb-1">
              {theme.era} · {theme.operationLabel}
            </p>
            <p className="font-display font-bold text-lg text-white leading-tight">
              {currentPos.operation === activeEra
                ? `Table ${currentPos.table} · ${stageLabel(currentPos.stage)}`
                : eraIndex < eraOperations.indexOf(kid.current_operation)
                  ? 'Completed — tap to replay'
                  : 'Locked'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}>
            <svg width="18" height="13" viewBox="0 0 18 13" fill="white" aria-hidden="true">
              <rect width="18" height="2.5" rx="1.25" />
              <rect y="5.25" width="18" height="2.5" rx="1.25" />
              <rect y="10.5" width="18" height="2.5" rx="1.25" />
            </svg>
          </div>
        </div>

        {atDebtFloor && (
          <div className="mx-4 mb-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
            <p className="font-body text-xs text-red-500 font-semibold">
              Coins are low — retries are free until you earn some back. Keep playing!
            </p>
          </div>
        )}
      </div>

      {/* Scrollable map — nodes positioned absolutely within this fixed-height container */}
      <div className="relative mx-auto max-w-sm" style={{ height: H, backgroundColor: '#FFFFFF' }}>

        {tables.map((table, i) => {
          const x = xForIndex(i)
          const y = TOP_PAD + i * V_STEP

          const targetPos = { operation: activeEra, table, stage: 'equation' }
          const unlocked = isUnlocked(currentPos, targetPos)
          const completed = isCompleted(currentPos, { operation: activeEra, table, stage: 'speed_round' })
          const isCurrentTable = currentPos.operation === activeEra && currentPos.table === table

          let icon = <StarIcon />
          if (completed) icon = <CheckIcon />
          else if (!unlocked) icon = <LockIcon />

          const RING_PAD = 12 // gap between node edge and the surrounding ring

          return (
            <div
              key={table}
              className="absolute"
              style={{
                left: `${x}%`,
                top: y,
                width: 0,
                height: 0,
                zIndex: isCurrentTable ? 15 : 10,
              }}
            >
              {/* Concentric "current node" ring — true circle centered on the
                  node, drawn behind it, never offset from the puck itself. */}
              {isCurrentTable && (
                <div
                  className="absolute rounded-full"
                  style={{
                    width: NODE_SIZE + RING_PAD * 2,
                    height: NODE_SIZE + RING_PAD * 2,
                    left: -(NODE_SIZE / 2 + RING_PAD),
                    top: -(NODE_SIZE / 2 + RING_PAD),
                    border: `3px solid ${theme.colors.primary}`,
                  }}
                />
              )}

              <button
                type="button"
                disabled={!unlocked}
                onClick={() => handleNodePress(table)}
                className="absolute rounded-full flex items-center justify-center
                           transition-transform duration-75 active:translate-y-1 disabled:active:translate-y-0"
                style={{
                  width: NODE_SIZE,
                  height: NODE_SIZE,
                  left: -NODE_SIZE / 2,
                  top: -NODE_SIZE / 2,
                  backgroundColor: unlocked ? theme.colors.primary : '#D1D5DB',
                  boxShadow: unlocked ? puckShadow(theme.colors.dark) : puckShadow('#9CA3AF'),
                }}
                aria-label={
                  completed
                    ? `Table ${table}, completed — tap to replay`
                    : unlocked
                      ? `Start table ${table}`
                      : `Table ${table}, locked`
                }
              >
                {icon}
              </button>

              {isCurrentTable && (
                <div
                  className="absolute font-body font-bold text-xs tracking-widest uppercase whitespace-nowrap px-3 py-1 rounded-full text-white"
                  style={{
                    top: -(NODE_SIZE / 2 + RING_PAD + 34),
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: theme.colors.primary,
                  }}
                >
                  Start
                </div>
              )}
            </div>
          )
        })}

      </div>
    </div>
  )
}
