import { useEffect, useState, useRef } from 'react'
import { themeFor } from '../lib/eraTheme'
import {
  NODES,
  tablesForOperation,
  isUnlocked,
  isCompleted,
  unitStatus,
  nodeLabel,
} from '../lib/progression'
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

function StarIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
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

// Per-node-type icons for the list rows — distinct glyphs so the 5 rows
// are visually scannable, not 5 identical circles with different labels.
function NodeTypeIcon({ node, size = 22 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }
  if (node === 'equations') {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
        <path d="M5 8h6M5 16h6M14 7l6 10M20 7l-6 10" />
      </svg>
    )
  }
  if (node === 'speed_round') {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.5a9.5 9.5 0 1 0 6.7 16.2M12 7v5l3.5 2" />
        <path d="M18 4l1.5-1.5M20 6l1.5-1.5" />
      </svg>
    )
  }
  if (node === 'irl') {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10l8-6 8 6v10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    )
  }
  if (node === 'irl_timed') {
    return (
      <svg {...common} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10l8-6 8 6v10" />
        <path d="M9 20v-6h6v6" />
        <circle cx="18" cy="6" r="4" fill="white" stroke="currentColor" strokeWidth="2" />
        <path d="M18 4.5V6l1 1" />
      </svg>
    )
  }
  // gift / bonus round
  return (
    <svg {...common} fill="currentColor" stroke="none">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M5 5H4a2 2 0 0 0-2 2c0 2.2 1.8 4 4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M19 5h1a2 2 0 0 1 2 2c0 2.2-1.8 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="10" y="13" width="4" height="4" />
      <rect x="7" y="17" width="10" height="3" rx="1.5" />
    </svg>
  )
}

