import { useState } from 'react'

// ── Confetti dots for slide 1 ────────────────────────────────────────────
const CONFETTI = [
  { x: 12, y: 8,  color: '#FFB700', shape: 'square', size: 12 },
  { x: 78, y: 12, color: '#58cc02', shape: 'circle', size: 10 },
  { x: 88, y: 25, color: '#1CB0F6', shape: 'square', size: 8  },
  { x: 5,  y: 30, color: '#FF4B4B', shape: 'circle', size: 8  },
  { x: 20, y: 55, color: '#FF9600', shape: 'square', size: 10 },
  { x: 82, y: 52, color: '#CE82FF', shape: 'circle', size: 10 },
  { x: 70, y: 8,  color: '#FFB700', shape: 'circle', size: 6  },
  { x: 35, y: 10, color: '#1CB0F6', shape: 'square', size: 7  },
  { x: 90, y: 60, color: '#FF4B4B', shape: 'square', size: 6  },
  { x: 8,  y: 65, color: '#58cc02', shape: 'circle', size: 7  },
]

// ── Slide illustrations ──────────────────────────────────────────────────

function Slide1() {
  return (
    <div className="flex-1 flex items-center justify-center relative w-full overflow-hidden">
      {/* Confetti */}
      {CONFETTI.map((c, i) => (
        <div key={i} className="absolute"
          style={{
            left: `${c.x}%`, top: `${c.y}%`,
            width: c.size, height: c.size,
            backgroundColor: c.color,
            borderRadius: c.shape === 'circle' ? '50%' : '2px',
            animation: `confettiFloat ${1.5 + i * 0.2}s ease-in-out infinite alternate`,
          }} />
      ))}
      {/* Mascot */}
      <img
        src="/onboarding-mascot.png"
        alt="Numio mascot"
        className="w-52 h-52 object-contain"
        style={{ animation: 'mascotBounce 2s ease-in-out infinite' }}
        draggable={false}
      />
    </div>
  )
}

