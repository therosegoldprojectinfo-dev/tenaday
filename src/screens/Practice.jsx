import { useState, useMemo } from 'react'
import { generateBatch } from '../lib/problems'

const TOTAL       = 10
const LIVES_START = 4

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

function cardClass(choice, selected, revealed, answer) {
  const base = [
    'rounded-2xl border-2 font-display font-bold text-3xl card-answer',
    'flex items-center justify-center h-32 w-full select-none',
  ].join(' ')

  if (!revealed) {
    return selected === choice
      ? `${base} border-stoneage-primary bg-stoneage-primary/10 text-stoneage-primary`
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

export default function Practice({ operation = 'addition', table = 1, onExit }) {
  const batch = useMemo(() => generateBatch(operation, table), [operation, table])

  const [idx,     setIdx]     = useState(0)
  const [lives,   setLives]   = useState(LIVES_START)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [wrong,   setWrong]   = useState(0)
  const [over,    setOver]    = useState(null)

  // Incrementing this key remounts the HeartIcon, restarting the CSS animation
  const [heartKey, setHeartKey] = useState(0)

  const q         = batch[idx]
  const isCorrect = selected === q?.answer

  // Emil: animate transform not width — scaleX from origin-left
  const progressScale = (idx + (revealed ? 1 : 0)) / TOTAL

  function handleCheck() {
    if (selected === null || revealed) return
    const wasWrong = selected !== q.answer
    setRevealed(true)
    if (wasWrong) {
      setWrong(w => w + 1)
      setLives(l => l - 1)
      setHeartKey(k => k + 1)
    }
  }

  function handleContinue() {
    if (lives === 0) {
      console.log('died')
      setOver('died')
      return
    }
    if (idx === TOTAL - 1) {
      const correct = TOTAL - wrong
      const pass    = correct >= 8
      console.log(`Finished: ${correct}/${TOTAL} — ${pass ? 'PASS' : 'did not pass'}`)
      setOver('finished')
      return
    }
    setIdx(i  => i + 1)
    setSelected(null)
    setRevealed(false)
  }

  // ── Game over screens ──────────────────────────────────────────

  if (over === 'died') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white px-6 gap-6 max-w-sm mx-auto">
        <span className="text-8xl" role="img" aria-label="skull">💀</span>
        <div className="text-center">
          <h2 className="font-display font-bold text-3xl text-gray-900 mb-2">Out of lives!</h2>
          <p className="font-body text-gray-400 text-sm">You ran out before finishing.</p>
        </div>
        {onExit && (
          <div className="w-full mt-2">
            <button
              onClick={onExit}
              className="btn-era w-full py-4 rounded-2xl bg-stoneage-primary font-body font-bold text-xl text-ink tracking-widest"
              style={{ '--btn-shadow': '#CC7700' }}
            >
              EXIT
            </button>
          </div>
        )}
      </div>
    )
  }

  if (over === 'finished') {
    const correct = TOTAL - wrong
    const pass    = correct >= 8
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
        </div>
        {onExit && (
          <div className="w-full mt-2">
            <button
              onClick={onExit}
              className="btn-era w-full py-4 rounded-2xl bg-stoneage-primary font-body font-bold text-xl text-ink tracking-widest"
              style={{ '--btn-shadow': '#CC7700' }}
            >
              EXIT
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
            className="h-full bg-stoneage-primary rounded-full origin-left"
            style={{
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

      {/* Question */}
      <div className="flex-shrink-0 px-6 pt-6 pb-2">
        <p className="text-4xl font-display font-extrabold text-gray-900 text-center leading-tight">
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
              style={!revealed && selected === choice ? { '--card-shadow': '#CC7700' } : {}}
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
            onClick={handleCheck}
            className={[
              'w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest',
              selected !== null
                ? 'btn-era bg-stoneage-primary text-ink'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed',
            ].join(' ')}
            style={selected !== null ? { '--btn-shadow': '#CC7700' } : {}}
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
              className={[
                'btn-era w-full py-4 font-body font-bold text-xl text-white tracking-widest',
                isCorrect ? 'bg-green-500' : 'bg-red-400',
              ].join(' ')}
              style={{ '--btn-shadow': isCorrect ? '#15803d' : '#b91c1c' }}
            >
              CONTINUE
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
