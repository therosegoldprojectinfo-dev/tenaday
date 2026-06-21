import { useState, useMemo, useEffect, useRef } from 'react'
import { generateBatch } from '../lib/problems'
import { themeFor } from '../lib/eraTheme'
import { stageLabel, nextStep } from '../lib/progression'
import { applyPayout, STAGE_PAYOUT } from '../lib/economy'
import {
  updateProgress,
  setCoinBalance,
  logCoinTransaction,
  logAttempt,
} from '../lib/kidData'

const TOTAL          = 10
const LIVES_START    = 4
const SPEED_ROUND_MS = 5000

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  )
}

// key prop on this component causes React to remount it, retriggering the CSS animation
function HeartIcon({ className = '' }) {
  return (
    <svg width="20" height="18" viewBox="0 0 22 20" fill="#ef4444"
      className={className} aria-hidden="true">
      <path d="M11 18.5S1 12.3 1 6.5a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 5.8-10 12-10 12z" />
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#FFB700" />
      <circle cx="10" cy="10" r="7" fill="#FFD700" />
      <path
        d="M10 5.5l1.1 3.4h3.6l-2.9 2.1 1.1 3.4L10 12.4 6.9 14.4l1.1-3.4-2.9-2.1h3.6z"
        fill="#CC7700"
      />
    </svg>
  )
}

function cardClass(choice, selected, revealed, answer) {
  const base = [
    'rounded-2xl border-2 font-display font-bold text-3xl card-answer',
    'flex items-center justify-center h-32 w-full select-none px-3 text-center',
  ].join(' ')

  if (!revealed) {
    return selected === choice
      ? `${base} border-green-500 bg-green-50 text-green-600`
      : `${base} border-gray-200 bg-white text-gray-800`
  }

  if (choice === answer)   return `${base} border-green-500  bg-green-50  text-green-700`
  if (choice === selected) return `${base} border-red-400    bg-red-50    text-red-500`
  return `${base} border-gray-100 bg-white text-gray-300`
}

function cardAnimClass(choice, selected, revealed, answer) {
  if (!revealed) return ''
  if (choice === answer)   return 'anim-correct'
  if (choice === selected) return 'anim-wrong-shake'
  return ''
}

