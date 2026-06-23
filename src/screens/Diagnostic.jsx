import { useState, useMemo } from 'react'
import { generateDiagnostic } from '../lib/problems'
import { updateProgress } from '../lib/kidData'
import { OPERATIONS } from '../lib/progression'

const SESSION_TOTAL  = 20
const PASS_THRESHOLD = 16   // 80% of 20
const LIVES_START    = 4

// ── Icons ─────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  )
}

function HeartIcon({ filled = true }) {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20"
      fill={filled ? '#ef4444' : '#fecaca'}
      aria-hidden="true"
    >
      <path d="M11 18.5S1 12.3 1 6.5a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 5.8-10 12-10 12z" />
    </svg>
  )
}

// ── Choice card helpers ────────────────────────────────────────────────────

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

// ── End screens ───────────────────────────────────────────────────────────

function DiedScreen({ onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <div className="h-screen md:h-auto md:min-h-[560px] md:my-8 md:rounded-3xl md:shadow-xl w-full max-w-sm md:max-w-md flex flex-col items-center justify-center bg-white px-8 gap-6">
        <span className="text-8xl select-none">💔</span>
        <div className="flex gap-2">
          {Array.from({ length: LIVES_START }).map((_, i) => (
            <HeartIcon key={i} filled={false} />
          ))}
        </div>
        <div className="text-center">
          <h2 className="font-display font-bold text-3xl text-gray-900 mb-2">Out of lives!</h2>
          <p className="font-body text-gray-400 text-sm leading-relaxed">
            No worries — you can retake the placement test for free.
          </p>
        </div>
        <button onClick={onRetry}
          className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest">
          TRY AGAIN
        </button>
      </div>
    </div>
  )
}

function ResultScreen({ passed, correct, claimedOperation, saving, onContinue }) {
  const opLabel = claimedOperation.charAt(0).toUpperCase() + claimedOperation.slice(1)
  const nextOp = OPERATIONS[OPERATIONS.indexOf(claimedOperation) + 1]
  const nextLabel = nextOp ? nextOp.charAt(0).toUpperCase() + nextOp.slice(1) : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <div className="h-screen md:h-auto md:min-h-[600px] md:my-8 md:rounded-3xl md:shadow-xl w-full max-w-sm md:max-w-md flex flex-col items-center justify-center bg-white px-8 gap-6">
        <span className="text-8xl select-none">{passed ? '🎉' : '💪'}</span>
        <div className="text-center">
          <h2 className="font-display font-bold text-3xl text-gray-900 mb-2">
            {passed ? 'You proved it!' : 'Not quite yet'}
          </h2>
          <p className="font-body text-gray-500 leading-relaxed">
            {passed
              ? `Amazing! You scored ${correct}/${SESSION_TOTAL}. ${nextLabel ? `Time to start ${nextLabel}!` : 'You know it all!'}`
              : `You scored ${correct}/${SESSION_TOTAL} on ${opLabel}. No worries — you'll start from the beginning and build a solid foundation!`}
          </p>
        </div>
        <button onClick={onContinue} disabled={saving}
          className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest">
          {saving ? 'SAVING…' : 'CONTINUE →'}
        </button>
      </div>
    </div>
  )
}

// ── Main Diagnostic component ─────────────────────────────────────────────

