// StreakSlide.jsx
// trigger = 'welcome' → shown after Welcome (Day 2+) — today partial
// trigger = 'review'  → shown after Review — today fully complete
// trigger = 'review_day1' → shown after Review on Day 1 — streak just started

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
  @keyframes half-pulse {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.5; }
  }
`

function LightningIcon({ filled, half, size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="half-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="50%" stopColor="#1a1a1a" />
          <stop offset="50%" stopColor="#d1d5db" />
        </linearGradient>
      </defs>
      <path
        d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z"
        fill={filled ? '#1a1a1a' : half ? 'url(#half-grad)' : '#d1d5db'}
      />
    </svg>
  )
}

function DayCircle({ label, filled, half, isCurrent, delay }) {
  const bg = filled ? '#d4f000' : half ? '#f0f0a0' : '#f3f4f6'
  const shadow = filled ? '0 2px 8px rgba(212,240,0,0.5)' : half ? '0 2px 8px rgba(212,240,0,0.2)' : 'none'
  const anim = filled
    ? `lightning-pop 0.4s ${delay}s ease both`
    : half
      ? `lightning-pop 0.4s ${delay}s ease both, half-pulse 1.8s ${delay + 0.4}s ease-in-out infinite`
      : 'none'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        backgroundColor: bg,
        border: isCurrent ? '3px solid #d4f000' : '3px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: anim,
        boxShadow: shadow,
        flexShrink: 0,
      }}>
        <LightningIcon filled={filled} half={half} size={20} />
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

export default function StreakSlide({ dayStreak = 1, trigger = 'welcome', onContinue }) {
  const todayIdx = new Date().getDay()
  const todayComplete = trigger === 'review' || trigger === 'review_day1'
  const isDay1Review = trigger === 'review_day1'

  // Build 5 circles: 2 back + today + 2 ahead
  const circleIndices = Array.from({ length: 5 }, (_, i) => {
    const offset = -2 + i // -2, -1, 0, 1, 2
    const dayIdx = ((todayIdx + offset) % 7 + 7) % 7
    const isCurrent = offset === 0
    const daysBack = -offset

    let filled = false
    let half = false

    if (offset < 0) {
      // Past days — filled if within streak
      filled = daysBack <= dayStreak
    } else if (offset === 0) {
      // Today
      if (todayComplete) {
        filled = true  // Review done — full day complete
      } else {
        half = dayStreak > 0  // Welcome done — partial day
      }
    }
    // Future days always empty

    return { label: DAYS[dayIdx], filled, half, isCurrent, offset }
  })

  // Headline and subtext based on trigger
  let headline, subtext
  if (isDay1Review) {
    headline = 'Your streak has started! ⚡'
    subtext  = 'You completed your first full day! Come back tomorrow to keep it going! 🔥'
  } else if (trigger === 'review') {
    headline = `${dayStreak} day streak completed! 🔥`
    subtext  = 'Amazing — you finished the full day! See you tomorrow! 🌟'
  } else {
    // welcome trigger — Day 2+
    headline = 'Your streak continues! 🔥'
    subtext  = `Finish today's activities to complete your ${dayStreak} day streak!`
  }

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
        {headline}
      </h1>

      <p style={{
        margin: '0 0 36px',
        fontFamily: "'Baloo 2', sans-serif",
        fontWeight: 600, fontSize: 15,
        color: '#6b7280', textAlign: 'center',
        animation: 'fadeUp 0.5s 0.2s ease both',
      }}>
        {subtext}
      </p>

      {/* Day circles */}
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
            half={c.half}
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
