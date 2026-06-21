const NODES = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
  { id: 4 },
  { id: 5 },
]

const NODE_SIZE = 64
const V_STEP    = 130
const TOP_PAD   = 72
const H         = TOP_PAD + (NODES.length - 1) * V_STEP + TOP_PAD  // 664

const LEFT_X  = 22
const RIGHT_X = 78

// Puck shadow: hard amber bottom edge + ambient glow + inner highlights
const PUCK_SHADOW = [
  '0 5px 0 0 #CC7700',
  '0 10px 20px rgba(255,150,0,0.22)',
  'inset 0 3px 0 rgba(255,255,255,0.30)',
  'inset 0 -2px 0 rgba(0,0,0,0.12)',
].join(', ')

// White star for inside each node puck
function StarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

// Heart for stats bar
function HeartStatIcon() {
  return (
    <svg width="18" height="16" viewBox="0 0 22 20" fill="#ef4444" aria-hidden="true">
      <path d="M11 18.5S1 12.3 1 6.5a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 5.8-10 12-10 12z" />
    </svg>
  )
}

// Coin for stats bar: amber circle with inner star mark
function CoinStatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#FFB700" />
      <circle cx="10" cy="10" r="7"  fill="#FFD700" />
      <path
        d="M10 5.5l1.1 3.4h3.6l-2.9 2.1 1.1 3.4L10 12.4 6.9 14.4l1.1-3.4-2.9-2.1h3.6z"
        fill="#CC7700"
      />
    </svg>
  )
}

// Campfire — flat single-color silhouette, warm amber
function Campfire({ style }) {
  return (
    <svg
      width="48"
      height="58"
      viewBox="0 0 48 58"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute pointer-events-none"
      style={style}
      aria-hidden="true"
    >
      {/* Outer flame */}
      <path
        d="M24 3 C20 11 11 17 11 27 C11 38 17 47 24 47 C31 47 37 38 37 27 C37 17 28 11 24 3Z"
        fill="#FF9600"
      />
      {/* Inner flame highlight */}
      <path
        d="M24 13 C22 18 18 22 18 28 C18 34 20.5 39 24 39 C27.5 39 30 34 30 28 C30 22 26 18 24 13Z"
        fill="#FFB700"
      />
      {/* Log left */}
      <rect
        x="5" y="46" width="38" height="7" rx="3.5"
        fill="#CC7700"
        transform="rotate(-20 24 49.5)"
      />
      {/* Log right */}
      <rect
        x="5" y="46" width="38" height="7" rx="3.5"
        fill="#CC7700"
        transform="rotate(20 24 49.5)"
      />
    </svg>
  )
}

// Cave entrance — flat stone arch silhouette using evenodd cutout
function Cave({ style }) {
  return (
    <svg
      width="76"
      height="54"
      viewBox="0 0 76 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute pointer-events-none"
      style={style}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 54 L0 27 Q0 1 38 1 Q76 1 76 27 L76 54 Z
           M12 54 L12 29 Q12 14 38 14 Q64 14 64 29 L64 54 Z"
        fill="#A08060"
      />
    </svg>
  )
}

export default function Map({ onNodePress }) {
  return (
    <div className="bg-white min-h-screen">

      {/* Sticky header: stats bar + era banner */}
      <div className="sticky top-0 bg-white z-30">

        {/* Stats bar: lives + coins */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {/* Lives pill */}
          <div className="flex items-center gap-1.5 bg-red-50 rounded-full px-3 py-2 border border-red-100">
            <HeartStatIcon />
            <span className="font-body font-bold text-base text-red-500 leading-none tabular-nums">4</span>
          </div>
          {/* Coin pill */}
          <div className="flex items-center gap-1.5 rounded-full px-3 py-2 border border-stoneage-accent/30"
               style={{ backgroundColor: 'rgba(255,183,0,0.08)' }}>
            <CoinStatIcon />
            <span className="font-body font-bold text-base text-stoneage-dark leading-none tabular-nums">42</span>
          </div>
        </div>

        {/* Era banner — stoneage-primary with hard-edge puck shadow */}
        <div
          className="mx-4 mb-3 rounded-2xl bg-stoneage-primary px-4 py-3 flex items-center justify-between"
          style={{ boxShadow: '0 3px 0 0 #CC7700' }}
        >
          <div>
            <p className="font-body font-bold text-xs text-white/70 tracking-widest uppercase leading-none mb-1">
              Stone Age · Addition
            </p>
            <p className="font-display font-bold text-lg text-white leading-tight">
              Stage 1
            </p>
          </div>
          {/* Menu icon button */}
          <div className="w-10 h-10 rounded-xl bg-stoneage-dark/30 flex items-center justify-center">
            <svg width="18" height="13" viewBox="0 0 18 13" fill="white" aria-hidden="true">
              <rect width="18" height="2.5" rx="1.25" />
              <rect y="5.25" width="18" height="2.5" rx="1.25" />
              <rect y="10.5" width="18" height="2.5" rx="1.25" />
            </svg>
          </div>
        </div>

      </div>

      {/* Scrollable map — nodes positioned absolutely within this fixed-height container */}
      <div className="relative mx-auto max-w-sm" style={{ height: H }}>

        {/* Campfire — right side, between node 1 and 2 */}
        <Campfire style={{ top: 106, right: '6%', zIndex: 5 }} />

        {/* Cave — left side, between node 3 and 4 */}
        <Cave style={{ top: 376, left: '2%', zIndex: 5 }} />

        {/* Nodes — amber pucks with white star icon.
            Inline boxShadow drives the 3D puck look; translate-only GPU press. */}
        {NODES.map((node, i) => {
          const isRight = i % 2 === 1
          const x = isRight ? RIGHT_X : LEFT_X
          const y = TOP_PAD + i * V_STEP
          return (
            <button
              key={node.id}
              type="button"
              onClick={onNodePress}
              className="absolute w-16 h-16 rounded-full bg-stoneage-primary
                         flex items-center justify-center
                         transition-transform duration-75 active:translate-y-1"
              style={{
                left: `calc(${x}% - ${NODE_SIZE / 2}px)`,
                top: y - NODE_SIZE / 2,
                boxShadow: PUCK_SHADOW,
                zIndex: 10,
              }}
              aria-label={`Start stage ${node.id}`}
            >
              <StarIcon />
            </button>
          )
        })}

      </div>
    </div>
  )
}
