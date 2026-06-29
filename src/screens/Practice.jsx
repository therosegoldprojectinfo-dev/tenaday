import React, { useState, useMemo, useEffect, useRef } from 'react'
import { generateBatch } from '../lib/problems'
import { themeFor } from '../lib/eraTheme'
import { nodeLabel, nextStep, normalizeNode, OPERATIONS } from '../lib/progression'
import { payoutForNode, NODE_PAYOUT } from '../lib/economy'
import {
  updateProgress,
  setCoinBalance,
  logCoinTransaction,
  logAttempt,
  stampAdvanceDate,
} from '../lib/kidData'

// Per-node question counts
const NODE_TOTALS = {
  welcome:       20,
  learn:         0,
  practice:      8,
  apply:         10,
  master:        10,
  double_reward: 10,
  review:        20,
}

// Per-node timer in ms
const NODE_TIMER_MS = {
  master:        10000,
  double_reward:  5000,
}

// ── Icons ─────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  )
}

function CoinIcon({ size = 36 }) {
  return <img src="/Cr%C3%A9ation%20sans%20titre%20(27).png" width={size} height={size} alt="" />
}

// ── Answer card helpers ───────────────────────────────────────────────────

function cardColorClass(choice, selected, revealed, answer) {
  if (!revealed) {
    return selected === choice
      ? 'border-blue-400 bg-blue-50 text-blue-700'
      : 'border-gray-200 bg-white text-gray-800'
  }
  if (choice === answer)   return 'border-green-500 bg-green-50 text-green-700'
  if (choice === selected) return 'border-amber-300 bg-amber-50 text-amber-600'
  return 'border-gray-100 bg-white text-gray-300'
}

function cardAnimClass(choice, selected, revealed, answer) {
  if (!revealed) return ''
  if (choice === answer) return 'anim-correct'
  return ''
}

// ── Coin tick-up animation hook ────────────────────────────────────────────

function useCoinTick(target, active) {
  const [displayed, setDisplayed] = useState(0)
  useEffect(() => {
    if (!active) { setDisplayed(0); return }
    setDisplayed(0)
    let current = 0
    const step = Math.max(1, Math.ceil(target / 24))
    const id = setInterval(() => {
      current = Math.min(current + step, target)
      setDisplayed(current)
      if (current >= target) clearInterval(id)
    }, 40)
    return () => clearInterval(id)
  }, [active, target])
  return displayed
}

// ── 🔥 Fire + flying Numio heads streak particles ─────────────────────────

function FireParticles({ streakKey, streak }) {
  if (streak < 3) return null
  // Chaos mode from streak 3 — feels like 10000 consecutive
  const fireCount = Math.min(8 + streak * 4, 40)
  const headCount = Math.min(3 + streak * 2, 20)
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" key={streakKey}>
      {/* Fire emojis — everywhere */}
      {Array.from({ length: fireCount }).map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.6
        const duration = 0.8 + Math.random() * 1.0
        const size = 24 + Math.random() * 36
        return (
          <div key={`fire-${i}`} style={{
            position: 'absolute', bottom: -40, left: `${left}%`,
            fontSize: size, animation: `fire-rise ${duration}s ${delay}s ease-out both`,
          }}>🔥</div>
        )
      })}
      {/* Flying Numio heads — big, everywhere */}
      {Array.from({ length: headCount }).map((_, i) => {
        const left = Math.random() * 95
        const delay = Math.random() * 0.7
        const duration = 0.9 + Math.random() * 1.2
        const size = 40 + Math.random() * 60
        const rotate = (Math.random() - 0.5) * 60
        return (
          <div key={`head-${i}`} style={{
            position: 'absolute', bottom: -60, left: `${left}%`,
            width: size, height: size,
            animation: `fire-rise ${duration}s ${delay}s ease-out both`,
            transform: `rotate(${rotate}deg)`,
          }}>
            <img src="/onboarding-mascot.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        )
      })}
    </div>
  )
}

function ConfettiBlast({ active }) {
  if (!active) return null
  const colors = ['#58cc02','#1CB0F6','#FF9600','#FF4B4B','#CE82FF','#FFD900','#FF6B6B','#4ECDC4']
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.5
        const duration = 1.0 + Math.random() * 0.8
        const size = 8 + Math.random() * 10
        const color = colors[i % colors.length]
        const isCircle = i % 3 === 0
        return (
          <div key={i} style={{
            position: 'absolute', bottom: -20, left: `${left}%`,
            width: size, height: size,
            borderRadius: isCircle ? '50%' : 2,
            backgroundColor: color,
            animation: `confetti-rise ${duration}s ${delay}s cubic-bezier(0.2,0.8,0.3,1) both`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }} />
        )
      })}
    </div>
  )
}

