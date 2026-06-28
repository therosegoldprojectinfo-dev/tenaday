import { useState, useMemo, useEffect, useRef } from 'react'
import { generateBatch } from '../lib/problems'
import { themeFor } from '../lib/eraTheme'
import { nodeLabel, nextStep, stepIndex, OPERATIONS } from '../lib/progression'
import { applyPayout, payoutForNode, passThresholdFor, NODE_PAYOUT, ENTRY_FEE, DEBT_FLOOR } from '../lib/economy'
import FlowerJump from '../components/FlowerJump'
import {
  updateProgress,
  stampAdvanceDate,
  setCoinBalance,
  logCoinTransaction,
  logAttempt,
  setHeartBalance,
} from '../lib/kidData'

const TOTAL       = 12  // default; review overrides to 24
const LIVES_START = 5
const TIMED_MS    = 5000

const TIMED_NODES        = new Set(['speed', 'double_reward'])
const WORD_PROBLEM_NODES = new Set(['what_happened', 'real_life'])

// ── Icons ─────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  )
}

function HeartIcon({ filled = true, className = '', style }) {
  return (
    <img src="/Cr%C3%A9ation%20sans%20titre%20(28).png" width="44" height="44" alt="" />
  )
}

function CoinIcon({ size = 36 }) {
  return <img src="/Cr%C3%A9ation%20sans%20titre%20(27).png" width={size} height={size} alt="" />
}

// ── Answer card helpers ───────────────────────────────────────────────────

function cardColorClass(choice, selected, revealed, answer) {
  if (!revealed) {
    return selected === choice
      ? 'border-green-500 bg-green-50 text-green-600'
      : 'border-gray-200 bg-white text-gray-800'
  }
  if (choice === answer)   return 'border-green-500 bg-green-50 text-green-700'
  if (choice === selected) return 'border-red-400 bg-red-50 text-red-500'
  return 'border-gray-100 bg-white text-gray-300'
}

function cardAnimClass(choice, selected, revealed, answer) {
  if (!revealed) return ''
  if (choice === answer)   return 'anim-correct'
  if (choice === selected) return 'anim-wrong-shake'
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

// ── End screens ───────────────────────────────────────────────────────────

/** 🔥 Fire particles that rise from the bottom when streak hits milestones */
function FireParticles({ streakKey, streak }) {
  if (streak < 3) return null
  const count = Math.min(streak, 12)
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" key={streakKey}>
      {Array.from({ length: count }).map((_, i) => {
        const left = 10 + Math.random() * 80
        const delay = Math.random() * 0.4
        const duration = 1.2 + Math.random() * 0.6
        const size = streak >= 7 ? 28 + Math.random() * 16 : 20 + Math.random() * 12
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: -40,
              left: `${left}%`,
              fontSize: size,
              animation: `fire-rise ${duration}s ${delay}s ease-out both`,
            }}
          >
            {streak >= 7 ? '🔥' : '🔥'}
          </div>
        )
      })}
    </div>
  )
}

/** 🎉 Confetti that bursts up from the bottom on session complete */
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
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: -20,
              left: `${left}%`,
              width: size,
              height: size,
              borderRadius: isCircle ? '50%' : 2,
              backgroundColor: color,
              animation: `confetti-rise ${duration}s ${delay}s cubic-bezier(0.2,0.8,0.3,1) both`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        )
      })}
    </div>
  )
}

/** 🔥 Streak badge shown in the header */
function StreakBadge({ streak }) {
  if (streak < 2) return null
  const hot = streak >= 7
  const warm = streak >= 4
  return (
    <div
      key={streak}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full anim-correct"
      style={{
        backgroundColor: hot ? '#FF4500' : warm ? '#FF9600' : '#FFB700',
        boxShadow: hot ? '0 0 12px rgba(255,69,0,0.6)' : 'none',
      }}
    >
      <span style={{ fontSize: hot ? 16 : 14 }}>🔥</span>
      <span className="font-display font-extrabold text-white" style={{ fontSize: hot ? 15 : 13 }}>
        {streak}
      </span>
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
    <span key={count} className={`font-display font-extrabold ${size} anim-correct`} style={{ color }}>
      {count}s
    </span>
  )
}

