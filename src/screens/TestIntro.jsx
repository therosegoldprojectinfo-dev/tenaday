const ANIM = `
  @keyframes breathe {
    0%,100% { transform: scale(1) translateY(0); }
    50%      { transform: scale(1.04) translateY(-6px); }
  }
  @keyframes shadowPulse {
    0%,100% { transform: scaleX(1); opacity: 0.18; }
    50%      { transform: scaleX(0.82); opacity: 0.10; }
  }
  @keyframes fadeUp {
    from { opacity:0; transform: translateY(20px); }
    to   { opacity:1; transform: translateY(0); }
  }
`

export default function TestIntro({ onStart, onSkip }) {
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

      {/* Main content — centered */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 36px 20px',
        gap: 0,
      }}>
        {/* Mascot + shadow */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 32 }}>
          <img
            src="/ChatGPT Image 27 juin 2026, 14_15_36.png"
            alt="Numio test mascot"
            style={{
              width: 180,
              height: 'auto',
              display: 'block',
              animation: 'breathe 2.8s ease-in-out infinite',
              position: 'relative',
              zIndex: 1,
            }}
          />
          {/* ground shadow */}
          <div style={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 120,
            height: 14,
            borderRadius: '50%',
            background: '#000',
            opacity: 0.12,
            animation: 'shadowPulse 2.8s ease-in-out infinite',
          }}/>
        </div>

        {/* Text */}
        <p style={{
          margin: 0,
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          fontSize: 22,
          lineHeight: 1.35,
          color: '#3c3c3c',
          textAlign: 'center',
          animation: 'fadeUp 0.5s 0.1s ease both',
        }}>
          Get <span style={{ color: '#58cc02' }}>25 good answers</span> in this test to confirm your level!
        </p>
      </div>

      {/* Bottom bar — like the Duolingo screenshot */}
      <div style={{
        borderTop: '2px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 28px 36px',
        gap: 16,
      }}>
        {/* Skip */}
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 14,
            color: '#1CB0F6',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '8px 4px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          MAYBE LATER
        </button>

        {/* Continue */}
        <button
          onClick={onStart}
          style={{
            flex: 1,
            maxWidth: 200,
            border: 'none',
            cursor: 'pointer',
            padding: '15px 24px',
            borderRadius: 16,
            background: '#58cc02',
            boxShadow: '0 4px 0 #46a302',
            color: '#fff',
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          CONTINUE →
        </button>
      </div>
    </div>
  )
}
