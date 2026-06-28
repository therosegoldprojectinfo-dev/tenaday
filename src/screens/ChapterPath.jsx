import { useEffect, useState, useRef, useCallback } from 'react'
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
      <rect x="5" y="11" width="28" height="18" rx="2" />
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
    <svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 16L6.5 10L12.5 4" />
    </svg>
  )
}

function HeartStatIcon() {
  return (
    <img src="/Cr%C3%A9ation%20sans%20titre%20(28).png" width="36" height="36" alt="" />
  )
}

function CoinStatIcon() {
  return <img src="/Cr%C3%A9ation%20sans%20titre%20(27).png" width="40" height="40" alt="" />
}

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

export default function ChapterPath({ operation, onStartNode, onBack, kidId }) {
  if (!kidId) throw new Error('ChapterPath: kidId is required')
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
  const [visibleUnit, setVisibleUnit] = useState(1)
  const unitRefs = useRef({})
  const hasScrolled = useRef(false)

  // Auto-scroll to current unit once after load
  useEffect(() => {
    if (!kid || hasScrolled.current) return
    const currentDay = kid.current_operation === operation
      ? (kid.current_table - 1) * BATCH_COUNT + (kid.current_batch || 1)
      : null
    if (!currentDay) return
    const el = unitRefs.current[currentDay]
    if (el) {
      hasScrolled.current = true
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    }
  }, [kid, operation])

  const TOTAL_DAYS = TABLE_COUNT * BATCH_COUNT

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
    if (pos === 'next_new_batch') {
      const allowed = await canStartNewUnit(kidId)
      if (!allowed) { setDayGateBlocked(true); return }
    }

    const isLearnNode = node === 'learn'
    const targetPos = { operation, table, batch, node }
    const isReplayNode = !isLearnNode && isCompleted(currentPos, targetPos)
    if (!isLearnNode && !isReplayNode && (kid.heart_balance ?? 5) === 0) { setNoHeartsBlocked(true); return }
    const newBalance = (isLearnNode || isReplayNode) ? kid.coin_balance : applyEntryFee(kid.coin_balance)

    if (!isLearnNode && !isReplayNode) {
      try {
        await setCoinBalance(kidId, newBalance)
        await logCoinTransaction(kidId, { amount: newBalance - kid.coin_balance, reason: 'entry_fee', balanceAfter: newBalance })
        setKid(k => ({ ...k, coin_balance: newBalance }))
      } catch (err) { console.error('Failed to charge entry fee:', err) }
    }

    const unlockBatch = node === 'unlock' ? previousBatch(operation, table, batch) : undefined
    const reviewPool = node === 'review' ? reviewPoolFor(operation, table, batch) : undefined

    onStartNode({ operation, table, batchNum: batch, node, coinBalance: newBalance, heartBalance: kid.heart_balance ?? 5, reviewPool, unlockBatch, placementClaim: kid.placement_claim, kidCurrentStep: { operation: kid.current_operation, table: kid.current_table, batch: kid.current_batch || 1, node: normalizeNode(kid.current_node) } })
  }

  async function handleRechargeHeart() {
    if (recharging) return
    setRechargeError(null)
    setRecharging(true)
    try {
      const { newHearts, newCoins } = await rechargeHeart(kidId, kid.heart_balance ?? 5, kid.coin_balance)
      setKid(k => ({ ...k, heart_balance: newHearts, coin_balance: newCoins }))
    } catch (err) { setRechargeError(err.message) }
    finally { setRecharging(false) }
  }

  const inDebt = kid.coin_balance < 0
  const atDebtFloor = kid.coin_balance <= DEBT_FLOOR

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
    <div className="h-screen flex flex-col chapter-path-root relative" style={{ backgroundColor: '#ffffff' }}>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(124,58,237,0.4)); }
          50% { filter: drop-shadow(0 0 18px rgba(124,58,237,0.8)); }
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
      <div className="flex-shrink-0 bg-white z-50 border-b border-gray-100">
        <div className="flex items-center justify-between px-3 py-3 max-w-sm md:max-w-3xl lg:max-w-5xl mx-auto">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 transition-colors duration-150 active:bg-gray-100" aria-label="Back">
            <BackIcon />
          </button>
          {tooltip && <div className="fixed inset-0 z-40" onClick={() => { setTooltip(null); setRechargeError(null) }} />}
          <div className="flex items-center gap-2">
            {/* Streak */}
            <div className="relative">
              <button onClick={() => setTooltip(t => t === 'streak' ? null : 'streak')} className="flex items-center gap-1.5 active:scale-95 transition-transform">
                <img src="/Cr%C3%A9ation%20sans%20titre%20(29).png" width="32" height="32" alt="" />
                <span className="font-body font-bold text-base text-orange-500 leading-none tabular-nums">{streak}</span>
              </button>
              {tooltip === 'streak' && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 w-44 text-center" onClick={e => e.stopPropagation()}>
                  <p className="mb-1"><img src="/Cr%C3%A9ation%20sans%20titre%20(29).png" width="40" height="40" alt="" /></p>
                  <p className="font-display font-bold text-gray-900 text-sm">Day Streak</p>
                  <p className="font-body text-xs text-gray-400 mt-1">{streak === 0 ? 'No streak yet — play today!' : `${streak} day${streak === 1 ? '' : 's'} in a row!`}</p>
                </div>
              )}
            </div>
            {/* Hearts */}
            <div className="relative">
              <button onClick={() => { setTooltip(t => t === 'hearts' ? null : 'hearts'); setRechargeError(null) }} className="flex items-center gap-1.5 active:scale-95 transition-transform">
                <HeartStatIcon />
                <span className="font-body font-bold text-base text-red-400 leading-none tabular-nums">{kid.heart_balance ?? 5}</span>
              </button>
              {tooltip === 'hearts' && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 w-52 text-center" onClick={e => e.stopPropagation()}>
                  <p className="mb-1"><img src="/Cr%C3%A9ation%20sans%20titre%20(28).png" width="56" height="56" alt="" /></p>
                  <p className="font-display font-bold text-gray-900 text-sm">Hearts</p>
                  <div className="flex justify-center gap-1 my-2">{Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ opacity: i < (kid.heart_balance ?? 5) ? 1 : 0.25, fontSize: 18 }}><img src="/Cr%C3%A9ation%20sans%20titre%20(28).png" width="36" height="36" alt="" /></span>)}</div>
                  <p className="font-body text-xs text-gray-400 mb-3">Hearts are lost when you answer wrong. Recharge with coins.</p>
                  {(kid.heart_balance ?? 5) < 5 ? (
                    <>{rechargeError && <p className="font-body text-xs text-red-400 mb-2">{rechargeError}</p>}
                    <button onClick={handleRechargeHeart} disabled={recharging || kid.coin_balance < 10} className="w-full py-2.5 rounded-xl font-body font-bold text-sm tracking-wide transition-all active:scale-95" style={{ backgroundColor: kid.coin_balance >= 10 ? '#ef4444' : '#F3F4F6', color: kid.coin_balance >= 10 ? '#fff' : '#9CA3AF', boxShadow: kid.coin_balance >= 10 ? '0 3px 0 0 #b91c1c' : '0 3px 0 0 #D1D5DB' }}>{recharging ? 'Recharging…' : '♥ +1 for 10 coins'}</button></>
                  ) : <p className="font-body text-xs text-green-500 font-bold">Full hearts! ✨</p>}
                </div>
              )}
            </div>
            {/* Coins */}
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
                  <p className="font-body text-xs text-gray-400 mt-1">{inDebt ? "You're in debt — keep playing!" : "Earn coins by completing activities."}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto relative z-10">

        {/* Alerts */}
        {atDebtFloor && (
          <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 max-w-sm md:max-w-3xl lg:max-w-5xl md:mx-auto">
            <p className="font-body text-xs text-red-500 font-semibold">Coins are low — retries are free until you earn some back. Keep playing!</p>
          </div>
        )}
        {dayGateBlocked && (
          <div className="mx-4 mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 max-w-sm md:max-w-3xl lg:max-w-5xl md:mx-auto flex items-start justify-between gap-3">
            <p className="font-body text-sm text-amber-800 font-semibold leading-snug">{nextUnlockMessage(kid.next_unlock_at)}</p>
            <button onClick={() => setDayGateBlocked(false)} className="flex-shrink-0 font-body font-bold text-xs text-amber-600 active:opacity-70">OK</button>
          </div>
        )}
        {noHeartsBlocked && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setNoHeartsBlocked(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ backgroundColor: 'white', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img src="/Cr%C3%A9ation%20sans%20titre%20(28).png" width="72" height="72" style={{ opacity: 0.4, margin: '0 auto 12px' }} alt="" />
                <p className="font-display font-bold text-xl text-gray-900">No hearts left!</p>
                <p className="font-body text-sm text-gray-400 mt-1">
                  {kid.coin_balance >= 10 ? 'Recharge a heart to keep playing.' : 'Not enough coins — hearts refill at midnight!'}
                </p>
              </div>
              {rechargeError && <p className="font-body text-xs text-red-400 mb-3 text-center">{rechargeError}</p>}
              {kid.coin_balance >= 10 ? (
                <button
                  onClick={async () => { setRechargeError(null); setRecharging(true); try { const { newHearts, newCoins } = await rechargeHeart(kidId, kid.heart_balance ?? 0, kid.coin_balance); setKid(k => ({ ...k, heart_balance: newHearts, coin_balance: newCoins })); setNoHeartsBlocked(false) } catch (err) { setRechargeError(err.message) } finally { setRecharging(false) } }}
                  disabled={recharging}
                  className="w-full py-4 rounded-2xl font-body font-bold text-base text-white transition-all active:scale-95"
                  style={{ backgroundColor: '#ef4444', boxShadow: '0 4px 0 0 #b91c1c' }}>
                  {recharging ? 'Recharging…' : '♥ Recharge 1 heart — 10 coins'}
                </button>
              ) : (
                <div className="rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3 text-center">
                  <p className="text-2xl mb-1">🌙</p>
                  <p className="font-display font-bold text-sm text-gray-900">Come back tomorrow!</p>
                  <p className="font-body text-xs text-gray-400 mt-1">Hearts refill at midnight.</p>
                </div>
              )}
              <button onClick={() => setNoHeartsBlocked(false)}
                className="w-full mt-3 py-3 rounded-2xl font-body font-bold text-sm text-gray-400 border border-gray-200 active:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        )}

        {/* ── Sticky unit banner ── */}
        {(() => {
          const u = allUnits.find(u => u.unitNumber === visibleUnit)
          const facts = u ? factsForBatch(u.batch) : []
          const factStr = u ? facts.map(f => `${u.table} ${theme.symbol} ${f}`).join(', ') : ''
          const color = UNIT_COLORS[(visibleUnit - 1) % UNIT_COLORS.length]
          return (
            <div style={{ position: 'sticky', top: 0, zIndex: 100, padding: '10px 16px', display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: '100%', maxWidth: 340,
                backgroundColor: color.bg,
                borderRadius: 16,
                boxShadow: `0 5px 0 ${color.shadow}`,
                padding: '12px 16px 14px',
              }}>
                <p style={{ fontFamily: 'var(--font-display, "Baloo 2", sans-serif)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', marginBottom: 3 }}>Unit {visibleUnit}</p>
                <p style={{ fontFamily: 'var(--font-display, "Baloo 2", sans-serif)', fontWeight: 800, fontSize: 20, color: '#fff', lineHeight: 1.2 }}>{factStr}</p>
              </div>
            </div>
          )
        })()}

        {/* ── Node path ── */}
        <div className="max-w-sm md:max-w-md mx-auto pt-6 pb-24 overflow-x-hidden" style={{ position: 'relative', zIndex: 1 }}>
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
                      {facts.map(f => `${table} ${theme.symbol} ${f}`).join(', ')}
                    </span>
                    <div style={{ flex: 1, height: 1.5, backgroundColor: '#e5e7eb', borderRadius: 2 }} />
                  </div>
                )}

                {/* Invisible sentinel for IntersectionObserver */}
                <div style={{ height: 1 }} ref={el => {
                  if (!el) return
                  const obs = new IntersectionObserver(([entry]) => {
                    if (entry.isIntersecting) setVisibleUnit(unitNumber)
                  }, { threshold: 0, rootMargin: '-10% 0px -80% 0px' })
                  obs.observe(el)
                }} />

                {NODES.map((node, nodeIdx) => {
                  const targetPos = { operation, table, batch, node }
                  const unlockedInChain = unitStatus === 'completed' || (unitStatus === 'active' && isUnlocked(currentPos, targetPos))
                  const completedNode = unitStatus === 'completed' || (unitStatus === 'active' && isCompleted(currentPos, targetPos))
                  const isCurrent = unitStatus === 'active' && currentPos.table === table && currentPos.batch === batch && normalizeNode(currentPos.node) === node
                  const isWelcome = node === 'unlock' && batch === 1 && table === 1 && (isCurrent || unlockedInChain)
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
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setOpenNode(null)} />
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
            ) : openNode.status === 'day_locked' ? (
              <>
                <p className="font-body text-sm text-gray-400 mb-5">You've done enough for today — come back tomorrow to continue!</p>
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-body font-bold text-base tracking-widest"
                  style={{ backgroundColor: '#fef3c7', color: '#d97706', boxShadow: '0 4px 0 #fcd34d', cursor: 'default' }}
                >
                  ⏰ COME BACK TOMORROW
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
    </div>
  )
}
