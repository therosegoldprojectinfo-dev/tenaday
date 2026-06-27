import { useState } from 'react'

const ANIM = `
  @keyframes breathe {
    0%,100% { transform: scale(1); }
    50%      { transform: scale(1.045); }
  }
  @keyframes blink {
    0%,92%,100% { scaleY: 1; }
    96%          { scaleY: 0; }
  }
  @keyframes bubblePop {
    from { opacity:0; transform: scale(0.85) translateY(6px); }
    to   { opacity:1; transform: scale(1)    translateY(0); }
  }
  @keyframes levelIn {
    from { opacity:0; transform: translateY(18px); }
    to   { opacity:1; transform: translateY(0); }
  }
`

const LEVELS = [
  { claim: null,           symbol: '🌱', label: 'Just starting out' },
  { claim: 'addition',     symbol: '+',  label: 'Addition' },
  { claim: 'subtraction',  symbol: '−',  label: 'Subtraction' },
  { claim: 'multiplication', symbol: '×', label: 'Multiplication' },
  { claim: 'division',     symbol: '÷',  label: 'Division' },
]

/* ── Animated mascot (breathing + blinking) ── */
function AnimatedMascot() {
  const [blink, setBlink] = useState(false)

  // Trigger blink every ~3.5s
  useState(() => {
    const interval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 150)
    }, 3500)
    return () => clearInterval(interval)
  })

  return (
    <div style={{ animation: 'breathe 3.2s ease-in-out infinite', display: 'inline-block' }}>
      <svg width={110} height={110} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        {/* green leaves base */}
        <ellipse cx={60}  cy={158} rx={58} ry={22} fill="#3a9e00"/>
        <ellipse cx={140} cy={158} rx={58} ry={22} fill="#3a9e00"/>
        <ellipse cx={100} cy={152} rx={72} ry={26} fill="#58cc02"/>
        {/* leaf highlights */}
        <ellipse cx={72}  cy={148} rx={28} ry={10} fill="#7ae820" opacity={0.5}/>
        <ellipse cx={128} cy={148} rx={28} ry={10} fill="#7ae820" opacity={0.5}/>

        {/* body */}
        <ellipse cx={100} cy={110} rx={74} ry={70} fill="#7c3aed"/>
        {/* body highlight */}
        <ellipse cx={100} cy={82}  rx={52} ry={36} fill="#9f67ff" opacity={0.45}/>

        {/* petal bumps on top */}
        <ellipse cx={60}  cy={52}  rx={32} ry={28} fill="#6d28d9"/>
        <ellipse cx={100} cy={44}  rx={32} ry={28} fill="#6d28d9"/>
        <ellipse cx={140} cy={52}  rx={32} ry={28} fill="#6d28d9"/>
        {/* petal highlights */}
        <ellipse cx={60}  cy={46}  rx={22} ry={18} fill="#8b5cf6" opacity={0.6}/>
        <ellipse cx={100} cy={38}  rx={22} ry={18} fill="#8b5cf6" opacity={0.6}/>
        <ellipse cx={140} cy={46}  rx={22} ry={18} fill="#8b5cf6" opacity={0.6}/>

        {/* left eye white */}
        <ellipse cx={72} cy={112} rx={24} ry={blink ? 2 : 26} fill="#fff"
          style={{ transition: 'ry 0.07s ease' }}/>
        {/* right eye white */}
        <ellipse cx={128} cy={112} rx={24} ry={blink ? 2 : 26} fill="#fff"
          style={{ transition: 'ry 0.07s ease' }}/>
        {/* left pupil */}
        {!blink && <ellipse cx={76} cy={116} rx={14} ry={16} fill="#3c3c52"/>}
        {/* right pupil */}
        {!blink && <ellipse cx={132} cy={116} rx={14} ry={16} fill="#3c3c52"/>}
        {/* eye shine left */}
        {!blink && <ellipse cx={80} cy={108} rx={5} ry={6} fill="#fff" opacity={0.9}/>}
        {/* eye shine right */}
        {!blink && <ellipse cx={136} cy={108} rx={5} ry={6} fill="#fff" opacity={0.9}/>}
      </svg>
    </div>
  )
}

