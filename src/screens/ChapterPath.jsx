import { useEffect, useState, useRef } from 'react'
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

// Distinct from a permanent lock — this is "come back tomorrow," a
// temporary/calendar state, not a progression block.
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
      <path
        d="M10 5.5l1.1 3.4h3.6l-2.9 2.1 1.1 3.4L10 12.4 6.9 14.4l1.1-3.4-2.9-2.1h3.6z"
        fill="#CC7700"
      />
    </svg>
  )
}

// Per-node-type icons for the list rows — distinct glyphs so the 6 rows
// are visually scannable. Each maps to its node's pedagogical purpose
// rather than being arbitrary: unlock=key, learn=seedling, practice=
// repeat-arrows, real_life=house, speed=stopwatch, review=brain/refresh.
function NodeTypeIcon({ node, size = 28 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }

  if (node === 'unlock') return (
    <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l8-8M16 7l2 2M19 4l2 2" />
    </svg>
  )

  if (node === 'learn') return (
    <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21V10M12 10C12 6 9 5 6 5c0 4 1 6 6 5ZM12 10c0-4 3-5 6-5 0 4-1 6-6 5Z" />
    </svg>
  )

  if (node === 'easy') return (
    <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>⭐</span>
  )

  if (node === 'medium') return (
    <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  )

  if (node === 'hard') return (
    <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>🔥</span>
  )

  if (node === 'double_reward') return (
    <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>🪙</span>
  )

  // review
  return (
    <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 1 3 6.7" />
      <path d="M3 16v-4h4" />
    </svg>
  )
}

// ── Day strip ────────────────────────────────────────────────────────────
// 72 circles total per chapter (12 tables × 6 batches). Shows a sliding
// window of ~10 circles centered on the kid's current position — enough
// context to see what's done and what's coming without scrolling through
// 72 at once. Each circle shows the day number. Color state:
//   green filled  = completed (playable as replay)
//   green outline = today's active day session (current cursor)
//   grey locked   = not yet reached OR day-gated (next calendar day)
function DayStrip({ totalDays, currentDay, selectedDay, onSelect }) {
  const selectedRef = useRef(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedDay])

  // Window: show 5 circles before current, current, 4 after — always 10
  // visible, clamped to the 1-totalDays range.
  const BEFORE = 5
  const AFTER  = 4
  const windowStart = Math.max(1, Math.min(currentDay - BEFORE, totalDays - BEFORE - AFTER))
  const windowEnd   = Math.min(totalDays, windowStart + BEFORE + AFTER)
  const visibleDays = Array.from({ length: windowEnd - windowStart + 1 }, (_, i) => windowStart + i)

  return (
    <div className="flex items-center overflow-x-auto no-scrollbar px-4 py-3 justify-start md:justify-center">
      <div className="flex items-center gap-4">
        {/* Ellipsis indicator if more days exist before the window */}
        {windowStart > 1 && (
          <span className="font-body text-xs text-gray-400 px-1">···</span>
        )}

        {visibleDays.map((day) => {
          const isDone     = day < currentDay
          const isCurrent  = day === currentDay
          const isLocked   = day > currentDay
          const isSelected = day === selectedDay

          return (
            <button
              key={day}
              ref={isSelected ? selectedRef : null}
              type="button"
              disabled={isLocked}
              onClick={() => !isLocked && onSelect(day)}
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-body font-bold text-xs transition-all active:translate-y-1"
              style={{
                backgroundColor: isLocked ? '#E5E7EB' : DUO_GREEN,
                color: isLocked ? '#9CA3AF' : '#FFFFFF',
                // 3D bottom shadow — darker green for active/done, grey for locked
                boxShadow: isLocked
                  ? '0 4px 0 0 #B0B7C0'
                  : `0 4px 0 0 ${DUO_GREEN_DARK}`,
                // Shine overlay via outline for selected state
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
              }}
              aria-label={`Day ${day}${isLocked ? ', locked' : isDone ? ', completed' : ', today'}`}
              aria-pressed={isSelected}
            >
              {isDone
                ? <CheckIcon size={14} />
                : isLocked
                  ? <LockIcon size={13} />
                  : day}
            </button>
          )
        })}

        {/* Ellipsis indicator if more days exist after the window */}
        {windowEnd < totalDays && (
          <span className="font-body text-xs text-gray-400 px-1">···</span>
        )}
      </div>
    </div>
  )
}

