import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ANIM = `
  @keyframes mascot-float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-10px); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pop {
    0%   { transform: scale(0.85); opacity: 0; }
    60%  { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
  }
`

function Mascot({ size = 120 }) {
  return (
    <div style={{ animation: 'mascot-float 2.2s ease-in-out infinite' }}>
      <img src="/onboarding-mascot.png" alt="Numio"
        style={{ width: size, height: 'auto', display: 'block' }} />
    </div>
  )
}

function Screen({ children }) {
  return (
    <div style={{
      minHeight: '100dvh', background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '48px 24px 40px', boxSizing: 'border-box',
      maxWidth: 420, margin: '0 auto',
      fontFamily: "'Baloo 2', sans-serif",
      animation: 'fadeUp 0.35s ease both',
    }}>
      <style>{ANIM}</style>
      {children}
    </div>
  )
}

function GreenButton({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', maxWidth: 340, border: 'none', cursor: disabled ? 'default' : 'pointer',
      padding: '16px 0', borderRadius: 16,
      background: disabled ? '#e5e7eb' : '#58cc02',
      boxShadow: disabled ? '0 4px 0 #d1d5db' : '0 4px 0 #46a302',
      color: disabled ? '#9ca3af' : '#fff',
      fontFamily: "'Baloo 2', sans-serif",
      fontWeight: 800, fontSize: 18, letterSpacing: '0.05em',
      textTransform: 'uppercase', transition: 'all 0.15s',
    }}>
      {children}
    </button>
  )
}

function Bubble({ text }) {
  return (
    <div style={{
      background: '#fff', border: '2px solid #e5e7eb',
      borderRadius: 20, padding: '18px 22px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
      textAlign: 'center', maxWidth: 320, position: 'relative',
      animation: 'pop 0.4s ease both',
    }}>
      <p style={{
        fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 20,
        color: '#1a1a1a', margin: 0, lineHeight: 1.4,
      }}>{text}</p>
      <div style={{
        position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
        borderTop: '14px solid white',
      }} />
    </div>
  )
}

// ── Typewriter hook ───────────────────────────────────────────────────────────
function useTypewriter(text, speed = 50) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(id); setDone(true) }
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return { displayed, done }
}

