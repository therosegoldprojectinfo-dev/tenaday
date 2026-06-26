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
    <div style={{height:380,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:34}}>
      {/* hearts row */}
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        {[0,1,2,3].map(i => (
          <svg key={i} width={48} height={44} viewBox="0 0 48 44">
            <path d="M24 42 C6 28 2 18 2 12 C2 5 7 1 13 1 C18 1 22 4 24 8 C26 4 30 1 35 1 C41 1 46 5 46 12 C46 18 42 28 24 42 Z" fill="#ef4444"/>
          </svg>
        ))}
        {/* cracked heart */}
        <svg width={56} height={52} viewBox="0 0 56 52" style={{overflow:'visible',animation:'bob 1.6s ease-in-out infinite'}}>
          <path d="M28 49 C7 33 2 22 2 14 C2 6 8 1 15 1 C21 1 25 4 28 9 C31 4 35 1 41 1 C48 1 54 6 54 14 C54 22 49 33 28 49 Z" fill="#e5e5e5"/>
          <path d="M28 9 C25 4 21 1 15 1 C8 1 2 6 2 14 C2 22 7 33 24 47 L30 30 L22 26 L31 18 L26 13 Z" fill="#ef4444"/>
          <path d="M30 30 L40 24" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx={48} cy={6} r={2.5} fill="#ef4444"/>
          <circle cx={52} cy={14} r={2} fill="#ef4444"/>
        </svg>
      </div>
      {/* big broken heart */}
      <svg width={200} height={185} viewBox="0 0 120 110" style={{overflow:'visible'}}>
        <g fill="#ef4444" style={{animation:'twinkle 2.2s ease-in-out infinite'}}>
          <path d="M14 24 l8 3 -4 7 Z"/>
          <circle cx={6} cy={46} r={4}/>
          <path d="M108 22 l-8 4 5 6 Z"/>
          <circle cx={116} cy={50} r={4.5}/>
          <circle cx={60} cy={108} r={3.5}/>
        </g>
        <path d="M55 22 L47 40 L59 54 L45 70 L55 100 C15 70 0 45 0 30 C0 12 15 5 30 5 C43 5 51 14 55 22 Z" fill="#ef4444"/>
        <path d="M65 22 L57 40 L69 54 L55 70 L65 100 C105 70 120 45 120 30 C120 12 105 5 90 5 C77 5 69 14 65 22 Z" fill="#d4d7dd"/>
        <path d="M20 22 q6 -10 16 -8" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity={0.55}/>
      </svg>
    </div>
  )
}

/* ── Slide 4 — One Unit Per Day ── */
function Slide4() {
  return (
    <div style={{height:380,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <svg width={280} height={298} viewBox="0 0 300 320" style={{filter:'drop-shadow(0 12px 26px rgba(0,0,0,.12))'}}>
        <defs>
          <clipPath id="dnCard"><rect x={0} y={0} width={300} height={320} rx={34}/></clipPath>
          <linearGradient id="dnSky" x1="0" y1="0.15" x2="1" y2="0.85">
            <stop offset="0.38" stopColor="#42b8f7"/>
            <stop offset="0.5" stopColor="#5a6fb5"/>
            <stop offset="0.62" stopColor="#16205c"/>
          </linearGradient>
        </defs>
        <g clipPath="url(#dnCard)">
          <rect width={300} height={320} fill="url(#dnSky)"/>
          <g fill="#ffffff">
            <circle cx={252} cy={48} r={2.6}/>
            <circle cx={220} cy={92} r={2}/>
            <circle cx={270} cy={120} r={2.3}/>
            <circle cx={238} cy={150} r={1.8}/>
            <circle cx={200} cy={56} r={1.6}/>
          </g>
          <g fill="#ffe9a8">
            <path d="M286 70 l1.6 4.6 4.6 .4 -3.5 3 1.1 4.5 -3.8 -2.5 -3.8 2.5 1.1 -4.5 -3.5 -3 4.6 -.4 Z"/>
          </g>
          <circle cx={238} cy={74} r={26} fill="#FFE08A"/>
          <circle cx={252} cy={66} r={22} fill="#16205c"/>
          {/* sun */}
          <g style={{transformOrigin:'72px 70px',animation:'spinslow 30s linear infinite'}}>
            <g stroke="#FFD21E" strokeWidth={6} strokeLinecap="round">
              <line x1={72} y1={14} x2={72} y2={28}/>
              <line x1={72} y1={112} x2={72} y2={126}/>
              <line x1={16} y1={70} x2={30} y2={70}/>
              <line x1={114} y1={70} x2={128} y2={70}/>
              <line x1={32} y1={30} x2={42} y2={40}/>
              <line x1={102} y1={100} x2={112} y2={110}/>
              <line x1={32} y1={110} x2={42} y2={100}/>
              <line x1={102} y1={40} x2={112} y2={30}/>
            </g>
          </g>
          <circle cx={72} cy={70} r={30} fill="#FFD21E"/>
          <path d="M0 232 C60 200 120 200 170 226 C220 252 270 236 300 222 L300 320 L0 320 Z" fill="#58cc02"/>
          <path d="M0 272 C70 248 140 262 210 262 C260 262 285 254 300 250 L300 320 L0 320 Z" fill="#3f9e1f"/>
          {/* calendar */}
          <g transform="translate(108,232)">
            <rect x={0} y={8} width={84} height={78} rx={14} fill="#fff" stroke="#e7eaf0" strokeWidth={3}/>
            <rect x={0} y={8} width={84} height={24} rx={12} fill="#1CB0F6"/>
            <rect x={18} y={2} width={8} height={16} rx={4} fill="#1CB0F6"/>
            <rect x={58} y={2} width={8} height={16} rx={4} fill="#1CB0F6"/>
            <circle cx={42} cy={58} r={18} fill="none" stroke="#3c3c3c" strokeWidth={3.5}/>
            <path d="M42 58 L42 46" stroke="#3c3c3c" strokeWidth={3.5} strokeLinecap="round"/>
            <path d="M42 58 L52 62" stroke="#3c3c3c" strokeWidth={3.5} strokeLinecap="round"/>
          </g>
        </g>
      </svg>
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
