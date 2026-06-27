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
  @keyframes grow      { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.18)} }
`

/* ── Slide 1 — Welcome (mascot + confetti) ── */
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
      {/* mascot */}
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

/* ── Slide 2 — Find your level (target/podium) ── */
function Slide2() {
  return (
    <div style={{height:380,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
      {/* spinning rays — green */}
      <svg width={260} height={260} viewBox="0 0 320 320" style={{position:'absolute',top:40,animation:'spinslow 26s linear infinite'}}>
        <g fill="#c8f5b0">
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

      {/* big target */}
      <svg width={160} height={160} viewBox="0 0 200 200" style={{position:'absolute',top:90,animation:'pulse 2.4s ease-in-out infinite'}}>
        <circle cx={100} cy={104} r={84} fill="#46a302"/>
        <circle cx={100} cy={100} r={84} fill="#58cc02"/>
        <circle cx={100} cy={100} r={62} fill="#fff"/>
        <circle cx={100} cy={100} r={42} fill="#58cc02"/>
        <circle cx={100} cy={100} r={22} fill="#fff"/>
        <circle cx={100} cy={100} r={10} fill="#ef4444"/>
        {/* arrow */}
        <line x1={148} y1={52} x2={106} y2={96} stroke="#1a1a2e" strokeWidth={6} strokeLinecap="round"/>
        <polygon points="148,38 162,62 136,58" fill="#1a1a2e"/>
      </svg>

      {/* small target bottom-left */}
      <svg width={62} height={62} viewBox="0 0 100 100" style={{position:'absolute',bottom:60,left:46,animation:'floaty 2.8s ease-in-out infinite'}}>
        <circle cx={50} cy={54} r={40} fill="#46a302"/>
        <circle cx={50} cy={50} r={40} fill="#58cc02"/>
        <circle cx={50} cy={50} r={28} fill="#fff"/>
        <circle cx={50} cy={50} r={16} fill="#58cc02"/>
        <circle cx={50} cy={50} r={7} fill="#ef4444"/>
      </svg>

      {/* star bottom-right */}
      <svg width={44} height={44} viewBox="0 0 100 100" style={{position:'absolute',bottom:120,right:48,animation:'floaty 2.3s ease-in-out infinite'}}>
        <path d="M50 8 l11 30 32 0 -26 19 10 30 -27 -18 -27 18 10 -30 -26 -19 32 0 Z" fill="#FFB700"/>
      </svg>

      <svg viewBox="0 0 24 24" width={20} height={20} style={{position:'absolute',bottom:80,right:120,animation:'twinkle 2s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#58cc02"/></svg>
      <svg viewBox="0 0 24 24" width={15} height={15} style={{position:'absolute',bottom:40,left:130,animation:'twinkle 2.5s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#c8f5b0"/></svg>
    </div>
  )
}

/* ── Slide 3 — Earn coins ── */
function Slide3() {
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

/* ── Slide 4 — Unlock real rewards (gift box) ── */
function Slide4() {
  return (
    <div style={{height:380,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
      {/* spinning rays — purple */}
      <svg width={260} height={260} viewBox="0 0 320 320" style={{position:'absolute',top:40,animation:'spinslow 26s linear infinite'}}>
        <g fill="#e9d5ff">
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

      {/* big gift box */}
      <svg width={160} height={160} viewBox="0 0 200 200" style={{position:'absolute',top:90,animation:'pulse 2.4s ease-in-out infinite'}}>
        {/* shadow */}
        <rect x={20} y={92} width={160} height={106} rx={10} fill="#6d28d9"/>
        {/* box body */}
        <rect x={20} y={88} width={160} height={106} rx={10} fill="#7c3aed"/>
        {/* lid shadow */}
        <rect x={14} y={62} width={172} height={38} rx={8} fill="#6d28d9"/>
        {/* lid */}
        <rect x={14} y={58} width={172} height={38} rx={8} fill="#8b5cf6"/>
        {/* ribbon vertical */}
        <rect x={88} y={58} width={24} height={136} fill="#FFB700"/>
        {/* ribbon horizontal on lid */}
        <rect x={14} y={70} width={172} height={14} fill="#FFB700"/>
        {/* bow left */}
        <ellipse cx={72} cy={58} rx={26} ry={14} fill="#ffc933" transform="rotate(-30 72 58)"/>
        {/* bow right */}
        <ellipse cx={128} cy={58} rx={26} ry={14} fill="#ffc933" transform="rotate(30 128 58)"/>
        {/* bow center */}
        <circle cx={100} cy={58} r={12} fill="#FFB700"/>
        {/* shine on box */}
        <rect x={36} y={98} width={12} height={60} rx={6} fill="#9f67ff" opacity={0.5}/>
      </svg>

      {/* small star top-left */}
      <svg width={50} height={50} viewBox="0 0 100 100" style={{position:'absolute',bottom:60,left:46,animation:'floaty 2.8s ease-in-out infinite'}}>
        <path d="M50 8 l11 30 32 0 -26 19 10 30 -27 -18 -27 18 10 -30 -26 -19 32 0 Z" fill="#FFB700"/>
      </svg>

      {/* small gift bottom-right */}
      <svg width={44} height={44} viewBox="0 0 100 100" style={{position:'absolute',bottom:120,right:48,animation:'floaty 2.3s ease-in-out infinite'}}>
        <rect x={10} y={46} width={80} height={52} rx={6} fill="#6d28d9"/>
        <rect x={10} y={44} width={80} height={52} rx={6} fill="#8b5cf6"/>
        <rect x={7} y={28} width={86} height={20} rx={5} fill="#7c3aed"/>
        <rect x={7} y={26} width={86} height={20} rx={5} fill="#9f67ff"/>
        <rect x={44} y={26} width={12} height={70} fill="#FFB700"/>
        <rect x={7} y={32} width={86} height={8} fill="#FFB700"/>
        <circle cx={50} cy={26} r={8} fill="#ffc933"/>
      </svg>

      <svg viewBox="0 0 24 24" width={20} height={20} style={{position:'absolute',bottom:80,right:120,animation:'twinkle 2s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#c4b5fd"/></svg>
      <svg viewBox="0 0 24 24" width={15} height={15} style={{position:'absolute',bottom:40,left:130,animation:'twinkle 2.5s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#e9d5ff"/></svg>
    </div>
  )
}

/* ── Slide 5 — One small habit (mascot) ── */
function Slide5() {
  return (
    <div style={{height:380,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
      {/* spinning rays — soft green */}
      <svg width={260} height={260} viewBox="0 0 320 320" style={{position:'absolute',top:40,animation:'spinslow 30s linear infinite'}}>
        <g fill="#bbf7d0">
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

      {/* mascot image */}
      <img
        src="/onboarding-mascot.png"
        alt="Numio mascot"
        style={{width:220,height:'auto',position:'relative',animation:'bob 3s ease-in-out infinite'}}
      />

      {/* sparkles */}
      <svg viewBox="0 0 24 24" width={22} height={22} style={{position:'absolute',top:130,left:56,animation:'twinkle 1.9s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#FFB700"/></svg>
      <svg viewBox="0 0 24 24" width={16} height={16} style={{position:'absolute',top:240,right:58,animation:'twinkle 2.4s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#22c55e"/></svg>
      <svg viewBox="0 0 24 24" width={14} height={14} style={{position:'absolute',top:88,right:72,animation:'twinkle 2.1s ease-in-out infinite'}}><path d="M12 0 l2.6 7.4 7.4 .6 -5.6 4.8 1.8 7.2 -6.2 -4 -6.2 4 1.8 -7.2 -5.6 -4.8 7.4 -.6 Z" fill="#1CB0F6"/></svg>
      <div style={{position:'absolute',top:195,left:42,width:11,height:11,borderRadius:'50%',background:'#22c55e',animation:'twinkle 1.7s ease-in-out infinite'}}/>
      <div style={{position:'absolute',top:68,right:50,width:13,height:13,borderRadius:4,background:'#FFB700',transform:'rotate(20deg)',animation:'confettiA 2.3s ease-in-out infinite alternate'}}/>
    </div>
  )
}

/* ── Slide config ── */
const SLIDES = [
  {
    component: Slide1,
    title: 'Welcome to Numio! 👋',
    sub: 'Get better at math in just a few minutes every day.',
    dotColor: '#58cc02',
    btnLabel: 'SEE HOW IT WORKS →',
    isLast: false,
  },
  {
    component: Slide2,
    title: 'Find your level 🎯',
    sub: 'Choose your level, then complete a quick test to make sure it\'s the right one.',
    dotColor: '#58cc02',
    btnLabel: 'CONTINUE →',
    isLast: false,
  },
  {
    component: Slide3,
    title: 'Earn coins 🪙',
    sub: 'Complete your daily Numio to earn coins.',
    dotColor: '#FFB700',
    btnLabel: 'CONTINUE →',
    isLast: false,
  },
  {
    component: Slide4,
    title: 'Unlock real rewards 🎁',
    sub: 'Exchange your coins for real rewards your parents choose.',
    dotColor: '#7c3aed',
    btnLabel: 'CONTINUE →',
    isLast: false,
  },
  {
    component: Slide5,
    title: 'One small habit 🌱',
    sub: 'Do your Numio every day. Get better at math. Enjoy your reward.',
    dotColor: '#22c55e',
    btnLabel: "START TODAY'S NUMIO →",
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
          lineHeight: 1.55,
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
          {slide.btnLabel}
        </button>
      </div>
    </div>
  )
}
