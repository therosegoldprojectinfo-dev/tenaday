import { useEffect, useState, useRef, useCallback } from 'react'
import { themeFor } from '../lib/eraTheme'
import { factValues } from '../lib/problems'
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
import { fetchKid, fetchStreak, setCoinBalance, logCoinTransaction, DEMO_KID_ID, fetchAvailableGifts } from '../lib/kidData'


const DUO_GREEN = '#58cc02'
const DUO_GREEN_DARK = '#46a302'

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
      <rect x="5" y="11" width="14" height="13" rx="2" />
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

// Builds the equation label exactly as factValues() computes it, so the
// unit banner / separator label always matches the actual questions
// generated for that table+batch (was previously just "table OP fact",
// which is correct for addition/multiplication but wrong for
// subtraction/division since their a/b are derived differently).
function factLabel(operation, table, fact, symbol) {
  const { a, b } = factValues(operation, table, fact)
  return `${a} ${symbol} ${b}`
}

function BackIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 16L6.5 10L12.5 4" />
    </svg>
  )
}


function CoinStatIcon() {
  return <img src="/Cr%C3%A9ation%20sans%20titre%20(27).png" width="40" height="40" alt="" />
}

// ── Node label mapping ────────────────────────────────────────────────────
const NODE_DISPLAY_NAMES = {
  welcome:       'Welcome',
  learn:         'Learn',
  practice:      'Practice',
  apply:         'Apply',
  master:        'Master',
  double_reward: 'Double Reward',
  review:        'Review',
}

// ── Duolingo-style S-curve offsets (px from center) ──────────────────────
const ZIGZAG_OFFSETS = [
  -30,
  -10,
   10,
   30,
   10,
  -10,
  -30,
]

// ── 3D Disc Node button ───────────────────────────────────────────────────
function DiscNode({ node, status, isCurrent, isWelcome, onPress, offset, nextUnlockAt }) {
  const locked       = status === 'locked'
  const dayLocked    = status === 'day_locked'
  const completed    = status === 'completed'
  const disabled     = locked || dayLocked
  const isReview     = node === 'review'
  const isDoubleReward = node === 'double_reward'
  const isSpecial    = isReview || isDoubleReward
  const forceGold    = isDoubleReward

  const displayName = isWelcome ? 'Welcome' : (NODE_DISPLAY_NAMES[node] || nodeLabel(node))

  const imgSrc = isDoubleReward
    ? '/ChatGPT Image 27 juin 2026, 18_34_34.png'
    : isReview
      ? '/ChatGPT Image 27 juin 2026, 18_29_52.png'
      : '/ChatGPT Image 27 juin 2026, 18_28_19.png'

  const statusIcon = null

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: -60,
    }}>
      <button
        type="button"
        disabled={false}
        onClick={onPress}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 0,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: disabled && !forceGold ? 'default' : 'pointer',
          WebkitTapHighlightColor: 'transparent',
          transform: `translateX(${offset}px)`,
          maxWidth: 'calc(100vw - 32px)',
        }}
        aria-label={displayName}
      >
        {/* Disc image */}
        <div
          style={{ position: 'relative', flexShrink: 0, transition: 'transform 0.08s ease' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.88) translateY(5px)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1) translateY(0px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) translateY(0px)' }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.88) translateY(5px)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1) translateY(0px)' }}
        >
          <img
            src={imgSrc}
            alt={displayName}
            draggable={false}
            onContextMenu={e => e.preventDefault()}
            style={{
              width: isSpecial ? 210 : 190,
              height: isSpecial ? 210 : 190,
              objectFit: 'contain',
              filter: (disabled && !forceGold) ? 'grayscale(100%) opacity(0.55)' : 'none',
              transform: isCurrent ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform 0.2s ease',
              display: 'block',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              pointerEvents: 'none',
              ...(isCurrent ? { filter: 'drop-shadow(0 0 10px rgba(124,58,237,0.5))' } : {}),
            }}
          />
          {isDoubleReward && <div className="shine-sweep" />}
          {statusIcon}
        </div>

        {/* Label beside disc, vertically centered */}
        <span style={{
          fontFamily: 'var(--font-display, "Baloo 2", sans-serif)',
          fontWeight: 800,
          fontSize: 15,
          color: (disabled && !forceGold) ? '#9CA3AF' : '#1f2937',
          whiteSpace: 'nowrap',
          marginLeft: -20,
        }}>{displayName}</span>
      </button>
    </div>
  )
}

