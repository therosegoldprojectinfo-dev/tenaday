import { useEffect, useState } from 'react'
import { themeFor } from '../lib/eraTheme'
import {
  NODES,
  TABLE_COUNT,
  BATCH_COUNT,
  tablesForOperation,
  isUnlocked,
  isCompleted,
  tableStatus,
  nodeLabel,
  nodePurpose,
  chainPosition,
  reviewPoolFor,
  previousBatch,
  factsForBatch,
  normalizeNode,
} from '../lib/progression'
import { canStartNewUnit, nextUnlockMessage } from '../lib/dayGate'
import { fetchKid, fetchStreak, setCoinBalance, logCoinTransaction, rechargeHeart, DEMO_KID_ID } from '../lib/kidData'
import { applyEntryFee, DEBT_FLOOR } from '../lib/economy'

const DUO_GREEN = '#58cc02'
const DUO_GREEN_DARK = '#46a302'

// ── Icons ────────────────────────────────────────────────────────────────

function CheckIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function LockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function ClockLockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 16L6.5 10L12.5 4" />
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
      <circle cx="10" cy="10" r="7" fill="#FFD700" />
      <path d="M10 5.5l1.1 3.4h3.6l-2.9 2.1 1.1 3.4L10 12.4 6.9 14.4l1.1-3.4-2.9-2.1h3.6z" fill="#CC7700" />
    </svg>
  )
}

// ── Day strip ────────────────────────────────────────────────────────────

// ── Node label mapping ────────────────────────────────────────────────────
const NODE_DISPLAY_NAMES = {
  unlock:        'Welcome',
  learn:         'Learn',
  easy:          'Easy',
  medium:        'Medium',
  hard:          'Hard',
  double_reward: 'Double Reward',
  review:        'Review',
}

// ── Zigzag positions: alternates left / right ─────────────────────────────
// index 0,2,4,6 → left; 1,3,5 → right
const ZIGZAG_SIDES = ['left', 'right', 'left', 'right', 'left', 'right', 'left']

