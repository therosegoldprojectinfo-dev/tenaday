import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { trackEvent } from '../lib/analytics'
import { trackPageView } from '../lib/gtag'

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
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
`

// ── Typewriter ─────────────────────────────────────────────────────────────────
function useTypewriter(text, speed = 10) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setDisplayed(''); setDone(false)
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

// ── Layout: bubble above mascot ────────────────────────────────────────────────
function Layout({ bubbleText, mascotSize = 110, children, button, step }) {
  const [showBubble, setShowBubble] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 400)
    return () => clearTimeout(t)
  }, [bubbleText])

  const { displayed, done } = useTypewriter(showBubble ? bubbleText : '', 10)

  // Progress bar: screens 1-8 out of 8 total steps
  const totalSteps = 8
  const progress = step ? Math.min((step / totalSteps) * 100, 100) : 0

  return (
    <div style={{
      minHeight: '100dvh', background: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '0 0 40px', boxSizing: 'border-box',
      maxWidth: 420, margin: '0 auto',
      fontFamily: "'Baloo 2', sans-serif",
      animation: 'fadeUp 0.3s ease both',
      overflow: 'hidden',
    }}>
      <style>{ANIM}</style>

      {/* Progress bar */}
      {step && (
        <div style={{ width: '100%', maxWidth: 420, padding: '16px 24px 0', boxSizing: 'border-box', margin: '0 auto' }}>
          <div style={{ height: 8, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 8,
              background: '#58cc02',
              width: `${progress}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', gap: 12, width: '100%', maxWidth: 420, padding: '16px 24px 0', margin: '0 auto', overflowY: 'auto' }}>
        {/* Bubble — appears 100ms after mascot */}
        {showBubble && (
          <div style={{
            background: '#fff', border: '2.5px solid #e5e7eb',
            borderRadius: 20, padding: '16px 22px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
            position: 'relative', width: '100%', maxWidth: 320,
            minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeUp 0.25s ease both',
          }}>
            <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 20, color: '#1a1a1a', margin: 0, lineHeight: 1.4, textAlign: 'center' }}>
              {displayed}
              {!done && <span style={{ opacity: 0.5, animation: 'blink 0.7s step-end infinite' }}>|</span>}
            </p>
            <div style={{ position: 'absolute', bottom: -13, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '13px solid white' }} />
            <div style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '14px solid #e5e7eb', zIndex: -1 }} />
          </div>
        )}

        {/* Mascot */}
        <div style={{ animation: 'mascot-float 2.2s ease-in-out infinite' }}>
          <img src="/onboarding-mascot.png" alt="Numio" style={{ width: mascotSize, height: 'auto' }} />
        </div>

        {/* Content */}
        {children && <div style={{ width: '100%', maxWidth: 340 }}>{children}</div>}
      </div>

      <div style={{ padding: '12px 24px 0', width: '100%', maxWidth: 420, boxSizing: 'border-box', margin: '0 auto' }}>
        {button}
      </div>
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
      fontWeight: 800, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>{children}</button>
  )
}

function StyledInput({ value, onChange, placeholder, type = 'text', ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '16px 18px', borderRadius: 14,
        border: `2.5px solid ${focused ? '#58cc02' : '#e5e7eb'}`, outline: 'none',
        fontFamily: "'Baloo 2', sans-serif", fontSize: 18, fontWeight: 700,
        color: '#1a1a1a', textAlign: 'center', transition: 'border-color 0.15s',
      }} {...props} />
  )
}

const OPERATIONS = [
  { id: 'addition', label: 'Addition', emoji: '➕', color: '#58cc02' },
  { id: 'subtraction', label: 'Subtraction', emoji: '➖', color: '#1CB0F6' },
  { id: 'multiplication', label: 'Multiplication', emoji: '✖️', color: '#FF9600' },
  { id: 'division', label: 'Division', emoji: '➗', color: '#CE82FF' },
]
const OP_ORDER = ['addition', 'subtraction', 'multiplication', 'division']