export default function Diagnostic({ kidId, claimedOperation, onPass, onFail }) {
  const questions = useMemo(
    () => generateDiagnostic(claimedOperation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [claimedOperation]
  )

  const SESSION_TOTAL = questions.length

  const [idx,      setIdx]      = useState(0)
  const [lives,    setLives]    = useState(LIVES_START)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [wrong,    setWrong]    = useState(0)
  const [over,     setOver]     = useState(null)
  const [passed,   setPassed]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [heartKey, setHeartKey] = useState(0)

  const q                = questions[idx]
  const isCorrect        = selected === q?.answer
  const isEquationChoice = q?.choiceType === 'equation'
  const progressScale    = (idx + (revealed ? 1 : 0)) / SESSION_TOTAL

  function handleCheck() {
    if (revealed || selected === null) return
    setRevealed(true)
    if (selected !== q.answer) {
      setWrong(w => w + 1)
      setLives(l => l - 1)
      setHeartKey(k => k + 1)
    }
  }

  function handleContinue() {
    if (lives === 0) { setOver('died'); return }
    if (idx === SESSION_TOTAL - 1) { finalize(); return }
    setIdx(i => i + 1)
    setSelected(null)
    setRevealed(false)
  }

  async function finalize() {
    const correct = SESSION_TOTAL - wrong
    const didPass = correct >= PASS_THRESHOLD
    setPassed(didPass)
    setOver('finished')

    if (didPass && kidId) {
      setSaving(true)
      try {
        // Pass = claimed chapter is done → start at the NEXT chapter
        // e.g. claimed addition → starts at subtraction/table1/batch1/learn
        const claimedIdx = OPERATIONS.indexOf(claimedOperation)
        const nextOp = OPERATIONS[claimedIdx + 1]
        if (nextOp) {
          await updateProgress(kidId, {
            operation: nextOp,
            table: 1,
            batch: 1,
            node: 'learn', // day 1 of new chapter shows welcome, cursor at learn
          })
        }
        // If claimed division (last op), nothing to advance to — stays at division
      } catch (err) {
        console.error('Diagnostic: failed to set progress cursor:', err)
      } finally {
        setSaving(false)
      }
    }
  }

  // ── End screens ─────────────────────────────────────────────────────────

  if (over === 'died') {
    return <DiedScreen onRetry={() => {
      setIdx(0); setLives(LIVES_START); setSelected(null); setRevealed(false)
      setWrong(0); setOver(null); setHeartKey(0)
    }} />
  }

  if (over === 'finished') {
    const correct = SESSION_TOTAL - wrong
    return (
      <ResultScreen
        passed={passed}
        correct={correct}
        claimedOperation={claimedOperation}
        saving={saving}
        onContinue={() => passed ? onPass() : onFail()}
      />
    )
  }

  // ── Game screen ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <div className="h-screen md:h-auto md:min-h-[700px] md:my-8 md:rounded-3xl md:shadow-xl md:border md:border-gray-100 overflow-hidden flex flex-col bg-white w-full max-w-sm md:max-w-md">

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-5 pb-3">
          <div className="w-11 h-11 flex items-center justify-center rounded-full text-gray-200">
            <XIcon />
          </div>

          <div className="flex-1 h-5 rounded-full bg-gray-100 overflow-hidden"
            role="progressbar" aria-valuenow={idx} aria-valuemax={SESSION_TOTAL}>
            <div className="h-full rounded-full origin-left"
              style={{
                backgroundColor: '#58cc02',
                transform: `scaleX(${progressScale})`,
                transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          <div className="flex items-center gap-1 px-2 py-2">
            {Array.from({ length: LIVES_START }).map((_, i) => (
              <HeartIcon key={i} filled={i < lives}
                className={lives > 0 && i === lives - 1 && heartKey > 0 ? 'anim-heart-pulse' : ''}
              />
            ))}
          </div>
        </div>

        {/* ── Label ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5">
          <p className="font-body font-bold text-xs tracking-widest uppercase text-gray-400">
            Placement Test · {idx + 1} of {SESSION_TOTAL}
          </p>
        </div>

        {/* ── Question text ─────────────────────────────────────────── */}
        <div className={`flex-shrink-0 px-6 pt-6 pb-2 ${q.text.endsWith('= ?') ? 'flex items-center justify-center' : ''}`}>
          <p className={
            q.text.endsWith('= ?')
              ? 'text-5xl font-display font-extrabold text-gray-900 text-center leading-tight tracking-tight'
              : 'text-xl font-body font-semibold text-gray-900 text-center leading-snug max-w-[34ch] mx-auto'
          }>
            {q.text}
          </p>
        </div>

        {/* ── Answer choices ────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center px-4 gap-3">
          {isEquationChoice ? (
            <div className="flex flex-col gap-3">
              {q.choices.map(choice => (
                <button key={choice} disabled={revealed}
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
            <div className="grid grid-cols-2 gap-3">
              {q.choices.map(choice => (
                <button key={choice} disabled={revealed}
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

        {/* ── Bottom action ─────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 pb-8 pt-3">
          {!revealed ? (
            <button disabled={selected === null} onClick={handleCheck}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest">
              CHECK
            </button>
          ) : (
            <div className={`rounded-2xl overflow-hidden border-2 ${
              isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className={`flex items-center gap-3 px-4 py-4 ${isCorrect ? 'text-green-700' : 'text-red-500'}`}>
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
              <button onClick={handleContinue}
                className={`w-full py-4 font-body font-bold text-xl tracking-widest ${
                  isCorrect ? 'btn-duo' : 'btn-duo-red'
                }`}>
                CONTINUE
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
