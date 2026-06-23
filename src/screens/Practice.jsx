import { useState, useMemo, useEffect, useRef } from 'react'
import { generateBatch } from '../lib/problems'
import { themeFor } from '../lib/eraTheme'
import { nodeLabel, nextStep, OPERATIONS } from '../lib/progression'
import { applyPayout, payoutForNode, passThresholdFor } from '../lib/economy'
import FlowerJump from '../components/FlowerJump'
import {
  updateProgress,
  setCoinBalance,
  logCoinTransaction,
  logAttempt,
} from '../lib/kidData'

const TOTAL       = 12
const LIVES_START = 4
const TIMED_MS    = 5000

const TIMED_NODES        = new Set(['speed'])
const WORD_PROBLEM_NODES = new Set(['practice', 'real_life'])

// ── Icons ─────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  )
}

function HeartIcon({ filled = true, className = '', style }) {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20"
      fill={filled ? '#ef4444' : '#fecaca'}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M11 18.5S1 12.3 1 6.5a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 5.8-10 12-10 12z" />
    </svg>
  )
}

function CoinIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#FFB700" />
      <circle cx="10" cy="10" r="7" fill="#FFD700" />
      <path d="M10 5.5l1.1 3.4h3.6l-2.9 2.1 1.1 3.4L10 12.4 6.9 14.4l1.1-3.4-2.9-2.1h3.6z"
        fill="#CC7700" />
    </svg>
  )
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

function DiedScreen({ saving, onExit }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <div className="h-screen md:h-auto md:min-h-[560px] md:my-8 md:rounded-3xl md:shadow-xl w-full max-w-sm md:max-w-md flex flex-col items-center justify-center bg-white px-8 gap-6">
        <div className="flex gap-3" aria-label="No lives left">
          {Array.from({ length: LIVES_START }).map((_, i) => (
            <HeartIcon key={i} filled={false} />
          ))}
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-3xl text-gray-900 mb-2">Out of lives</h2>
          <p className="font-body text-gray-400 text-sm leading-relaxed">
            That was a tough one. You can try again any time — no worries.
          </p>
        </div>
        {onExit && (
          <button
            onClick={onExit}
            disabled={saving}
            className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest"
          >
            {saving ? 'SAVING…' : 'GOT IT'}
          </button>
        )}
      </div>
    </div>
  )
}