// ── Node list row ────────────────────────────────────────────────────────
// 'dayLocked' is a distinct visual state from a normal progression lock —
// uses a clock icon and different copy, since it's temporary ("come back
// tomorrow"), not a permanent block.
// Per-node accent colors — makes each card feel distinct and fun
const NODE_COLORS = {
  unlock:        { bg: '#DCFCE7', icon: '#16A34A', border: '#86EFAC', shadow: '#4ADE80' },
  learn:         { bg: '#DCFCE7', icon: '#16A34A', border: '#86EFAC', shadow: '#4ADE80' },
  easy:          { bg: '#DCFCE7', icon: '#16A34A', border: '#86EFAC', shadow: '#4ADE80' },
  medium:        { bg: '#DBEAFE', icon: '#2563EB', border: '#93C5FD', shadow: '#60A5FA' },
  hard:          { bg: '#FFF7ED', icon: '#EA580C', border: '#FDBA74', shadow: '#FB923C' },
  double_reward: { bg: '#FEF3C7', icon: '#D97706', border: '#FCD34D', shadow: '#FBBF24' },
  review:        { bg: '#F5F3FF', icon: '#7C3AED', border: '#C4B5FD', shadow: '#A78BFA' },
  // legacy
  what_happened: { bg: '#FEF3C7', icon: '#D97706', border: '#FCD34D', shadow: '#FBBF24' },
  practice:      { bg: '#DBEAFE', icon: '#2563EB', border: '#93C5FD', shadow: '#60A5FA' },
  real_life:     { bg: '#FCE7F3', icon: '#BE185D', border: '#F9A8D4', shadow: '#F472B6' },
  speed:         { bg: '#FFF7ED', icon: '#EA580C', border: '#FDBA74', shadow: '#FB923C' },
}