// ── Hello screen ───────────────────────────────────────────────────────────────
function HelloScreen({ onNext }) {
  const [showBubble, setShowBubble] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 400)
    return () => clearTimeout(t)
  }, [])
  const { displayed, done } = useTypewriter(showBubble ? "Hi! 👋 I'm Numio!" : '', 10)
  return (
    <div style={{ minHeight: '100dvh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '60px 24px 40px', boxSizing: 'border-box', maxWidth: 420, margin: '0 auto', fontFamily: "'Baloo 2', sans-serif" }}>
      <style>{ANIM}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        {showBubble && (
          <div style={{ background: '#fff', border: '2.5px solid #e5e7eb', borderRadius: 20, padding: '18px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', position: 'relative', maxWidth: 300, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeUp 0.25s ease both' }}>
            <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 24, color: '#1a1a1a', margin: 0, textAlign: 'center' }}>
              {displayed}{!done && <span style={{ animation: 'blink 0.7s step-end infinite', opacity: 0.5 }}>|</span>}
            </p>
            <div style={{ position: 'absolute', bottom: -13, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '13px solid white' }} />
            <div style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '14px solid #e5e7eb', zIndex: -1 }} />
          </div>
        )}
        <div style={{ animation: 'mascot-float 2.2s ease-in-out infinite' }}>
          <img src="/onboarding-mascot.png" alt="Numio" style={{ width: 200, height: 'auto' }} />
        </div>
      </div>
      <GreenButton onClick={onNext} disabled={!done}>CONTINUE →</GreenButton>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ChildOnboarding({ kidId, parentId, onDone, startStep = 0, savedName = '', savedAge = '' }) {
  const [step, setStep] = useState(startStep)
  const [name, setName] = useState(savedName)
  const [age, setAge] = useState(savedAge)
  const [rewardName, setRewardName] = useState('')
  const [rewardPrice, setRewardPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [knownOps, setKnownOps] = useState([])
  const [justStarting, setJustStarting] = useState(false)
  const [tablesByOp, setTablesByOp] = useState({})
  const [howStep, setHowStep] = useState(0)

  // Fires once per real onboarding attempt. startStep > 0 means this is a
  // resume (e.g. App.jsx's onPickLevel jumps back in at step 6 to redo the
  // level check) rather than a fresh start, so don't double-count those.
  useEffect(() => {
    if (startStep === 0) trackEvent('onboarding_started', { parentId, kidId })
    trackPageView('/app/onboarding', 'Onboarding')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Typewriter texts for screens 8 and 9 — must be at top level (Rules of Hooks)
  const { displayed: screen8Text } = useTypewriter(
    step === 8 ? `Ooh nice, ${name}! 🔥 Let's do a quick test to confirm the level!` : '',
    10
  )
  const { displayed: screen9Text } = useTypewriter(
    step === 9 ? `Ok ${name}, let's start your journey! 🚀` : '',
    10
  )

  const howSteps = [
    { icon: '🧮', label: 'Practice math' },
    { icon: '🪙', label: 'Earn coins' },
    { icon: '🎁', label: `Unlock ${rewardName || 'your reward'}` },
  ]

  const selectedOp = justStarting ? null : (knownOps.length > 0 ? knownOps[knownOps.length - 1] : null)

  function selectOp(opId) {
    setJustStarting(false)
    const idx = OP_ORDER.indexOf(opId)
    setKnownOps(OP_ORDER.slice(0, idx + 1))
  }

  async function saveAndFinish(goToDiagnostic) {
    setSaving(true)
    try {
      if (name.trim()) {
        const { error: kidError } = await supabase
          .from('kids')
          .update({ name: name.trim(), age: parseInt(age) || null })
          .eq('id', kidId)
        if (kidError) throw kidError
      }
      if (rewardName.trim() && rewardPrice) {
        const price = Math.min(250, Math.max(150, parseInt(rewardPrice) || 200))
        const { error: giftError } = await supabase
          .from('gifts')
          .insert({ parent_id: parentId, name: rewardName.trim(), coin_price: price, icon: 'gift' })
        if (giftError) console.error('Gift insert failed:', giftError) // non-fatal — proceed
        else trackEvent('reward_created', { parentId, reward_name: rewardName.trim(), coin_price: price })
      }
      trackEvent('level_selected', { parentId, kidId, just_starting: justStarting, known_ops: knownOps })
      const completedTablesByOp = {}
      knownOps.forEach((op, i) => {
        completedTablesByOp[op] = i < knownOps.length - 1
          ? Array.from({ length: 12 }, (_, j) => j + 1)
          : (tablesByOp[op] || [])
      })
      onDone({ justStarting, knownOps, tablesByOp: completedTablesByOp, goToDiagnostic, kidName: name.trim(), kidAge: age })
    } catch (err) {
      console.error('Onboarding save failed:', err)
      setSaving(false)
    }
  }

  // SCREEN 0
  if (step === 0) return <HelloScreen onNext={() => setStep(1)} />

  // SCREEN 1: Child's name (parent POV)
  if (step === 1) return (
    <Layout bubbleText="What is your child's name? 😊"
      step={1} button={<GreenButton onClick={() => setStep(2)} disabled={!name.trim()}>CONTINUE →</GreenButton>}>
      <StyledInput autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Your child's first name..." />
    </Layout>
  )

  // SCREEN 2: Age
  if (step === 2) return (
    <Layout bubbleText={`How old is ${name || 'your child'}? 🎈`}
      step={2} button={<GreenButton onClick={() => setStep(3)} disabled={!age || isNaN(parseInt(age)) || parseInt(age) < 3 || parseInt(age) > 14}>CONTINUE →</GreenButton>}>
      <StyledInput type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Age..." min={3} max={14} />
    </Layout>
  )

  // SCREEN 3: Reward setup
  if (step === 3) return (
    <Layout bubbleText={`Set a reward ${name} already wants and give it a price! 🎁`}
      step={3} button={<GreenButton onClick={() => setStep(4)} disabled={!rewardName.trim() || !rewardPrice}>CONTINUE →</GreenButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <StyledInput value={rewardName} onChange={e => setRewardName(e.target.value)} placeholder="e.g. Extra screen time, a toy..." />
        <div>
          <StyledInput type="number" value={rewardPrice} onChange={e => setRewardPrice(e.target.value)} placeholder="Coin price (150–250)..." />
          <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 600, fontSize: 12, color: '#9ca3af', margin: '8px 0 0', textAlign: 'center' }}>
            💡 Pick between 150–250 coins — not too easy, not too hard!
          </p>
        </div>
      </div>
    </Layout>
  )

  // SCREEN 4: How it works
  if (step === 4) return (
    <Layout bubbleText="Here's how Numio works! 😄"
      step={4} button={howStep < howSteps.length - 1
        ? <GreenButton onClick={() => setHowStep(s => s + 1)}>NEXT →</GreenButton>
        : <GreenButton onClick={() => setStep(5)}>GOT IT! →</GreenButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
        {howSteps.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: howStep >= i ? '#f0fff0' : '#f9fafb', border: `3px solid ${howStep >= i ? '#58cc02' : '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, transition: 'all 0.3s', animation: howStep === i ? 'pop 0.4s ease both' : 'none' }}>{s.icon}</div>
            <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 14, color: howStep >= i ? '#1a1a1a' : '#d1d5db', margin: '6px 0', transition: 'color 0.3s' }}>{s.label}</p>
            {i < howSteps.length - 1 && <div style={{ fontSize: 16, color: howStep > i ? '#58cc02' : '#e5e7eb', margin: '2px 0', transition: 'color 0.3s' }}>↓</div>}
          </div>
        ))}
      </div>
    </Layout>
  )

  // SCREEN 5: Level check intro
  if (step === 5) return (
    <Layout bubbleText={`Now let's see what ${name} already knows! 👀`}
      step={5} button={<GreenButton onClick={() => setStep(6)}>LET'S GO! →</GreenButton>}>
      <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 600, fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
        I just want to know where to start with {name}! 😊
      </p>
    </Layout>
  )

  // SCREEN 6: What do they know? — just starting out ON TOP, single select
  if (step === 6) return (
    <Layout bubbleText={`What math does ${name} know? 😄`}
      step={6} button={
        <GreenButton onClick={() => {
          if (justStarting) setStep(9) // go to congrats screen
          else if (knownOps.length > 0) setStep(7)
        }} disabled={!justStarting && knownOps.length === 0}>
          CONTINUE →
        </GreenButton>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {/* Just starting out — ON TOP */}
        <button onClick={() => { setJustStarting(true); setKnownOps([]) }} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
          border: `3px solid ${justStarting ? '#58cc02' : '#e5e7eb'}`,
          background: justStarting ? '#58cc02' : '#fff',
          cursor: 'pointer', transition: 'all 0.15s',
        }}>
          <span style={{ fontSize: 18 }}>🌱</span>
          <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 15, color: justStarting ? '#fff' : '#1a1a1a' }}>Just starting out!</span>
          {justStarting && <span style={{ marginLeft: 'auto', color: '#fff', fontSize: 20 }}>✓</span>}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 13, color: '#9ca3af' }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        {OPERATIONS.map(op => {
          const selected = selectedOp === op.id
          return (
            <button key={op.id} onClick={() => selectOp(op.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
              border: `3px solid ${selected ? op.color : '#e5e7eb'}`,
              background: selected ? `${op.color}15` : '#fff',
              cursor: 'pointer', transition: 'all 0.15s',
              opacity: justStarting ? 0.4 : 1,
            }}>
              <span style={{ fontSize: 18 }}>{op.emoji}</span>
              <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 15, color: selected ? op.color : '#1a1a1a' }}>{op.label}</span>
              {selected && <span style={{ marginLeft: 'auto', color: op.color, fontSize: 20 }}>✓</span>}
            </button>
          )
        })}
      </div>
    </Layout>
  )

  // SCREEN 7: Table picker — only highest op
  if (step === 7) {
    const highestOp = OPERATIONS.find(o => o.id === knownOps[knownOps.length - 1])
    const currentTables = tablesByOp[highestOp.id] || []
    return (
      <Layout bubbleText={`${highestOp.emoji} ${highestOp.label} — which tables does ${name} know? 😊`}
        step={7} button={<GreenButton onClick={() => setStep(8)} disabled={currentTables.length === 0}>DONE →</GreenButton>}>
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => {
            const allTables = Array.from({ length: 12 }, (_, i) => i + 1)
            const allSelected = allTables.every(t => currentTables.includes(t))
            setTablesByOp(prev => ({
              ...prev,
              [highestOp.id]: allSelected ? [] : allTables,
            }))
          }} style={{
            width: '100%', padding: '10px 0', borderRadius: 12,
            border: `2.5px solid ${Array.from({length:12},(_,i)=>i+1).every(t=>currentTables.includes(t)) ? highestOp.color : '#e5e7eb'}`,
            background: Array.from({length:12},(_,i)=>i+1).every(t=>currentTables.includes(t)) ? `${highestOp.color}15` : '#fff',
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 14,
            color: Array.from({length:12},(_,i)=>i+1).every(t=>currentTables.includes(t)) ? highestOp.color : '#6b7280',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {Array.from({length:12},(_,i)=>i+1).every(t=>currentTables.includes(t)) ? '✓ All selected' : 'Select all'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(t => {
            const selected = currentTables.includes(t)
            return (
              <button key={t} onClick={() => {
                setTablesByOp(prev => ({
                  ...prev,
                  [highestOp.id]: selected ? (prev[highestOp.id] || []).filter(x => x !== t) : [...(prev[highestOp.id] || []), t],
                }))
              }} style={{
                padding: '10px 0', borderRadius: 10,
                border: `3px solid ${selected ? highestOp.color : '#e5e7eb'}`,
                background: selected ? `${highestOp.color}15` : '#fff',
                fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18,
                color: selected ? highestOp.color : '#6b7280',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{t}</button>
            )
          })}
        </div>
      </Layout>
    )
  }

  // SCREEN 8: Result before diagnostic — special image
  if (step === 8) {
    return (
      <div style={{ minHeight: '100dvh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '48px 24px 40px', boxSizing: 'border-box', maxWidth: 420, margin: '0 auto', fontFamily: "'Baloo 2', sans-serif" }}>
        <style>{ANIM}</style>
        {/* Progress bar — screens 1-7 show this via Layout; this screen has
            its own bespoke layout (bypassing Layout) so it was previously
            missing entirely. Step 8 of 8 = full bar. */}
        <div style={{ width: '100%', maxWidth: 420, padding: '0 0 16px', boxSizing: 'border-box', margin: '0 auto' }}>
          <div style={{ height: 8, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 8, background: '#58cc02', width: '100%' }} />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <div style={{ background: '#fff', border: '2.5px solid #e5e7eb', borderRadius: 20, padding: '16px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', position: 'relative', width: '100%', maxWidth: 320, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 20, color: '#1a1a1a', margin: 0, lineHeight: 1.4, textAlign: 'center' }}>{screen8Text}</p>
            <div style={{ position: 'absolute', bottom: -13, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '13px solid white' }} />
            <div style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '14px solid #e5e7eb', zIndex: -1 }} />
          </div>
          <img src="/ChatGPT Image 27 juin 2026, 14_15_36.png" alt="Numio ready" style={{ width: '100%', maxWidth: 280, objectFit: 'contain', animation: 'pop 0.4s ease both' }} />
          <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 600, fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
            Get 20 out of 25 right to confirm the level! 🎯<br />
            <span style={{ fontSize: 13, color: '#9ca3af' }}>No pressure — just do your best 😊</span>
          </p>
        </div>
        <GreenButton onClick={() => saveAndFinish(true)} disabled={saving}>{saving ? 'SAVING...' : "LET'S GO! 🚀"}</GreenButton>
      </div>
    )
  }

  // SCREEN 9: Just starting out congrats screen
  if (step === 9) {
    return (
      <div style={{ minHeight: '100dvh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '60px 24px 40px', boxSizing: 'border-box', maxWidth: 420, margin: '0 auto', fontFamily: "'Baloo 2', sans-serif" }}>
        <style>{ANIM}</style>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <div style={{ background: '#fff', border: '2.5px solid #e5e7eb', borderRadius: 20, padding: '18px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', position: 'relative', maxWidth: 300, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 22, color: '#1a1a1a', margin: 0, textAlign: 'center' }}>{screen9Text}</p>
            <div style={{ position: 'absolute', bottom: -13, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '13px solid white' }} />
            <div style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '14px solid #e5e7eb', zIndex: -1 }} />
          </div>
          <div style={{ animation: 'mascot-float 2.2s ease-in-out infinite' }}>
            <img src="/onboarding-mascot.png" alt="Numio" style={{ width: 180, height: 'auto' }} />
          </div>
        </div>
        <GreenButton onClick={() => saveAndFinish(false)} disabled={saving}>{saving ? 'SAVING...' : "START LEARNING! 🎉"}</GreenButton>
      </div>
    )
  }

  return null
}
