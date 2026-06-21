// ── FlowerJump ───────────────────────────────────────────────────────────
// A celebration/idle animation: the flower mascot crouches (anticipation),
// jumps with a little poof cloud, lands, and settles back to standing.
// Ported from a 3.0s keyframe animation (stand/crouch/jump pose cross-fades
// + lift/squash-stretch + shadow) into plain CSS @keyframes so it has zero
// runtime dependency — just three stacked <img> layers and a wrapper div.
//
// Usage: <FlowerJump loop /> for an idle/ambient loop (e.g. on the chapter
// card list), or <FlowerJump /> (no loop) for a one-shot celebration moment
// (e.g. after passing a node) — pair with an onAnimationEnd if you need to
// know when the single play finishes.

const STAND  = '/mascots/jump-anim/stand.png'
const CROUCH = '/mascots/jump-anim/crouch.png'
const JUMP   = '/mascots/jump-anim/jump.png'

export default function FlowerJump({ loop = false, size = 220, className = '', onAnimationEnd }) {
  const loopClass = loop ? 'flower-jump-loop' : 'flower-jump-once'

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Soft contact shadow — scales/fades as the flower lifts off the ground */}
      <div
        className={`absolute left-1/2 anim-flower-shadow ${loopClass}`}
        style={{
          bottom: size * 0.12,
          width: size * 0.5,
          height: size * 0.09,
          marginLeft: -(size * 0.25),
          background: 'radial-gradient(ellipse at center, rgba(40,55,30,0.35), rgba(40,55,30,0) 70%)',
          filter: 'blur(2px)',
          pointerEvents: 'none',
        }}
      />

      {/* Body wrapper: handles the lift arc + squash/stretch, transform-origin
          near the base of the flower so it squashes from the "feet" up. */}
      <div
        className={`absolute inset-0 anim-flower-body ${loopClass}`}
        style={{ transformOrigin: '50% 86%' }}
        onAnimationEnd={onAnimationEnd}
      >
        <img
          src={STAND}
          alt=""
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute inset-0 w-full h-full object-contain select-none pointer-events-none anim-flower-stand ${loopClass}`}
        />
        <img
          src={CROUCH}
          alt=""
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute inset-0 w-full h-full object-contain select-none pointer-events-none anim-flower-crouch ${loopClass}`}
        />
        <img
          src={JUMP}
          alt=""
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className={`absolute inset-0 w-full h-full object-contain select-none pointer-events-none anim-flower-jumppose ${loopClass}`}
        />
      </div>
    </div>
  )
}