export default function Practice({
  operation = 'addition',
  table = 1,
  stage = 'equation',
  kidId,
  coinBalance = 0,
  onExit,
  onBalanceChange,
}) {
  const theme = themeFor(operation)
  const isSpeedRound = stage === 'speed_round'
  const isWordProblem = stage === 'word_problem'

  const batch = useMemo(() => generateBatch(operation, table, stage), [operation, table, stage])

  const [idx,      setIdx]      = useState(0)
  const [lives,    setLives]    = useState(LIVES_START)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [wrong,    setWrong]    = useState(0)
  const [over,     setOver]     = useState(null) // null | 'died' | 'finished'
  const [saving,   setSaving]   = useState(false)

  // Incrementing this key remounts the HeartIcon, restarting the CSS animation
  const [heartKey, setHeartKey] = useState(0)

  // Speed round: per-question 5s timer. timerKey remounts the bar so the
  // CSS animation restarts on every new question.
  const [timerKey, setTimerKey] = useState(0)
  const timeoutRef = useRef(null)

  const q = batch[idx]
  const isCorrect = selected === q?.answer

  // Emil: animate transform not width — scaleX from origin-left
  const progressScale = (idx + (revealed ? 1 : 0)) / TOTAL

  function handleWrongChoice() {
    setWrong(w => w + 1)
    setLives(l => l - 1)
    setHeartKey(k => k + 1)
  }

  function handleCheck(forcedChoice) {
    if (revealed) return
    const choice = forcedChoice !== undefined ? forcedChoice : selected
    if (choice === null || choice === undefined) return

    setRevealed(true)
    if (choice !== q.answer) handleWrongChoice()
  }

  // Speed round: auto-expire the question if no answer was chosen in time —
  // counts as a wrong answer, same as picking the wrong card.
  useEffect(() => {
    if (!isSpeedRound || over || revealed) return
    timeoutRef.current = setTimeout(() => {
      handleCheck(null) // null never matches q.answer -> counts as wrong
    }, SPEED_ROUND_MS)
    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, isSpeedRound, over, revealed])

  async function finalizeAttempt(result) {
    setSaving(true)
    const correct = TOTAL - wrong
    let coinsDelta = 0
    let newBalance = coinBalance

    if (result === 'passed') {
      newBalance = applyPayout(coinBalance)
      coinsDelta = STAGE_PAYOUT
    }
    // 'died' and 'retry' carry no further coin change here — the entry fee
    // was already charged when the attempt started (handled in Map.jsx).

    try {
      if (kidId) {
        const attemptId = await logAttempt(kidId, {
          operation, table, stage,
          questionsSeen: idx + 1,
          correctCount: correct,
          wrongCount: wrong,
          livesUsed: LIVES_START - lives,
          result,
          coinsDelta,
        })

        if (coinsDelta !== 0) {
          await setCoinBalance(kidId, newBalance)
          await logCoinTransaction(kidId, {
            attemptId,
            amount: coinsDelta,
            reason: 'stage_pass',
            balanceAfter: newBalance,
          })
          onBalanceChange?.(newBalance)
        }

        if (result === 'passed') {
          const next = nextStep(operation, table, stage)
          if (next) await updateProgress(kidId, next)
        }
      }
    } catch (err) {
      console.error('Failed to save attempt (gameplay continues regardless):', err)
    } finally {
      setSaving(false)
    }
  }

  function handleContinue() {
    if (lives === 0) {
      setOver('died')
      finalizeAttempt('died')
      return
    }
    if (idx === TOTAL - 1) {
      const correct = TOTAL - wrong
      const pass = correct >= 8
      setOver('finished')
      finalizeAttempt(pass ? 'passed' : 'retry')
      return
    }
    setIdx(i => i + 1)
    setSelected(null)
    setRevealed(false)
    setTimerKey(k => k + 1)
  }

  // ── Game over screens ──────────────────────────────────────────

  if (over === 'died') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white px-6 gap-6 max-w-sm mx-auto">
        <span className="text-8xl" role="img" aria-label="skull">💀</span>
        <div className="text-center">
          <h2 className="font-display font-bold text-3xl text-gray-900 mb-2">Out of lives!</h2>
          <p className="font-body text-gray-400 text-sm">You ran out before finishing. Try again any time.</p>
        </div>
        {onExit && (
          <div className="w-full mt-2">
            <button
              onClick={onExit}
              disabled={saving}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest"
            >
              {saving ? 'SAVING…' : 'EXIT'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (over === 'finished') {
    const correct = TOTAL - wrong
    const pass = correct >= 8
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white px-6 gap-6 max-w-sm mx-auto">
        <span className="text-8xl" role="img" aria-label={pass ? 'star' : 'thumbs up'}>
          {pass ? '⭐' : '👍'}
        </span>
        <div className="text-center">
          <h2 className="font-display font-bold text-3xl text-gray-900 mb-2">
            {pass ? 'You passed!' : 'Not quite!'}
          </h2>
          <p className="font-body text-gray-400">{correct} out of {TOTAL} correct</p>
          {pass && (
            <div className="flex items-center justify-center gap-1.5 mt-3 font-body font-bold text-base text-amber-600">
              <CoinIcon /> +{STAGE_PAYOUT}
            </div>
          )}
        </div>
        {onExit && (
          <div className="w-full mt-2">
            <button
              onClick={onExit}
              disabled={saving}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest"
            >
              {saving ? 'SAVING…' : 'CONTINUE'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Main practice screen ───────────────────────────────────────

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-white max-w-sm mx-auto">

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-5 pb-3">
        <button
          onClick={onExit}
          className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400
                     transition-colors duration-150 active:bg-gray-100"
          aria-label="Exit practice"
        >
          <XIcon />
        </button>

        {/* Progress bar — chunky h-5, scaleX GPU animation */}
        <div
          className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden"
          role="progressbar"
          aria-valuenow={idx}
          aria-valuemax={TOTAL}
        >
          <div
            className="h-full rounded-full origin-left"
            style={{
              backgroundColor: '#58cc02',
              transform: `scaleX(${progressScale})`,
              transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        {/* Lives — pill badge. HeartIcon remounts on heartKey, restarting anim-heart-pulse */}
        <div className="flex items-center gap-1.5 bg-red-50 rounded-full px-3 py-2 border border-red-100 min-w-[52px] justify-center">
          <HeartIcon key={heartKey} className={heartKey > 0 ? 'anim-heart-pulse' : ''} />
          <span className="font-body font-bold text-base text-red-500 leading-none tabular-nums">
            {lives}
          </span>
        </div>
      </div>

      {/* Stage label + speed-round timer */}
      <div className="flex-shrink-0 px-5 flex items-center justify-between">
        <p className="font-body font-bold text-xs tracking-widest uppercase" style={{ color: theme.colors.dark }}>
          {theme.era} · {stageLabel(stage)}
        </p>
        {isSpeedRound && (
          <p className="font-body font-bold text-xs text-gray-400">5s</p>
        )}
      </div>

      {isSpeedRound && (
        <div className="flex-shrink-0 mx-5 mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            key={timerKey}
            className="h-full bg-red-400 rounded-full anim-speed-countdown"
            style={{ animationDuration: `${SPEED_ROUND_MS}ms` }}
          />
        </div>
      )}

      {/* Question */}
      <div className={`flex-shrink-0 px-6 pt-5 pb-2 ${isWordProblem ? '' : 'flex items-center justify-center'}`}>
        <p className={
          isWordProblem
            ? 'text-xl font-body font-semibold text-gray-900 text-center leading-snug max-w-[34ch] mx-auto'
            : 'text-4xl font-display font-extrabold text-gray-900 text-center leading-tight'
        }>
          {q.text}
        </p>
      </div>

      {/* Answer grid */}
      <div className="flex-1 flex flex-col justify-center px-4 gap-3">
        <div className="grid grid-cols-2 gap-3">
          {q.choices.map(choice => (
            <button
              key={choice}
              disabled={revealed}
              onClick={() => !revealed && setSelected(choice)}
              aria-pressed={selected === choice}
              className={`${cardClass(choice, selected, revealed, q.answer)} ${cardAnimClass(choice, selected, revealed, q.answer)}`}
              style={!revealed && selected === choice ? { '--card-shadow': '#22c55e' } : {}}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom action */}
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
              <span className="font-body font-bold text-base">
                {isCorrect ? 'Correct!' : `Answer: ${q.answer}`}
              </span>
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
  )
}
