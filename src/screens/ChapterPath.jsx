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
} from '../lib/progression'
import { isPlayableToday, nextUnlockMessage } from '../lib/dayGate'
import { fetchKid, setCoinBalance, logCoinTransaction, DEMO_KID_ID } from '../lib/kidData'
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
function NodeTypeIcon({ node, size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }
  if (node === 'unlock') {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12l8-8M16 7l2 2M19 4l2 2" />
      </svg>
    )
  }
  if (node === 'learn') {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21V10M12 10C12 6 9 5 6 5c0 4 1 6 6 5ZM12 10c0-4 3-5 6-5 0 4-1 6-6 5Z" />
      </svg>
    )
  }
  if (node === 'what_happened') {
    // Question mark bubble — "which equation describes this?"
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 9a3 3 0 1 1 4 2.8c-.6.2-1 .8-1 1.4V14" />
        <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    )
  }
  if (node === 'practice') {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2l4 4-4 4M21 6H8a4 4 0 0 0-4 4v1M7 22l-4-4 4-4M3 18h13a4 4 0 0 0 4-4v-1" />
      </svg>
    )
  }
  if (node === 'real_life') {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10l8-6 8 6v10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    )
  }
  if (node === 'speed') {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.5a9.5 9.5 0 1 0 6.7 16.2M12 7v5l3.5 2" />
        <path d="M18 4l1.5-1.5M20 6l1.5-1.5" />
      </svg>
    )
  }
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
      <div className="flex items-center gap-2.5">
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
              className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-body font-bold text-xs transition-transform"
              style={{
                backgroundColor: isDone ? DUO_GREEN : isLocked ? '#F3F4F6' : DUO_GREEN,
                color: isLocked ? '#D1D5DB' : '#FFFFFF',
                outline: isSelected ? `3px solid ${DUO_GREEN_DARK}` : 'none',
                outlineOffset: '2px',
                transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                opacity: isLocked ? 0.5 : 1,
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
  unlock:       { bg: '#EDE9FE', icon: '#7C3AED', border: '#C4B5FD' },
  learn:        { bg: '#DCFCE7', icon: '#16A34A', border: '#86EFAC' },
  what_happened:{ bg: '#FEF3C7', icon: '#D97706', border: '#FCD34D' },
  practice:     { bg: '#DBEAFE', icon: '#2563EB', border: '#93C5FD' },
  real_life:    { bg: '#FCE7F3', icon: '#BE185D', border: '#F9A8D4' },
  speed:        { bg: '#FFF7ED', icon: '#EA580C', border: '#FDBA74' },
  review:       { bg: '#F0FDF4', icon: '#15803D', border: '#4ADE80' },
}

function NodeRow({ node, status, isCurrent, isWelcome, onPress }) {
  const locked    = status === 'locked'
  const dayLocked = status === 'day_locked'
  const completed = status === 'completed'
  const disabled  = locked || dayLocked
  const colors    = NODE_COLORS[node] || NODE_COLORS.learn

  const subtitle = locked
    ? 'Locked'
    : dayLocked
      ? nextUnlockMessage()
      : completed
        ? 'Completed — tap to replay'
        : isWelcome
          ? "Let's get started! 🎉"
          : isCurrent
            ? nodePurpose(node)
            : 'Ready to play!'

  const displayLabel = isWelcome ? 'Welcome!' : nodeLabel(node)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className="w-full flex items-center gap-4 rounded-3xl border-2 px-4 py-4
                 transition-transform active:scale-[0.97] disabled:active:scale-100"
      style={{
        backgroundColor: disabled ? '#F9FAFB' : colors.bg,
        borderColor: disabled ? '#E5E7EB' : completed ? DUO_GREEN : colors.border,
        boxShadow: disabled ? 'none' : isCurrent ? `0 4px 12px ${colors.border}80` : 'none',
      }}
    >
      {/* Big icon badge */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: disabled ? '#E5E7EB' : completed ? `${DUO_GREEN}22` : `${colors.icon}22`,
          color: disabled ? '#9CA3AF' : completed ? DUO_GREEN : colors.icon,
        }}
      >
        <NodeTypeIcon node={node} size={28} />
      </div>

      <div className="flex-1 text-left min-w-0">
        <p className={`font-display font-bold text-lg leading-tight ${disabled ? 'text-gray-300' : 'text-gray-900'}`}>
          {displayLabel}
        </p>
        <p className={`font-body text-sm mt-0.5 leading-snug font-semibold ${
          dayLocked   ? 'text-amber-500'
          : locked    ? 'text-gray-300'
          : completed ? 'text-gray-400'
          : isCurrent ? `text-[${colors.icon}]`
          : 'text-green-500'
        }`}
        style={{ color: !dayLocked && !locked && !completed && isCurrent ? colors.icon : undefined }}
        >
          {subtitle}
        </p>
      </div>

      {/* Status badge */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{
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

export default function ChapterPath({ operation, onStartNode, onBack, kidId = DEMO_KID_ID }) {
  const [kid, setKid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [openNode, setOpenNode] = useState(null)

  const TOTAL_DAYS = TABLE_COUNT * BATCH_COUNT // 72

  useEffect(() => {
    let cancelled = false
    fetchKid(kidId)
      .then(data => {
        if (cancelled) return
        setKid(data)
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
    node: kid.current_node,
  }

  // Derive table/batch from the selected day number (1-72)
  const selectedTable = Math.ceil(selectedDay / BATCH_COUNT)
  const selectedBatch = ((selectedDay - 1) % BATCH_COUNT) + 1

  // The kid's current day number within this chapter.
  // For completed chapters (cursor is past this operation), set to TOTAL_DAYS+1
  // so all 72 circles show as done (green checkmarks) in the strip.
  const opOrder = ['addition','subtraction','multiplication','division']
  const isCompleted = opOrder.indexOf(currentPos.operation) > opOrder.indexOf(operation)
  const currentDay = isCompleted
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

    const unlockBatch = node === 'unlock'
      ? previousBatch(operation, table, batch)
      : undefined

    const reviewPool = node === 'review'
      ? reviewPoolFor(operation, table, batch)
      : undefined

    onStartNode({
      operation, table, batchNum: batch, node,
      coinBalance: newBalance,
      reviewPool,
      unlockBatch,
      placementClaim: kid.placement_claim,
    })
  }

  const inDebt = kid.coin_balance < 0
  const atDebtFloor = kid.coin_balance <= DEBT_FLOOR

  return (
    <div className="min-h-screen bg-white">

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

      <div className="max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto px-4 pb-10 flex flex-col gap-3">
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

            let dayLocked = false
            if (selectedStatus === 'active' && unlockedInChain && !completed) {
              const pos = chainPosition(currentPos, targetPos)
              const playable = isPlayableToday(pos, kid.last_advance_date, new Date())
              dayLocked = !playable
            }

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