// ── Horizontal unit selector ────────────────────────────────────────────
// A scrollable strip of connected circles, one per unit (matches the
// reference: "+1, +2, +3, +4..." checkpoint timeline). All 12 are always
// visible/scrollable; only unlocked ones are tappable.
function UnitSelector({ tables, currentPos, operation, theme, selectedTable, onSelect }) {
  const selectedRef = useRef(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedTable])

  return (
    <div className="flex items-center overflow-x-auto no-scrollbar px-4 py-4">
      {tables.map((table, i) => {
        const uStatus = unitStatus(currentPos, operation, table)
        const locked = uStatus === 'locked'
        const completed = uStatus === 'completed'
        const isSelected = table === selectedTable

        let icon = <span className="font-body font-bold text-sm">{table}</span>
        if (completed) icon = <CheckIcon size={18} />
        else if (locked) icon = <LockIcon size={16} />
        else if (uStatus === 'active') icon = <StarIcon size={16} />

        return (
          <div key={table} className="flex items-center flex-shrink-0">
            {i > 0 && (
              <div
                className="h-0.5 w-6"
                style={{ backgroundColor: completed || uStatus === 'active' ? theme.colors.primary : '#E5E7EB' }}
              />
            )}
            <button
              ref={isSelected ? selectedRef : null}
              type="button"
              disabled={locked}
              onClick={() => onSelect(table)}
              className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-transform"
              style={{
                backgroundColor: locked ? '#E5E7EB' : theme.colors.primary,
                color: locked ? '#9CA3AF' : '#FFFFFF',
                outline: isSelected ? `3px solid ${theme.colors.dark}` : 'none',
                outlineOffset: '2px',
                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
              }}
              aria-label={`Unit ${table}${locked ? ', locked' : ''}`}
              aria-pressed={isSelected}
            >
              {icon}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Node list row ────────────────────────────────────────────────────────
// Horizontal card: icon, title + progress indicator, status circle —
// matches the reference's task-list visual language directly.
function NodeRow({ node, status, isCurrent, onPress }) {
  const locked = status === 'locked'
  const completed = status === 'completed'
  const isGift = node === 'gift'

  const subtitle = locked
    ? 'Locked'
    : completed
      ? 'Completed — tap to replay'
      : isCurrent
        ? 'Up next'
        : 'Ready to play'

  return (
    <button
      type="button"
      disabled={locked}
      onClick={onPress}
      className="w-full flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3.5
                 transition-transform active:scale-[0.98] disabled:active:scale-100"
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: locked ? '#F3F4F6' : isGift ? '#FFF7E0' : '#EAF8DC',
          color: locked ? '#9CA3AF' : isGift ? '#CC9900' : DUO_GREEN_DARK,
        }}
      >
        <NodeTypeIcon node={node} />
      </div>

      <div className="flex-1 text-left min-w-0">
        <p className={`font-display font-bold text-base leading-tight ${locked ? 'text-gray-400' : 'text-gray-900'}`}>
          {nodeLabel(node)}
        </p>
        <p className={`font-body text-xs mt-0.5 ${locked ? 'text-gray-300' : completed ? 'text-gray-400' : 'text-green-600'}`}>
          {subtitle}
        </p>
      </div>

      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: locked ? '#F3F4F6' : completed ? DUO_GREEN : '#F3F4F6',
          color: locked ? '#D1D5DB' : completed ? '#FFFFFF' : '#D1D5DB',
        }}
      >
        {locked ? <LockIcon size={16} /> : <CheckIcon size={16} />}
      </div>
    </button>
  )
}

export default function ChapterPath({ operation, onStartNode, onBack, kidId = DEMO_KID_ID }) {
  const [kid, setKid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  // The single node whose confirmation bottom-sheet is open, or null.
  const [openNode, setOpenNode] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchKid(kidId)
      .then(data => {
        if (cancelled) return
        setKid(data)
        // Default the selected unit to the kid's current table in this
        // chapter, or table 1 if they haven't reached this chapter yet.
        setSelectedTable(data.current_operation === operation ? data.current_table : 1)
      })
      .catch(err => {
        console.error('Failed to load kid progress:', err)
        if (!cancelled) setError(err)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [kidId, operation])

  if (loading || selectedTable === null) {
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
    node: kid.current_node,
  }
  const tables = tablesForOperation()
  const selectedUnitStatus = unitStatus(currentPos, operation, selectedTable)

  function handleSelectUnit(table) {
    setOpenNode(null)
    setSelectedTable(table)
  }

  function handleTogglePopover(table, node, status, isCurrent) {
    if (status === 'locked') return
    setOpenNode(prev =>
      prev && prev.table === table && prev.node === node
        ? null
        : { table, node, status, isCurrent }
    )
  }

  async function handleConfirmStart() {
    if (!openNode) return
    const { table, node } = openNode
    setOpenNode(null)

    // Charge entry fee up front (spec §7), clamped at the debt floor —
    // charged on the bottom sheet's confirm tap, not the row tap that
    // just opens it, so browsing the unit's nodes never costs coins.
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

    onStartNode({ operation, table, node, coinBalance: newBalance })
  }

  const inDebt = kid.coin_balance < 0
  const atDebtFloor = kid.coin_balance <= DEBT_FLOOR

  return (
    <div className="min-h-screen bg-white">

      {/* Top stats bar + back button */}
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

        {/* Horizontal scrollable unit selector — connected checkpoint
            timeline, all 12 units visible, only unlocked ones tappable. */}
        <UnitSelector
          tables={tables}
          currentPos={currentPos}
          operation={operation}
          theme={theme}
          selectedTable={selectedTable}
          onSelect={handleSelectUnit}
        />
      </div>

      {atDebtFloor && (
        <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 max-w-sm md:max-w-3xl lg:max-w-5xl md:mx-auto">
          <p className="font-body text-xs text-red-500 font-semibold">
            Coins are low — retries are free until you earn some back. Keep playing!
          </p>
        </div>
      )}

      {/* Selected unit header */}
      <div className="px-4 pt-5 pb-2 max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto">
        <p className="font-body font-bold text-xs tracking-widest uppercase" style={{ color: theme.colors.primary }}>
          {theme.operationLabel}
        </p>
        <p className="font-display font-bold text-2xl text-gray-900">
          Unit {selectedTable}
        </p>
      </div>

      {/* The 5 exercises for the selected unit, as list rows — single
          column on phone, 2 columns on tablet/desktop since these are
          short list-style rows that read fine side by side. */}
      <div className="max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto px-4 pb-10 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {selectedUnitStatus === 'locked' ? (
          <div className="md:col-span-2 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-6 text-center">
            <LockIcon size={26} />
            <p className="font-body text-sm text-gray-400 mt-2">
              Complete the previous unit to unlock this one.
            </p>
          </div>
        ) : (
          NODES.map(node => {
            const targetPos = { operation, table: selectedTable, node }

            const unlocked =
              selectedUnitStatus === 'completed' ||
              (selectedUnitStatus === 'active' && isUnlocked(currentPos, targetPos))

            const completed =
              selectedUnitStatus === 'completed' ||
              (selectedUnitStatus === 'active' && isCompleted(currentPos, targetPos))

            const isCurrent =
              selectedUnitStatus === 'active' &&
              currentPos.table === selectedTable &&
              currentPos.node === node

            const status = completed ? 'completed' : unlocked ? 'active' : 'locked'

            return (
              <NodeRow
                key={node}
                node={node}
                status={status}
                isCurrent={isCurrent}
                onPress={() => handleTogglePopover(selectedTable, node, status, isCurrent)}
              />
            )
          })
        )}
      </div>

      {/* Node confirmation: bottom sheet on phone (standard mobile pattern),
          centered modal on tablet/desktop — a full-width sheet sliding up
          across a wide monitor would look broken, so it switches treatment
          at the md breakpoint rather than just stretching. */}
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
                  ? 'Ready when you are'
                  : 'Tap to play'}
            </p>
            <button
              onClick={handleConfirmStart}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest"
            >
              {openNode.status === 'completed'
                ? 'PRACTICE'
                : openNode.node === 'gift'
                  ? 'BONUS ROUND'
                  : 'START'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