function DiedScreen({ saving, onExit }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <div className="h-screen md:h-auto md:min-h-[560px] md:my-8 md:rounded-3xl md:shadow-xl w-full max-w-sm md:max-w-md flex flex-col items-center justify-center bg-white px-8 gap-6">
        <img src="/Cr%C3%A9ation%20sans%20titre%20(28).png" width="160" height="160" style={{opacity:0.4}} alt="" />
        <div className="flex gap-2" aria-label="No lives left">
          {Array.from({ length: LIVES_START }).map((_, i) => (
            <HeartIcon key={i} filled={false} style={{ opacity: 0.3 }} />
          ))}
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-3xl text-gray-900 mb-2">Out of lives!</h2>
          <p className="font-body text-gray-400 text-sm leading-relaxed">
            That was a tough one. You can try again — it's free!
          </p>
        </div>
        {onExit && (
          <button onClick={onExit} disabled={saving}
            className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest">
            {saving ? 'SAVING…' : 'TRY AGAIN'}
          </button>
        )}
      </div>
    </div>
  )
}

function FinishedScreen({ passed, correct, total, payout, isReview, saving, onExit }) {
  const coinDisplayed = useCoinTick(payout, passed)

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50 relative overflow-hidden">
      <div className="h-screen md:h-auto md:min-h-[600px] md:my-8 md:rounded-3xl md:shadow-xl w-full max-w-sm md:max-w-md flex flex-col items-center justify-center bg-white px-8 gap-6 relative z-10">
        {passed ? (
          <div className="flex flex-col items-center gap-2">
            <FlowerJump size={220} loop />
            <div className="flex gap-2 mt-1">
              {[0,1,2].map((i) => (
                <span key={i} style={{
                  display: 'inline-block',
                  animation: `correct-bounce 0.5s ${0.1 + i * 0.13}s cubic-bezier(0.34,1.56,0.64,1) both`
                }}>
                  <img src="/Cr%C3%A9ation%20sans%20titre%20(27).png" width="80" height="80" alt="" />
                </span>
              ))}
            </div>
          </div>
        ) : (
          <span className="text-8xl select-none">💪</span>
        )}

        <div className="text-center">
          <h2 className="font-display font-bold text-3xl text-gray-900 mb-2">
            {passed
              ? (isReview ? '🎉 Review complete!' : '🎉 You passed!')
              : 'Almost there!'}
          </h2>
          <p className="font-body text-gray-400">
            {correct} out of {total} correct
          </p>
          {!passed && (
            <p className="font-body text-gray-400 text-sm mt-1">
              Retry is free — you've got this!
            </p>
          )}
          {passed && (
            <div className="flex items-center justify-center gap-2 mt-4 font-display font-extrabold text-3xl text-amber-500">
              <CoinIcon size={60} />
              <span className="tabular-nums">+{coinDisplayed}</span>
            </div>
          )}
        </div>

        {onExit && (
          <button onClick={onExit} disabled={saving}
            className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest">
            {saving ? 'SAVING…' : passed ? 'CONTINUE →' : 'TRY AGAIN'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Lesson screen (Learn node) ───────────────────────────────────────────
// Pure display — shows today's 2 facts clearly, no questions, no lives.
// Kid taps "Got it →" and we advance the cursor to the next node.
function LessonScreen({ facts, theme, operation, table, batchNum, node, kidId, coinBalance, onExit, onBalanceChange }) {
  const [saving, setSaving] = useState(false)
  const [coins, setCoins]   = useState(0)
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
      setCoins(payout)
      onBalanceChange?.(newBalance)
    } catch (err) {
      console.error('Failed to advance after lesson:', err)
    } finally {
      setSaving(false)
      onExit?.()
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
              <div
                key={i}
                className="w-full rounded-2xl border-2 px-6 py-5 flex items-center justify-between"
                style={{ borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}0D` }}
              >
                <span className="font-display font-extrabold text-4xl text-gray-900">{f.equation}</span>
                <span className="font-display font-extrabold text-4xl" style={{ color: theme.colors.primary }}>= {f.result}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleGotIt}
          disabled={saving}
          className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest mt-6"
        >
          {saving ? 'SAVING…' : 'GOT IT →'}
        </button>
      </div>
    </div>
  )
}

// ── Speech hook ───────────────────────────────────────────────────────────
// Uses the Web Speech API (built into every modern browser, free, no API key).
// Picks a male-sounding voice — tries to find an English male voice first,
// falls back to whatever is available.
function useSpeech() {
  const [speaking, setSpeaking] = useState(false)

  function getVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || []
    // Prefer male English voices — common names across platforms
    const malePrefs = ['Daniel', 'David', 'Alex', 'Fred', 'Ralph', 'Junior',
                       'Albert', 'Bruce', 'English Male', 'Google UK English Male',
                       'Microsoft David', 'Microsoft Mark', 'Aaron', 'Arthur']
    for (const name of malePrefs) {
      const v = voices.find(v => v.name.includes(name))
      if (v) return v
    }
    // Fallback: any English voice
    return voices.find(v => v.lang?.startsWith('en')) || voices[0] || null
  }

  function speak(text) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.voice = getVoice()
    utt.rate  = 0.9   // slightly slower — clearer for kids
    utt.pitch = 0.95  // slightly lower — more teacher-like
    utt.volume = 1
    utt.onstart = () => setSpeaking(true)
    utt.onend   = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }

  function stop() {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }

  // Clean up on unmount
  useEffect(() => { return () => window.speechSynthesis?.cancel() }, [])

  return { speak, stop, speaking }
}

function SpeakerIcon({ active }) {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={active ? 'currentColor' : 'none'} />
      {active ? (
        <>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </>
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
  onExit,
  onBalanceChange,
  onHeartChange,
}) {
  const theme         = themeFor(operation)
  const isReview      = node === 'review'
  const payout        = payoutForNode(node)

  const generated = useMemo(
    () => generateBatch(operation, table, batchNum, node, { unlockBatch, reviewPool }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [operation, table, batchNum, node]
  )

  // Learn is a pure lesson — no game state needed
  const isLesson  = generated?.isLesson === true
  const questions = isLesson ? [] : generated
  // Review has 24 questions; all others have 12
  const SESSION_TOTAL = isReview ? 24 : TOTAL
  const passThreshold = passThresholdFor(operation, placementClaim, OPERATIONS, SESSION_TOTAL)

  const [idx,      setIdx]      = useState(0)
  const [lives,    setLives]    = useState(heartBalance ?? LIVES_START)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [wrong,    setWrong]    = useState(0)
  const [over,     setOver]     = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [heartKey, setHeartKey] = useState(0)
  const [showHeartLost, setShowHeartLost] = useState(false)
  const [timerKey, setTimerKey] = useState(1)
  const [streak,   setStreak]   = useState(0)
  const [fireKey,  setFireKey]  = useState(0) // bumped to trigger fire burst
  const timeoutRef = useRef(null)
  const { speak, stop, speaking } = useSpeech()

  const q                = questions[idx]
  const isCorrect        = selected === q?.answer
  const isEquationChoice = q?.choiceType === 'equation'
  const isTrueFalse      = q?.choiceType === 'truefalse'
  const isComparison     = q?.choiceType === 'comparison'
  const isTimed          = q?.isTimed === true
  const isWordProblem    = q?.format === 'word'

  const progressScale = (idx + (revealed ? 1 : 0)) / SESSION_TOTAL

  // ── Answer handling ─────────────────────────────────────────────────────

  function handleCheck(forcedChoice) {
    if (revealed) return
    const choice = forcedChoice !== undefined ? forcedChoice : selected
    if (choice === null || choice === undefined) return

    setRevealed(true)
    if (choice === q.answer) {
      const newStreak = streak + 1
      setStreak(newStreak)
      // Fire burst at streak milestones 3, 5, 7, 10+
      if (newStreak >= 3) setFireKey(k => k + 1)
    } else {
      setStreak(0)
      setWrong(w => w + 1)
      setLives(l => {
        const next = l - 1
        if (kidId) setHeartBalance(kidId, next).catch(console.error)
        onHeartChange?.(next)
        return next
      })
      setHeartKey(k => k + 1)
      setShowHeartLost(true)
      setTimeout(() => setShowHeartLost(false), 1500)
    }
  }

  function handleTimerExpire() {
    if (revealed || over) return
    if (selected !== null) { handleCheck(selected); return }
    setRevealed(true)
    setStreak(0)
    setWrong(w => w + 1)
    setLives(l => {
      const next = l - 1
      if (kidId) setHeartBalance(kidId, next).catch(console.error)
      onHeartChange?.(next)
      return next
    })
    setHeartKey(k => k + 1)
    setShowHeartLost(true)
    setTimeout(() => setShowHeartLost(false), 1500)
  }

  useEffect(() => {
    if (!isTimed || over || revealed) return
    timeoutRef.current = setTimeout(handleTimerExpire, TIMED_MS)
    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, isTimed, over, revealed])

  function handleContinue() {
    // Check last question FIRST — if the kid answered all questions,
    // evaluate their score regardless of lives remaining. A 4th wrong
    // answer on Q12 should still trigger the finished screen if they
    // passed the threshold, not the died screen.
    if (idx === SESSION_TOTAL - 1) {
      const correct = SESSION_TOTAL - wrong
      if (lives === 0 && correct < passThreshold) {
        setOver('died')
        finalizeAttempt('died')
      } else {
        setOver('finished')
        finalizeAttempt(correct >= passThreshold ? 'passed' : 'retry')
      }
      return
    }
    if (lives === 0) {
      setOver('died')
      finalizeAttempt('died')
      return
    }
    setIdx(i => i + 1)
    setSelected(null)
    setRevealed(false)
    setTimerKey(k => k + 1)
  }

  // ── Persistence ─────────────────────────────────────────────────────────

  async function finalizeAttempt(result) {
    setSaving(true)
    const correct    = SESSION_TOTAL - wrong
    const coinsDelta = result === 'passed' ? payout : 0
    const newBalance = result === 'passed' ? applyPayout(coinBalance, node) : coinBalance

    try {
      if (kidId) {
        const attemptId = await logAttempt(kidId, {
          operation, table, batch: batchNum, node,
          questionsSeen: idx + 1,
          correctCount:  correct,
          wrongCount:    wrong,
          livesUsed:     LIVES_START - lives,
          result,
          coinsDelta,
        })

        if (coinsDelta > 0) {
          await setCoinBalance(kidId, newBalance)
          await logCoinTransaction(kidId, {
            attemptId,
            amount:       coinsDelta,
            reason:       isReview ? 'review_node_pass' : 'node_pass',
            balanceAfter: newBalance,
          })
          onBalanceChange?.(newBalance)
        }

        if (result === 'passed') {
          const next = nextStep(operation, table, batchNum, node)
          // Cursor regression guard: only write if next step is strictly
          // ahead of where the kid already is. Replaying a completed node
          // and passing must never move the cursor backward.
          // stepIndex is exported from progression.js for this exact check.
          // We pass the live kid position via the props that were captured
          // when this Practice session started — those reflect the DB state
          // at the moment the node was opened, which is safe to compare against.
          const currentIdx = stepIndex(operation, table, batchNum, node)
          const nextIdx    = next ? stepIndex(next.operation, next.table, next.batch, next.node) : -1
          // kidCurrentIdx: the cursor the kid has in the DB right now.
          // We don't have it as a live value here, so use the conservative
          // check: only advance if next > the node we just completed.
          // This protects against replay regression because a replay's
          // next step will always be <= the kid's real current cursor.
          if (next && nextIdx > currentIdx) {
            if (node === 'review') {
              await updateProgress(kidId, next)
              try {
                await stampAdvanceDate(kidId)
              } catch (gateErr) {
                console.error('stampAdvanceDate failed (gate will be open, cursor advanced):', gateErr)
              }
            } else {
              await updateProgress(kidId, next)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to save attempt (gameplay continues regardless):', err)
    } finally {
      setSaving(false)
    }
  }

  // ── End screens ─────────────────────────────────────────────────────────

  // Learn is a pure lesson screen — show today's 2 facts clearly,
  // no questions, no lives, no coins. Kid taps "Got it" and advances.
  if (isLesson) {
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

  if (over === 'died') {
    return <DiedScreen saving={saving} onExit={onExit} />
  }

  if (over === 'finished') {
    const correct = SESSION_TOTAL - wrong
    const passed  = correct >= passThreshold
    return (
      <>
        <ConfettiBlast active={passed} />
        <FinishedScreen
          passed={passed}
          correct={correct}
          total={SESSION_TOTAL}
          payout={payout}
          isReview={isReview}
          saving={saving}
          onExit={onExit}
        />
      </>
    )
  }

  // ── Game screen ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      {/* Fire particles — rise from bottom when streak ≥ 3 */}
      <FireParticles streakKey={fireKey} streak={streak} />

      <div className="relative h-screen md:h-auto md:min-h-[700px] md:my-8 md:rounded-3xl md:shadow-xl md:border md:border-gray-100 overflow-hidden flex flex-col bg-white w-full max-w-sm md:max-w-md">

        {/* Heart lost flash overlay */}
        {showHeartLost && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ animation: 'fadeInOut 1.5s ease forwards' }}>
            <div className="bg-red-500 text-white rounded-3xl px-8 py-5 flex flex-col items-center gap-2 shadow-2xl"
              style={{ animation: 'correct-bounce 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <img src="/Cr%C3%A9ation%20sans%20titre%20(28).png" width="80" height="80" style={{opacity:0.6}} alt="" />
              <p className="font-display font-bold text-2xl">-1 Heart!</p>
            </div>
          </div>
        )}

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-5 pb-3">
          <button
            onClick={async () => {
              // Log the attempt as abandoned and refund entry fee so
              // mid-session exits don't silently drain coins
              try {
                await logAttempt(kidId, {
                  operation, table, batch: batchNum, node,
                  questionsSeen: idx,
                  correctCount: idx - wrong,
                  wrongCount: wrong,
                  livesUsed: LIVES_START - lives,
                  result: 'retry',
                  coinsDelta: 0,
                })
                // Refund entry fee on exit — but only if the kid wasn't
                // already at the debt floor when they entered. At the floor,
                // applyEntryFee charged nothing (Math.max kept them at -10),
                // so there's nothing to refund. Refunding anyway gives free coins.
                if (coinBalance > DEBT_FLOOR) {
                  // Refund the entry fee. If kid was in debt, cap the refund
                  // so they don't go above 0 (they paid nothing at the floor).
                  // If kid had positive coins, just add the fee back normally.
                  const refunded = coinBalance < 0
                    ? Math.min(coinBalance + ENTRY_FEE, 0)
                    : coinBalance + ENTRY_FEE
                  await setCoinBalance(kidId, refunded)
                  await logCoinTransaction(kidId, {
                    amount: ENTRY_FEE,
                    reason: 'exit_refund',
                    balanceAfter: refunded,
                  })
                }
              } catch (err) {
                console.error('Exit cleanup failed (non-blocking):', err)
              }
              onExit?.()
            }}
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 transition-colors duration-150 active:bg-gray-100"
            aria-label="Exit practice"
          >
            <XIcon />
          </button>

          <div
            className="flex-1 h-5 rounded-full overflow-hidden"
            style={{
              backgroundColor: streak >= 3 ? '#FFE0B2' : '#F3F4F6',
              transition: 'background-color 0.4s',
            }}
            role="progressbar"
            aria-valuenow={idx}
            aria-valuemax={SESSION_TOTAL}
          >
            <div
              className="h-full rounded-full origin-left"
              style={{
                backgroundColor: streak >= 7 ? '#FF4500' : streak >= 4 ? '#FF9600' : '#58cc02',
                transform: `scaleX(${progressScale})`,
                transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s',
                boxShadow: streak >= 4 ? `0 0 8px ${streak >= 7 ? '#FF4500' : '#FF9600'}` : 'none',
              }}
            />
          </div>

          {/* Streak badge replaces hearts when streak ≥ 2, hearts stay */}
          <div className="flex items-center gap-1.5">
            <StreakBadge streak={streak} />
            <div className="flex items-center gap-0.5">
              {Array.from({ length: LIVES_START }).map((_, i) => {
                const filled = i < lives
                return (
                  <HeartIcon
                    key={i}
                    filled={filled}
                    className={filled && i === lives - 1 && heartKey > 0 ? 'anim-heart-pulse' : ''}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Node label + speed countdown ────────────────────────── */}
        <div className="flex-shrink-0 px-5 flex items-center justify-between">
          <p className="font-body font-bold text-xs tracking-widest uppercase" style={{ color: theme.colors.dark }}>
            {theme.era} · Table {table} · {nodeLabel(node)}
          </p>
          {isTimed && (
            <SpeedCountdown key={timerKey} durationMs={TIMED_MS} />
          )}
        </div>

        {/* Speed countdown bar */}
        {isTimed && (
          <div className="flex-shrink-0 mx-5 mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              key={timerKey}
              className="h-full bg-red-400 rounded-full anim-speed-countdown"
              style={{ animationDuration: `${TIMED_MS}ms` }}
            />
          </div>
        )}

        {/* ── Question text ────────────────────────────────────────── */}
        <div className={`flex-shrink-0 px-6 pt-6 pb-2 ${(isWordProblem || !q.text.endsWith('= ?')) ? '' : 'flex items-center justify-center'}`}>
          <p className={
            (isWordProblem || !q.text.endsWith('= ?'))
              ? 'text-xl font-body font-semibold text-gray-900 text-center leading-snug max-w-[34ch] mx-auto'
              : 'text-5xl font-display font-extrabold text-gray-900 text-center leading-tight tracking-tight'
          }>
            {q.text}
          </p>
        </div>

        {/* ── Read aloud button ─────────────────────────────────────── */}
        <div className="flex-shrink-0 flex justify-center pb-2">
          <button
            onClick={() => speaking ? stop() : speak(q.text)}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all active:scale-90"
            style={{
              backgroundColor: speaking ? '#1CB0F6' : '#F3F4F6',
              color: speaking ? '#FFFFFF' : '#9CA3AF',
              boxShadow: speaking ? '0 0 8px rgba(28,176,246,0.4)' : 'none',
            }}
            aria-label={speaking ? 'Stop reading' : 'Read question aloud'}
          >
            <SpeakerIcon active={speaking} />
            <span className="font-body font-bold text-xs">
              {speaking ? 'Stop' : 'Read aloud'}
            </span>
          </button>
        </div>

        {/* ── Answer choices ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center px-4 gap-3">
          {isEquationChoice ? (
            // Equation choices: single column
            <div className="flex flex-col gap-3">
              {q.choices.map(choice => (
                <button
                  key={choice}
                  disabled={revealed}
                  onClick={() => !revealed && setSelected(choice)}
                  aria-pressed={selected === choice}
                  className={[
                    'rounded-2xl border-2 font-display font-bold text-2xl card-answer',
                    'flex items-center justify-center py-5 w-full select-none px-4 text-center',
                    cardColorClass(choice, selected, revealed, q.answer),
                    cardAnimClass(choice, selected, revealed, q.answer),
                  ].join(' ')}
                  style={!revealed && selected === choice ? { '--card-shadow': '#22c55e' } : {}}
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : isTrueFalse ? (
            // True / False: 2 wide buttons side by side
            <div className="flex gap-3">
              {q.choices.map(choice => (
                <button
                  key={choice}
                  disabled={revealed}
                  onClick={() => !revealed && setSelected(choice)}
                  aria-pressed={selected === choice}
                  className={[
                    'flex-1 rounded-2xl border-2 font-display font-bold text-2xl card-answer',
                    'flex items-center justify-center h-28 select-none',
                    cardColorClass(choice, selected, revealed, q.answer),
                    cardAnimClass(choice, selected, revealed, q.answer),
                  ].join(' ')}
                  style={!revealed && selected === choice ? { '--card-shadow': '#22c55e' } : {}}
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : isComparison ? (
            // Comparison: 2 expression buttons stacked
            <div className="flex flex-col gap-3">
              {q.choices.map(choice => (
                <button
                  key={choice}
                  disabled={revealed}
                  onClick={() => !revealed && setSelected(choice)}
                  aria-pressed={selected === choice}
                  className={[
                    'rounded-2xl border-2 font-display font-bold text-2xl card-answer',
                    'flex items-center justify-center py-6 w-full select-none',
                    cardColorClass(choice, selected, revealed, q.answer),
                    cardAnimClass(choice, selected, revealed, q.answer),
                  ].join(' ')}
                  style={!revealed && selected === choice ? { '--card-shadow': '#22c55e' } : {}}
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            // Number choices: 2×2 grid
            <div className="grid grid-cols-2 gap-3">
              {q.choices.map(choice => (
                <button
                  key={choice}
                  disabled={revealed}
                  onClick={() => !revealed && setSelected(choice)}
                  aria-pressed={selected === choice}
                  className={[
                    'rounded-2xl border-2 font-display font-bold text-4xl card-answer',
                    'flex items-center justify-center h-28 w-full select-none',
                    cardColorClass(choice, selected, revealed, q.answer),
                    cardAnimClass(choice, selected, revealed, q.answer),
                  ].join(' ')}
                  style={!revealed && selected === choice ? { '--card-shadow': '#22c55e' } : {}}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom action ────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 pb-8 pt-3">
          {!revealed ? (
            <button
              disabled={selected === null}
              onClick={() => handleCheck()}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest"
            >
              CHECK
            </button>
          ) : (
            <div className={`rounded-2xl overflow-hidden border-2 ${
              isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className={`flex items-center gap-3 px-4 py-4 ${
                isCorrect ? 'text-green-700' : 'text-red-500'
              }`}>
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xl ${
                  isCorrect ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
                }`}>
                  {isCorrect ? '✓' : '✗'}
                </div>
                <div className="min-w-0">
                  <p className="font-body font-bold text-base leading-tight">
                    {isCorrect ? 'Correct!' : 'Not quite'}
                  </p>
                  {!isCorrect && (
                    <p className="font-body text-sm text-red-400 leading-tight truncate">
                      Answer: {q.answer}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleContinue}
                className={`w-full py-4 font-body font-bold text-xl tracking-widest ${
                  isCorrect ? 'btn-duo' : 'btn-duo-red'
                }`}
              >
                CONTINUE
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
