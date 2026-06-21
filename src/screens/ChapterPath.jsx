import { useEffect, useState } from 'react'
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

// ── Zigzag offsets ───────────────────────────────────────────────────────
// Ported from a real Duolingo-clone reference: a fixed lookup table of
// horizontal offsets per node index, alternating direction per unit. This
// replaces a hand-computed sine wave with the same proven pattern Duolingo
// itself uses — simpler, and because nodes stack via flexbox (not manual
// pixel math), spacing is never wrong regardless of content above it.
const LEFT_OFFSETS  = [0, 64, 96, 56, -16, -64, 0]   // px, negative = shift right
const RIGHT_OFFSETS = [0, -64, -96, -56, 16, 64, 0]

function offsetForNode(unitIndex, nodeIdx) {
  const table = unitIndex % 2 === 0 ? LEFT_OFFSETS : RIGHT_OFFSETS
  return table[nodeIdx % table.length]
}

const NODE_SIZE = 88
const RING_SIZE = 104 // SVG progress ring, larger than the node so it reads as a halo
const RING_STROKE = 5

function puckShadow(darkHex) {
  return [
    `0 6px 0 0 ${darkHex}`,
    '0 12px 22px rgba(0,0,0,0.20)',
    'inset 0 3px 0 rgba(255,255,255,0.30)',
    'inset 0 -2px 0 rgba(0,0,0,0.12)',
  ].join(', ')
}

