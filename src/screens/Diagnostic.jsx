import { useState, useMemo, useEffect, useRef } from 'react'
import { generateDiagnostic } from '../lib/problems'
import { updateProgress } from '../lib/kidData'
import { OPERATIONS } from '../lib/progression'
import { generateHint } from '../lib/hints'

const SESSION_TOTAL  = 25
const PASS_THRESHOLD = 20

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
    <svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l12 12M16 4L4 16" />
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
  if (choice === selected) return 'border-amber-300 bg-amber-50 text-amber-600'
  return 'border-gray-100 bg-white text-gray-300'
}

function cardAnimClass(choice, selected, revealed, answer) {
  if (!revealed) return ''
  if (choice === answer)   return 'anim-correct'

  return ''
}

// ── End screens ───────────────────────────────────────────────────────────


function ResultScreen({ passed, correct, claimedOperation, selectedTables, saving, onContinue }) {
  const opLabel  = claimedOperation.charAt(0).toUpperCase() + claimedOperation.slice(1)
  const maxTable = selectedTables && selectedTables.length > 0 ? Math.max(...selectedTables) : 12
  const nextTable = maxTable + 1
  const nextOp   = OPERATIONS[OPERATIONS.indexOf(claimedOperation) + 1]

  let successMessage
  if (nextTable <= 12) {
    successMessage = `Amazing! You know ${opLabel} up to table ${maxTable}. Let's continue from table ${nextTable}!`
  } else if (nextOp) {
    successMessage = `You know all of ${opLabel}! Time to start ${nextOp.charAt(0).toUpperCase() + nextOp.slice(1)}!`
  } else {
    successMessage = 'Incredible — you know it all! 🏆'
  }

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
              ? successMessage
              : `No worries — you'll start from the beginning and build a solid foundation!`}
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
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={active ? 'currentColor' : 'none'} />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

// ── Numio wrong-answer popup (same as Practice) ───────────────────────────