function StreakTooltip({ streak, align = 'left' }) {
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
      position: 'absolute', top: '100%', marginTop: 8, ...(align === 'right' ? { right: 0 } : { left: 0 }),
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

export default function ChapterPath({ operation, onStartNode, onBack, kidId, parentId, onGoToParent, onGoToRewards }) {
  if (!kidId) throw new Error('ChapterPath: kidId is required')
  const [kid, setKid] = useState(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [openNode, setOpenNode] = useState(null)
  const [dayGateBlocked, setDayGateBlocked] = useState(false)
  const [tooltip, setTooltip] = useState(null)
  const [visibleUnit, setVisibleUnit] = useState(1)
  const [hasRewards, setHasRewards] = useState(true)
  const [showNoRewards, setShowNoRewards] = useState(false)
  const [showParentPopup, setShowParentPopup] = useState(false)
  const [showDayGateScreen, setShowDayGateScreen] = useState(false)
  const [scrollDir, setScrollDir] = useState(null) // 'up' | 'down' | null
  const currentUnitRef = useRef(null)
  const unitRefs = useRef({})
  const unitObservers = useRef({})
  const scrollContainerRef = useRef(null)

  // Cleanup all IntersectionObservers on unmount
  useEffect(() => {
    return () => {
      Object.values(unitObservers.current).forEach(obs => obs && obs.disconnect())
      unitObservers.current = {}
    }
  }, [])

  // Auto-scroll removed — using floating nav button instead

  // Scroll to current unit on first load + track scroll direction for floating button
  useEffect(() => {
    if (!kid) return

    // Previously this always fell back to unit 1 whenever the kid's
    // current operation didn't match this chapter — which is correct for
    // a chapter the kid hasn't reached yet, but wrong for a chapter
    // they've already FINISHED (kid has moved on to a later operation).
    // A completed chapter should scroll to its last unit, not its first.
    const opOrder = ['addition', 'subtraction', 'multiplication', 'division']
    const isCompletedChapter = opOrder.indexOf(kid.current_operation) > opOrder.indexOf(operation)
    const currentDay = kid.current_operation === operation
      ? (kid.current_table - 1) * BATCH_COUNT + (kid.current_batch || 1)
      : isCompletedChapter
        ? TABLE_COUNT * BATCH_COUNT
        : 1

    let attempts = 0
    let rafId = null
    let timeoutId = null

    const tryScroll = () => {
      const container = scrollContainerRef.current
      const el = unitRefs.current[currentDay]

      if (container && el) {
        const elTop = el.getBoundingClientRect().top
        const containerTop = container.getBoundingClientRect().top
        const target = container.scrollTop + elTop - containerTop - 190
        if (target > 10) {
          container.scrollTo({ top: target, behavior: 'instant' })
        }
        currentUnitRef.current = el

        // Attach scroll listener now that we have the element
        const handleScroll = () => {
          const currentEl = currentUnitRef.current
          if (!currentEl) return
          const elTop2 = currentEl.getBoundingClientRect().top
          const cTop = container.getBoundingClientRect().top
          const rel = elTop2 - cTop
          if (rel < -60) setScrollDir('up')
          else if (rel > container.clientHeight - 60) setScrollDir('down')
          else setScrollDir(null)
        }
        container.addEventListener('scroll', handleScroll, { passive: true })
        currentUnitRef._cleanup = () => container.removeEventListener('scroll', handleScroll)
      } else if (attempts < 40) {
        attempts++
        // Use rAF for first few attempts (fast), then slow down
        if (attempts < 5) {
          rafId = requestAnimationFrame(tryScroll)
        } else {
          timeoutId = setTimeout(tryScroll, 100)
        }
      }
    }

    // Wait 2 frames for React to fully render unitRefs
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(tryScroll)
    })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
      if (currentUnitRef._cleanup) {
        currentUnitRef._cleanup()
        currentUnitRef._cleanup = null
      }
    }
  }, [kid, operation])

  const TOTAL_DAYS = TABLE_COUNT * BATCH_COUNT

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchKid(kidId), fetchStreak(kidId), parentId ? fetchAvailableGifts(parentId) : Promise.resolve([])])
      .then(([data, streakData, gifts]) => {
        if (cancelled) return
        setKid(data)
        setStreak(streakData)
        setHasRewards(gifts && gifts.some(g => g.parent_id !== null))
        if (data.current_operation === operation) {
          const day = (data.current_table - 1) * BATCH_COUNT + (data.current_batch || 1)
          setSelectedDay(day)
        } else {
          const opIdx = ['addition','subtraction','multiplication','division'].indexOf(operation)
          const curOpIdx = ['addition','subtraction','multiplication','division'].indexOf(data.current_operation)
          setSelectedDay(curOpIdx > opIdx ? TABLE_COUNT * BATCH_COUNT : 1)
        }
      })
      .catch(err => { if (!cancelled) setError(err) })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [kidId, operation])

  if (loading || selectedDay === null) {
    return <div className="bg-white min-h-screen flex items-center justify-center"><p className="font-body text-gray-400">Loading…</p></div>
  }
  if (error || !kid) {
    return <div className="bg-white min-h-screen flex items-center justify-center px-6 text-center"><p className="font-body text-gray-500">Couldn't load progress.</p></div>
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

  function handleTogglePopover(table, batch, node, status, isCurrent) {
    if (!hasRewards) { setShowNoRewards(true); return }
    if (status === 'day_locked') { setShowDayGateScreen(true); return }
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

    const targetUnlock = { operation, table, batch, node: 'welcome' }
    const pos = chainPosition(currentPos, targetUnlock)
    if (pos === 'next_new_batch') {
      const allowed = await canStartNewUnit(kidId)
      if (!allowed) { setDayGateBlocked(true); return }
    }

    const unlockBatch = node === 'welcome' ? previousBatch(operation, table, batch) : undefined
    const reviewPool = node === 'review' ? reviewPoolFor(operation, table, batch) : undefined

    onStartNode({ operation, table, batchNum: batch, node, coinBalance: kid.coin_balance, reviewPool, unlockBatch, placementClaim: kid.placement_claim, kidCurrentStep: { operation: kid.current_operation, table: kid.current_table, batch: kid.current_batch || 1, node: normalizeNode(kid.current_node) } })
  }


  const allUnits = []
  for (let t = 1; t <= TABLE_COUNT; t++) {
    for (let b = 1; b <= BATCH_COUNT; b++) {
      allUnits.push({ table: t, batch: b, unitNumber: (t - 1) * BATCH_COUNT + b })
    }
  }

  const UNIT_COLORS = [
    { bg: '#58cc02', shadow: '#46a302' },
    { bg: '#1cb0f6', shadow: '#0a8fcb' },
    { bg: '#ffb700', shadow: '#d99700' },
    { bg: '#ff4b4b', shadow: '#cc0000' },
    { bg: '#ff9600', shadow: '#cc7a00' },
    { bg: '#ce82ff', shadow: '#9b59b6' },
    { bg: '#ff86d0', shadow: '#cc5ca3' },
  ]

  return (
    <div className="flex flex-col chapter-path-root relative" style={{ height: '100dvh', backgroundColor: '#ffffff' }}>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(124,58,237,0.4)); }
          50% { filter: drop-shadow(0 0 18px rgba(124,58,237,0.8)); }
        }
        @keyframes mascot-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes daygate-confetti {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-110vh) rotate(720deg); opacity: 0.2; }
        }
        @keyframes nm-shine {
          0% { transform: translateX(-130%) skewX(-18deg); }
          100% { transform: translateX(230%) skewX(-18deg); }
        }
        @keyframes bg-floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes bg-twinkle { 0%,100%{opacity:.08;transform:scale(.7)} 50%{opacity:.18;transform:scale(1)} }
        @keyframes bg-confetti { 0%{transform:translateY(0) rotate(0deg)} 100%{transform:translateY(18px) rotate(160deg)} }
        @keyframes bg-spinslow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes bg-bob { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-10px) rotate(2deg)} }
        .node-current img { animation: pulse-glow 2s ease-in-out infinite; }
        .node-double-reward { position: relative; }
        .node-double-reward .shine-sweep {
          position: absolute;
          top: 0; left: 0;
          width: 60%;
          height: 75%;
          overflow: hidden;
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
        }
        .node-double-reward .shine-sweep::after {
          content: '';
          position: absolute;
          top: -10%; left: 0;
          width: 40%; height: 120%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent);
          animation: nm-shine 2s ease-in-out infinite;
          animation-delay: 0.5s;
        }
      `}</style>

      {/* ── Animated background elements ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Stars */}
        <svg viewBox="0 0 24 24" width={28} height={28} style={{position:'absolute',top:'8%',left:'6%',opacity:.12,animation:'bg-twinkle 2.1s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#1CB0F6"/></svg>
        <svg viewBox="0 0 24 24" width={18} height={18} style={{position:'absolute',top:'15%',right:'8%',opacity:.1,animation:'bg-twinkle 1.8s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#ef4444"/></svg>
        <svg viewBox="0 0 24 24" width={22} height={22} style={{position:'absolute',top:'35%',left:'4%',opacity:.1,animation:'bg-twinkle 2.5s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#1CB0F6"/></svg>
        <svg viewBox="0 0 24 24" width={16} height={16} style={{position:'absolute',top:'50%',right:'5%',opacity:.1,animation:'bg-twinkle 2.3s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#ef4444"/></svg>
        <svg viewBox="0 0 24 24" width={24} height={24} style={{position:'absolute',top:'70%',left:'7%',opacity:.1,animation:'bg-twinkle 1.9s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#1CB0F6"/></svg>
        <svg viewBox="0 0 24 24" width={20} height={20} style={{position:'absolute',top:'82%',right:'9%',opacity:.1,animation:'bg-twinkle 2.7s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#ef4444"/></svg>
        {/* Confetti */}
        <div style={{position:'absolute',top:'12%',left:'15%',width:14,height:14,borderRadius:4,background:'#1CB0F6',opacity:.1,animation:'bg-confetti 2.2s ease-in-out infinite alternate'}}/>
        <div style={{position:'absolute',top:'25%',right:'12%',width:12,height:12,borderRadius:4,background:'#ef4444',opacity:.1,transform:'rotate(20deg)',animation:'bg-confetti 2.6s ease-in-out infinite alternate'}}/>
        <div style={{position:'absolute',top:'45%',left:'10%',width:10,height:10,borderRadius:'50%',background:'#1CB0F6',opacity:.12,animation:'bg-confetti 1.9s ease-in-out infinite alternate'}}/>
        <div style={{position:'absolute',top:'60%',right:'14%',width:14,height:14,borderRadius:4,background:'#ef4444',opacity:.1,transform:'rotate(35deg)',animation:'bg-confetti 2.4s ease-in-out infinite alternate'}}/>
        <div style={{position:'absolute',top:'75%',left:'12%',width:11,height:11,borderRadius:'50%',background:'#1CB0F6',opacity:.1,animation:'bg-confetti 2.1s ease-in-out infinite alternate'}}/>
        <div style={{position:'absolute',top:'88%',right:'10%',width:13,height:13,borderRadius:4,background:'#ef4444',opacity:.1,transform:'rotate(-20deg)',animation:'bg-confetti 2.8s ease-in-out infinite alternate'}}/>
        {/* Floating circles */}
        <div style={{position:'absolute',top:'20%',right:'3%',width:40,height:40,borderRadius:'50%',background:'#1CB0F6',opacity:.07,animation:'bg-floaty 3s ease-in-out infinite'}}/>
        <div style={{position:'absolute',top:'55%',left:'2%',width:32,height:32,borderRadius:'50%',background:'#ef4444',opacity:.07,animation:'bg-bob 3.5s ease-in-out infinite'}}/>
        <div style={{position:'absolute',top:'40%',right:'2%',width:24,height:24,borderRadius:'50%',background:'#1CB0F6',opacity:.08,animation:'bg-floaty 2.6s ease-in-out infinite'}}/>
        <div style={{position:'absolute',top:'90%',left:'5%',width:28,height:28,borderRadius:'50%',background:'#ef4444',opacity:.07,animation:'bg-bob 4s ease-in-out infinite'}}/>
        {/* Middle elements */}
        <svg viewBox="0 0 24 24" width={16} height={16} style={{position:'absolute',top:'22%',left:'45%',opacity:.1,animation:'bg-twinkle 2.3s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#1CB0F6"/></svg>
        <svg viewBox="0 0 24 24" width={20} height={20} style={{position:'absolute',top:'48%',left:'50%',opacity:.09,animation:'bg-twinkle 2.8s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#ef4444"/></svg>
        <svg viewBox="0 0 24 24" width={14} height={14} style={{position:'absolute',top:'72%',left:'42%',opacity:.1,animation:'bg-twinkle 2.1s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#1CB0F6"/></svg>
        <div style={{position:'absolute',top:'30%',left:'48%',width:10,height:10,borderRadius:3,background:'#ef4444',opacity:.09,transform:'rotate(25deg)',animation:'bg-confetti 2.3s ease-in-out infinite alternate'}}/>
        <div style={{position:'absolute',top:'58%',left:'44%',width:12,height:12,borderRadius:'50%',background:'#1CB0F6',opacity:.09,animation:'bg-floaty 3.2s ease-in-out infinite'}}/>
        <div style={{position:'absolute',top:'85%',left:'50%',width:9,height:9,borderRadius:3,background:'#ef4444',opacity:.09,transform:'rotate(-15deg)',animation:'bg-confetti 2.6s ease-in-out infinite alternate'}}/>
        <svg width={36} height={36} viewBox="0 0 60 60" style={{position:'absolute',top:'38%',left:'43%',opacity:.06,animation:'bg-spinslow 30s linear infinite'}}>
          <circle cx="30" cy="30" r="26" fill="none" stroke="#1CB0F6" strokeWidth="4" strokeDasharray="10 10"/>
        </svg>
        <svg width={60} height={60} viewBox="0 0 60 60" style={{position:'absolute',top:'5%',right:'15%',opacity:.07,animation:'bg-spinslow 20s linear infinite'}}>
          <circle cx="30" cy="30" r="26" fill="none" stroke="#1CB0F6" strokeWidth="4" strokeDasharray="12 8"/>
        </svg>
        <svg width={44} height={44} viewBox="0 0 60 60" style={{position:'absolute',top:'65%',left:'3%',opacity:.07,animation:'bg-spinslow 25s linear infinite reverse'}}>
          <circle cx="30" cy="30" r="26" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="10 10"/>
        </svg>
      </div>

      {/* ── Fixed header ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100" style={{ position: 'sticky', top: 0, zIndex: 60 }}>
        <div className="flex items-center justify-between px-3 py-3 max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 transition-colors duration-150 active:bg-gray-100" aria-label="Back">
            <BackIcon />
          </button>
          {tooltip && <div className="fixed inset-0 z-40" onClick={() => setTooltip(null)} />}
          <div className="flex items-center gap-2">
            {/* Streak */}
            <div className="relative">
              <button onClick={() => setTooltip(t => t === 'streak' ? null : 'streak')} className="flex items-center gap-1.5 active:scale-95 transition-transform">
                <img src="/Cr%C3%A9ation%20sans%20titre%20(29).png" width="32" height="32" alt="" />
                <span className="font-body font-bold text-base text-orange-500 leading-none tabular-nums">{streak}</span>
              </button>
              {tooltip === 'streak' && <StreakTooltip streak={streak} align='right' />}
            </div>
            {/* Coins */}
            <div className="relative">
              <button onClick={() => setTooltip(t => t === 'coins' ? null : 'coins')} className="flex items-center gap-1.5 active:scale-95 transition-transform">
                <CoinStatIcon />
                <span className={'font-body font-bold text-base leading-none tabular-nums text-amber-700'}>{kid.coin_balance}</span>
              </button>
              {tooltip === 'coins' && (
                <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 w-44 text-center" onClick={e => e.stopPropagation()}>
                  <p className="mb-1"><img src="/Cr%C3%A9ation%20sans%20titre%20(27).png" width="56" height="56" alt="" /></p>
                  <p className="font-display font-bold text-gray-900 text-sm">Coins</p>
                  <p className={'font-body font-bold text-lg mt-1 tabular-nums text-amber-600'}>{kid.coin_balance}</p>
                  <p className="font-body text-xs text-gray-400 mt-1">Earn coins by completing activities.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Unit banner — fixed in place, transparent bg, colored pill ── */}
      {(() => {
        const u = allUnits.find(u => u.unitNumber === visibleUnit)
        const facts = u ? factsForBatch(u.batch) : []
        const factStr = u ? facts.map(f => factLabel(operation, u.table, f, theme.symbol)).join(', ') : ''
        const color = UNIT_COLORS[(visibleUnit - 1) % UNIT_COLORS.length]
        return (
          <div style={{
            position: 'fixed', top: 64, left: 0, right: 0,
            zIndex: 50, padding: '10px 16px',
            display: 'flex', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: '100%', maxWidth: 340,
              backgroundColor: color.bg,
              borderRadius: 16,
              boxShadow: `0 5px 0 ${color.shadow}`,
              padding: '12px 16px 14px',
              pointerEvents: 'auto',
            }}>
              <p style={{ fontFamily: 'var(--font-display, "Baloo 2", sans-serif)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', marginBottom: 3 }}>Unit {visibleUnit}</p>
              <p style={{ fontFamily: 'var(--font-display, "Baloo 2", sans-serif)', fontWeight: 800, fontSize: 20, color: '#fff', lineHeight: 1.2 }}>{factStr}</p>
            </div>
          </div>
        )
      })()}

      {/* ── Scrollable content ── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative z-10">

        {/* Alerts */}
        {dayGateBlocked && (
          <div className="mx-4 mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 max-w-sm md:max-w-3xl lg:max-w-5xl md:mx-auto flex items-start justify-between gap-3">
            <p className="font-body text-sm text-amber-800 font-semibold leading-snug">{nextUnlockMessage(kid.next_unlock_at)}</p>
            <button onClick={() => setDayGateBlocked(false)} className="flex-shrink-0 font-body font-bold text-xs text-amber-600 active:opacity-70">OK</button>
          </div>
        )}
        {/* ── Node path ── */}
        <div className="max-w-sm md:max-w-md mx-auto pb-24 overflow-x-hidden" style={{ position: 'relative', zIndex: 1, paddingTop: 100 }}>
          {allUnits.map(({ table, batch, unitNumber }) => {
            const unitStatus = tableStatus(currentPos, operation, table)
            const facts = factsForBatch(batch)

            return (
              <div key={unitNumber} ref={el => { unitRefs.current[unitNumber] = el }} data-unit={unitNumber}>
                {/* Separator line between units */}
                {unitNumber > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 24px 8px' }}>
                    <div style={{ flex: 1, height: 1.5, backgroundColor: '#e5e7eb', borderRadius: 2 }} />
                    <span style={{ fontFamily: 'var(--font-display, "Baloo 2", sans-serif)', fontWeight: 700, fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {facts.map(f => factLabel(operation, table, f, theme.symbol)).join(', ')}
                    </span>
                    <div style={{ flex: 1, height: 1.5, backgroundColor: '#e5e7eb', borderRadius: 2 }} />
                  </div>
                )}

                {/* Invisible sentinel for IntersectionObserver */}
                <div style={{ height: 1 }} ref={el => {
                  if (!el || unitObservers.current[unitNumber]) return
                  const obs = new IntersectionObserver(([entry]) => {
                    if (entry.isIntersecting) setVisibleUnit(unitNumber)
                  }, { threshold: 0, rootMargin: '-10% 0px -80% 0px' })
                  obs.observe(el)
                  unitObservers.current[unitNumber] = obs
                }} />

                {NODES.map((node, nodeIdx) => {
                  const targetPos = { operation, table, batch, node }
                  const unlockedInChain = unitStatus === 'completed' || (unitStatus === 'active' && isUnlocked(currentPos, targetPos))
                  const completedNode = unitStatus === 'completed' || (unitStatus === 'active' && isCompleted(currentPos, targetPos))
                  const isCurrent = unitStatus === 'active' && currentPos.table === table && currentPos.batch === batch && normalizeNode(currentPos.node) === node
                  const isWelcome = node === 'welcome' && batch === 1 && table === 1 && (isCurrent || unlockedInChain)
                  const gateOpen = !kid.next_unlock_at || new Date(kid.next_unlock_at) <= new Date()
                  const isCurrentBatch = currentPos.operation === operation && currentPos.table === table && currentPos.batch === batch
                  const dayLocked = !gateOpen && isCurrentBatch && !completedNode
                  const status = completedNode ? 'completed' : dayLocked ? 'day_locked' : unlockedInChain ? 'active' : 'locked'
                  const offset = ZIGZAG_OFFSETS[nodeIdx % ZIGZAG_OFFSETS.length]

                  return (
                    <div key={node} className={isCurrent ? 'node-current' : node === 'double_reward' ? 'node-double-reward' : ''}>
                      <DiscNode
                        node={node}
                        status={status}
                        isCurrent={isCurrent}
                        isWelcome={isWelcome}
                        nextUnlockAt={kid.next_unlock_at}
                        offset={offset}
                        onPress={() => handleTogglePopover(table, batch, node, status, isCurrent)}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Node popover ── */}
      {openNode && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenNode(null)} />
          <div className="fixed z-50 bg-white anim-sheet-in bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-5 pb-8 max-w-sm mx-auto md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto md:rounded-3xl md:max-w-md md:w-full md:px-6 md:pt-6 md:pb-7">
            <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-4 md:hidden" />
            <p className="font-display font-bold text-xl text-gray-900 mb-1">{nodeLabel(openNode.node)}</p>

            {openNode.status === 'locked' ? (
              <>
                <p className="font-body text-sm text-gray-400 mb-5">Complete the previous nodes to unlock this one!</p>
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-body font-bold text-base tracking-widest"
                  style={{ backgroundColor: '#e5e7eb', color: '#9ca3af', boxShadow: '0 4px 0 #d1d5db', cursor: 'default' }}
                >
                  🔒 NOT YET UNLOCKED
                </button>
              </>
            ) : (
              <>
                <p className="font-body text-sm text-gray-400 mb-5">
                  {openNode.status === 'completed' ? 'Tap to replay this node' : openNode.isCurrent ? nodePurpose(openNode.node) : 'Tap to play'}
                </p>
                <button onClick={handleConfirmStart} className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest">
                  {openNode.status === 'completed' ? `REPLAY ${nodeLabel(openNode.node).toUpperCase()}` : openNode.node === 'learn' ? 'START LESSON' : openNode.node === 'review' ? 'START REVIEW' : `START ${nodeLabel(openNode.node).toUpperCase()}`}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Day gate celebration screen ── */}
      {showDayGateScreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '48px 24px 48px', boxSizing: 'border-box',
          overflow: 'hidden',
        }}>
          {/* Confetti rising from bottom */}
          {[
            { left: '8%',  color: '#58cc02', size: 14, dur: '3.2s', delay: '0s' },
            { left: '20%', color: '#1CB0F6', size: 10, dur: '2.8s', delay: '0.3s' },
            { left: '35%', color: '#FF9600', size: 12, dur: '3.5s', delay: '0.6s' },
            { left: '50%', color: '#CE82FF', size: 16, dur: '2.6s', delay: '0.1s' },
            { left: '65%', color: '#FF4B4B', size: 11, dur: '3.8s', delay: '0.4s' },
            { left: '78%', color: '#FFD700', size: 13, dur: '3.0s', delay: '0.7s' },
            { left: '88%', color: '#58cc02', size: 10, dur: '2.9s', delay: '0.2s' },
            { left: '14%', color: '#FF9600', size: 15, dur: '3.4s', delay: '0.9s' },
            { left: '42%', color: '#1CB0F6', size: 9,  dur: '2.7s', delay: '0.5s' },
            { left: '72%', color: '#CE82FF', size: 12, dur: '3.6s', delay: '0.8s' },
          ].map((c, i) => (
            <div key={i} style={{
              position: 'absolute', bottom: -20, left: c.left,
              width: c.size, height: c.size,
              borderRadius: i % 2 === 0 ? '50%' : 3,
              backgroundColor: c.color,
              animation: `daygate-confetti ${c.dur} ${c.delay} linear infinite`,
              zIndex: 0,
            }} />
          ))}

          {/* Top text */}
          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <h1 style={{
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 26,
              color: '#1a1a1a', margin: '0 0 8px', lineHeight: 1.3,
            }}>
              You've done enough today,<br />{kid?.name?.split(' ')[0]}! 🎉
            </h1>
            <p style={{
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 600, fontSize: 16,
              color: '#6b7280', margin: 0,
            }}>Go enjoy your rewards!</p>
          </div>

          {/* Mascot — smaller, static */}
          <div style={{ zIndex: 1 }}>
            <img
              src="/daygate-mascot.png"
              alt="Numio chilling"
              style={{ width: 220, height: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* Button */}
          <div style={{ width: '100%', maxWidth: 340, zIndex: 1 }}>
            <button
              onClick={() => { setShowDayGateScreen(false); onGoToRewards?.() }}
              style={{
                width: '100%', border: 'none', cursor: 'pointer',
                padding: '18px 0', borderRadius: 16,
                background: '#58cc02', boxShadow: '0 5px 0 #46a302',
                color: '#fff', fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 800, fontSize: 17, letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              I will go enjoy my rewards! 🎁
            </button>
          </div>
        </div>
      )}

      {/* ── No rewards screen ── */}
      {showNoRewards && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: '#fff',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          padding: '60px 24px 48px', boxSizing: 'border-box',
        }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 28,
              color: '#1a1a1a', margin: '0 0 10px',
            }}>No rewards yet! 😤</h1>
            <p style={{
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 600, fontSize: 16,
              color: '#6b7280', margin: 0, maxWidth: 280,
            }}>Ask your parent to set up rewards before you can start playing!</p>
          </div>

          <img
            src="/no-rewards-mascot.png"
            alt="Numio is waiting"
            style={{ width: '100%', maxWidth: 300, objectFit: 'contain', flex: 1, maxHeight: 380 }}
          />

          <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => setShowParentPopup(true)}
              style={{
                width: '100%', border: 'none', cursor: 'pointer',
                padding: '18px 0', borderRadius: 16,
                background: '#58cc02', boxShadow: '0 5px 0 #46a302',
                color: '#fff', fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 800, fontSize: 17, letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              My parent will set up! →
            </button>
            <button
              onClick={() => setShowNoRewards(false)}
              style={{
                width: '100%', border: 'none', cursor: 'pointer',
                padding: '12px 0', borderRadius: 16,
                background: 'none', color: '#9ca3af',
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 14,
              }}
            >
              Go back
            </button>
          </div>
        </div>
      )}

      {/* ── Are you the parent? popup ── */}
      {showParentPopup && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 110,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-end',
          background: 'rgba(0,0,0,0.5)',
        }}>
          <div style={{
            background: 'white', borderRadius: '24px 24px 0 0',
            padding: '24px 24px 40px', width: '100%', maxWidth: 480,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{ animation: 'mascot-float 1.8s ease-in-out infinite' }}>
              <img src="/onboarding-mascot.png" alt="Numio" style={{ width: 80, height: 'auto' }} />
            </div>
            <p style={{
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 20,
              color: '#1a1a1a', textAlign: 'center', margin: 0,
            }}>Are you the parent? 👋</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <button onClick={() => { setShowParentPopup(false); setShowNoRewards(false); onGoToParent?.() }} style={{
                width: '100%', border: 'none', cursor: 'pointer',
                padding: '16px 0', borderRadius: 14,
                background: '#58cc02', boxShadow: '0 4px 0 #46a302',
                color: '#fff', fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 800, fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>Yes, I'm the parent ✅</button>
              <button onClick={() => setShowParentPopup(false)} style={{
                width: '100%', border: 'none', cursor: 'pointer',
                padding: '12px 0', borderRadius: 14,
                background: 'none', color: '#9ca3af',
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 14,
              }}>No, go back</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating back-to-current button ── */}
      {scrollDir && (
        <button
          onClick={() => {
            const el = currentUnitRef.current
            const container = scrollContainerRef.current
            if (el && container) {
              const elTop = el.getBoundingClientRect().top
              const containerTop = container.getBoundingClientRect().top
              const target = container.scrollTop + elTop - containerTop - 190
              container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
            }
          }}
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            zIndex: 60,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#58cc02',
            boxShadow: '0 4px 12px rgba(88,204,2,0.4)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: '#fff',
            animation: 'fadeUp 0.2s ease both',
          }}
        >
          {scrollDir === 'up' ? '↑' : '↓'}
        </button>
      )}

    </div>
  )
}