// ── Hello screen — mascot centered, bubble above with typewriter ──────────────
function HelloScreen({ onNext }) {
  const text = "Hi! 👋 I'm Numio!"
  const { displayed, done } = useTypewriter(text, 55)

  return (
    <div style={{
      minHeight: '100dvh', background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '60px 24px 40px', boxSizing: 'border-box',
      fontFamily: "'Baloo 2', sans-serif",
    }}>
      <style>{ANIM + `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        {/* Speech bubble above mascot */}
        <div style={{
          background: '#fff', border: '2.5px solid #e5e7eb',
          borderRadius: 20, padding: '18px 24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          position: 'relative', maxWidth: 280,
          animation: 'pop 0.4s ease both',
          minHeight: 56, display: 'flex', alignItems: 'center',
          justifyContent: 'center',
        }}>
          <p style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 22,
            color: '#1a1a1a', margin: 0, lineHeight: 1.3, textAlign: 'center',
          }}>
            {displayed}
            {!done && <span style={{ opacity: 0.5, animation: 'blink 0.8s step-end infinite' }}>|</span>}
          </p>
          {/* Bubble tail pointing down toward mascot */}
          <div style={{
            position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
            borderTop: '14px solid white',
          }} />
          <div style={{
            position: 'absolute', bottom: -17, left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '13px solid transparent', borderRight: '13px solid transparent',
            borderTop: '15px solid #e5e7eb',
            zIndex: -1,
          }} />
        </div>

        {/* Big mascot */}
        <div style={{ animation: 'mascot-float 2.2s ease-in-out infinite' }}>
          <img src="/onboarding-mascot.png" alt="Numio"
            style={{ width: 200, height: 'auto', display: 'block' }} />
        </div>
      </div>

      <GreenButton onClick={onNext} disabled={!done}>CONTINUE →</GreenButton>
    </div>
  )
}

const OPERATIONS = [
  { id: 'addition', label: 'Addition', emoji: '➕', color: '#58cc02' },
  { id: 'subtraction', label: 'Subtraction', emoji: '➖', color: '#1CB0F6' },
  { id: 'multiplication', label: 'Multiplication', emoji: '✖️', color: '#FF9600' },
  { id: 'division', label: 'Division', emoji: '➗', color: '#CE82FF' },
]

// ── Main component ─────────────────────────────────────────────────────────────
export default function ChildOnboarding({ kidId, parentId, onDone }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState(null)
  const [rewardName, setRewardName] = useState('')
  const [rewardPrice, setRewardPrice] = useState(200)
  const [saving, setSaving] = useState(false)

  // Level selection
  const [knownOps, setKnownOps] = useState([]) // e.g. ['addition', 'multiplication']
  const [justStarting, setJustStarting] = useState(false)
  const [tablesByOp, setTablesByOp] = useState({}) // { addition: [1,2,3], ... }
  const [currentOpIdx, setCurrentOpIdx] = useState(0) // which op we're picking tables for

  // How-it-works animation
  const [howStep, setHowStep] = useState(0)

  const howSteps = [
    { icon: '🧮', label: 'Practice math' },
    { icon: '🪙', label: 'Earn coins' },
    { icon: '🎁', label: `Unlock ${rewardName || 'your reward'}` },
  ]

  async function saveAndFinish(goToDiagnostic) {
    setSaving(true)
    try {
      // 1. Update kid name and age
      await supabase.from('kids').update({ name: name.trim(), age }).eq('id', kidId)

      // 2. Create the first reward
      if (rewardName.trim()) {
        await supabase.from('gifts').insert({
          parent_id: parentId,
          name: rewardName.trim(),
          coin_price: rewardPrice,
          icon: 'gift',
        })
      }

      // 3. Done — let App.jsx decide what's next
      onDone({
        justStarting,
        knownOps,
        tablesByOp,
        goToDiagnostic,
      })
    } catch (err) {
      console.error('Onboarding save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── SCREEN 0: Hello ───────────────────────────────────────────────────────
  if (step === 0) return <HelloScreen onNext={() => setStep(1)} />

  // ── SCREEN 1: Name ────────────────────────────────────────────────────────
  if (step === 1) return (
    <Screen>
      <Mascot />
      <div style={{ width: '100%', maxWidth: 340 }}>
        <Bubble text="What's your name? 😊" />
        <div style={{ marginTop: 32 }}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your first name..."
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '16px 18px', borderRadius: 14,
              border: '2px solid #e5e7eb', outline: 'none',
              fontFamily: "'Baloo 2', sans-serif", fontSize: 18, fontWeight: 700,
              color: '#1a1a1a', textAlign: 'center',
            }}
            onFocus={e => e.target.style.borderColor = '#58cc02'}
            onBlur={e => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>
      </div>
      <GreenButton onClick={() => setStep(2)} disabled={!name.trim()}>
        CONTINUE →
      </GreenButton>
    </Screen>
  )

  // ── SCREEN 2: Age ─────────────────────────────────────────────────────────
  if (step === 2) return (
    <Screen>
      <Mascot />
      <div style={{ width: '100%', maxWidth: 340 }}>
        <Bubble text={`How old are you, ${name}? 🎂`} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 32 }}>
          {[6, 7, 8, 9, 10, 11, 12].map(a => (
            <button key={a} onClick={() => setAge(a)} style={{
              width: 64, height: 64, borderRadius: 16,
              border: `3px solid ${age === a ? '#58cc02' : '#e5e7eb'}`,
              background: age === a ? '#f0fff0' : '#fff',
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22,
              color: age === a ? '#58cc02' : '#6b7280', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>{a}</button>
          ))}
        </div>
      </div>
      <GreenButton onClick={() => setStep(3)} disabled={!age}>CONTINUE →</GreenButton>
    </Screen>
  )

  // ── SCREEN 3: Reward setup ────────────────────────────────────────────────
  if (step === 3) return (
    <Screen>
      <Mascot />
      <div style={{ width: '100%', maxWidth: 340 }}>
        <Bubble text={`What do you want to earn, ${name}? 🎁`} />
        <p style={{
          textAlign: 'center', fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 600, fontSize: 14, color: '#9ca3af', margin: '12px 0 24px',
        }}>Ask your parent to help you set this up!</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 13,
              color: '#6b7280', marginBottom: 6, display: 'block',
            }}>Reward name</label>
            <input
              value={rewardName}
              onChange={e => setRewardName(e.target.value)}
              placeholder="e.g. Extra screen time, a toy..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '14px 16px', borderRadius: 14,
                border: '2px solid #e5e7eb', outline: 'none',
                fontFamily: "'Baloo 2', sans-serif", fontSize: 16, fontWeight: 600,
              }}
              onFocus={e => e.target.style.borderColor = '#58cc02'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div>
            <label style={{
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 13,
              color: '#6b7280', marginBottom: 6, display: 'block',
            }}>
              Coin price: <span style={{ color: '#58cc02' }}>{rewardPrice} 🪙</span>
            </label>
            <p style={{
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 600, fontSize: 12,
              color: '#9ca3af', margin: '0 0 8px',
            }}>
              Pick between 150–250 coins — not too easy, not too hard! 😊
            </p>
            <input
              type="range" min={150} max={250} step={10}
              value={rewardPrice}
              onChange={e => setRewardPrice(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#58cc02' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 12, color: '#9ca3af' }}>150</span>
              <span style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 12, color: '#9ca3af' }}>250</span>
            </div>
          </div>
        </div>
      </div>
      <GreenButton onClick={() => setStep(4)} disabled={!rewardName.trim()}>
        CONTINUE →
      </GreenButton>
    </Screen>
  )

  // ── SCREEN 4: How it works ────────────────────────────────────────────────
  if (step === 4) return (
    <Screen>
      <Mascot />
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 340 }}>
        <Bubble text="Here's how Numio works! 😄" />
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {howSteps.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: howStep >= i ? '#f0fff0' : '#f9fafb',
                border: `3px solid ${howStep >= i ? '#58cc02' : '#e5e7eb'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32,
                animation: howStep === i ? 'pop 0.4s ease both' : 'none',
                transition: 'all 0.3s',
              }}>{s.icon}</div>
              <p style={{
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 15,
                color: howStep >= i ? '#1a1a1a' : '#d1d5db', margin: '8px 0',
                transition: 'color 0.3s',
              }}>{s.label}</p>
              {i < howSteps.length - 1 && (
                <div style={{ fontSize: 20, color: howStep > i ? '#58cc02' : '#e5e7eb', margin: '4px 0', transition: 'color 0.3s' }}>↓</div>
              )}
            </div>
          ))}
        </div>
      </div>
      {howStep < howSteps.length - 1 ? (
        <GreenButton onClick={() => setHowStep(s => s + 1)}>NEXT →</GreenButton>
      ) : (
        <GreenButton onClick={() => setStep(5)}>GOT IT! →</GreenButton>
      )}
    </Screen>
  )

  // ── SCREEN 5: Level check intro ───────────────────────────────────────────
  if (step === 5) return (
    <Screen>
      <Mascot />
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <Bubble text={`Now let's see what you already know, ${name}! 👀`} />
        <p style={{
          fontFamily: "'Baloo 2', sans-serif", fontWeight: 600, fontSize: 15,
          color: '#6b7280', marginTop: 20, lineHeight: 1.6,
        }}>
          Don't worry — this is <strong>NOT a test</strong> 😊<br />
          I just want to know where to start with you!
        </p>
      </div>
      <GreenButton onClick={() => setStep(6)}>LET'S GO! →</GreenButton>
    </Screen>
  )

  // ── SCREEN 6: What do you know? ───────────────────────────────────────────
  if (step === 6) return (
    <Screen>
      <Mascot />
      <div style={{ width: '100%', maxWidth: 340 }}>
        <Bubble text="What math do you know? 😄" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
          {OPERATIONS.map(op => {
            const selected = knownOps.includes(op.id)
            return (
              <button key={op.id} onClick={() => {
                if (justStarting) return
                setKnownOps(prev => selected ? prev.filter(o => o !== op.id) : [...prev, op.id])
              }} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', borderRadius: 16,
                border: `3px solid ${selected ? op.color : '#e5e7eb'}`,
                background: selected ? `${op.color}15` : '#fff',
                cursor: 'pointer', transition: 'all 0.15s',
                opacity: justStarting ? 0.4 : 1,
              }}>
                <span style={{ fontSize: 24 }}>{op.emoji}</span>
                <span style={{
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 17,
                  color: selected ? op.color : '#1a1a1a',
                }}>{op.label}</span>
                {selected && <span style={{ marginLeft: 'auto', color: op.color, fontSize: 20 }}>✓</span>}
              </button>
            )
          })}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            <span style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 13, color: '#9ca3af' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          </div>

          <button onClick={() => {
            setJustStarting(true)
            setKnownOps([])
          }} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', borderRadius: 16,
            border: `3px solid ${justStarting ? '#58cc02' : '#e5e7eb'}`,
            background: justStarting ? '#f0fff0' : '#fff',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 24 }}>🌱</span>
            <span style={{
              fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 17,
              color: justStarting ? '#58cc02' : '#1a1a1a',
            }}>Just starting out!</span>
            {justStarting && <span style={{ marginLeft: 'auto', color: '#58cc02', fontSize: 20 }}>✓</span>}
          </button>
        </div>
      </div>
      <GreenButton
        onClick={() => {
          if (justStarting) {
            saveAndFinish(false)
          } else if (knownOps.length > 0) {
            setCurrentOpIdx(0)
            setStep(7)
          }
        }}
        disabled={!justStarting && knownOps.length === 0}
      >
        CONTINUE →
      </GreenButton>
    </Screen>
  )

  // ── SCREEN 7: Table picker per operation ──────────────────────────────────
  if (step === 7) {
    const op = OPERATIONS.find(o => o.id === knownOps[currentOpIdx])
    const currentTables = tablesByOp[op.id] || []
    const isLastOp = currentOpIdx === knownOps.length - 1

    return (
      <Screen>
        <Mascot />
        <div style={{ width: '100%', maxWidth: 340 }}>
          <Bubble text={`${op.emoji} ${op.label} — which tables do you know? 😊`} />
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10, marginTop: 28,
          }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(t => {
              const selected = currentTables.includes(t)
              return (
                <button key={t} onClick={() => {
                  setTablesByOp(prev => ({
                    ...prev,
                    [op.id]: selected
                      ? (prev[op.id] || []).filter(x => x !== t)
                      : [...(prev[op.id] || []), t],
                  }))
                }} style={{
                  padding: '12px 0', borderRadius: 12,
                  border: `3px solid ${selected ? op.color : '#e5e7eb'}`,
                  background: selected ? `${op.color}15` : '#fff',
                  fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18,
                  color: selected ? op.color : '#6b7280',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>{t}</button>
              )
            })}
          </div>
        </div>
        <GreenButton
          onClick={() => {
            if (!isLastOp) {
              setCurrentOpIdx(i => i + 1)
            } else {
              // All ops done — go to result
              setStep(8)
            }
          }}
          disabled={currentTables.length === 0}
        >
          {isLastOp ? 'DONE →' : `NEXT: ${OPERATIONS.find(o => o.id === knownOps[currentOpIdx + 1])?.label} →`}
        </GreenButton>
      </Screen>
    )
  }

  // ── SCREEN 8: Result ──────────────────────────────────────────────────────
  if (step === 8) return (
    <Screen>
      <Mascot size={150} />
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <Bubble text={`Ooh nice, ${name}! 🔥 Let's do a quick test to confirm your level!`} />
        <p style={{
          fontFamily: "'Baloo 2', sans-serif", fontWeight: 600, fontSize: 15,
          color: '#6b7280', marginTop: 20, lineHeight: 1.6,
        }}>
          Don't worry — it's super short and there are no wrong answers 😊
        </p>
      </div>
      <GreenButton onClick={() => saveAndFinish(true)} disabled={saving}>
        {saving ? 'SAVING...' : "LET'S GO! 🚀"}
      </GreenButton>
    </Screen>
  )

  return null
}