function FinishedScreen({ passed, correct, payout, isReview, saving, onExit }) {
  const coinDisplayed = useCoinTick(payout, passed)

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <div className="h-screen md:h-auto md:min-h-[600px] md:my-8 md:rounded-3xl md:shadow-xl w-full max-w-sm md:max-w-md flex flex-col items-center justify-center bg-white px-8 gap-6">
        {passed ? (
          <FlowerJump size={200} />
        ) : (
          <span className="text-7xl select-none" role="img" aria-label="thumbs up">👍</span>
        )}

        <div className="text-center">
          <h2 className="font-display font-bold text-3xl text-gray-900 mb-2">
            {passed
              ? (isReview ? 'Review complete!' : 'You passed!')
              : 'Not quite!'}
          </h2>
          <p className="font-body text-gray-400">
            {correct} out of {TOTAL} correct
          </p>
          {!passed && (
            <p className="font-body text-gray-400 text-sm mt-1">
              Retry is free — give it another go!
            </p>
          )}
          {passed && (
            <div className="flex items-center justify-center gap-2 mt-4 font-body font-bold text-2xl text-amber-500">
              <CoinIcon size={26} />
              <span className="tabular-nums">+{coinDisplayed}</span>
            </div>
          )}
        </div>

        {onExit && (
          <button
            onClick={onExit}
            disabled={saving}
            className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest"
          >
            {saving ? 'SAVING…' : 'CONTINUE'}
          </button>
        )}
      </div>
    </div>
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
  reviewPool,
  unlockBatch,
  placementClaim = null,
  onExit,
  onBalanceChange,
}) {
  const theme         = themeFor(operation)
  const isTimed       = TIMED_NODES.has(node)
  const isWordProblem = WORD_PROBLEM_NODES.has(node)
  const isReview      = node === 'review'
  const payout        = payoutForNode(node)
  const passThreshold = passThresholdFor(operation, placementClaim, OPERATIONS)

  const questions = useMemo(
    () => generateBatch(operation, table, batchNum, node, { unlockBatch, reviewPool }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [operation, table, batchNum, node]
  )

  const [idx,      setIdx]      = useState(0)
  const [lives,    setLives]    = useState(LIVES_START)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [wrong,    setWrong]    = useState(0)
  const [over,     setOver]     = useState(null) // null | 'died' | 'finished'
  const [saving,   setSaving]   = useState(false)
  const [heartKey, setHeartKey] = useState(0)
  const [timerKey, setTimerKey] = useState(0)
  const timeoutRef = useRef(null)

  const q         = questions[idx]
  const isCorrect = selected === q?.answer
  const isEquationChoice = q?.choiceType === 'equation'

  const progressScale = (idx + (revealed ? 1 : 0)) / TOTAL

  // ── Answer handling ─────────────────────────────────────────────────────

  function handleCheck(forcedChoice) {
    if (revealed) return
    const choice = forcedChoice !== undefined ? forcedChoice : selected
    if (choice === null || choice === undefined) return

    setRevealed(true)
    if (choice !== q.answer) {
      setWrong(w => w + 1)
      setLives(l => l - 1)
      setHeartKey(k => k + 1)
    }
  }

  // Speed node: auto-expire → count as wrong
  useEffect(() => {
    if (!isTimed || over || revealed) return
    timeoutRef.current = setTimeout(() => {
      handleCheck(null) // null never equals q.answer → wrong
    }, TIMED_MS)
    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, isTimed, over, revealed])

  function handleContinue() {
    if (lives === 0) {
      setOver('died')
      finalizeAttempt('died')
      return
    }
    if (idx === TOTAL - 1) {
      const correct = TOTAL - wrong
      setOver('finished')
      finalizeAttempt(correct >= passThreshold ? 'passed' : 'retry')
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
    const correct    = TOTAL - wrong
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
          if (next) await updateProgress(kidId, next)
        }
      }
    } catch (err) {
      console.error('Failed to save attempt (gameplay continues regardless):', err)
    } finally {
      setSaving(false)
    }
  }

  // ── End screens ─────────────────────────────────────────────────────────

  if (over === 'died') {
    return <DiedScreen saving={saving} onExit={onExit} />
  }

  if (over === 'finished') {
    const correct = TOTAL - wrong
    const passed  = correct >= passThreshold
    return (
      <FinishedScreen
        passed={passed}
        correct={correct}
        payout={payout}
        isReview={isReview}
        saving={saving}
        onExit={onExit}
      />
    )
  }

  // ── Game screen ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <div className="h-screen md:h-auto md:min-h-[700px] md:my-8 md:rounded-3xl md:shadow-xl md:border md:border-gray-100 overflow-hidden flex flex-col bg-white w-full max-w-sm md:max-w-md">

        {/* ── Top bar ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-5 pb-3">
          <button
            onClick={onExit}
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-400 transition-colors duration-150 active:bg-gray-100"
            aria-label="Exit practice"
          >
            <XIcon />
          </button>

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

          {/* Lives row — hearts light up and pulse when one is lost */}
          <div className="flex items-center gap-1 px-2 py-2">
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

        {/* ── Node label + speed indicator ────────────────────────── */}
        <div className="flex-shrink-0 px-5 flex items-center justify-between">
          <p className="font-body font-bold text-xs tracking-widest uppercase" style={{ color: theme.colors.dark }}>
            {theme.era} · Table {table} · {nodeLabel(node)}
          </p>
          {isTimed && (
            <p className="font-body font-bold text-xs text-gray-400">5s</p>
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
        <div className={`flex-shrink-0 px-6 pt-6 pb-2 ${isWordProblem ? '' : 'flex items-center justify-center'}`}>
          <p className={
            isWordProblem
              ? 'text-xl font-body font-semibold text-gray-900 text-center leading-snug max-w-[34ch] mx-auto'
              : 'text-5xl font-display font-extrabold text-gray-900 text-center leading-tight tracking-tight'
          }>
            {q.text}
          </p>
        </div>

        {/* ── Answer choices ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center px-4 gap-3">
          {isEquationChoice ? (
            // Equation choices: single column, monospace-style, legible
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
          ) : (
            // Number choices: 2×2 grid, large numbers
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
