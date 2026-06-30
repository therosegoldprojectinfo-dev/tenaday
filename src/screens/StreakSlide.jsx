// StreakSlide.jsx — shown after Welcome every day

const DAYS = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa']

const ANIM = `
  @keyframes lightning-pop {
    0%   { transform: scale(0.5); opacity: 0; }
    60%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes mascot-float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-10px); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`

function LightningIcon({ filled, size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"
        fill={filled ? '#1a1a1a' : '#d1d5db'}
      />
    </svg>
  )
}

function DayCircle({ label, filled, isCurrent, delay }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        backgroundColor: filled ? '#d4f000' : '#f3f4f6',
        border: isCurrent ? '3px solid #d4f000' : '3px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: filled ? `lightning-pop 0.4s ${delay}s ease both` : 'none',
        boxShadow: filled ? '0 2px 8px rgba(212,240,0,0.5)' : 'none',
        flexShrink: 0,
      }}>
        <LightningIcon filled={filled} size={20} />
      </div>
      <span style={{
        fontFamily: "'Baloo 2', sans-serif",
        fontWeight: isCurrent ? 800 : 600,
        fontSize: 11,
        color: isCurrent ? '#1a1a1a' : '#9ca3af',
      }}>
        {label}
      </span>
    </div>
  )
}

export default function StreakSlide({ dayStreak = 1, onContinue }) {
  const todayIdx = new Date().getDay() // 0=Su, 1=M, ...

  // Show 2 days back + today + 2 ahead = 5 circles (fits mobile)
  const windowSize = 5
  const startOffset = -2
  const circleIndices = Array.from({ length: windowSize }, (_, i) => {
    const offset = startOffset + i // -2, -1, 0, 1, 2
    const dayIdx = ((todayIdx + offset) % 7 + 7) % 7
    const isCurrent = offset === 0
    const daysBack = -offset
    const filled = offset <= 0 && daysBack < dayStreak
    return { label: DAYS[dayIdx], filled, isCurrent, offset }
  })

  const isDay1 = dayStreak === 1
  const isFreshStart = dayStreak < 1
  const headlineText = isFreshStart
    ? "Let's build a streak! ⚡"
    : isDay1
      ? 'Your streak has started! ⚡'
      : `${dayStreak} days in a row! 🔥`

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      fontFamily: "'Baloo 2', sans-serif",
      padding: '40px 20px',
      maxWidth: 390,
      margin: '0 auto',
      boxSizing: 'border-box',
    }}>
      <style>{ANIM}</style>

      {/* Mascot */}
      <div style={{ animation: 'mascot-float 2s ease-in-out infinite', marginBottom: 28 }}>
        <img src="/onboarding-mascot.png" alt="Numio"
          style={{ width: 120, height: 'auto', display: 'block' }} />
      </div>

      {/* Headline */}
      <h1 style={{
        margin: '0 0 8px',
        fontFamily: "'Baloo 2', sans-serif",
        fontWeight: 800, fontSize: 26,
        color: '#1a1a1a', textAlign: 'center',
        animation: 'fadeUp 0.5s 0.1s ease both',
      }}>
        {headlineText}
      </h1>

      <p style={{
        margin: '0 0 36px',
        fontFamily: "'Baloo 2', sans-serif",
        fontWeight: 600, fontSize: 15,
        color: '#6b7280', textAlign: 'center',
        animation: 'fadeUp 0.5s 0.2s ease both',
      }}>
        {isFreshStart ? 'Finish a full day to start your streak!' : isDay1 ? 'Come back tomorrow to keep it going!' : 'Amazing — keep showing up!'}
      </p>

      {/* Day circles — 3 back + today + 2 ahead, small, fits on mobile */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 48,
        animation: 'fadeUp 0.5s 0.3s ease both',
        width: '100%', justifyContent: 'center',
      }}>
        {circleIndices.map((c, i) => (
          <DayCircle
            key={i}
            label={c.label}
            filled={c.filled}
            isCurrent={c.isCurrent}
            delay={0.3 + i * 0.07}
          />
        ))}
      </div>

      {/* Button */}
      <button
        onClick={onContinue}
        style={{
          width: '100%', maxWidth: 340,
          border: 'none', cursor: 'pointer',
          padding: '16px 0', borderRadius: 16,
          background: '#58cc02', boxShadow: '0 4px 0 #46a302',
          color: '#fff', fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800, fontSize: 18,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          animation: 'fadeUp 0.5s 0.5s ease both',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        PERFECT →
      </button>
    </div>
  )
}