function StarIcon({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

function CheckIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function LockIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function TrophyIcon({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" fill="white" />
      <path
        d="M7 5H4a2 2 0 0 0-2 2c0 2.2 1.8 4 4 4M17 5h3a2 2 0 0 1 2 2c0 2.2-1.8 4-4 4"
        stroke="white" strokeWidth="2" strokeLinecap="round"
      />
      <rect x="10" y="13" width="4" height="4" fill="white" />
      <rect x="7" y="17" width="10" height="3" rx="1.5" fill="white" />
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

// ── Node button ──────────────────────────────────────────────────────────
// Fixed Duolingo green for every unlocked node (per project-wide rule: only
// green is used for action/interactive elements, regardless of era) — grey
// for locked. The era's own color no longer tints nodes; it only tints the
// unit banner, so the chapter still has visual identity without breaking
// the "green is the only action color" rule.
const DUO_GREEN = '#58cc02'
const DUO_GREEN_DARK = '#46a302'

function PathNode({ table, node, status, isCurrent, offsetPx, onPress }) {
  const locked = status === 'locked'
  const completed = status === 'completed'
  const isTrophyNode = node === 'gift'

  let icon
  if (completed) icon = <CheckIcon />
  else if (locked) icon = <LockIcon />
  else if (isTrophyNode) icon = <TrophyIcon />
  else icon = <StarIcon />

  const nodeSize = isTrophyNode ? NODE_SIZE + 10 : NODE_SIZE

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE, marginLeft: offsetPx }}
    >
      {/* SVG progress ring — current node only. A full ring (progress=1)
          reads as a clear halo without needing a flat grey div behind it. */}
      {isCurrent && (
        <svg
          className="absolute"
          width={RING_SIZE}
          height={RING_SIZE}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={(RING_SIZE - RING_STROKE) / 2}
            stroke="#E5E7EB"
            strokeWidth={RING_STROKE}
            fill="none"
          />
        </svg>
      )}

      <button
        type="button"
        disabled={locked}
        onClick={onPress}
        className="relative rounded-full flex items-center justify-center
                   transition-transform duration-75 active:translate-y-1 disabled:active:translate-y-0"
        style={{
          width: nodeSize,
          height: nodeSize,
          backgroundColor: locked ? '#D1D5DB' : DUO_GREEN,
          boxShadow: locked ? puckShadow('#9CA3AF') : puckShadow(DUO_GREEN_DARK),
        }}
        aria-label={
          completed
            ? `Table ${table}, ${nodeLabel(node)}, completed — tap to replay`
            : locked
              ? `Table ${table}, ${nodeLabel(node)}, locked`
              : `Start table ${table}, ${nodeLabel(node)}`
        }
      >
        {icon}
      </button>
    </div>
  )
}

// ── Unit banner ──────────────────────────────────────────────────────────
// True "sandwich" divider per design reference: sits between the previous
// unit's last node and this unit's first node, with normal flex spacing on
// both sides — never anchored/overlapping either neighbor, because flexbox
// stacking (not manual y-position math) guarantees the gap.
function UnitBanner({ table, status, theme }) {
  if (status === 'locked') {
    // Locked future units get a plain text divider, not a heavy colored
    // banner — matches the lighter-weight treatment Duolingo itself uses
    // for sections you haven't reached yet.
    return (
      <div className="flex items-center gap-3 w-full px-6 py-2">
        <div className="flex-1 h-px bg-gray-200" />
        <p className="font-body font-bold text-sm text-gray-300 text-center whitespace-nowrap">
          Unit {table}
        </p>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
    )
  }

  return (
    <div className="w-full px-4">
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between max-w-sm mx-auto"
        style={{
          backgroundColor: theme.colors.primary,
          boxShadow: `0 3px 0 0 ${theme.colors.dark}`,
        }}
      >
        <div>
          <p className="font-body font-bold text-xs text-white/75 tracking-widest uppercase leading-none mb-1">
            {theme.operationLabel}
          </p>
          <p className="font-display font-bold text-lg text-white leading-tight">
            Unit {table}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ChapterPath({ operation, onStartNode, onBack, kidId = DEMO_KID_ID }) {
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

  const theme = themeFor(operation)
  const currentPos = {
    operation: kid.current_operation,
    table: kid.current_table,
    node: kid.current_node,
  }
  const tables = tablesForOperation()

  async function handleNodePress(table, node) {
    const uStatus = unitStatus(currentPos, operation, table)
    const targetPos = { operation, table, node }

    const playable =
      uStatus === 'completed' ||
      (uStatus === 'active' && isUnlocked(currentPos, targetPos))

    if (!playable) return

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

    onStartNode({ operation, table, node, coinBalance: newBalance })
  }

  const inDebt = kid.coin_balance < 0
  const atDebtFloor = kid.coin_balance <= DEBT_FLOOR

  return (
    <div className="min-h-screen bg-white">

      {/* Top stats bar + back button */}
      <div className="sticky top-0 bg-white z-30 border-b border-gray-100">
        <div className="flex items-center justify-between px-3 py-3 max-w-sm mx-auto">
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
      </div>

      {atDebtFloor && (
        <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 max-w-sm md:mx-auto">
          <p className="font-body text-xs text-red-500 font-semibold">
            Coins are low — retries are free until you earn some back. Keep playing!
          </p>
        </div>
      )}

      {/* Node path — each unit is its own flex column block: banner, then
          its 5 nodes stacked with consistent gap. Units stack vertically
          with their own margin, so a banner can never be overlapped by a
          node — flexbox guarantees the gap regardless of content size. */}
      <div className="flex flex-col items-center w-full">
        {tables.map(table => {
          const uStatus = unitStatus(currentPos, operation, table)

          return (
            <div key={table} className="flex flex-col items-center w-full">
              <div className="my-6 w-full flex justify-center">
                <UnitBanner table={table} status={uStatus} theme={theme} />
              </div>

              <div className="flex flex-col items-center gap-5 py-2">
                {NODES.map((node, nodeIdx) => {
                  const targetPos = { operation, table, node }

                  const unlocked =
                    uStatus === 'completed' ||
                    (uStatus === 'active' && isUnlocked(currentPos, targetPos))

                  const completed =
                    uStatus === 'completed' ||
                    (uStatus === 'active' && isCompleted(currentPos, targetPos))

                  const isCurrent =
                    uStatus === 'active' &&
                    currentPos.table === table &&
                    currentPos.node === node

                  const status = completed ? 'completed' : unlocked ? 'active' : 'locked'

                  return (
                    <PathNode
                      key={node}
                      table={table}
                      node={node}
                      status={status}
                      isCurrent={isCurrent}
                      offsetPx={offsetForNode(table, nodeIdx)}
                      onPress={() => handleNodePress(table, node)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}

        <div className="h-16" />
      </div>
    </div>
  )
}
