import { useState, useMemo, useEffect, useRef } from 'react'
import { generateDiagnostic } from '../lib/problems'
import { updateProgress } from '../lib/kidData'
import { OPERATIONS } from '../lib/progression'

const SESSION_TOTAL  = 20
const PASS_THRESHOLD = 16
const LIVES_START    = 4

function FireParticles({ streakKey, streak }) {
  if (streak < 3) return null
  const count = Math.min(streak, 12)
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" key={streakKey}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', bottom: -40,
          left: `${10 + Math.random() * 80}%`,
          fontSize: streak >= 7 ? 28 + Math.random() * 16 : 20 + Math.random() * 12,
          animation: `fire-rise ${1.2 + Math.random() * 0.6}s ${Math.random() * 0.4}s ease-out both`,
        }}>🔥</div>
      ))}
    </div>
  )
}

function ConfettiBlast({ active }) {
  if (!active) return null
  const colors = ['#58cc02','#1CB0F6','#FF9600','#FF4B4B','#CE82FF','#FFD900']
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', bottom: -20,
          left: `${Math.random() * 100}%`,
          width: 8 + Math.random() * 10,
          height: 8 + Math.random() * 10,
          borderRadius: i % 3 === 0 ? '50%' : 2,
          backgroundColor: colors[i % colors.length],
          animation: `confetti-rise ${1.0 + Math.random() * 0.8}s ${Math.random() * 0.5}s cubic-bezier(0.2,0.8,0.3,1) both`,
        }} />
      ))}
    </div>
  )
}

function StreakBadge({ streak }) {
  if (streak < 2) return null
  const hot = streak >= 7, warm = streak >= 4
  return (
    <div key={streak} className="flex items-center gap-1 px-2.5 py-1 rounded-full anim-correct"
      style={{ backgroundColor: hot ? '#FF4500' : warm ? '#FF9600' : '#FFB700',
               boxShadow: hot ? '0 0 12px rgba(255,69,0,0.6)' : 'none' }}>
      <span style={{ fontSize: hot ? 16 : 14 }}>🔥</span>
      <span className="font-display font-extrabold text-white" style={{ fontSize: hot ? 15 : 13 }}>{streak}</span>
    </div>
  )
}

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

function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  function getVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || []
    const malePrefs = ['Daniel', 'David', 'Alex', 'Fred', 'Google UK English Male',
                       'Microsoft David', 'Microsoft Mark', 'Aaron', 'Arthur']
    for (const name of malePrefs) {
      const v = voices.find(v => v.name.includes(name))
      if (v) return v
    }
    return voices.find(v => v.lang?.startsWith('en')) || voices[0] || null
  }
  function speak(text) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.voice = getVoice()
    utt.rate = 0.9; utt.pitch = 0.95; utt.volume = 1
    utt.onstart = () => setSpeaking(true)
    utt.onend   = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }
  function stop() { window.speechSynthesis?.cancel(); setSpeaking(false) }
  useEffect(() => () => window.speechSynthesis?.cancel(), [])
  return { speak, stop, speaking }
}

function SpeakerIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={active ? 'currentColor' : 'none'} />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
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
  const [streak,   setStreak]   = useState(0)
  const [fireKey,  setFireKey]  = useState(0)
  const { speak, stop, speaking } = useSpeech()

  const q                = questions[idx]
  const isCorrect        = selected === q?.answer
  const isEquationChoice = q?.choiceType === 'equation'
  const progressScale    = (idx + (revealed ? 1 : 0)) / SESSION_TOTAL

  function handleCheck() {
    if (revealed || selected === null) return
    setRevealed(true)
    if (selected === q.answer) {
      const newStreak = streak + 1
      setStreak(newStreak)
      if (newStreak >= 3) setFireKey(k => k + 1)
    } else {
      setStreak(0)
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
      setWrong(0); setOver(null); setHeartKey(0); setStreak(0); setFireKey(0)
    }} />
  }

  if (over === 'finished') {
    const correct = SESSION_TOTAL - wrong
    return (
      <>
        <ConfettiBlast active={passed} />
        <ResultScreen
          passed={passed}
          correct={correct}
          claimedOperation={claimedOperation}
          saving={saving}
          onContinue={() => passed ? onPass() : onFail()}
        />
      </>
    )
  }

  // ── Game screen ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-gray-50">
      <FireParticles streakKey={fireKey} streak={streak} />
      <div className="h-screen md:h-auto md:min-h-[700px] md:my-8 md:rounded-3xl md:shadow-xl md:border md:border-gray-100 overflow-hidden flex flex-col bg-white w-full max-w-sm md:max-w-md">

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-5 pb-3">
          <div className="w-11 h-11 flex items-center justify-center rounded-full text-gray-200">
            <XIcon />
          </div>

          <div className="flex-1 h-5 rounded-full overflow-hidden"
            style={{ backgroundColor: streak >= 3 ? '#FFE0B2' : '#F3F4F6', transition: 'background-color 0.4s' }}
            role="progressbar" aria-valuenow={idx} aria-valuemax={SESSION_TOTAL}>
            <div className="h-full rounded-full origin-left"
              style={{
                backgroundColor: streak >= 7 ? '#FF4500' : streak >= 4 ? '#FF9600' : '#58cc02',
                transform: `scaleX(${progressScale})`,
                transition: 'transform 350ms cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s',
                boxShadow: streak >= 4 ? `0 0 8px ${streak >= 7 ? '#FF4500' : '#FF9600'}` : 'none',
              }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <StreakBadge streak={streak} />
            <div className="flex items-center gap-1">
              {Array.from({ length: LIVES_START }).map((_, i) => (
                <HeartIcon key={i} filled={i < lives}
                  className={lives > 0 && i === lives - 1 && heartKey > 0 ? 'anim-heart-pulse' : ''}
                />
              ))}
            </div>
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
          <div className="relative">
            <p className={
              q.text.endsWith('= ?')
                ? 'text-5xl font-display font-extrabold text-gray-900 text-center leading-tight tracking-tight'
                : 'text-xl font-body font-semibold text-gray-900 text-center leading-snug max-w-[34ch] mx-auto'
            }>
              {q.text}
            </p>
            <button
              onClick={() => speaking ? stop() : speak(q.text)}
              className="absolute -right-2 -top-2 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{
                backgroundColor: speaking ? '#1CB0F6' : '#F3F4F6',
                color: speaking ? '#FFFFFF' : '#9CA3AF',
                boxShadow: speaking ? '0 0 8px rgba(28,176,246,0.5)' : 'none',
              }}
              aria-label={speaking ? 'Stop reading' : 'Read question aloud'}
            >
              <SpeakerIcon active={speaking} />
            </button>
          </div>
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
