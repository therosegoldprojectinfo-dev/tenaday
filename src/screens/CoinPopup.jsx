import { useMemo } from 'react'

export default function CoinPopup({ coinsEarned, onDone }) {
  // Random positions so the coins don't look the same every time
  const coins = useMemo(
    () => Array.from({ length: 40 }, () => ({
      left:     Math.random() * 92,
      delay:    (Math.random() * 1.5).toFixed(2),
      duration: (1.8 + Math.random() * 1.2).toFixed(2),
      size:     36 + Math.random() * 36,
    })),
    []
  )

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6 overflow-hidden">

      {/* Coins popping up from the bottom */}
      {coins.map((c, i) => (
        <img
          key={i}
          src="/coin-flower.png"
          alt=""
          style={{
            position: 'absolute',
            bottom: -80,
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            objectFit: 'contain',
            opacity: 0,
            animation: `coin-rise ${c.duration}s ${c.delay}s ease-out both`,
          }}
        />
      ))}

      <div className="relative w-full max-w-sm flex flex-col items-center text-center gap-2">
        <p className="font-display font-bold text-2xl text-ink">Tu as gagné</p>

        {/* Curved amount under the title */}
        <svg viewBox="0 0 300 70" width="100%" height="70" style={{ overflow: 'visible' }}>
          <defs>
            <path id="coin-curve" d="M 20,18 Q 150,68 280,18" />
          </defs>
          <text fill="#f59e0b" fontWeight="800" fontSize="36" fontFamily="inherit">
            <textPath href="#coin-curve" startOffset="50%" textAnchor="middle">
              {coinsEarned} pièces
            </textPath>
          </text>
        </svg>

        <button
          onClick={onDone}
          className="w-full mt-6 py-4 rounded-full font-display font-bold text-base text-ink transition-all active:scale-95"
          style={{ background: 'white', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          Continuer
        </button>
      </div>

      <style>{`@keyframes coin-rise{0%{transform:translateY(0) rotate(0deg);opacity:0}10%{opacity:1}100%{transform:translateY(-110vh) rotate(360deg);opacity:1}}`}</style>
    </div>
  )
}