// ── 3D Disc Node button ───────────────────────────────────────────────────
function DiscNode({ node, status, isCurrent, isWelcome, onPress, side, nextUnlockAt }) {
  const locked       = status === 'locked'
  const dayLocked    = status === 'day_locked'
  const completed    = status === 'completed'
  const disabled     = locked || dayLocked
  const isReview     = node === 'review'
  const isDoubleReward = node === 'double_reward'
  const isSpecial    = isReview || isDoubleReward

  // Double reward always keeps gold color even when locked
  const forceGold = isDoubleReward

  const displayName = isWelcome ? 'Welcome' : (NODE_DISPLAY_NAMES[node] || nodeLabel(node))

  // Node image src
  const imgSrc = isDoubleReward
    ? '/ChatGPT Image 27 juin 2026, 18_34_34.png'
    : isReview
      ? '/ChatGPT Image 27 juin 2026, 18_29_52.png'
      : '/ChatGPT Image 27 juin 2026, 18_28_19.png'

  // Status overlay — only day-locked clock badge remains; no checkmark, no arrow
  const statusIcon = dayLocked
    ? <div style={{
        position: 'absolute', bottom: -4, right: -4,
        width: 28, height: 28, borderRadius: '50%',
        backgroundColor: '#FEF3C7',
        border: '2px solid #FCD34D',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#D97706',
      }}>
        <ClockLockIcon size={14} />
      </div>
    : null

  // Label side — no NEXT UP badge, no arrow, just the name
  const label = (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: side === 'left' ? 'flex-start' : 'flex-end',
      maxWidth: 110,
    }}>
      <span style={{
        fontFamily: 'var(--font-display, "Baloo 2", sans-serif)',
        fontWeight: 800,
        fontSize: 15,
        color: (disabled && !forceGold) ? '#9CA3AF' : '#1f2937',
        lineHeight: 1.2,
        textAlign: side === 'left' ? 'left' : 'right',
      }}>{displayName}</span>
      {dayLocked && (
        <span style={{
          marginTop: 3, fontSize: 10, fontWeight: 700,
          color: '#D97706',
        }}>⏰ Tomorrow</span>
      )}
    </div>
  )

  return (
    <div style={{
      display: 'flex',
      justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
      paddingLeft: side === 'left' ? 16 : 0,
      paddingRight: side === 'right' ? 16 : 0,
      marginBottom: 28,
    }}>
      <button
        type="button"
        disabled={disabled && !forceGold}
        onClick={(!disabled || forceGold) ? onPress : undefined}
        style={{
          display: 'flex',
          flexDirection: side === 'left' ? 'row' : 'row-reverse',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: disabled && !forceGold ? 'default' : 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={displayName}
      >
        {/* Disc image */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={imgSrc}
            alt={displayName}
            style={{
              width: isSpecial ? 240 : 216,
              height: isSpecial ? 240 : 216,
              objectFit: 'contain',
              filter: (disabled && !forceGold) ? 'grayscale(100%) opacity(0.55)' : 'none',
              transform: isCurrent ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.2s ease',
              display: 'block',
              // pulse shadow for current node
              ...(isCurrent ? { filter: 'drop-shadow(0 0 10px rgba(124,58,237,0.5))' } : {}),
            }}
            draggable={false}
          />
          {statusIcon}
        </div>

        {label}
      </button>
    </div>
  )
}

// ── Unit banner ───────────────────────────────────────────────────────────
function UnitBanner({ unitNumber, facts, operation, table }) {
  const theme = themeFor(operation)
  const factStr = facts.map(f => `${table} ${theme.symbol} ${f}`).join(', ')
  return (
    <div style={{
      margin: '8px 20px 28px',
      borderRadius: 18,
      border: '2px solid',
      borderColor: '#e0e7ff',
      backgroundColor: '#fff',
      padding: '14px 18px',
      boxShadow: '0 2px 0 #c7d2fe',
      textAlign: 'center',
    }}>
      <p style={{
        fontFamily: 'var(--font-display, "Baloo 2", sans-serif)',
        fontWeight: 900,
        fontSize: 11,
        letterSpacing: '0.1em',
        color: '#6366f1',
        textTransform: 'uppercase',
        marginBottom: 2,
      }}>
        Unit {unitNumber}
      </p>
      <p style={{
        fontFamily: 'var(--font-display, "Baloo 2", sans-serif)',
        fontWeight: 800,
        fontSize: 15,
        color: '#1f2937',
      }}>
        {factStr}
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function ChapterPath({ operation, onStartNode, onBack, kidId }) {
  if (!kidId) throw new Error('ChapterPath: kidId is required — do not render without a real kid ID')
  const [kid, setKid] = useState(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [openNode, setOpenNode] = useState(null)
  const [dayGateBlocked, setDayGateBlocked] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const [noHeartsBlocked, setNoHeartsBlocked] = useState(false)
  const [recharging, setRecharging] = useState(false)
  const [rechargeError, setRechargeError] = useState(null)

  const TOTAL_DAYS = TABLE_COUNT * BATCH_COUNT // 72

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchKid(kidId), fetchStreak(kidId)])
      .then(([data, streakData]) => {
        if (cancelled) return
        setKid(data)
        setStreak(streakData)
        if (data.current_operation === operation) {
          const day = (data.current_table - 1) * BATCH_COUNT + (data.current_batch || 1)
          setSelectedDay(day)
        } else {
          const opIdx = ['addition','subtraction','multiplication','division'].indexOf(operation)
          const curOpIdx = ['addition','subtraction','multiplication','division'].indexOf(data.current_operation)
          setSelectedDay(curOpIdx > opIdx ? TABLE_COUNT * BATCH_COUNT : 1)
        }
      })
      .catch(err => {
        console.error('Failed to load kid progress:', err)
        if (!cancelled) setError(err)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [kidId, operation])

  if (loading || selectedDay === null) {
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

  const theme = themeFor(operation)
  const currentPos = {
    operation: kid.current_operation,
    table: kid.current_table,
    batch: kid.current_batch || 1,
    node: normalizeNode(kid.current_node),
  }

  const selectedTable = Math.ceil(selectedDay / BATCH_COUNT)
  const selectedBatch = ((selectedDay - 1) % BATCH_COUNT) + 1

  const opOrder = ['addition','subtraction','multiplication','division']
  const isChapterCompleted = opOrder.indexOf(currentPos.operation) > opOrder.indexOf(operation)
  const currentDay = isChapterCompleted
    ? TOTAL_DAYS + 1
    : currentPos.operation === operation
      ? (currentPos.table - 1) * BATCH_COUNT + currentPos.batch
      : 0

  const selectedStatus = tableStatus(currentPos, operation, selectedTable)

  function handleSelectDay(day) {
    setOpenNode(null)
    setSelectedDay(day)
  }

  function handleTogglePopover(table, batch, node, status, isCurrent) {
    if (status === 'locked') return
    if (status === 'day_locked') return
    setOpenNode(prev =>
      prev && prev.table === table && prev.batch === batch && prev.node === node
        ? null
        : { table, batch, node, status, isCurrent }
    )
  }

  async function handleConfirmStart() {
    if (!openNode) return
    const { table, batch, node } = openNode
    setOpenNode(null)

    const targetUnlock = { operation, table, batch, node: 'unlock' }
    const pos = chainPosition(currentPos, targetUnlock)
    if (pos === 'next_new_batch' || pos === 'current' || pos === 'next_same_batch') {
      const allowed = await canStartNewUnit(kidId)
      if (!allowed) {
        setDayGateBlocked(true)
        return
      }
    }

    const isLearnNode = node === 'learn'
    const targetPos = { operation, table, batch, node }
    const isReplayNode = !isLearnNode && isCompleted(currentPos, targetPos)
    if (!isLearnNode && !isReplayNode && (kid.heart_balance ?? 5) === 0) {
      setNoHeartsBlocked(true)
      return
    }
    const newBalance = (isLearnNode || isReplayNode) ? kid.coin_balance : applyEntryFee(kid.coin_balance)

    if (!isLearnNode && !isReplayNode) {
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
    }

    const unlockBatch = node === 'unlock'
      ? previousBatch(operation, table, batch)
      : undefined

    const reviewPool = node === 'review'
      ? reviewPoolFor(operation, table, batch)
      : undefined

    onStartNode({
      operation, table, batchNum: batch, node,
      coinBalance: newBalance,
      heartBalance: kid.heart_balance ?? 5,
      reviewPool,
      unlockBatch,
      placementClaim: kid.placement_claim,
    })
  }

  async function handleRechargeHeart() {
    if (recharging) return
    setRechargeError(null)
    setRecharging(true)
    try {
      const { newHearts, newCoins } = await rechargeHeart(kidId, kid.heart_balance ?? 5, kid.coin_balance)
      setKid(k => ({ ...k, heart_balance: newHearts, coin_balance: newCoins }))
    } catch (err) {
      setRechargeError(err.message)
    } finally {
      setRecharging(false)
    }
  }

  const inDebt = kid.coin_balance < 0
  const atDebtFloor = kid.coin_balance <= DEBT_FLOOR

  // ── Build full path: all 72 units, each with 7 nodes ─────────────────
  // We render ALL units in the path (not just selected day),
  // but dim/lock based on current progress.
  // Unit number = (table - 1) * BATCH_COUNT + batch  (1-indexed)
  const allUnits = []
  for (let t = 1; t <= TABLE_COUNT; t++) {
    for (let b = 1; b <= BATCH_COUNT; b++) {
      allUnits.push({ table: t, batch: b, unitNumber: (t - 1) * BATCH_COUNT + b })
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(124,58,237,0.4)); }
          50% { filter: drop-shadow(0 0 18px rgba(124,58,237,0.8)); }
        }
        .node-current img {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 bg-white z-30 border-b border-gray-100">
        <div className="flex items-center justify-between px-3 py-3 max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 transition-colors duration-150 active:bg-gray-100"
            aria-label="Back to chapters"
          >
            <BackIcon />
          </button>

          {tooltip && (
            <div className="fixed inset-0 z-40" onClick={() => { setTooltip(null); setRechargeError(null) }} />
          )}

          <div className="flex items-center gap-2">
            {/* Streak */}
            <div className="relative">
              <button onClick={() => setTooltip(t => t === 'streak' ? null : 'streak')}
                className="flex items-center gap-1.5 bg-orange-50 rounded-full px-3 py-2 border border-orange-200 active:scale-95 transition-transform">
                <span className="text-base leading-none">🔥</span>
                <span className="font-body font-bold text-base text-orange-500 leading-none tabular-nums">{streak}</span>
              </button>
              {tooltip === 'streak' && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 w-44 text-center" onClick={e => e.stopPropagation()}>
                  <p className="text-2xl mb-1">🔥</p>
                  <p className="font-display font-bold text-gray-900 text-sm">Day Streak</p>
                  <p className="font-body text-xs text-gray-400 mt-1">
                    {streak === 0 ? 'No streak yet — play today!' : `${streak} day${streak === 1 ? '' : 's'} in a row!`}
                  </p>
                </div>
              )}
            </div>

            {/* Hearts */}
            <div className="relative">
              <button onClick={() => { setTooltip(t => t === 'hearts' ? null : 'hearts'); setRechargeError(null) }}
                className="flex items-center gap-1.5 bg-red-50 rounded-full px-3 py-2 border border-red-100 active:scale-95 transition-transform">
                <HeartStatIcon />
                <span className="font-body font-bold text-base text-red-400 leading-none tabular-nums">{kid.heart_balance ?? 5}</span>
              </button>
              {tooltip === 'hearts' && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 w-52 text-center" onClick={e => e.stopPropagation()}>
                  <p className="text-2xl mb-1">❤️</p>
                  <p className="font-display font-bold text-gray-900 text-sm">Hearts</p>
                  <div className="flex justify-center gap-1 my-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ opacity: i < (kid.heart_balance ?? 5) ? 1 : 0.25, fontSize: 18 }}>❤️</span>
                    ))}
                  </div>
                  <p className="font-body text-xs text-gray-400 mb-3">Hearts are lost when you answer wrong. Recharge with coins.</p>
                  {(kid.heart_balance ?? 5) < 5 ? (
                    <>
                      {rechargeError && <p className="font-body text-xs text-red-400 mb-2">{rechargeError}</p>}
                      <button
                        onClick={handleRechargeHeart}
                        disabled={recharging || kid.coin_balance < 10}
                        className="w-full py-2.5 rounded-xl font-body font-bold text-sm tracking-wide transition-all active:scale-95"
                        style={{
                          backgroundColor: kid.coin_balance >= 10 ? '#ef4444' : '#F3F4F6',
                          color: kid.coin_balance >= 10 ? '#fff' : '#9CA3AF',
                          boxShadow: kid.coin_balance >= 10 ? '0 3px 0 0 #b91c1c' : '0 3px 0 0 #D1D5DB',
                        }}
                      >
                        {recharging ? 'Recharging…' : '❤️ +1 for 10 ⭐'}
                      </button>
                    </>
                  ) : (
                    <p className="font-body text-xs text-green-500 font-bold">Full hearts! ✨</p>
                  )}
                </div>
              )}
            </div>

            {/* Coins */}
            <div className="relative">
              <button onClick={() => setTooltip(t => t === 'coins' ? null : 'coins')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 border active:scale-95 transition-transform ${inDebt ? 'border-red-200' : 'border-amber-200'}`}
                style={{ backgroundColor: inDebt ? 'rgba(239,68,68,0.06)' : 'rgba(255,183,0,0.08)' }}>
                <CoinStatIcon />
                <span className={`font-body font-bold text-base leading-none tabular-nums ${inDebt ? 'text-red-500' : 'text-amber-700'}`}>{kid.coin_balance}</span>
              </button>
              {tooltip === 'coins' && (
                <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 w-44 text-center" onClick={e => e.stopPropagation()}>
                  <p className="text-2xl mb-1">⭐</p>
                  <p className="font-display font-bold text-gray-900 text-sm">Coins</p>
                  <p className={`font-body font-bold text-lg mt-1 tabular-nums ${inDebt ? 'text-red-500' : 'text-amber-600'}`}>{kid.coin_balance}</p>
                  <p className="font-body text-xs text-gray-400 mt-1">
                    {inDebt ? "You're in debt — keep playing to earn coins back!" : "Earn coins by completing activities."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Alert banners ── */}
      {atDebtFloor && (
        <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 max-w-sm md:max-w-3xl lg:max-w-5xl md:mx-auto">
          <p className="font-body text-xs text-red-500 font-semibold">
            Coins are low — retries are free until you earn some back. Keep playing!
          </p>
        </div>
      )}

      {dayGateBlocked && (
        <div className="mx-4 mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 max-w-sm md:max-w-3xl lg:max-w-5xl md:mx-auto flex items-start justify-between gap-3">
          <p className="font-body text-sm text-amber-800 font-semibold leading-snug">
            {nextUnlockMessage(kid.next_unlock_at)}
          </p>
          <button onClick={() => setDayGateBlocked(false)}
            className="flex-shrink-0 font-body font-bold text-xs text-amber-600 active:opacity-70" aria-label="Dismiss">
            OK
          </button>
        </div>
      )}

      {noHeartsBlocked && (
        <div className="mx-4 mt-3 rounded-2xl border-2 border-red-100 bg-red-50 px-5 py-4 max-w-sm md:max-w-3xl lg:max-w-5xl md:mx-auto">
          {kid.coin_balance >= 10 ? (
            <>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-display font-bold text-base text-red-700">💔 No hearts left!</p>
                  <p className="font-body text-sm text-red-500 mt-0.5">Recharge a heart to keep playing.</p>
                </div>
                <button onClick={() => setNoHeartsBlocked(false)} className="font-body font-bold text-xs text-red-300 active:opacity-70 flex-shrink-0">✕</button>
              </div>
              {rechargeError && <p className="font-body text-xs text-red-400 mb-2">{rechargeError}</p>}
              <button
                onClick={async () => {
                  setRechargeError(null)
                  setRecharging(true)
                  try {
                    const { newHearts, newCoins } = await rechargeHeart(kidId, kid.heart_balance ?? 0, kid.coin_balance)
                    setKid(k => ({ ...k, heart_balance: newHearts, coin_balance: newCoins }))
                    setNoHeartsBlocked(false)
                  } catch (err) {
                    setRechargeError(err.message)
                  } finally {
                    setRecharging(false)
                  }
                }}
                disabled={recharging}
                className="w-full py-3 rounded-xl font-body font-bold text-sm tracking-wide transition-all active:scale-95 text-white"
                style={{ backgroundColor: '#ef4444', boxShadow: '0 3px 0 0 #b91c1c' }}
              >
                {recharging ? 'Recharging…' : '❤️ Recharge 1 heart — 10 ⭐'}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display font-bold text-base text-red-700">💔 No hearts left!</p>
                  <p className="font-body text-sm text-red-500 mt-0.5">Not enough coins to recharge (need 10 ⭐).</p>
                </div>
                <button onClick={() => setNoHeartsBlocked(false)} className="font-body font-bold text-xs text-red-300 active:opacity-70 flex-shrink-0">✕</button>
              </div>
              <div className="mt-3 rounded-xl bg-white px-4 py-3 text-center">
                <p className="text-3xl mb-1">🌙</p>
                <p className="font-display font-bold text-sm text-gray-900">Come back tomorrow!</p>
                <p className="font-body text-xs text-gray-400 mt-1 leading-snug">
                  Your hearts refill at midnight. You can still replay completed activities for free!
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Chapter heading ── */}
      <div className="px-4 pt-5 pb-2 max-w-sm md:max-w-md mx-auto">
        <p className="font-body font-bold text-xs tracking-widest uppercase" style={{ color: theme.colors.primary }}>
          {theme.operationLabel}
        </p>
        <p className="font-display font-bold text-2xl text-gray-900">
          {TOTAL_DAYS} Units
        </p>
      </div>

      {/* ── Zigzag path ── */}
      <div className="max-w-sm md:max-w-md mx-auto pt-4 pb-24">
        {allUnits.map(({ table, batch, unitNumber }) => {
          const unitStatus = tableStatus(currentPos, operation, table)
          const facts = factsForBatch(batch)

          return (
            <div key={unitNumber}>
              {/* Unit banner */}
              <UnitBanner
                unitNumber={unitNumber}
                facts={facts}
                operation={operation}
                table={table}
              />

              {/* 7 nodes for this unit */}
              {NODES.map((node, nodeIdx) => {
                const targetPos = { operation, table, batch, node }

                const unlockedInChain =
                  unitStatus === 'completed' ||
                  (unitStatus === 'active' && isUnlocked(currentPos, targetPos))

                const completedNode =
                  unitStatus === 'completed' ||
                  (unitStatus === 'active' && isCompleted(currentPos, targetPos))

                const isCurrent =
                  unitStatus === 'active' &&
                  currentPos.table === table &&
                  currentPos.batch === batch &&
                  currentPos.node === node

                const isWelcome = node === 'unlock' &&
                  batch === 1 &&
                  table === 1 &&
                  (isCurrent || unlockedInChain)

                const gateOpen = !kid.next_unlock_at || new Date(kid.next_unlock_at) <= new Date()
                const isCurrentBatch =
                  currentPos.operation === operation &&
                  currentPos.table === table &&
                  currentPos.batch === batch

                const dayLocked = !gateOpen && isCurrentBatch && !completedNode

                const status = completedNode
                  ? 'completed'
                  : dayLocked
                    ? 'day_locked'
                    : unlockedInChain
                      ? 'active'
                      : 'locked'

                const side = ZIGZAG_SIDES[nodeIdx % ZIGZAG_SIDES.length]

                return (
                  <div key={node} className={isCurrent ? 'node-current' : ''}>
                    <DiscNode
                      node={node}
                      status={status}
                      isCurrent={isCurrent}
                      isWelcome={isWelcome}
                      nextUnlockAt={kid.next_unlock_at}
                      side={side}
                      onPress={() => handleTogglePopover(table, batch, node, status, isCurrent)}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Node popover ── */}
      {openNode && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpenNode(null)} />
          <div className="fixed z-50 bg-white anim-sheet-in
                         bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-5 pb-8 max-w-sm mx-auto
                         md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto
                         md:rounded-3xl md:max-w-md md:w-full md:px-6 md:pt-6 md:pb-7">
            <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-4 md:hidden" />
            <p className="font-display font-bold text-xl text-gray-900 mb-1">
              {nodeLabel(openNode.node)}
            </p>
            <p className="font-body text-sm text-gray-400 mb-5">
              {openNode.status === 'completed'
                ? 'Tap to replay this node'
                : openNode.isCurrent
                  ? nodePurpose(openNode.node)
                  : 'Tap to play'}
            </p>
            <button
              onClick={handleConfirmStart}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest"
            >
              {openNode.status === 'completed'
                ? `REPLAY ${nodeLabel(openNode.node).toUpperCase()}`
                : openNode.node === 'learn'
                  ? 'START LESSON'
                  : openNode.node === 'review'
                    ? 'START REVIEW'
                    : `START ${nodeLabel(openNode.node).toUpperCase()}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