function StreakBadge({ streak }) {
  if (streak < 2) return null
  const hot = streak >= 7
  const warm = streak >= 4
  return (
    <div key={streak} className="flex items-center gap-1 px-2.5 py-1 rounded-full anim-correct"
      style={{
        backgroundColor: hot ? '#FF4500' : warm ? '#FF9600' : '#FFB700',
        boxShadow: hot ? '0 0 12px rgba(255,69,0,0.6)' : 'none',
      }}>
      <span style={{ fontSize: hot ? 16 : 14 }}>🔥</span>
      <span className="font-display font-extrabold text-white" style={{ fontSize: hot ? 15 : 13 }}>{streak}</span>
    </div>
  )
}

function SpeedCountdown({ durationMs }) {
  const total = Math.ceil(durationMs / 1000)
  const [count, setCount] = useState(total)
  useEffect(() => {
    if (count <= 0) return
    const t = setTimeout(() => setCount(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [count])
  const color = count <= 2 ? '#EF4444' : count === 3 ? '#F97316' : '#9CA3AF'
  const size  = count <= 2 ? 'text-2xl' : count === 3 ? 'text-xl' : 'text-base'
  return (
    <span key={count} className={`font-display font-extrabold ${size} anim-correct`} style={{ color }}>{count}s</span>
  )
}

// ── 🌼 Numio wrong-answer mascot popup with typewriter bubble ─────────────

function useTypewriter(text, active, speed = 70) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!active) { setDisplayed(''); return }
    setDisplayed('')
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, active, speed])
  return displayed
}

