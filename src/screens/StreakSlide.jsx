// StreakSlide.jsx
// Shown after Welcome is completed every day.
// Displays the kid's day streak with lightning bolt circles.

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

function LightningIcon({ filled, size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"
        fill={filled ? '#1a1a1a' : '#d1d5db'}
        stroke="none"
      />
    </svg>
  )
}

function DayCircle({ label, filled, isCurrent, delay }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        backgroundColor: filled ? '#d4f000' : '#f3f4f6',
        border: isCurrent ? '3px solid #d4f000' : '3px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: filled ? `lightning-pop 0.4s ${delay}s ease both` : 'none',
        boxShadow: filled ? '0 2px 8px rgba(212,240,0,0.4)' : 'none',
      }}>
        <LightningIcon filled={filled} size={28} />
      </div>
      <span style={{
        fontFamily: "'Baloo 2', sans-serif",
        fontWeight: isCurrent ? 800 : 600,
        fontSize: 13,
        color: isCurrent ? '#1a1a1a' : '#9ca3af',
      }}>
        {label}
      </span>
    </div>
  )
}

export default function StreakSlide({ dayStreak = 1, onContinue }) {
  // Figure out which day of week today is (0=Su)
  const todayIdx = new Date().getDay()

  // Build 7 day circles — filled for days up to and including today based on streak
  // Streak tells us how many consecutive days. We show today + previous streak-1 days filled.
  const circles = DAYS.map((label, i) => {
    // Days that are "filled" = today and the streak-1 days before it (wrapping)
    const daysBack = (todayIdx - i + 7) % 7
    const filled = daysBack < dayStreak
    const isCurrent = i === todayIdx
    return { label, filled, isCurrent }
  })

  const isDay1 = dayStreak <= 1
  const headlineText = isDay1
    ? "Your streak has started! ⚡"
    : `Your streak is on fire! ${dayStreak} days! 🔥`

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      fontFamily: "'Baloo 2', sans-serif",
      padding: '40px 24px',
      maxWidth: 390,
      margin: '0 auto',
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
        {isDay1 ? 'Come back tomorrow to keep it going!' : 'Amazing work — keep showing up!'}
      </p>

      {/* Day circles */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 48,
        animation: 'fadeUp 0.5s 0.3s ease both',
      }}>
        {circles.map((c, i) => (
          <DayCircle
            key={c.label}
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
