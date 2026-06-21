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
import FlowerJump from '../components/FlowerJump'

// ── Layout constants ─────────────────────────────────────────────────────
// Bigger nodes, more breathing room than the old single-stage map per
// design feedback: "the circle is large... distance between the nodes...
// generous gap."
const NODE_SIZE   = 92
const RING_PAD    = 14   // gap between node edge and the surrounding halo ring
const V_STEP      = 124  // vertical distance between node centers
const UNIT_GAP    = 64   // extra vertical space reserved for each unit's banner
const TOP_PAD     = 28
const START_PILL_CLEARANCE = 150 // extra space reserved above the current node so the START pill (which floats ~142px above the node center) never overlaps the unit banner

const CENTER_X  = 50
const WAVE_AMPL = 26
function xForIndex(i) {
  return CENTER_X + WAVE_AMPL * Math.sin(i * 0.9)
}

function puckShadow(darkHex) {
  return [
    `0 6px 0 0 ${darkHex}`,
    '0 12px 22px rgba(0,0,0,0.20)',
    'inset 0 3px 0 rgba(255,255,255,0.30)',
    'inset 0 -2px 0 rgba(0,0,0,0.12)',
  ].join(', ')
}

function StarIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

function CheckIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

function LockIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function TrophyIcon({ size = 36 }) {
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

  // Build a flat list of every node across all 12 units, in path order,
  // each tagged with which unit it belongs to and whether it's the first
  // node of a new unit (so we know where to drop a banner).
  const flatNodes = []
  tables.forEach(table => {
    NODES.forEach((node, nodeIdx) => {
      flatNodes.push({ table, node, nodeIdx, isFirstOfUnit: nodeIdx === 0 })
    })
  })

  // Vertical position bookkeeping: every unit's banner reserves UNIT_GAP of
  // height before its first node — including unit 1, which previously had
  // no reserved space and caused the banner to overlap the node + START
  // pill. The START pill itself floats above the kid's current node and
  // also needs its own reserved clearance so it never collides with the
  // banner above it. bannerY is computed independently of any START-pill
  // clearance added to a node's own y, so the banner never shifts based on
  // whether the unit's first node happens to be the current node.
  let y = TOP_PAD + UNIT_GAP
  const positioned = flatNodes.map((n, i) => {
    if (n.isFirstOfUnit && i !== 0) y += UNIT_GAP
    const bannerY = y - UNIT_GAP // fixed offset above this node, pre-clearance
    const isCurrentNodeForSpacing =
      currentPos.operation === operation &&
      currentPos.table === n.table &&
      currentPos.node === n.node
    // Reserve extra clearance above any node that will render the START
    // pill, so the pill (and its little tail) never overlaps the banner
    // or the previous node.
    if (isCurrentNodeForSpacing) y += START_PILL_CLEARANCE
    const pos = { ...n, y, bannerY, x: xForIndex(i) }
    y += V_STEP
    return pos
  })
  const totalHeight = y + TOP_PAD

  async function handleNodePress(table, node) {
    const uStatus = unitStatus(currentPos, operation, table)
    const targetPos = { operation, table, node }

    // Playable if: this unit is already fully completed (replay mode —
    // every node in it stays open), or this unit is the kid's active unit
    // AND the specific node is unlocked within the linear chain. Anything
    // else (locked chapter, locked future unit) is not playable.
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

      {/* Scrolling node path */}
      <div className="relative mx-auto max-w-sm" style={{ height: totalHeight }}>

        {positioned.map(({ table, node, nodeIdx, isFirstOfUnit, y, bannerY, x }) => {
          const uStatus = unitStatus(currentPos, operation, table)
          const targetPos = { operation, table, node }

          // A node is playable if its unit is active and the node itself is
          // unlocked within the linear chain, OR the whole unit/chapter is
          // already completed (replay mode — everything stays playable).
          const unlocked =
            uStatus === 'completed' ||
            (uStatus === 'active' && isUnlocked(currentPos, targetPos))

          const completed =
            uStatus === 'completed' ||
            (uStatus === 'active' && isCompleted(currentPos, targetPos))

          const isCurrentNode =
            uStatus === 'active' &&
            currentPos.table === table &&
            currentPos.node === node

          const isTrophyNode = node === 'gift'

          let icon
          if (completed) icon = <CheckIcon />
          else if (!unlocked) icon = <LockIcon />
          else if (isTrophyNode) icon = <TrophyIcon />
          else icon = <StarIcon />

          return (
            <div key={`${table}-${node}`}>
              {isFirstOfUnit && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 w-full px-4"
                  style={{ top: bannerY, maxWidth: 384 }}
                >
                  <div
                    className="rounded-2xl px-4 py-3 flex items-center justify-between"
                    style={{
                      backgroundColor: uStatus === 'locked' ? '#D1D5DB' : theme.colors.primary,
                      boxShadow: `0 3px 0 0 ${uStatus === 'locked' ? '#9CA3AF' : theme.colors.dark}`,
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
              )}

              <div
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: y,
                  width: 0,
                  height: 0,
                  zIndex: isCurrentNode ? 15 : 10,
                }}
              >
                {/* Soft grey halo ring around the kid's current node — bigger
                    diameter than the puck, clearly a halo not a tight outline. */}
                {isCurrentNode && (
                  <div
                    className="absolute rounded-full"
                    style={{
                      width: NODE_SIZE + RING_PAD * 2,
                      height: NODE_SIZE + RING_PAD * 2,
                      left: -(NODE_SIZE / 2 + RING_PAD),
                      top: -(NODE_SIZE / 2 + RING_PAD),
                      backgroundColor: '#E5E7EB',
                    }}
                  />
                )}

                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => handleNodePress(table, node)}
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
                      ? `Table ${table}, ${nodeLabel(node)}, completed — tap to replay`
                      : unlocked
                        ? `Start table ${table}, ${nodeLabel(node)}`
                        : `Table ${table}, ${nodeLabel(node)}, locked`
                  }
                >
                  {icon}
                </button>

                {/* START pill with speech-bubble tail, floats above the
                    current node pointing down to it. */}
                {isCurrentNode && (
                  <div
                    className="absolute flex flex-col items-center"
                    style={{
                      top: -(NODE_SIZE / 2 + RING_PAD + 44),
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div
                      className="font-body font-bold text-sm tracking-wide px-4 py-1.5 rounded-2xl"
                      style={{ color: theme.colors.primary, border: `2px solid ${theme.colors.primary}`, backgroundColor: '#FFFFFF' }}
                    >
                      START
                    </div>
                    <div
                      className="w-3 h-3 rotate-45 -mt-1.5"
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRight: `2px solid ${theme.colors.primary}`,
                        borderBottom: `2px solid ${theme.colors.primary}`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Ambient mascot — one per unit, sitting in the open space the
            zigzag path leaves on alternating sides. Loops continuously as
            idle "alive" decoration, doesn't block or compete with nodes. */}
        {positioned
          .filter(p => p.nodeIdx === 2) // middle node (irl) of each unit — roughly centered in that unit's vertical span
          .map(p => (
            <div
              key={`mascot-${p.table}`}
              className="absolute"
              style={{
                top: p.y - 70,
                // Mirror to whichever side has more open space: opposite
                // the node's own x position.
                left: p.x > 50 ? '8%' : '62%',
                zIndex: 1,
              }}
            >
              <FlowerJump loop size={140} />
            </div>
          ))}

      </div>
    </div>
  )
}