// isSecondWrong = true → show answer + give up button
// isSecondWrong = false → show hint + retry button
function NumioPopup({ visible, hint, answer, isSecondWrong, onRetry, onGiveUp }) {
  const [phase, setPhase] = useState(0)

  const messages = isSecondWrong
    ? [
        'Almost my friend! 🌸',
        `The answer was ${answer} — remember it!`,
        'Keep going, you\'re doing great! 💪',
      ]
    : [
        'Not quite my friend... 🌸',
        hint,
        'Retry my friend! You got this! 💪',
      ]

  const displayed = useTypewriter(messages[phase], visible)

  useEffect(() => {
    if (!visible) { setPhase(0); return }
    setPhase(0)
    const t1 = setTimeout(() => setPhase(1), messages[0].length * 70 + 1800)
    const t2 = setTimeout(() => setPhase(2), messages[0].length * 70 + 1800 + messages[1].length * 70 + 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [visible, isSecondWrong])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end',
      paddingBottom: 0,
      background: 'rgba(255,255,255,0.88)',
    }}>
      {/* Bubble */}
      <div style={{
        background: 'white', borderRadius: 24,
        border: '2px solid #e5e7eb', padding: '18px 24px',
        maxWidth: 320, marginBottom: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        position: 'relative', animation: 'fadeUp 0.3s ease both',
        minHeight: 64, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 14,
      }}>
        <p style={{
          fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 17,
          color: '#3c3c3c', textAlign: 'center', lineHeight: 1.4, margin: 0, minHeight: 48,
        }}>
          {displayed}
        </p>

        {phase === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {!isSecondWrong ? (
              <button onClick={onRetry} style={{
                width: '100%', border: 'none', cursor: 'pointer',
                padding: '14px 0', borderRadius: 14,
                background: '#58cc02', boxShadow: '0 4px 0 #46a302',
                color: '#fff', fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 800, fontSize: 16, letterSpacing: '0.05em',
                textTransform: 'uppercase', animation: 'fadeUp 0.3s ease both',
              }}>
                RETRY 🔄
              </button>
            ) : (
              <button onClick={onGiveUp} style={{
                width: '100%', border: 'none', cursor: 'pointer',
                padding: '14px 0', borderRadius: 14,
                background: '#FF9600', boxShadow: '0 4px 0 #c97700',
                color: '#fff', fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 800, fontSize: 16, letterSpacing: '0.05em',
                textTransform: 'uppercase', animation: 'fadeUp 0.3s ease both',
              }}>
                CONTINUE →
              </button>
            )}
          </div>
        )}

        {/* Bubble tail */}
        <div style={{
          position: 'absolute', bottom: -14, left: '50%',
          transform: 'translateX(-50%)', width: 0, height: 0,
          borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
          borderTop: '14px solid white',
        }} />
      </div>

      {/* Numio mascot floating */}
      <div style={{ animation: 'mascot-float 1.8s ease-in-out infinite', marginBottom: 0 }}>
        <img src="/onboarding-mascot.png" alt="Numio" style={{ width: 130, height: 'auto', display: 'block' }} />
      </div>

      <style>{`
        @keyframes mascot-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── 🚪 Quit confirmation popup ────────────────────────────────────────────

function QuitPopup({ visible, onLeave, onStay }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end',
      background: 'rgba(255,255,255,0.92)',
    }}>
      {/* Bubble */}
      <div style={{
        background: 'white', borderRadius: 24,
        border: '2px solid #e5e7eb', padding: '20px 24px',
        maxWidth: 320, marginBottom: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        position: 'relative', animation: 'fadeUp 0.3s ease both',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 16,
      }}>
        <p style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700, fontSize: 18,
          color: '#3c3c3c', textAlign: 'center',
          lineHeight: 1.4, margin: 0,
        }}>
          No don't leave me! 😢<br />Are you sure you want to leave?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
          <button onClick={onStay} style={{
            width: '100%', border: 'none', cursor: 'pointer',
            padding: '14px 0', borderRadius: 14,
            background: '#58cc02', boxShadow: '0 4px 0 #46a302',
            color: '#fff', fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800, fontSize: 16, letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            CONTINUE PLAYING 💪
          </button>
          <button onClick={onLeave} style={{
            width: '100%', border: 'none', cursor: 'pointer',
            padding: '12px 0', borderRadius: 14,
            background: 'none', color: '#9ca3af',
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 14,
          }}>
            Yes, leave
          </button>
        </div>

        {/* Bubble tail */}
        <div style={{
          position: 'absolute', bottom: -14, left: '50%',
          transform: 'translateX(-50%)', width: 0, height: 0,
          borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
          borderTop: '14px solid white',
        }} />
      </div>

      {/* Floating mascot */}
      <div style={{ animation: 'mascot-float 1.8s ease-in-out infinite' }}>
        <img src="/onboarding-mascot.png" alt="Numio"
          style={{ width: 130, height: 'auto', display: 'block' }} />
      </div>
    </div>
  )
}



function FinishedScreen({ payout, node, saving, onExit }) {
  const coinDisplayed = useCoinTick(payout, true)
  const isReview = node === 'review'

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50 relative overflow-hidden">
      <ConfettiBlast active />
      <div className="h-screen md:h-auto md:min-h-[600px] md:my-8 md:rounded-3xl md:shadow-xl w-full max-w-sm md:max-w-md flex flex-col items-center justify-center bg-white px-8 gap-6 relative z-10">

        {/* Floating mascot */}
        <div style={{ animation: 'mascot-float 2s ease-in-out infinite' }}>
          <img src="/onboarding-mascot.png" alt="Numio" style={{ width: 160, height: 'auto', display: 'block' }} />
        </div>

        <div className="text-center">
          <h2 className="font-display font-bold text-4xl text-gray-900 mb-2">
            Perfect! 🎉
          </h2>
          <p className="font-body text-gray-500 text-lg">
            {isReview ? 'You finished the review!' : 'You finished the activity!'}
          </p>
        </div>

        {/* Coin count */}
        <div className="flex items-center justify-center gap-3">
          <CoinIcon size={56} />
          <div className="text-left">
            <p className="font-body text-xs text-amber-600 font-bold tracking-widest uppercase">Coins earned</p>
            <p className="font-display font-extrabold text-4xl text-amber-500 tabular-nums">+{coinDisplayed}</p>
          </div>
        </div>

        {onExit && (
          <button onClick={() => onExit(node)} disabled={saving}
            className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest">
            {saving ? 'SAVING…' : 'CONTINUE →'}
          </button>
        )}

        <style>{`
          @keyframes mascot-float {
            0%,100% { transform: translateY(0px); }
            50%      { transform: translateY(-12px); }
          }
        `}</style>
      </div>
    </div>
  )
}

// ── Lesson screen (Learn node) ────────────────────────────────────────────

function LessonScreen({ facts, theme, operation, table, batchNum, node, kidId, coinBalance, onExit, onBalanceChange }) {
  const [saving, setSaving] = useState(false)
  const payout = NODE_PAYOUT

  async function handleGotIt() {
    setSaving(true)
    try {
      const next = nextStep(operation, table, batchNum, node)
      const newBalance = coinBalance + payout
      await Promise.all([
        next && kidId ? updateProgress(kidId, next) : Promise.resolve(),
        kidId ? setCoinBalance(kidId, newBalance) : Promise.resolve(),
        kidId ? logCoinTransaction(kidId, { amount: payout, reason: 'lesson_complete', balanceAfter: newBalance }) : Promise.resolve(),
      ])
      onBalanceChange?.(newBalance)
    } catch (err) {
      console.error('Failed to advance after lesson:', err)
    } finally {
      setSaving(false)
      onExit?.('learn')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <div className="h-screen md:h-auto md:min-h-[500px] md:my-8 md:rounded-3xl md:shadow-xl w-full max-w-sm md:max-w-md flex flex-col bg-white px-6 py-10">
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="text-center">
            <p className="font-body font-bold text-xs tracking-widest uppercase mb-1" style={{ color: theme.colors.primary }}>
              {theme.era} · Table {table}
            </p>
            <h1 className="font-display font-bold text-2xl text-gray-900">Today's new facts</h1>
            <p className="font-body text-sm text-gray-400 mt-1">Memorize these — they'll come up a lot!</p>
          </div>
          <div className="w-full flex flex-col gap-4">
            {facts.map((f, i) => (
              <div key={i} className="w-full rounded-2xl border-2 px-6 py-5 flex items-center justify-between"
                style={{ borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}0D` }}>
                <span className="font-display font-extrabold text-4xl text-gray-900">{f.equation}</span>
                <span className="font-display font-extrabold text-4xl" style={{ color: theme.colors.primary }}>= {f.result}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={handleGotIt} disabled={saving}
          className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest mt-6">
          {saving ? 'SAVING…' : 'GOT IT →'}
        </button>
      </div>
    </div>
  )
}