function useTypewriterD(text, active, speed = 70) {
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

function DiagnosticNumioPopup({ visible, hint, answer, isSecondWrong, onRetry, onGiveUp }) {
  const [phase, setPhase] = useState(0)

  const messages = isSecondWrong
    ? ['Almost my friend! 🌸', `The answer was ${answer} — remember it!`, 'Keep going! 💪']
    : ['Not quite my friend... 🌸', hint, 'Retry my friend! You got this! 💪']

  const displayed = useTypewriterD(messages[phase], visible)

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
      background: 'rgba(255,255,255,0.88)',
    }}>
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
        }}>{displayed}</p>

        {phase === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {!isSecondWrong ? (
              <button onClick={onRetry} style={{
                width: '100%', border: 'none', cursor: 'pointer',
                padding: '14px 0', borderRadius: 14,
                background: '#58cc02', boxShadow: '0 4px 0 #46a302',
                color: '#fff', fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 800, fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>RETRY 🔄</button>
            ) : (
              <button onClick={onGiveUp} style={{
                width: '100%', border: 'none', cursor: 'pointer',
                padding: '14px 0', borderRadius: 14,
                background: '#FF9600', boxShadow: '0 4px 0 #c97700',
                color: '#fff', fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 800, fontSize: 16, letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>CONTINUE →</button>
            )}
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: -14, left: '50%',
          transform: 'translateX(-50%)', width: 0, height: 0,
          borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
          borderTop: '14px solid white',
        }} />
      </div>

      <div style={{ animation: 'mascot-float 1.8s ease-in-out infinite' }}>
        <img src="/onboarding-mascot.png" alt="Numio" style={{ width: 130, height: 'auto', display: 'block' }} />
      </div>

      <style>{`
        @keyframes mascot-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}

// ── Quit confirmation popup — specific to leaving the diagnostic ──────────

function DiagnosticQuitPopup({ visible, onLeave, onStay }) {
  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end',
      background: 'rgba(255,255,255,0.92)',
    }}>
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
          Why are you leaving? 🌸<br />
          Do you want to pick a different level instead?
        </p>
        <p style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 600, fontSize: 13,
          color: '#9ca3af', textAlign: 'center',
          lineHeight: 1.4, margin: 0,
        }}>
          If you quit this test, you'll start at the very beginning of Numio's program.
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
            CONTINUE TEST 💪
          </button>
          <button onClick={onLeave} style={{
            width: '100%', border: 'none', cursor: 'pointer',
            padding: '12px 0', borderRadius: 14,
            background: 'none', color: '#9ca3af',
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 700, fontSize: 14,
          }}>
            Yes, start from the beginning
          </button>
        </div>

        <div style={{
          position: 'absolute', bottom: -14, left: '50%',
          transform: 'translateX(-50%)', width: 0, height: 0,
          borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
          borderTop: '14px solid white',
        }} />
      </div>

      <div style={{ animation: 'mascot-float 1.8s ease-in-out infinite' }}>
        <img src="/onboarding-mascot.png" alt="Numio"
          style={{ width: 130, height: 'auto', display: 'block' }} />
      </div>
    </div>
  )
}

// ── Main Diagnostic component ─────────────────────────────────────────────

export default function Diagnostic({ kidId, claimedOperation, selectedTables, onPass, onFail }) {
  const questions = useMemo(
    () => generateDiagnostic(claimedOperation, selectedTables || []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [claimedOperation]
  )

  const SESSION_TOTAL = questions.length

  const [idx,          setIdx]          = useState(0)
  const [selected,     setSelected]     = useState(null)
  const [revealed,     setRevealed]     = useState(false)
  const [wrong,        setWrong]        = useState(0)
  const [over,         setOver]         = useState(null)
  const [passed,       setPassed]       = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [streak,       setStreak]       = useState(0)
  const [fireKey,      setFireKey]      = useState(0)
  const [showPopup,    setShowPopup]    = useState(false)
  const [showQuitPopup, setShowQuitPopup] = useState(false)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const { speak, stop, speaking } = useSpeech()

  const q                = questions[idx]
  const isTyped          = q?.isTyped === true
  const isTimed          = q?.isTimed === true
  const isCorrect        = isTyped
    ? String(selected ?? '').trim() === String(q?.answer)
    : selected === q?.answer
  const isTrueFalse      = q?.choiceType === 'truefalse'
  const progressScale    = (idx + (revealed ? 1 : 0)) / SESSION_TOTAL
  const [timerKey, setTimerKey] = useState(0)
  const timeoutRef = useRef(null)

  // Build pedagogical hint based on operation
  function buildHint(wrongAnswer) {
    if (!q) return ''
    if (q.hintMeta) {
      return generateHint({ ...q.hintMeta, wrongAnswer })
    }
    return 'Take your time and try again! 💪'
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
    timeoutRef.current = setTimeout(handleTimerExpire, 10000)
    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, isTimed, over, revealed, showPopup])

  function handleCheck() {
    if (revealed || showPopup || selected === null || selected === undefined || selected === '') return
    const correct = isTyped
      ? String(selected).trim() === String(q.answer)
      : selected === q.answer
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

  function handleRetry() {
    setShowPopup(false)
    setSelected(null)
  }

  function handleGiveUp() {
    setShowPopup(false)
    setRevealed(true)
  }

  function handleContinue() {
    setWrongAttempts(0)
    if (idx === SESSION_TOTAL - 1) { finalize(); return }
    setIdx(i => i + 1)
    setSelected(null)
    setRevealed(false)
    setTimerKey(k => k + 1)
  }

  async function finalize() {
    const correct = SESSION_TOTAL - wrong
    const didPass = correct >= PASS_THRESHOLD
    setPassed(didPass)
    setOver('finished')

    if (didPass && kidId) {
      setSaving(true)
      try {
        // Pass = kid proved they know claimed tables
        // → start at the first table they did NOT claim within the same operation
        // → if they claimed all 12, move to next operation table 1
        const claimedIdx    = OPERATIONS.indexOf(claimedOperation)
        const maxTable      = selectedTables && selectedTables.length > 0
          ? Math.max(...selectedTables)
          : 12
        const nextTable     = maxTable + 1

        let nextProgress
        if (nextTable <= 12) {
          // Still within the same operation — start at the next unclaimed table
          nextProgress = {
            operation: claimedOperation,
            table: nextTable,
            batch: 1,
            node: 'welcome',
          }
        } else {
          // All 12 tables claimed for this operation → move to next operation
          const nextOp = OPERATIONS[claimedIdx + 1]
          if (nextOp) {
            nextProgress = {
              operation: nextOp,
              table: 1,
              batch: 1,
              node: 'welcome',
            }
          }
          // If division and all claimed → stay, nothing to advance to
        }

        if (nextProgress) {
          await updateProgress(kidId, nextProgress)
        }
      } catch (err) {
        console.error('Diagnostic: failed to set progress cursor:', err)
      } finally {
        setSaving(false)
      }
    }
  }

  // ── End screens ─────────────────────────────────────────────────────────

  if (over === 'finished') {
    const correct = SESSION_TOTAL - wrong
    return (
      <>
        <ConfettiBlast active={passed} />
        <ResultScreen
          passed={passed}
          correct={correct}
          claimedOperation={claimedOperation}
          selectedTables={selectedTables}
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

      {/* Quit confirmation popup */}
      <DiagnosticQuitPopup
        visible={showQuitPopup}
        onStay={() => setShowQuitPopup(false)}
        onLeave={() => { setShowQuitPopup(false); onFail() }}
      />

      {/* Numio wrong-answer popup */}
      <DiagnosticNumioPopup
        visible={showPopup}
        hint={buildHint(selected)}
        answer={q?.answer}
        isSecondWrong={wrongAttempts >= 2}
        onRetry={handleRetry}
        onGiveUp={handleGiveUp}
      />

      <div className="md:h-auto md:min-h-[700px] md:my-8 md:rounded-3xl md:shadow-xl md:border md:border-gray-100 overflow-hidden flex flex-col bg-white w-full max-w-sm md:max-w-md" style={{height:"100dvh"}}>

        {/* ── Top bar ───────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 pt-2 pb-1">
          <button onClick={() => { stop(); setShowQuitPopup(true) }}
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-300 transition-colors duration-150 active:bg-gray-100">
            <XIcon />
          </button>

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
          </div>
        </div>

        {/* ── Label ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5">
          <p className="font-body font-bold text-xs tracking-widest uppercase text-gray-400">
            Placement Test · {idx + 1} of {SESSION_TOTAL}
          </p>
        </div>

        {/* ── Question text ─────────────────────────────────────────── */}
        <div className={`flex-shrink-0 px-6 pt-3 pb-1 ${q.text.endsWith('= ?') ? 'flex items-center justify-center' : ''}`}>
          <p className={
            q.text.endsWith('= ?')
              ? 'text-4xl font-display font-extrabold text-gray-900 text-center leading-tight tracking-tight'
              : 'text-xl font-body font-semibold text-gray-900 text-center leading-snug max-w-[34ch] mx-auto'
          }>
            {q.text}
          </p>
        </div>

        {/* ── Read aloud button ─────────────────────────────────────── */}
        <div className="flex-shrink-0 flex justify-center py-1">
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

        {/* ── Timer bar ─────────────────────────────────────────────── */}
        {isTimed && (
          <div className="flex-shrink-0 mx-5 mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              key={timerKey}
              className="h-full bg-red-400 rounded-full anim-speed-countdown"
              style={{ animationDuration: '10000ms' }}
            />
          </div>
        )}

        {/* ── Answer choices ────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col justify-center px-4 gap-2 mt-1">
          {isTyped ? (
            <div className="flex flex-col items-center gap-4">
              <div className={[
                'w-40 h-20 rounded-2xl border-2 flex items-center justify-center',
                revealed
                  ? String(selected).trim() === String(q.answer)
                    ? 'border-green-400 bg-green-50'
                    : 'border-amber-300 bg-amber-50'
                  : selected !== null
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white',
              ].join(' ')}>
                <span className="font-display font-extrabold text-5xl text-gray-900">
                  {selected ?? '?'}
                </span>
              </div>
              {revealed && String(selected ?? '').trim() !== String(q.answer) && (
                <p className="font-body text-sm text-amber-600 font-semibold">
                  Answer: <span className="font-display font-bold text-lg">{q.answer}</span>
                </p>
              )}
              {!revealed && (
                <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                  {[1,2,3,4,5,6,7,8,9,null,0,'⌫'].map((key, ki) => (
                    <button
                      key={ki}
                      disabled={key === null}
                      onClick={() => {
                        if (key === null) return
                        if (key === '⌫') {
                          setSelected(s => {
                            const str = String(s ?? '')
                            return str.length <= 1 ? null : Number(str.slice(0, -1))
                          })
                        } else {
                          setSelected(s => {
                            const str = String(s ?? '').replace('null', '')
                            const next = str + String(key)
                            return next.length > 4 ? s : Number(next)
                          })
                        }
                      }}
                      className={[
                        'h-11 rounded-2xl font-display font-bold text-2xl',
                        'flex items-center justify-center select-none',
                        key === null
                          ? 'opacity-0 pointer-events-none'
                          : key === '⌫'
                            ? 'bg-red-50 text-red-400 border-2 border-red-100 active:bg-red-100'
                            : 'bg-gray-50 text-gray-800 border-2 border-gray-200 active:bg-gray-100',
                      ].join(' ')}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : isTrueFalse ? (
            <div className="flex gap-3">
              {q.choices.map(choice => (
                <button key={choice} disabled={revealed}
                  onClick={() => !revealed && setSelected(choice)}
                  aria-pressed={selected === choice}
                  className={[
                    'flex-1 rounded-2xl border-2 font-display font-bold text-2xl card-answer',
                    'flex items-center justify-center h-20 select-none',
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
            <div className="grid grid-cols-2 gap-2">
              {q.choices.map(choice => (
                <button key={choice} disabled={revealed}
                  onClick={() => !revealed && setSelected(choice)}
                  aria-pressed={selected === choice}
                  className={[
                    'rounded-2xl border-2 font-display font-bold text-4xl card-answer',
                    'flex items-center justify-center h-20 w-full select-none',
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
        <div className="flex-shrink-0 px-4 pt-3" style={{paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))"}}>
          {!revealed ? (
            <button disabled={selected === null || selected === undefined || selected === ''} onClick={handleCheck}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest">
              CHECK
            </button>
          ) : (
            <div className={`rounded-2xl overflow-hidden border-2 ${
              isCorrect ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="text-2xl">{isCorrect ? '🎉' : '💪'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-bold text-base leading-tight">
                    {isCorrect ? 'Correct! Keep going!' : 'Almost there!'}
                  </p>
                  {!isCorrect && (
                    <p className="font-body text-sm text-amber-600 leading-tight truncate">
                      Answer: {q.answer}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={handleContinue}
                className={`w-full py-4 font-body font-bold text-xl tracking-widest ${
                  isCorrect ? 'btn-duo' : 'btn-duo-yellow'
                }`}>
                CONTINUE →
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
