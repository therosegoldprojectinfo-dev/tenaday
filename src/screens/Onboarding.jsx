import { useState } from 'react'

/* ── inline keyframe styles ── */
const ANIM = `
  @keyframes floaty    { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-14px)} }
  @keyframes bob       { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-10px) rotate(2deg)} }
  @keyframes spinslow  { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes pulse     { 0%,100%{transform:scale(1);opacity:.9} 50%{transform:scale(1.06);opacity:1} }
  @keyframes confettiA { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(22px) rotate(160deg)} }
  @keyframes twinkle   { 0%,100%{opacity:.3;transform:scale(.7)} 50%{opacity:1;transform:scale(1)} }
  @keyframes slideIn   { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
`

/* ── Slide 1 — Welcome ── */
function Slide1() {
  return (
    <div style={{height:380,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
      {/* confetti */}
      <div style={{position:'absolute',top:100,left:54,width:18,height:18,borderRadius:5,background:'#FFB700',animation:'confettiA 1.9s ease-in-out infinite alternate'}}/>
      <div style={{position:'absolute',top:80,right:60,width:14,height:14,borderRadius:4,background:'#1CB0F6',transform:'rotate(20deg)',animation:'confettiA 2.3s ease-in-out infinite alternate'}}/>
      <div style={{position:'absolute',top:190,left:40,width:13,height:13,borderRadius:'50%',background:'#ef4444',animation:'twinkle 1.7s ease-in-out infinite'}}/>
      <div style={{position:'absolute',top:56,left:150,width:12,height:12,borderRadius:4,background:'#58cc02',transform:'rotate(-15deg)',animation:'confettiA 2.1s ease-in-out infinite alternate'}}/>
      <div style={{position:'absolute',top:220,right:46,width:16,height:16,borderRadius:5,background:'#FFB700',transform:'rotate(35deg)',animation:'confettiA 2.5s ease-in-out infinite alternate'}}/>
      <div style={{position:'absolute',top:260,left:96,width:11,height:11,borderRadius:'50%',background:'#1CB0F6',animation:'twinkle 2s ease-in-out infinite'}}/>
      <div style={{position:'absolute',top:130,right:104,width:10,height:24,borderRadius:5,background:'#ef4444',transform:'rotate(40deg)',animation:'confettiA 2.2s ease-in-out infinite alternate'}}/>
      {/* sparkles */}
      <svg viewBox="0 0 24 24" width={26} height={26} style={{position:'absolute',top:130,left:62,animation:'twinkle 1.9s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#FFB700"/></svg>
      <svg viewBox="0 0 24 24" width={20} height={20} style={{position:'absolute',top:260,right:64,animation:'twinkle 2.4s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#1CB0F6"/></svg>
      <svg viewBox="0 0 24 24" width={16} height={16} style={{position:'absolute',top:90,right:118,animation:'twinkle 2.1s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#58cc02"/></svg>
      {/* mascot — use existing asset if available, otherwise draw the purple owl SVG */}
      <MascotOrFallback/>
    </div>
  )
}

function MascotOrFallback() {
  const [err, setErr] = useState(false)
  if (!err) {
    return (
      <img
        src="/numiologoapp.png"
        alt="Numio mascot"
        onError={() => setErr(true)}
        style={{width:200,height:'auto',position:'relative',animation:'bob 3s ease-in-out infinite'}}
      />
    )
  }
  /* inline SVG fallback — friendly purple owl face */
  return (
    <svg viewBox="0 0 200 200" width={200} height={200} style={{position:'relative',animation:'bob 3s ease-in-out infinite'}}>
      <circle cx={100} cy={110} r={80} fill="#a78bfa"/>
      <ellipse cx={70} cy={100} rx={28} ry={28} fill="#fff"/>
      <ellipse cx={130} cy={100} rx={28} ry={28} fill="#fff"/>
      <circle cx={70} cy={100} r={14} fill="#3c3c52"/>
      <circle cx={130} cy={100} r={14} fill="#3c3c52"/>
      <circle cx={75} cy={95} r={5} fill="#fff"/>
      <circle cx={135} cy={95} r={5} fill="#fff"/>
      <path d="M85 140 Q100 158 115 140 Q100 150 85 140 Z" fill="#7ed321"/>
    </svg>
  )
}

/* ── Slide 2 — Earn Coins ── */
function Slide2() {
  return (
    <div style={{height:380,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
      {/* spinning rays */}
      <svg width={260} height={260} viewBox="0 0 320 320" style={{position:'absolute',top:40,animation:'spinslow 26s linear infinite'}}>
        <g fill="#FFE08A">
          <rect x={154} y={14} width={12} height={42} rx={6}/>
          <rect x={154} y={264} width={12} height={42} rx={6}/>
          <rect x={14} y={154} width={42} height={12} rx={6}/>
          <rect x={264} y={154} width={42} height={12} rx={6}/>
          <rect x={52} y={52} width={12} height={40} rx={6} transform="rotate(-45 58 72)"/>
          <rect x={256} y={52} width={12} height={40} rx={6} transform="rotate(45 262 72)"/>
          <rect x={52} y={228} width={12} height={40} rx={6} transform="rotate(45 58 248)"/>
          <rect x={256} y={228} width={12} height={40} rx={6} transform="rotate(-45 262 248)"/>
        </g>
      </svg>
      {/* big coin */}
      <svg width={160} height={160} viewBox="0 0 200 200" style={{position:'absolute',top:90,animation:'pulse 2.4s ease-in-out infinite'}}>
        <circle cx={100} cy={104} r={84} fill="#e09a00"/>
        <circle cx={100} cy={96} r={84} fill="#FFB700"/>
        <circle cx={100} cy={96} r={64} fill="#ffc933"/>
        <path d="M100 50 l13 27 30 4 -22 21 6 30 -27 -15 -27 15 6 -30 -22 -21 30 -4 Z" fill="#fff"/>
      </svg>
      {/* small coins */}
      <svg width={62} height={62} viewBox="0 0 100 100" style={{position:'absolute',bottom:60,left:46,animation:'floaty 2.8s ease-in-out infinite'}}>
        <circle cx={50} cy={54} r={40} fill="#e09a00"/>
        <circle cx={50} cy={50} r={40} fill="#FFB700"/>
        <circle cx={50} cy={50} r={30} fill="#ffc933"/>
        <path d="M50 28 l7 14 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 Z" fill="#fff"/>
      </svg>
      <svg width={44} height={44} viewBox="0 0 100 100" style={{position:'absolute',bottom:120,right:48,animation:'floaty 2.3s ease-in-out infinite'}}>
        <circle cx={50} cy={54} r={40} fill="#e09a00"/>
        <circle cx={50} cy={50} r={40} fill="#FFB700"/>
        <circle cx={50} cy={50} r={30} fill="#ffc933"/>
        <path d="M50 28 l7 14 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 Z" fill="#fff"/>
      </svg>
      <svg viewBox="0 0 24 24" width={20} height={20} style={{position:'absolute',bottom:80,right:120,animation:'twinkle 2s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#FFE08A"/></svg>
      <svg viewBox="0 0 24 24" width={15} height={15} style={{position:'absolute',bottom:40,left:130,animation:'twinkle 2.5s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#FFE08A"/></svg>
    </div>
  )
}

/* ── Slide 3 — Protect Hearts ── */
function Slide3() {
  return (
    <div style={{height:380,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
      {/* spinning rays in red */}
      <svg width={260} height={260} viewBox="0 0 320 320" style={{position:'absolute',top:40,animation:'spinslow 26s linear infinite'}}>
        <g fill="#fecaca">
          <rect x={154} y={14} width={12} height={42} rx={6}/>
          <rect x={154} y={264} width={12} height={42} rx={6}/>
          <rect x={14} y={154} width={42} height={12} rx={6}/>
          <rect x={264} y={154} width={42} height={12} rx={6}/>
          <rect x={52} y={52} width={12} height={40} rx={6} transform="rotate(-45 58 72)"/>
          <rect x={256} y={52} width={12} height={40} rx={6} transform="rotate(45 262 72)"/>
          <rect x={52} y={228} width={12} height={40} rx={6} transform="rotate(45 58 248)"/>
          <rect x={256} y={228} width={12} height={40} rx={6} transform="rotate(-45 262 248)"/>
        </g>
      </svg>

      {/* big heart */}
      <svg width={160} height={150} viewBox="0 0 200 185" style={{position:'absolute',top:90,animation:'pulse 2.4s ease-in-out infinite'}}>
        {/* shadow */}
        <path d="M100 178 C20 130 4 88 4 60 C4 28 26 8 52 8 C72 8 88 20 100 36 C112 20 128 8 148 8 C174 8 196 28 196 60 C196 88 180 130 100 178 Z" fill="#c0392b" transform="translate(0,8)"/>
        {/* main */}
        <path d="M100 178 C20 130 4 88 4 60 C4 28 26 8 52 8 C72 8 88 20 100 36 C112 20 128 8 148 8 C174 8 196 28 196 60 C196 88 180 130 100 178 Z" fill="#ef4444"/>
        {/* shine */}
        <path d="M52 28 q14 -16 34 -12" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" opacity={0.45}/>
      </svg>

      {/* small heart bottom-left */}
      <svg width={62} height={58} viewBox="0 0 100 92" style={{position:'absolute',bottom:60,left:46,animation:'floaty 2.8s ease-in-out infinite'}}>
        <path d="M50 88 C10 64 2 44 2 30 C2 14 13 4 26 4 C36 4 44 10 50 18 C56 10 64 4 74 4 C87 4 98 14 98 30 C98 44 90 64 50 88 Z" fill="#c0392b" transform="translate(0,4)"/>
        <path d="M50 88 C10 64 2 44 2 30 C2 14 13 4 26 4 C36 4 44 10 50 18 C56 10 64 4 74 4 C87 4 98 14 98 30 C98 44 90 64 50 88 Z" fill="#ef4444"/>
      </svg>

      {/* small heart bottom-right */}
      <svg width={44} height={40} viewBox="0 0 100 92" style={{position:'absolute',bottom:120,right:48,animation:'floaty 2.3s ease-in-out infinite'}}>
        <path d="M50 88 C10 64 2 44 2 30 C2 14 13 4 26 4 C36 4 44 10 50 18 C56 10 64 4 74 4 C87 4 98 14 98 30 C98 44 90 64 50 88 Z" fill="#c0392b" transform="translate(0,4)"/>
        <path d="M50 88 C10 64 2 44 2 30 C2 14 13 4 26 4 C36 4 44 10 50 18 C56 10 64 4 74 4 C87 4 98 14 98 30 C98 44 90 64 50 88 Z" fill="#ef4444"/>
      </svg>

      {/* sparkles */}
      <svg viewBox="0 0 24 24" width={20} height={20} style={{position:'absolute',bottom:80,right:120,animation:'twinkle 2s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#ef4444"/></svg>
      <svg viewBox="0 0 24 24" width={15} height={15} style={{position:'absolute',bottom:40,left:130,animation:'twinkle 2.5s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#fecaca"/></svg>
    </div>
  )
}

/* ── Slide 4 — One Unit Per Day ── */
function Slide4() {
  return (
    <div style={{height:380,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
      {/* spinning rays — same as coins slide but in blue */}
      <svg width={260} height={260} viewBox="0 0 320 320" style={{position:'absolute',top:40,animation:'spinslow 26s linear infinite'}}>
        <g fill="#b3e5fc">
          <rect x={154} y={14} width={12} height={42} rx={6}/>
          <rect x={154} y={264} width={12} height={42} rx={6}/>
          <rect x={14} y={154} width={42} height={12} rx={6}/>
          <rect x={264} y={154} width={42} height={12} rx={6}/>
          <rect x={52} y={52} width={12} height={40} rx={6} transform="rotate(-45 58 72)"/>
          <rect x={256} y={52} width={12} height={40} rx={6} transform="rotate(45 262 72)"/>
          <rect x={52} y={228} width={12} height={40} rx={6} transform="rotate(45 58 248)"/>
          <rect x={256} y={228} width={12} height={40} rx={6} transform="rotate(-45 262 248)"/>
        </g>
      </svg>

      {/* big clock */}
      <svg width={160} height={160} viewBox="0 0 200 200" style={{position:'absolute',top:90,animation:'pulse 2.4s ease-in-out infinite'}}>
        {/* shadow ring */}
        <circle cx={100} cy={108} r={84} fill="#0d8fcf"/>
        {/* face */}
        <circle cx={100} cy={100} r={84} fill="#1CB0F6"/>
        {/* inner face */}
        <circle cx={100} cy={100} r={68} fill="#e8f7ff"/>
        {/* hour marks */}
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg,i) => {
          const r = deg * Math.PI / 180
          const x1 = 100 + 56*Math.sin(r), y1 = 100 - 56*Math.cos(r)
          const x2 = 100 + 64*Math.sin(r), y2 = 100 - 64*Math.cos(r)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1CB0F6" strokeWidth={i%3===0?4:2.5} strokeLinecap="round"/>
        })}
        {/* hour hand — pointing ~10 */}
        <line x1={100} y1={100} x2={72} y2={60} stroke="#1a1a2e" strokeWidth={7} strokeLinecap="round"/>
        {/* minute hand — pointing ~2 */}
        <line x1={100} y1={100} x2={134} y2={54} stroke="#1a1a2e" strokeWidth={5} strokeLinecap="round"/>
        {/* center dot */}
        <circle cx={100} cy={100} r={8} fill="#1CB0F6"/>
        <circle cx={100} cy={100} r={4} fill="#fff"/>
      </svg>

      {/* small clock top-left */}
      <svg width={62} height={62} viewBox="0 0 100 100" style={{position:'absolute',bottom:60,left:46,animation:'floaty 2.8s ease-in-out infinite'}}>
        <circle cx={50} cy={54} r={40} fill="#0d8fcf"/>
        <circle cx={50} cy={50} r={40} fill="#1CB0F6"/>
        <circle cx={50} cy={50} r={30} fill="#e8f7ff"/>
        <line x1={50} y1={50} x2={36} y2={30} stroke="#1a1a2e" strokeWidth={4} strokeLinecap="round"/>
        <line x1={50} y1={50} x2={67} y2={27} stroke="#1a1a2e" strokeWidth={3} strokeLinecap="round"/>
        <circle cx={50} cy={50} r={5} fill="#1CB0F6"/>
      </svg>

      {/* small clock bottom-right */}
      <svg width={44} height={44} viewBox="0 0 100 100" style={{position:'absolute',bottom:120,right:48,animation:'floaty 2.3s ease-in-out infinite'}}>
        <circle cx={50} cy={54} r={40} fill="#0d8fcf"/>
        <circle cx={50} cy={50} r={40} fill="#1CB0F6"/>
        <circle cx={50} cy={50} r={30} fill="#e8f7ff"/>
        <line x1={50} y1={50} x2={36} y2={30} stroke="#1a1a2e" strokeWidth={4} strokeLinecap="round"/>
        <line x1={50} y1={50} x2={67} y2={27} stroke="#1a1a2e" strokeWidth={3} strokeLinecap="round"/>
        <circle cx={50} cy={50} r={5} fill="#1CB0F6"/>
      </svg>

      {/* sparkles */}
      <svg viewBox="0 0 24 24" width={20} height={20} style={{position:'absolute',bottom:80,right:120,animation:'twinkle 2s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#1CB0F6"/></svg>
      <svg viewBox="0 0 24 24" width={15} height={15} style={{position:'absolute',bottom:40,left:130,animation:'twinkle 2.5s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#b3e5fc"/></svg>
    </div>
  )
}

/* ── Slide config ── */
const SLIDES = [
  {
    component: Slide1,
    title: 'Welcome to Numio! 🎉',
    sub: 'Math made fun, one day at a time.',
    dotColor: '#58cc02',
    isLast: false,
  },
  {
    component: Slide2,
    title: 'Answer right, earn coins ⭐',
    sub: 'Use your coins to unlock real rewards!',
    dotColor: '#FFB700',
    isLast: false,
  },
  {
    component: Slide3,
    title: 'Protect your hearts ❤️',
    sub: 'Wrong answers cost a heart. Recharge with coins!',
    dotColor: '#ef4444',
    isLast: false,
  },
  {
    component: Slide4,
    title: 'One unit per day 🌙',
    sub: "Finish today's unit and come back tomorrow!",
    dotColor: '#1CB0F6',
    isLast: true,
  },
]

/* ── Main Onboarding component ── */
export default function Onboarding({ onDone }) {
  const [current, setCurrent] = useState(0)
  const [fading, setFading] = useState(false)

  const slide = SLIDES[current]
  const SlideContent = slide.component

  function handleNext() {
    if (fading) return
    if (slide.isLast) { onDone(); return }
    setFading(true)
    setTimeout(() => {
      setCurrent(c => c + 1)
      setFading(false)
    }, 200)
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        background: '#ffffff',
        fontFamily: "'Baloo 2', sans-serif",
        transition: 'opacity 0.2s ease',
        opacity: fading ? 0 : 1,
        maxWidth: 390,
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{ANIM}</style>

      {/* Illustration area */}
      <div style={{flex: 1, position: 'relative', minHeight: 0}}>
        <SlideContent key={current}/>
      </div>

      {/* Text + dots + button */}
      <div style={{padding: '0 32px 40px', textAlign: 'center'}}>
        <h1 style={{
          margin: '0 0 10px',
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700,
          fontSize: 28,
          lineHeight: 1.15,
          color: '#3c3c3c',
        }}>
          {slide.title}
        </h1>
        <p style={{
          margin: '0 0 22px',
          fontWeight: 700,
          fontSize: 16,
          lineHeight: 1.45,
          color: '#777',
        }}>
          {slide.sub}
        </p>

        {/* dots */}
        <div style={{display:'flex', gap:8, justifyContent:'center', marginBottom:20}}>
          {SLIDES.map((s, i) => (
            <div key={i} style={{
              height: 8,
              width: i === current ? 26 : 8,
              borderRadius: 4,
              background: i === current ? slide.dotColor : '#e5e5e5',
              transition: 'all 0.3s ease',
            }}/>
          ))}
        </div>

        {/* button */}
        <button
          onClick={handleNext}
          style={{
            width: '100%',
            border: 'none',
            cursor: 'pointer',
            padding: '16px',
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
          {slide.isLast ? 'GET STARTED →' : 'CONTINUE →'}
        </button>
      </div>
    </div>
  )
}
