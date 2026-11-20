export default function StreakPopup({ streakCount, onClose }) {
  const label = streakCount === 1 ? 'jour de série' : 'jours de série'

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-2">

        {/* Above the fire */}
        <p className="font-display font-bold text-2xl text-ink">
          Tu as <span style={{ color: '#ff2d78' }}>{streakCount}</span>
        </p>

        {/* Fire only */}
        <img
          src="/streak-fire.png"
          alt=""
          style={{ width: 200, height: 200, objectFit: 'contain' }}
        />

        {/* Curved text under the fire */}
        <svg viewBox="0 0 300 70" width="100%" height="70" style={{ overflow: 'visible' }}>
          <defs>
            <path id="streak-curve" d="M 20,18 Q 150,68 280,18" />
          </defs>
          <text fill="#1a1a2e" fontWeight="800" fontSize="30" fontFamily="inherit">
            <textPath href="#streak-curve" startOffset="50%" textAnchor="middle">
              {label}
            </textPath>
          </text>
        </svg>

        <button
          onClick={onClose}
          className="w-full mt-6 py-4 rounded-full font-display font-bold text-base text-ink transition-all active:scale-95"
          style={{ background: 'white', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          Continuer
        </button>
      </div>
    </div>
  )
}
