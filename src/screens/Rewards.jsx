function TreasureChestIconLarge() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="10" width="18" height="10" rx="2" fill="#C8821A" />
      <rect x="3" y="10" width="18" height="4" fill="#A8690F" />
      <path d="M3 10c0-3.5 4-6 9-6s9 2.5 9 6" fill="#E0993C" />
      <rect x="10" y="12.5" width="4" height="4" rx="0.5" fill="#FFD24C" />
      <circle cx="12" cy="14.5" r="0.9" fill="#A8690F" />
    </svg>
  )
}

/** Placeholder — real content (parent-defined gifts, coin prices, "buy"
 *  flow per spec §8) comes in a later build phase. This just establishes
 *  the nav destination exists and reads as "coming soon," not broken. */
export default function Rewards() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 gap-4 text-center">
      <TreasureChestIconLarge />
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-900 mb-1">Rewards</h1>
        <p className="font-body text-sm text-gray-400 max-w-xs">
          Coming soon — save up coins and trade them in for real prizes your parent sets up.
        </p>
      </div>
    </div>
  )
}