function NodeRow({ node, status, nextUnlockAt, isCurrent, isWelcome, onPress }) {
  const locked    = status === 'locked'
  const dayLocked = status === 'day_locked'
  const completed = status === 'completed'
  const disabled  = locked || dayLocked
  const colors    = NODE_COLORS[node] || NODE_COLORS.learn
  const isDoubleReward = node === 'double_reward'
  const isHard = node === 'hard'

  const subtitle = locked
    ? 'Locked'
    : dayLocked
      ? nextUnlockMessage(nextUnlockAt)
      : completed
        ? 'Completed — tap to replay'
        : nodePurpose(node)

  const displayLabel = isWelcome ? 'Welcome!' : nodeLabel(node)

  // Shimmer classes always apply for hard/double_reward regardless of lock state
  const shimmerClass = isDoubleReward ? 'gold-shimmer' : isHard ? 'red-shimmer' : ''

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={`w-full flex items-center gap-4 rounded-3xl px-4 py-4 transition-all active:translate-y-1 ${shimmerClass ? shimmerClass : 'border-2'}`}
      style={(!isDoubleReward && !isHard) ? {
        backgroundColor: disabled ? '#F9FAFB' : completed ? '#DCFCE7' : colors.bg,
        borderColor: disabled ? '#E5E7EB' : completed ? DUO_GREEN : colors.border,
        boxShadow: disabled
          ? '0 4px 0 0 #D1D5DB'
          : completed
            ? `0 4px 0 0 ${DUO_GREEN_DARK}`
            : isCurrent
              ? `0 4px 0 0 ${colors.shadow}, 0 0 0 3px ${colors.border}`
              : `0 4px 0 0 ${colors.shadow ?? colors.border}`,
      } : {}}
    >
      {/* Big icon badge */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={isDoubleReward ? {
          background: disabled ? 'rgba(245,158,11,0.25)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: disabled ? '#d97706' : '#fff',
          boxShadow: disabled ? 'none' : '0 3px 0 #b45309',
        } : isHard ? {
          background: disabled ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
          color: disabled ? '#ef4444' : '#fff',
          boxShadow: disabled ? 'none' : '0 3px 0 #991b1b',
        } : {
          backgroundColor: disabled ? '#E5E7EB' : completed ? `${DUO_GREEN}22` : `${colors.icon}22`,
          color: disabled ? '#9CA3AF' : completed ? DUO_GREEN : colors.icon,
        }}
      >
        <NodeTypeIcon node={node} size={28} />
      </div>

      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-display font-bold text-lg leading-tight ${
            isDoubleReward ? (disabled ? 'text-amber-600' : 'text-amber-900')
            : isHard       ? (disabled ? 'text-red-400'   : 'text-red-900')
            : disabled     ? 'text-gray-300'
            : 'text-gray-900'
          }`}>
            {displayLabel}
          </p>
          {isCurrent && !completed && !disabled && (
            <span className="text-white font-display font-black rounded-full px-2 py-0.5"
              style={{ backgroundColor: isDoubleReward ? '#d97706' : isHard ? '#b91c1c' : colors.icon, fontSize: 10 }}>
              NEXT UP
            </span>
          )}
          {isDoubleReward && (
            <span className="font-display font-black rounded-full px-2 py-0.5"
              style={{ backgroundColor: disabled ? 'rgba(217,119,6,0.2)' : '#d97706', color: disabled ? '#d97706' : '#fff', fontSize: 10 }}>
              2×
            </span>
          )}
        </div>
        <p className={`font-body text-sm mt-0.5 leading-snug font-semibold ${
          dayLocked        ? 'text-amber-500'
          : isDoubleReward ? (disabled ? 'text-amber-500' : 'text-amber-700')
          : isHard         ? (disabled ? 'text-red-300'   : 'text-red-600')
          : locked         ? 'text-gray-300'
          : completed      ? 'text-gray-400'
          : 'text-gray-500'
        }`}
        style={{ color: !dayLocked && !locked && !completed && !isDoubleReward && !isHard && isCurrent ? colors.icon : undefined }}
        >
          {subtitle}
        </p>
      </div>

      {/* Status badge */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={isDoubleReward && !completed ? {
          background: disabled ? 'rgba(245,158,11,0.2)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: disabled ? '#d97706' : '#fff',
          boxShadow: disabled ? 'none' : '0 2px 0 #b45309',
        } : isHard && !completed ? {
          background: disabled ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
          color: disabled ? '#ef4444' : '#fff',
          boxShadow: disabled ? 'none' : '0 2px 0 #991b1b',
        } : {
          backgroundColor: dayLocked ? '#FEF3C7' : locked ? '#F3F4F6' : completed ? DUO_GREEN : `${colors.icon}22`,
          color: dayLocked ? '#D97706' : locked ? '#D1D5DB' : completed ? '#FFFFFF' : colors.icon,
        }}
      >
        {dayLocked
          ? <ClockLockIcon size={18} />
          : locked
            ? <LockIcon size={18} />
            : completed
              ? <CheckIcon size={18} />
              : <span style={{ fontSize: 18 }}>→</span>}
      </div>
    </button>
  )
}


export default function ChapterPath({ operation, onStartNode, onBack, kidId }) {
  if (!kidId) throw new Error('ChapterPath: kidId is required — do not render without a real kid ID')
  const [kid, setKid] = useState(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [openNode, setOpenNode] = useState(null)
  const [dayGateBlocked, setDayGateBlocked] = useState(false)
  const [tooltip, setTooltip] = useState(null) // 'streak' | 'hearts' | 'coins' | null
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
        // Default selected day to the kid's current day within this chapter,
        // or day 1 if they haven't reached this chapter yet.
        if (data.current_operation === operation) {
          const day = (data.current_table - 1) * BATCH_COUNT + (data.current_batch || 1)
          setSelectedDay(day)
        } else {
          // Chapter is either not yet reached (locked) or already completed.
          // For completed chapters (cursor is past this operation), show day 72
          // so the kid sees all their completed work, not an empty day 1.
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

  // Derive table/batch from the selected day number (1-72)
  const selectedTable = Math.ceil(selectedDay / BATCH_COUNT)
  const selectedBatch = ((selectedDay - 1) % BATCH_COUNT) + 1

  // The kid's current day number within this chapter.
  // For completed chapters (cursor is past this operation), set to TOTAL_DAYS+1
  // so all 72 circles show as done (green checkmarks) in the strip.
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
    if (status === 'locked' || status === 'day_locked') return
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

    // Defense-in-depth day gate: the node list already shows next-batch nodes
    // as day_locked (so they can't be tapped), but re-check here with a live
    // server query in case kid state was stale when the UI rendered.
    const targetUnlock = { operation, table, batch, node: 'unlock' }
    const pos = chainPosition(currentPos, targetUnlock)
    if (pos === 'next_new_batch' || pos === 'current' || pos === 'next_same_batch') {
      const allowed = await canStartNewUnit(kidId)
      if (!allowed) {
        setDayGateBlocked(true)
        return
      }
    }

    // Learn is always free — no lives, no entry fee.
    const isLearnNode = node === 'learn'
    // Replay: completed nodes are always free per spec.
    // A node is a replay if it's behind the current cursor (isCompleted returns true).
    const targetPos = { operation, table, batch, node }
    const isReplayNode = !isLearnNode && isCompleted(currentPos, targetPos)
    // Heart gate: non-learn, non-replay nodes require at least 1 heart.
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

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes goldShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes redShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .gold-shimmer {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 30%, #fbbf24 50%, #fde68a 70%, #fef3c7 100%) !important;
          background-size: 200% 200% !important;
          animation: goldShimmer 2s linear infinite !important;
          border: 2.5px solid #f59e0b !important;
          box-shadow: 0 4px 0 #d97706, 0 2px 20px rgba(245,158,11,0.4) !important;
        }
        .red-shimmer {
          background: linear-gradient(135deg, #fff1f0 0%, #fecaca 30%, #f87171 50%, #fecaca 70%, #fff1f0 100%) !important;
          background-size: 200% 200% !important;
          animation: redShimmer 2s linear infinite !important;
          border: 2.5px solid #ef4444 !important;
          box-shadow: 0 4px 0 #b91c1c, 0 2px 20px rgba(239,68,68,0.4) !important;
        }
      `}</style>

      <div className="sticky top-0 bg-white z-30 border-b border-gray-100">
        <div className="flex items-center justify-between px-3 py-3 max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500
                       transition-colors duration-150 active:bg-gray-100"
            aria-label="Back to chapters"
          >
            <BackIcon />
          </button>
          {/* Close tooltip on outside click */}
          {tooltip && (
            <div className="fixed inset-0 z-40" onClick={() => { setTooltip(null); setRechargeError(null) }} />
          )}

          <div className="flex items-center gap-2">

            {/* ── Streak badge ── */}
            <div className="relative">
              <button
                onClick={() => setTooltip(t => t === 'streak' ? null : 'streak')}
                className="flex items-center gap-1.5 bg-orange-50 rounded-full px-3 py-2 border border-orange-200 active:scale-95 transition-transform"
              >
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

            {/* ── Hearts badge ── */}
            <div className="relative">
              <button
                onClick={() => { setTooltip(t => t === 'hearts' ? null : 'hearts'); setRechargeError(null) }}
                className="flex items-center gap-1.5 bg-red-50 rounded-full px-3 py-2 border border-red-100 active:scale-95 transition-transform"
              >
                <HeartStatIcon />
                <span className="font-body font-bold text-base text-red-400 leading-none tabular-nums">
                  {kid.heart_balance ?? 5}
                </span>
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
                  <p className="font-body text-xs text-gray-400 mb-3">
                    Hearts are lost when you answer wrong. Recharge with coins.
                  </p>
                  {(kid.heart_balance ?? 5) < 5 ? (
                    <>
                      {rechargeError && (
                        <p className="font-body text-xs text-red-400 mb-2">{rechargeError}</p>
                      )}
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

            {/* ── Coins badge ── */}
            <div className="relative">
              <button
                onClick={() => setTooltip(t => t === 'coins' ? null : 'coins')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 border active:scale-95 transition-transform ${
                  inDebt ? 'border-red-200' : 'border-amber-200'
                }`}
                style={{ backgroundColor: inDebt ? 'rgba(239,68,68,0.06)' : 'rgba(255,183,0,0.08)' }}
              >
                <CoinStatIcon />
                <span className={`font-body font-bold text-base leading-none tabular-nums ${inDebt ? 'text-red-500' : 'text-amber-700'}`}>
                  {kid.coin_balance}
                </span>
              </button>
              {tooltip === 'coins' && (
<div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 w-44 text-center" onClick={e => e.stopPropagation()}>
                  <p className="text-2xl mb-1">⭐</p>
                  <p className="font-display font-bold text-gray-900 text-sm">Coins</p>
                  <p className={`font-body font-bold text-lg mt-1 tabular-nums ${inDebt ? 'text-red-500' : 'text-amber-600'}`}>
                    {kid.coin_balance}
                  </p>
                  <p className="font-body text-xs text-gray-400 mt-1">
                    {inDebt ? "You're in debt — keep playing to earn coins back!" : "Earn coins by completing activities."}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        <DayStrip
          totalDays={TOTAL_DAYS}
          currentDay={currentDay || 1}
          selectedDay={selectedDay}
          onSelect={handleSelectDay}
        />
      </div>

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
          <button
            onClick={() => setDayGateBlocked(false)}
            className="flex-shrink-0 font-body font-bold text-xs text-amber-600 active:opacity-70"
            aria-label="Dismiss"
          >
            OK
          </button>
        </div>
      )}

      {noHeartsBlocked && (
        <div className="mx-4 mt-3 rounded-2xl border-2 border-red-100 bg-red-50 px-5 py-4 max-w-sm md:max-w-3xl lg:max-w-5xl md:mx-auto">
          {kid.coin_balance >= 10 ? (
            /* Has enough coins — show recharge option */
            <>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-display font-bold text-base text-red-700">💔 No hearts left!</p>
                  <p className="font-body text-sm text-red-500 mt-0.5">Recharge a heart to keep playing.</p>
                </div>
                <button onClick={() => setNoHeartsBlocked(false)}
                  className="font-body font-bold text-xs text-red-300 active:opacity-70 flex-shrink-0">✕</button>
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
            /* Can't afford recharge — friendly dead-end screen */
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display font-bold text-base text-red-700">💔 No hearts left!</p>
                  <p className="font-body text-sm text-red-500 mt-0.5">Not enough coins to recharge (need 10 ⭐).</p>
                </div>
                <button onClick={() => setNoHeartsBlocked(false)}
                  className="font-body font-bold text-xs text-red-300 active:opacity-70 flex-shrink-0">✕</button>
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

      <div className="px-4 pt-5 pb-2 max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto">
        <p className="font-body font-bold text-xs tracking-widest uppercase" style={{ color: theme.colors.primary }}>
          {theme.operationLabel} · Table {selectedTable}
        </p>
        <p className="font-display font-bold text-2xl text-gray-900">
          Day {selectedDay} of {TOTAL_DAYS}
        </p>
        <p className="font-body text-xs text-gray-400 mt-0.5">
          Today's facts: {factsForBatch(selectedBatch).map(f => `${selectedTable} ${theme.symbol} ${f}`).join(', ')}
        </p>
      </div>

      <div className="max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto px-4 pb-10 flex flex-col gap-4">
        {selectedStatus === 'locked' ? (
          <div className="md:col-span-2 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-6 text-center">
            <LockIcon size={26} />
            <p className="font-body text-sm text-gray-400 mt-2">
              Complete the previous day to unlock this one.
            </p>
          </div>
        ) : (
          NODES.map(node => {
            const targetPos = {
              operation,
              table: selectedTable,
              batch: selectedBatch,
              node,
            }

            const unlockedInChain =
              selectedStatus === 'completed' ||
              (selectedStatus === 'active' && isUnlocked(currentPos, targetPos))

            const completed =
              selectedStatus === 'completed' ||
              (selectedStatus === 'active' && isCompleted(currentPos, targetPos))

            const isCurrent =
              selectedStatus === 'active' &&
              currentPos.table === selectedTable &&
              currentPos.batch === selectedBatch &&
              currentPos.node === node

            // Day 1 of any chapter (batch 1, unlock node, table 1) →
            // this is the Welcome/Intro screen, not a regular unlock exercise.
            // Show it as a special state so the label reflects that.
            const isWelcome = node === 'unlock' &&
              selectedBatch === 1 &&
              selectedTable === 1 &&
              (isCurrent || unlockedInChain)

            // Day gate: batch-level check using server next_unlock_at.
            // When gate is closed and the selected batch IS the cursor's current batch,
            // every node in that batch shows as day_locked — including nodes that are
            // not yet unlockedInChain (chain only unlocks unlock+learn after advance;
            // the rest show as 'locked' by chain but must show 'day_locked' to the kid).
            const gateOpen = !kid.next_unlock_at || new Date(kid.next_unlock_at) <= new Date()
            const isCurrentBatch =
              currentPos.operation === operation &&
              currentPos.table === selectedTable &&
              currentPos.batch === selectedBatch

            // Batch 4 nodes are all completed=true so they show as 'completed' (replayable).
            // Batch 5 nodes: if gate closed, ALL are day_locked regardless of chain state.
            const dayLocked = !gateOpen && isCurrentBatch && !completed

            const status = completed
              ? 'completed'
              : dayLocked
                ? 'day_locked'
                : unlockedInChain
                  ? 'active'
                  : 'locked'

            return (
              <NodeRow
                key={node}
                node={node}
                status={status}
                nextUnlockAt={kid.next_unlock_at}
                isCurrent={isCurrent}
                isWelcome={isWelcome}
                onPress={() => handleTogglePopover(selectedTable, selectedBatch, node, status, isCurrent)}
              />
            )
          })
        )}
      </div>

      {openNode && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpenNode(null)}
          />
          <div
            className="fixed z-50 bg-white anim-sheet-in
                       bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-5 pb-8 max-w-sm mx-auto
                       md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto
                       md:rounded-3xl md:max-w-md md:w-full md:px-6 md:pt-6 md:pb-7"
          >
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