/* ── Speech bubble ── */
function SpeechBubble() {
  return (
    <div style={{
      position: 'relative',
      background: '#fff',
      border: '2.5px solid #e5e5e5',
      borderRadius: 18,
      padding: '12px 18px',
      maxWidth: 210,
      animation: 'bubblePop 0.4s cubic-bezier(.34,1.56,.64,1) both',
      boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
    }}>
      <p style={{
        margin: 0,
        fontFamily: "'Baloo 2', sans-serif",
        fontWeight: 800,
        fontSize: 15,
        color: '#3c3c3c',
        lineHeight: 1.35,
        textAlign: 'center',
      }}>
        What's your level? 🎯
      </p>
      {/* tail pointing left toward mascot */}
      <div style={{
        position: 'absolute',
        left: -13,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 0,
        height: 0,
        borderTop: '8px solid transparent',
        borderBottom: '8px solid transparent',
        borderRight: '13px solid #e5e5e5',
      }}/>
      <div style={{
        position: 'absolute',
        left: -10,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 0,
        height: 0,
        borderTop: '7px solid transparent',
        borderBottom: '7px solid transparent',
        borderRight: '12px solid #fff',
      }}/>
    </div>
  )
}

/* ── Level button (Duolingo style) ── */
function LevelButton({ symbol, label, selected, onClick, delay }) {
  const isEmoji = symbol === '🌱'
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        borderRadius: 16,
        border: `2.5px solid ${selected ? '#58cc02' : '#e5e5e5'}`,
        background: selected ? '#f0fce8' : '#fff',
        boxShadow: selected
          ? '0 4px 0 #46a302'
          : '0 4px 0 #d1d5db',
        cursor: 'pointer',
        fontFamily: "'Baloo 2', sans-serif",
        WebkitTapHighlightColor: 'transparent',
        transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        animation: `levelIn 0.35s ease both`,
        animationDelay: delay,
        transform: selected ? 'translateY(2px)' : 'none',
      }}
    >
      {/* symbol badge */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: selected ? '#58cc02' : '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.15s',
      }}>
        <span style={{
          fontSize: isEmoji ? 22 : 26,
          fontWeight: 900,
          color: selected ? '#fff' : '#6b7280',
          lineHeight: 1,
          fontFamily: isEmoji ? 'inherit' : "'Baloo 2', sans-serif",
        }}>
          {symbol}
        </span>
      </div>
      {/* label */}
      <span style={{
        fontWeight: 800,
        fontSize: 16,
        color: selected ? '#3c3c3c' : '#4b5563',
        textAlign: 'left',
      }}>
        {label}
      </span>
      {/* checkmark */}
      {selected && (
        <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width={22} height={22} viewBox="0 0 22 22" fill="none">
          <circle cx={11} cy={11} r={11} fill="#58cc02"/>
          <path d="M6 11.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

/* ── Main LevelSelect screen ── */
export default function LevelSelect({ onDone }) {
  const [selected, setSelected] = useState(null)

  function handleConfirm() {
    if (selected === null && selected !== 0) return
    const level = LEVELS[selected]
    onDone(level.claim)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      fontFamily: "'Baloo 2', sans-serif",
      maxWidth: 390,
      margin: '0 auto',
    }}>
      <style>{ANIM}</style>

      {/* Mascot + bubble */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: '36px 28px 20px',
      }}>
        <AnimatedMascot />
        <SpeechBubble />
      </div>

      {/* Level buttons */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '0 24px 24px',
      }}>
        {LEVELS.map((lvl, i) => (
          <LevelButton
            key={lvl.claim ?? 'start'}
            symbol={lvl.symbol}
            label={lvl.label}
            selected={selected === i}
            onClick={() => setSelected(i)}
            delay={`${i * 0.06}s`}
          />
        ))}
      </div>

      {/* Confirm button */}
      <div style={{ padding: '0 24px 40px' }}>
        <button
          onClick={handleConfirm}
          disabled={selected === null}
          style={{
            width: '100%',
            border: 'none',
            cursor: selected !== null ? 'pointer' : 'not-allowed',
            padding: '16px',
            borderRadius: 16,
            background: selected !== null ? '#58cc02' : '#e5e5e5',
            boxShadow: selected !== null ? '0 4px 0 #46a302' : '0 4px 0 #c0c0c0',
            color: selected !== null ? '#fff' : '#aaa',
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          CONFIRM →
        </button>
      </div>
    </div>
  )
}