// ── Speech hook ───────────────────────────────────────────────────────────

function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  function getVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || []
    const malePrefs = ['Daniel', 'David', 'Alex', 'Fred', 'Ralph', 'Junior',
      'Google UK English Male', 'Microsoft David', 'Microsoft Mark']
    for (const pref of malePrefs) {
      const v = voices.find(v => v.name.includes(pref))
      if (v) return v
    }
    return voices.find(v => /en/i.test(v.lang)) || voices[0] || null
  }
  function speak(text) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.voice = getVoice()
    utt.rate = 0.92
    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }
  function stop() { window.speechSynthesis?.cancel(); setSpeaking(false) }
  return { speak, stop, speaking }
}

function SpeakerIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={active ? 'currentColor' : 'none'} />
      {active ? (
        <><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></>
      ) : (
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
      )}
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function Practice({
  operation     = 'addition',
  table         = 1,
  batchNum      = 1,
  node          = 'learn',
  kidId,
  coinBalance   = 0,
  heartBalance  = 5,
  reviewPool,
  unlockBatch,
  placementClaim = null,
  kidCurrentStep = null,
  onExit,
  onBalanceChange,
  onHeartChange,
}) {
  const theme    = themeFor(operation)
  const isReview = node === 'review'
  const basePayout = payoutForNode(node)

  const generated = useMemo(
    () => generateBatch(operation, table, batchNum, node, { unlockBatch, reviewPool }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [operation, table, batchNum, node]
  )

  const isLesson = generated?.isLesson === true

  // questions is a mutable array we can splice bridge step2 into
  const [questions, setQuestions] = useState(() => isLesson ? [] : (generated || []))
  useEffect(() => {
    setQuestions(isLesson ? [] : (generated || []))
  }, [generated, isLesson])

  const SESSION_TOTAL = NODE_TOTALS[node] ?? 10

  const [idx,          setIdx]          = useState(0)
  const [selected,     setSelected]     = useState(null)
  const [revealed,     setRevealed]     = useState(false)
  const [wrong,        setWrong]        = useState(0)
  const [over,         setOver]         = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [timerKey,     setTimerKey]     = useState(1)
  const [streak,       setStreak]       = useState(0)
  const [fireKey,      setFireKey]      = useState(0)

  // Wrong answer / retry state
  const [showPopup,      setShowPopup]      = useState(false)
  const [showQuitPopup,  setShowQuitPopup]  = useState(false)
  const [isRetry,      setIsRetry]      = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0) // 0,1,2 per question
  const [earnedCoins,  setEarnedCoins]  = useState(0)

  const timeoutRef = useRef(null)
  const { speak, stop, speaking } = useSpeech()

  const q         = questions[idx]
  const isTyped   = q?.isTyped === true
  const isFormula = q?.choiceType === 'formula'
  const isTrueFalse = q?.choiceType === 'truefalse'
  const isExpression = q?.choiceType === 'expression' || q?.choiceType === 'comparison'
  const isTimed   = q?.isTimed === true
  const timerMs   = NODE_TIMER_MS[node] ?? 10000
  const isBridge1 = q?.isBridgeStep1 === true

  function normalizeFormula(s) {
    return String(s ?? '').trim()
      .replace(/\s+/g, ' ')
      .replace(/[-–—]/g, '−')   // normalize minus variants
      .replace(/[×x\*]/g, '×')  // normalize multiply
      .replace(/[÷/]/g, '÷')    // normalize divide
  }

  const isCorrect = isFormula
    ? normalizeFormula(selected) === normalizeFormula(q?.answer)
    : isTyped
      ? String(selected ?? '').trim() === String(q?.answer)
      : selected === q?.answer

  const progressScale = (idx + (revealed ? 1 : 0)) / Math.max(questions.length, 1)

  // Build hint text for popup
  function buildHint(question) {
    if (!question) return ''

    // Bridge step1 — hint about picking the operation
    if (question.isBridgeStep1) {
      return pick([
        'Read the question — are things being added or taken away? 🤔',
        'Does the story say "more", "total", or "left"? That\'s your clue! 💡',
        'Think about what\'s happening in the story first! 📖',
      ])
    }

    // Hint based on operation
    const op = question.bridgeOperation || operation
    const hints = {
      addition: [
        'Start at the bigger number and count up! 🖐️',
        'Use your fingers — count on from the first number! ✋',
        'Think of it as putting two groups together! 🟡🟡',
        'Count up slowly, one step at a time! 1... 2... 3...',
      ],
      subtraction: [
        'Start at the big number and count backwards! 🔢',
        'Use your fingers and take some away! ✋',
        'Think: what\'s left if you remove some? 📦',
        'Count down slowly from the first number! 10... 9... 8...',
      ],
      multiplication: [
        'Think of it as groups! Count each group one by one! 🔵🔵🔵',
        'Skip count! Like 2, 4, 6, 8... 🎵',
        'Add the same number over and over! ➕➕➕',
        'Draw the groups in your head! How many in each? 🧠',
      ],
      division: [
        'How many times can you fit the small number into the big one? 📦',
        'Think of sharing equally — deal them out one by one! 🃏',
        'Count up in groups until you reach the big number! ➕',
        'Multiplication can help — what times that number gives you this? 🔄',
      ],
    }
    const pool = hints[op] || hints.addition
    return pick(pool)
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  // ── Answer handling ───────────────────────────────────────────────────

  function handleCheck() {
    if (revealed || showPopup) return
    const choice = selected
    if (choice === null || choice === undefined || choice === '') return

    const correct = isFormula
      ? normalizeFormula(choice) === normalizeFormula(q.answer)
      : isTyped
        ? String(choice).trim() === String(q.answer)
        : choice === q.answer

    if (correct) {
      setRevealed(true)
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak >= 3) setFireKey(k => k + 1)
      setEarnedCoins(c => c + Math.round((isRetry ? basePayout * 2 : basePayout) / (questions.length || 1)))

      // If bridge step1 — no step2, just continue
      if (isBridge1) {
        // nothing to inject
      }
    } else {
      // Wrong
      setStreak(0)
      setWrong(w => w + 1)
      const newWrongAttempts = wrongAttempts + 1
      setWrongAttempts(newWrongAttempts)
      setShowPopup(true)
    }
  }

  function handleRetry() {
    setShowPopup(false)
    setSelected(null)
    setIsRetry(true)
  }

  function handleGiveUp() {
    // Second wrong — show answer, give half coins, move on
    setShowPopup(false)
    setRevealed(true)
    setIsRetry(false)
    setEarnedCoins(c => c + Math.round((basePayout * 0.5) / (questions.length || 1)))
  }

  function handleTimerExpire() {
    if (revealed || over || showPopup) return
    const choice = selected
    const correct = choice !== null && choice !== undefined && choice !== ''
      ? (isTyped ? String(choice).trim() === String(q.answer) : choice === q.answer)
      : false
    if (correct) {
      setRevealed(true)
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak >= 3) setFireKey(k => k + 1)
    } else {
      setStreak(0)
      setWrong(w => w + 1)
      setWrongAttempts(w => w + 1)
      setShowPopup(true)
    }
  }

  useEffect(() => {
    if (!isTimed || over || revealed || showPopup) return
    timeoutRef.current = setTimeout(handleTimerExpire, timerMs)
    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, isTimed, over, revealed, showPopup])

  function handleContinue() {
    setIsRetry(false)
    setWrongAttempts(0)
    if (idx === questions.length - 1) {
      setOver('finished')
      finalizeAttempt()
      return
    }
    setIdx(i => i + 1)
    setSelected(null)
    setRevealed(false)
    setTimerKey(k => k + 1)
  }

  // ── Persistence ──────────────────────────────────────────────────────

  async function finalizeAttempt() {
    setSaving(true)
    const newBalance = coinBalance + basePayout
    try {
      const next = nextStep(operation, table, batchNum, node)
      await Promise.all([
        next && kidId ? updateProgress(kidId, next) : Promise.resolve(),
        kidId ? setCoinBalance(kidId, newBalance) : Promise.resolve(),
        kidId ? logCoinTransaction(kidId, { amount: basePayout, reason: 'node_pass', balanceAfter: newBalance }) : Promise.resolve(),
        kidId ? logAttempt(kidId, { operation, tableNumber: table, node, questionsSeen: questions.length, correctCount: questions.length - wrong, wrongCount: wrong, livesUsed: 0, result: 'passed', coinsDelta: basePayout }) : Promise.resolve(),
        // 🔑 Stamp the day gate when Review completes — sets next_unlock_at to next midnight
        (node === 'review' && kidId) ? stampAdvanceDate(kidId) : Promise.resolve(),
      ])
      onBalanceChange?.(newBalance)
    } catch (err) {
      console.error('finalizeAttempt failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Render guard ─────────────────────────────────────────────────────

  if (isLesson && generated?.isLesson) {
    return (
      <LessonScreen
        facts={generated.facts}
        theme={theme}
        operation={operation}
        table={table}
        batchNum={batchNum}
        node={node}
        kidId={kidId}
        coinBalance={coinBalance}
        onExit={onExit}
        onBalanceChange={onBalanceChange}
      />
    )
  }

  if (over === 'finished') {
    const correct = questions.length - wrong
    return (
      <FinishedScreen
        payout={basePayout}
        node={node}
        saving={saving}
        onExit={onExit}
      />
    )
  }

  if (!q) return null

  // ── Game screen ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <FireParticles streakKey={fireKey} streak={streak} />

      {/* Quit confirmation popup */}
      <QuitPopup
        visible={showQuitPopup}
        onStay={() => setShowQuitPopup(false)}
        onLeave={() => { setShowQuitPopup(false); onExit?.(null) }}
      />

      {/* Numio wrong-answer popup */}
      <NumioPopup
        visible={showPopup}
        hint={buildHint(q)}
        answer={q?.answer}
        isSecondWrong={wrongAttempts >= 2}
        onRetry={handleRetry}
        onGiveUp={handleGiveUp}
      />

      <div className="h-screen md:h-auto md:min-h-[700px] md:my-8 md:rounded-3xl md:shadow-xl md:border md:border-gray-100 overflow-hidden flex flex-col bg-white w-full max-w-sm md:max-w-md">

        {/* ── Top bar ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-5 pb-3">
          <button onClick={() => { stop(); setShowQuitPopup(true) }}
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-300 transition-colors duration-150 active:bg-gray-100">
            <XIcon />
          </button>

          <div className="flex-1 h-5 rounded-full overflow-hidden"
            style={{ backgroundColor: streak >= 3 ? '#FFE0B2' : '#F3F4F6', transition: 'background-color 0.4s' }}
            role="progressbar" aria-valuenow={idx} aria-valuemax={questions.length}>
            <div className="h-full rounded-full origin-left"
              style={{
                backgroundColor: streak >= 7 ? '#FF4500' : streak >= 4 ? '#FF9600' : '#58cc02',
                transform: `scaleX(${progressScale})`,
                transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s',
                boxShadow: streak >= 4 ? `0 0 8px ${streak >= 7 ? '#FF4500' : '#FF9600'}` : 'none',
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <StreakBadge streak={streak} />
            {/* Live coin display — ticks up after each correct answer */}
            <div className="flex items-center gap-1">
              <CoinIcon size={28} />
              <span
                key={coinBalance + earnedCoins}
                className="font-display font-bold text-base text-amber-500 anim-correct"
              >
                {coinBalance + earnedCoins}
              </span>
            </div>
          </div>
        </div>

        {/* ── Node label + timer ──────────────────────────────── */}
        <div className="flex-shrink-0 px-5 flex items-center justify-between">
          <p className="font-body font-bold text-xs tracking-widest uppercase" style={{ color: theme.colors.dark }}>
            {theme.era} · Table {table} · {nodeLabel(node)}
          </p>
          {isTimed && <SpeedCountdown key={timerKey} durationMs={timerMs} />}
        </div>

        {/* ── Timer bar ───────────────────────────────────────── */}
        {isTimed && (
          <div className="flex-shrink-0 mx-5 mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div key={timerKey} className="h-full bg-red-400 rounded-full anim-speed-countdown"
              style={{ animationDuration: `${timerMs}ms` }} />
          </div>
        )}

        {/* ── Bridge step 1 label ─────────────────────────────── */}
        {isBridge1 && (
          <div className="flex-shrink-0 px-5 mt-2">
            <div className="rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5"
              style={{ backgroundColor: `${theme.colors.primary}18` }}>
              <span className="text-sm">🧩</span>
              <span className="font-body font-bold text-xs" style={{ color: theme.colors.dark }}>
                Type the formula to solve it!
              </span>
            </div>
          </div>
        )}

        {/* ── Question text ───────────────────────────────────── */}
        <div className={`flex-shrink-0 px-6 pt-6 pb-2 ${q.text.endsWith('= ?') ? 'flex items-center justify-center' : ''}`}>
          <p className={
            q.text.endsWith('= ?')
              ? 'text-5xl font-display font-extrabold text-gray-900 text-center leading-tight tracking-tight'
              : 'text-xl font-body font-semibold text-gray-900 text-center leading-snug max-w-[34ch] mx-auto whitespace-pre-line'
          }>
            {q.text}
          </p>
        </div>

        {/* ── Retry badge ─────────────────────────────────────── */}
        {isRetry && !revealed && (
          <div className="flex-shrink-0 flex justify-center pb-1">
            <span className="font-body font-bold text-xs px-3 py-1 rounded-full"
              style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              🔄 Retry — double coins if correct!
            </span>
          </div>
        )}

        {/* ── Read aloud button ───────────────────────────────── */}
        <div className="flex-shrink-0 flex justify-center pb-2">
          <button onClick={() => speaking ? stop() : speak(q.text)}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-90"
            style={{
              backgroundColor: speaking ? '#1CB0F6' : '#F3F4F6',
              color: speaking ? '#FFFFFF' : '#9CA3AF',
              boxShadow: speaking ? '0 0 8px rgba(28,176,246,0.4)' : 'none',
            }}>
            <SpeakerIcon active={speaking} />
            <span className="font-body font-bold text-xs">{speaking ? 'Stop' : 'Read aloud'}</span>
          </button>
        </div>

        {/* ── Answer choices ──────────────────────────────────── */}
        <div key={`choices-${idx}-${isRetry}`} className="flex-1 flex flex-col justify-center px-4 gap-3">
          {isFormula ? (
            // Formula keyboard — kid types e.g. "3 + 4"
            <div className="flex flex-col items-center gap-4">
              {/* Display box */}
              <div className={[
                'w-64 h-16 rounded-2xl border-2 flex items-center justify-center px-4',
                revealed
                  ? normalizeFormula(selected) === normalizeFormula(q.answer)
                    ? 'border-green-400 bg-green-50'
                    : 'border-amber-300 bg-amber-50'
                  : selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white',
              ].join(' ')}>
                <span className="font-display font-bold text-2xl text-gray-900 tracking-wide">
                  {selected || <span className="text-gray-300">e.g. 3 + 4</span>}
                </span>
              </div>
              {revealed && normalizeFormula(selected) !== normalizeFormula(q.answer) && (
                <p className="font-body text-sm text-amber-600 font-semibold">
                  Answer: <span className="font-display font-bold text-lg">{q.answer}</span>
                </p>
              )}
              {!revealed && (
                <div className="w-full max-w-xs flex flex-col gap-2">
                  {/* Number row */}
                  <div className="grid grid-cols-5 gap-2">
                    {[1,2,3,4,5,6,7,8,9,0].map(n => (
                      <button key={n}
                        onClick={() => setSelected(s => ((s || '') + String(n)).slice(0, 8))}
                        className="h-12 rounded-xl font-display font-bold text-xl bg-gray-50 text-gray-800 border-2 border-gray-200 active:bg-gray-100 flex items-center justify-center">
                        {n}
                      </button>
                    ))}
                  </div>
                  {/* Operator row */}
                  <div className="grid grid-cols-5 gap-2">
                    {['+', '−', '×', '÷', '⌫'].map(op => (
                      <button key={op}
                        onClick={() => {
                          if (op === '⌫') {
                            setSelected(s => {
                              const str = s || ''
                              const trimmed = str.trimEnd()
                              // Remove last char or last " op " block
                              if (trimmed.endsWith(' ')) return trimmed.slice(0, -1)
                              const parts = trimmed.split('')
                              parts.pop()
                              const result = parts.join('').trimEnd()
                              return result || null
                            })
                          } else {
                            setSelected(s => {
                              const str = (s || '').trimEnd()
                              if (!str) return null
                              // Don't add operator if last char is already an operator
                              const last = str[str.length - 1]
                              if (['+','−','×','÷'].includes(last)) return str.slice(0, -1) + op + ' '
                              return str + ' ' + op + ' '
                            })
                          }
                        }}
                        className={[
                          'h-12 rounded-xl font-display font-bold text-xl flex items-center justify-center border-2',
                          op === '⌫'
                            ? 'bg-red-50 text-red-400 border-red-100 active:bg-red-100'
                            : 'bg-amber-50 text-amber-600 border-amber-200 active:bg-amber-100',
                        ].join(' ')}>
                        {op}
                      </button>
                    ))}
                  </div>
                  {/* Space/clear */}
                  <button
                    onClick={() => setSelected(null)}
                    className="w-full h-10 rounded-xl font-body font-bold text-sm text-gray-400 border-2 border-gray-200 bg-white active:bg-gray-50">
                    Clear
                  </button>
                </div>
              )}
            </div>
          ) : isTyped ? (
            <div className="flex flex-col items-center gap-4">
              <div className={[
                'w-40 h-20 rounded-2xl border-2 flex items-center justify-center',
                revealed
                  ? String(selected).trim() === String(q.answer)
                    ? 'border-green-400 bg-green-50'
                    : 'border-amber-300 bg-amber-50'
                  : selected !== null ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white',
              ].join(' ')}>
                <span className="font-display font-extrabold text-5xl text-gray-900">{selected ?? '?'}</span>
              </div>
              {revealed && String(selected ?? '').trim() !== String(q.answer) && (
                <p className="font-body text-sm text-amber-600 font-semibold">
                  Answer: <span className="font-display font-bold text-lg">{q.answer}</span>
                </p>
              )}
              {!revealed && (
                <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                  {[1,2,3,4,5,6,7,8,9,null,0,'⌫'].map((key, ki) => (
                    <button key={ki} disabled={key === null}
                      onClick={() => {
                        if (key === null) return
                        if (key === '⌫') {
                          setSelected(s => { const str = String(s ?? ''); return str.length <= 1 ? null : Number(str.slice(0, -1)) })
                        } else {
                          setSelected(s => { const str = String(s ?? '').replace('null',''); const next = str + String(key); return next.length > 4 ? s : Number(next) })
                        }
                      }}
                      className={[
                        'h-14 rounded-2xl font-display font-bold text-2xl flex items-center justify-center select-none',
                        key === null ? 'opacity-0 pointer-events-none'
                          : key === '⌫' ? 'bg-red-50 text-red-400 border-2 border-red-100 active:bg-red-100'
                          : 'bg-gray-50 text-gray-800 border-2 border-gray-200 active:bg-gray-100',
                      ].join(' ')}
                    >{key}</button>
                  ))}
                </div>
              )}
            </div>
          ) : isTrueFalse ? (
            <div className="flex gap-3">
              {q.choices.map(choice => (
                <button key={choice} disabled={revealed}
                  onClick={() => !revealed && setSelected(choice)}
                  className={['flex-1 rounded-2xl border-2 font-display font-bold text-2xl card-answer',
                    'flex items-center justify-center h-28 select-none',
                    cardColorClass(choice, selected, revealed, q.answer),
                    cardAnimClass(choice, selected, revealed, q.answer),
                  ].join(' ')}
                  style={!revealed && selected === choice ? { '--card-shadow': '#22c55e' } : {}}>
                  {choice}
                </button>
              ))}
            </div>
          ) : isExpression ? (
            <div className="flex flex-col gap-3">
              {q.choices.map(choice => (
                <button key={choice} disabled={revealed}
                  onClick={() => !revealed && setSelected(choice)}
                  className={['rounded-2xl border-2 font-body font-semibold text-base card-answer',
                    'flex items-center justify-center py-4 w-full select-none px-4 text-center',
                    cardColorClass(choice, selected, revealed, q.answer),
                    cardAnimClass(choice, selected, revealed, q.answer),
                  ].join(' ')}
                  style={!revealed && selected === choice ? { '--card-shadow': '#22c55e' } : {}}>
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {q.choices.map(choice => (
                <button key={choice} disabled={revealed}
                  onClick={() => !revealed && setSelected(choice)}
                  className={['rounded-2xl border-2 font-display font-bold text-4xl card-answer',
                    'flex items-center justify-center h-28 w-full select-none',
                    cardColorClass(choice, selected, revealed, q.answer),
                    cardAnimClass(choice, selected, revealed, q.answer),
                  ].join(' ')}
                  style={!revealed && selected === choice ? { '--card-shadow': '#22c55e' } : {}}>
                  {choice}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom action ───────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 pb-8 pt-3">
          {!revealed ? (
            <button
              disabled={selected === null || selected === undefined || selected === ''}
              onClick={handleCheck}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest">
              {isFormula ? 'CHECK FORMULA' : 'CHECK'}
            </button>
          ) : (
            <div className={`rounded-2xl overflow-hidden border-2 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-2xl">{isCorrect ? '🎉' : '💪'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-bold text-base leading-tight">
                    {isCorrect ? (isRetry ? '🌟 Amazing! Double coins!' : 'Correct!') : 'Keep going!'}
                  </p>
                  {!isCorrect && (
                    <p className="font-body text-sm text-amber-600 leading-tight truncate">
                      Answer: {q.answer}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={handleContinue}
                className={`w-full py-4 font-body font-bold text-xl tracking-widest ${isCorrect ? 'btn-duo' : 'btn-duo-yellow'}`}>
                CONTINUE →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