function Slide2() {
  return (
    <div className="flex-1 flex items-center justify-center relative w-full">
      {/* Big coin */}
      <div className="relative" style={{ animation: 'mascotBounce 2s ease-in-out infinite' }}>
        <div className="w-44 h-44 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#FFB700', boxShadow: '0 6px 0 #CC8800' }}>
          <div className="w-36 h-36 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#FFD700' }}>
            <svg width="72" height="72" viewBox="0 0 24 24" fill="white">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </div>
        </div>
        {/* Rays */}
        {[0,45,90,135,180,225,270,315].map((deg, i) => (
          <div key={i} className="absolute w-3 h-7 rounded-full"
            style={{
              backgroundColor: '#FFD700',
              top: '50%', left: '50%',
              transformOrigin: '50% 110px',
              transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-110px)`,
              opacity: 0.8,
            }} />
        ))}
      </div>
      {/* Small floating coins */}
      <div className="absolute bottom-24 left-16 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: '#FFB700', animation: 'confettiFloat 1.8s ease-in-out infinite alternate' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      </div>
      <div className="absolute bottom-16 right-16 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: '#FFB700', animation: 'confettiFloat 2.2s ease-in-out infinite alternate' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      </div>
    </div>
  )
}

function Slide3() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
      {/* 5 hearts row */}
      <div className="flex gap-3">
        {[0,1,2,3].map(i => (
          <span key={i} className="text-5xl" style={{ animation: `mascotBounce ${1.5 + i * 0.1}s ease-in-out infinite` }}>❤️</span>
        ))}
        {/* Broken heart */}
        <div className="relative" style={{ animation: 'mascotBounce 1.9s ease-in-out infinite' }}>
          <span className="text-5xl" style={{ filter: 'grayscale(0.3) opacity(0.7)' }}>🤍</span>
          <span className="absolute top-0 left-0 text-5xl" style={{ clipPath: 'inset(0 50% 0 0)' }}>❤️</span>
        </div>
      </div>
      {/* Big broken heart */}
      <div className="relative" style={{ animation: 'heartBreak 2s ease-in-out infinite' }}>
        <div className="flex">
          {/* Left half — red */}
          <div style={{ fontSize: 100, lineHeight: 1, clipPath: 'inset(0 50% 0 0)', marginRight: -2 }}>❤️</div>
          {/* Right half — gray */}
          <div style={{ fontSize: 100, lineHeight: 1, clipPath: 'inset(0 0 0 50%)', filter: 'grayscale(1) opacity(0.5)', marginLeft: -2 }}>❤️</div>
        </div>
        {/* Fragments */}
        {[
          { top: -10, left: 30, rot: -20 },
          { top: -5,  left: 70, rot: 15  },
          { top: 60,  left: 10, rot: -30 },
          { top: 70,  left: 80, rot: 25  },
        ].map((f, i) => (
          <div key={i} className="absolute w-3 h-3 rounded-sm"
            style={{
              backgroundColor: '#ef4444',
              top: f.top, left: f.left,
              transform: `rotate(${f.rot}deg)`,
              opacity: 0.7,
              animation: `confettiFloat ${1.2 + i * 0.3}s ease-in-out infinite alternate`,
            }} />
        ))}
      </div>
    </div>
  )
}

function Slide4() {
  return (
    <div className="flex-1 flex items-center justify-center w-full px-6">
      {/* Day/night scene card */}
      <div className="w-full rounded-3xl overflow-hidden relative"
        style={{ height: 220, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
        {/* Day side */}
        <div className="absolute inset-0 left-0" style={{ width: '52%', backgroundColor: '#87CEEB' }}>
          {/* Sun */}
          <div className="absolute w-16 h-16 rounded-full"
            style={{ backgroundColor: '#FFD700', top: 20, left: 20, boxShadow: '0 0 20px #FFB700' }} />
          {/* Sun rays */}
          {[0,60,120,180,240,300].map((deg, i) => (
            <div key={i} className="absolute w-1.5 h-5 rounded-full"
              style={{
                backgroundColor: '#FFD700',
                top: 48, left: 48,
                transformOrigin: '50% 32px',
                transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-32px)`,
                opacity: 0.8,
              }} />
          ))}
          {/* Green hill */}
          <div className="absolute bottom-0 left-0 right-0 h-16 rounded-tl-full"
            style={{ backgroundColor: '#58cc02' }} />
        </div>

        {/* Diagonal separator */}
        <div className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom right, transparent 49%, #1a2a5e 50%)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />

        {/* Night side */}
        <div className="absolute inset-0 right-0" style={{ left: '48%', backgroundColor: '#1a2a5e' }}>
          {/* Moon */}
          <div className="absolute w-12 h-12 rounded-full"
            style={{ backgroundColor: '#FFD700', top: 20, right: 20, boxShadow: '0 0 15px rgba(255,215,0,0.4)' }}>
            <div className="absolute w-9 h-9 rounded-full"
              style={{ backgroundColor: '#1a2a5e', top: 2, left: -4 }} />
          </div>
          {/* Stars */}
          {[[20,50],[40,25],[60,45],[80,15],[30,70]].map(([x,y], i) => (
            <div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-white"
              style={{ left: `${x}%`, top: y, opacity: 0.8, animation: `confettiFloat ${1 + i * 0.4}s ease-in-out infinite alternate` }} />
          ))}
          {/* Green hill */}
          <div className="absolute bottom-0 left-0 right-0 h-16"
            style={{ backgroundColor: '#3a7d00', borderRadius: '60% 60% 0 0' }} />
        </div>

        {/* Calendar icon in center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white rounded-2xl w-14 h-14 flex items-center justify-center"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <div className="text-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#1CB0F6' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Slide data ───────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 1,
    illustration: <Slide1 />,
    title: 'Welcome to Numio! 🎉',
    subtitle: 'Math made fun, one day at a time.',
    dotColor: '#58cc02',
  },
  {
    id: 2,
    illustration: <Slide2 />,
    title: 'Answer right, earn coins ⭐',
    subtitle: 'Use your coins to unlock real rewards!',
    dotColor: '#FFB700',
  },
  {
    id: 3,
    illustration: <Slide3 />,
    title: 'Protect your hearts ❤️',
    subtitle: 'Wrong answers cost a heart. Recharge with coins!',
    dotColor: '#ef4444',
  },
  {
    id: 4,
    illustration: <Slide4 />,
    title: 'One unit per day 🌙',
    subtitle: 'Finish today\'s unit and come back tomorrow for more!',
    dotColor: '#1CB0F6',
  },
]

// ── Main Onboarding component ────────────────────────────────────────────
export default function Onboarding({ onDone }) {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  function handleNext() {
    if (animating) return
    if (isLast) { onDone(); return }
    setAnimating(true)
    setTimeout(() => {
      setCurrent(c => c + 1)
      setAnimating(false)
    }, 200)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes mascotBounce {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes confettiFloat {
          0%   { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-8px) rotate(15deg); }
        }
        @keyframes heartBreak {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.05); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        className="w-full max-w-sm mx-auto flex flex-col min-h-screen bg-white px-6 pt-10 pb-8"
        style={{ animation: 'slideIn 0.3s ease forwards', opacity: animating ? 0 : 1, transition: 'opacity 0.2s ease' }}
      >
        {/* Illustration area */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {slide.illustration}
        </div>

        {/* Text */}
        <div className="text-center mb-6">
          <h1 className="font-display font-bold text-2xl text-gray-900 mb-2 leading-snug">
            {slide.title}
          </h1>
          <p className="font-body text-base text-gray-400 leading-relaxed">
            {slide.subtitle}
          </p>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mb-6">
          {SLIDES.map((s, i) => (
            <div key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                backgroundColor: i === current ? slide.dotColor : '#E5E7EB',
              }} />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-body font-bold text-lg tracking-widest text-white transition-all active:scale-95"
          style={{
            backgroundColor: '#58cc02',
            boxShadow: '0 4px 0 0 #46a302',
          }}
        >
          {isLast ? 'GET STARTED →' : 'CONTINUE →'}
        </button>
      </div>
    </div>
  )
}
