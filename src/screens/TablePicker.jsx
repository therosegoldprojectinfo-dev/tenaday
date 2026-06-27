import { useState } from 'react'

const ANIM = `
  @keyframes breathe {
    0%,100% { transform: scale(1); }
    50%      { transform: scale(1.045); }
  }
  @keyframes bubblePop {
    from { opacity:0; transform: scale(0.85) translateY(6px); }
    to   { opacity:1; transform: scale(1)    translateY(0); }
  }
  @keyframes tileIn {
    from { opacity:0; transform: scale(0.7); }
    to   { opacity:1; transform: scale(1); }
  }
`

const OP_LABELS = {
  addition:       'addition',
  subtraction:    'subtraction',
  multiplication: 'multiplication',
  division:       'division',
}

const OP_SYMBOLS = {
  addition:       '+',
  subtraction:    '−',
  multiplication: '×',
  division:       '÷',
}

/* ── Animated mascot ── */
function AnimatedMascot() {
  return (
    <div style={{ animation: 'breathe 3.2s ease-in-out infinite', display: 'inline-block' }}>
      <img
        src="/onboarding-mascot.png"
        alt="Numio mascot"
        style={{ width: 90, height: 'auto', display: 'block' }}
      />
    </div>
  )
}

/* ── Speech bubble ── */
function SpeechBubble({ operation }) {
  const symbol = OP_SYMBOLS[operation] || '+'
  const label  = OP_LABELS[operation]  || ''
  return (
    <div style={{
      position: 'relative',
      background: '#fff',
      border: '2.5px solid #e5e5e5',
      borderRadius: 18,
      padding: '11px 16px',
      maxWidth: 200,
      animation: 'bubblePop 0.4s cubic-bezier(.34,1.56,.64,1) both',
      boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
    }}>
      <p style={{
        margin: 0,
        fontFamily: "'Baloo 2', sans-serif",
        fontWeight: 800,
        fontSize: 14,
        color: '#3c3c3c',
        lineHeight: 1.35,
        textAlign: 'center',
      }}>
        Which {label} {symbol} tables do you know? 💪
      </p>
      {/* tail */}
      <div style={{
        position: 'absolute', left: -13, top: '50%',
        transform: 'translateY(-50%)', width: 0, height: 0,
        borderTop: '8px solid transparent',
        borderBottom: '8px solid transparent',
        borderRight: '13px solid #e5e5e5',
      }}/>
      <div style={{
        position: 'absolute', left: -10, top: '50%',
        transform: 'translateY(-50%)', width: 0, height: 0,
        borderTop: '7px solid transparent',
        borderBottom: '7px solid transparent',
        borderRight: '12px solid #fff',
      }}/>
    </div>
  )
}

/* ── Table tile ── */
function TableTile({ n, selected, onToggle, delay }) {
  return (
    <button
      onClick={() => onToggle(n)}
      style={{
        width: '100%',
        aspectRatio: '1',
        borderRadius: 14,
        border: `2.5px solid ${selected ? '#58cc02' : '#e5e5e5'}`,
        background: selected ? '#58cc02' : '#fff',
        boxShadow: selected ? '0 3px 0 #46a302' : '0 3px 0 #d1d5db',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        fontFamily: "'Baloo 2', sans-serif",
        WebkitTapHighlightColor: 'transparent',
        transition: 'all 0.15s ease',
        animation: `tileIn 0.3s ease both`,
        animationDelay: delay,
        transform: selected ? 'translateY(1px)' : 'none',
      }}
    >
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.8)' : '#9ca3af',
        lineHeight: 1,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        Table
      </span>
      <span style={{
        fontSize: 22,
        fontWeight: 900,
        color: selected ? '#fff' : '#3c3c3c',
        lineHeight: 1,
      }}>
        {n}
      </span>
    </button>
  )
}

/* ── Main TablePicker screen ── */
export default function TablePicker({ operation, onDone }) {
  const [selected, setSelected] = useState(new Set())

  function toggle(n) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(n) ? next.delete(n) : next.add(n)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set([1,2,3,4,5,6,7,8,9,10,11,12]))
  }

  const allSelected = selected.size === 12
  const canContinue = selected.size > 0

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
        padding: '28px 24px 16px',
      }}>
        <AnimatedMascot />
        <SpeechBubble operation={operation} />
      </div>

      {/* Select all toggle */}
      <div style={{ padding: '0 24px 12px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={selectAll}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 13,
            color: allSelected ? '#aaa' : '#58cc02',
            padding: '4px 8px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {allSelected ? '✓ All selected' : 'Select all'}
        </button>
      </div>

      {/* 4×3 grid of tables */}
      <div style={{
        flex: 1,
        padding: '0 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
        alignContent: 'start',
      }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
          <TableTile
            key={n}
            n={n}
            selected={selected.has(n)}
            onToggle={toggle}
            delay={`${(n - 1) * 0.03}s`}
          />
        ))}
      </div>

      {/* Continue button */}
      <div style={{ padding: '20px 24px 40px' }}>
        <button
          onClick={() => canContinue && onDone(Array.from(selected))}
          disabled={!canContinue}
          style={{
            width: '100%',
            border: 'none',
            cursor: canContinue ? 'pointer' : 'not-allowed',
            padding: '16px',
            borderRadius: 16,
            background: canContinue ? '#58cc02' : '#e5e5e5',
            boxShadow: canContinue ? '0 4px 0 #46a302' : '0 4px 0 #c0c0c0',
            color: canContinue ? '#fff' : '#aaa',
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          CONTINUE →
        </button>
      </div>
    </div>
  )
}
