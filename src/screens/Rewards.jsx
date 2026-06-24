import { useEffect, useState } from 'react'
import { fetchKid, fetchAvailableGifts, purchaseGift } from '../lib/kidData'
import { isInDebt } from '../lib/economy'

const DUO_GREEN = '#58cc02'
const DUO_GREEN_DARK = '#46a302'

// ── Icons ────────────────────────────────────────────────────────────────
// Small fixed vocabulary matching the `icon` column in the gifts table
// (see schema.sql's comment on that column) — every reward's icon comes
// from this set, not freeform input, so the card list stays visually
// consistent the way a real shop would.

function CoinIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#FFB700" />
      <circle cx="10" cy="10" r="7" fill="#FFD700" />
      <path
        d="M10 5.5l1.1 3.4h3.6l-2.9 2.1 1.1 3.4L10 12.4 6.9 14.4l1.1-3.4-2.9-2.1h3.6z"
        fill="#CC7700"
      />
    </svg>
  )
}

function TvIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 19v2M7 6l3-3 3 3" />
    </svg>
  )
}

function UtensilsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3v7a2 2 0 0 0 2 2v9M6 3v7M9 3v7M16 3c-1.5 0-3 2-3 5s1 5 3 5v9" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.5A9 9 0 1 1 11.5 3 7 7 0 0 0 21 12.5Z" />
    </svg>
  )
}

function TreeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22v-7M8 15h8l-2.5-4h1.5L12 7l-2.5 4H11z" />
      <path d="M9 11 6.5 7H8l-2-3.5h12L16 7h1.5L15 11" />
    </svg>
  )
}

function FilmIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" />
    </svg>
  )
}

function GiftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="9" width="18" height="11" rx="1" />
      <path d="M3 9h18M12 9v11M12 9C9 9 7 7 7 5.5A2.5 2.5 0 0 1 9.5 3C11.5 3 12 6 12 9ZM12 9c3 0 5-2 5-3.5A2.5 2.5 0 0 0 14.5 3C12.5 3 12 6 12 9Z" />
    </svg>
  )
}

const ICONS = { tv: TvIcon, utensils: UtensilsIcon, moon: MoonIcon, tree: TreeIcon, film: FilmIcon, gift: GiftIcon }

function GiftIconBadge({ icon }) {
  const Icon = ICONS[icon] || GiftIcon
  return (
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EAF8DC', color: DUO_GREEN_DARK }}>
      <Icon />
    </div>
  )
}

function RewardCard({ gift, affordable, locked, onBuy }) {
  const disabled = !affordable || locked

  return (
    <div className="w-full flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3.5">
      <GiftIconBadge icon={gift.icon} />

      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-base text-gray-900 leading-tight">{gift.name}</p>
        <div className="flex items-center gap-1 mt-1">
          <CoinIcon size={15} />
          <span className="font-body font-bold text-sm text-amber-700">{gift.coin_price}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onBuy(gift)}
        className="flex-shrink-0 px-4 py-2.5 rounded-xl font-body font-bold text-sm tracking-wide transition-transform active:scale-95"
        style={{
          backgroundColor: disabled ? '#E5E7EB' : DUO_GREEN,
          color: disabled ? '#9CA3AF' : '#FFFFFF',
          boxShadow: disabled ? 'none' : `0 3px 0 0 ${DUO_GREEN_DARK}`,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        BUY
      </button>
    </div>
  )
}

export default function Rewards({ kidId, parentId }) {
  const [kid, setKid] = useState(null)
  const [gifts, setGifts] = useState(null)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(null) // the gift pending purchase confirmation
  const [purchasing, setPurchasing] = useState(false)
  const [justBought, setJustBought] = useState(null) // gift name, for a brief success toast

  async function loadAll() {
    try {
      const [kidData, giftsData] = await Promise.all([
        fetchKid(kidId),
        fetchAvailableGifts(parentId),
      ])
      setKid(kidData)
      setGifts(giftsData)
    } catch (err) {
      console.error('Failed to load rewards:', err)
      setError(err)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidId, parentId])

  async function handleConfirmPurchase() {
    if (!confirming || !kid) return
    setPurchasing(true)
    try {
      // Re-fetch the kid's CURRENT balance right before purchasing rather
      // than trusting the balance already in state — it could have
      // changed (e.g. the kid played a node in another tab) since this
      // screen first loaded. purchaseGift() also re-validates server-side.
      const freshKid = await fetchKid(kidId)
      const newBalance = await purchaseGift(kidId, confirming, freshKid.coin_balance)
      setKid(k => ({ ...k, coin_balance: newBalance }))
      setJustBought(confirming.name)
      setTimeout(() => setJustBought(null), 2500)
    } catch (err) {
      console.error('Purchase failed:', err)
      setError(err)
    } finally {
      setPurchasing(false)
      setConfirming(null)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="text-5xl">😕</span>
          <p className="font-body text-gray-500">
            Couldn't load rewards. Check your connection and try again.
          </p>
          <button
            onClick={() => { setError(null); loadAll() }}
            className="btn-duo px-8 py-3 rounded-2xl font-body font-bold text-base tracking-widest"
          >
            RETRY
          </button>
        </div>
      </div>
    )
  }

  if (!kid || !gifts) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-body text-gray-400">Loading…</p>
      </div>
    )
  }

  const inDebt = isInDebt(kid.coin_balance)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-sm md:max-w-md mx-auto px-4 pt-6 pb-10">

        <div className="flex items-center justify-between mb-1">
          <h1 className="font-display font-bold text-2xl text-gray-900">Rewards</h1>
          <div className="flex items-center gap-1.5 bg-amber-50 rounded-full px-3 py-2 border border-amber-100">
            <CoinIcon />
            <span className="font-body font-bold text-base text-amber-700 leading-none tabular-nums">
              {kid.coin_balance}
            </span>
          </div>
        </div>
        <p className="font-body text-sm text-gray-400 mb-5">
          Trade your saved coins for real prizes your parent set up.
        </p>

        {/* Per spec §7: while in debt, rewards stay locked until the
            balance is back to >= 0, even if a specific item's price
            would technically be "affordable" against a positive view of
            the balance — debt has to clear first. */}
        {inDebt && (
          <div className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 mb-5">
            <p className="font-body text-sm text-red-600 font-semibold">
              Rewards are locked while coins are negative. Keep playing to earn them back!
            </p>
          </div>
        )}

        {justBought && (
          <div className="rounded-2xl bg-green-50 border border-green-100 px-4 py-3 mb-5">
            <p className="font-body text-sm text-green-700 font-semibold">
              You got "{justBought}"! Ask your parent to make it happen.
            </p>
          </div>
        )}

        {gifts.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-8 text-center">
            <p className="font-body text-sm text-gray-400">No rewards have been set up yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {gifts.map(gift => (
              <RewardCard
                key={gift.id}
                gift={gift}
                affordable={kid.coin_balance >= gift.coin_price}
                locked={inDebt}
                onBuy={setConfirming}
              />
            ))}
          </div>
        )}
      </div>

      {/* Purchase confirmation — bottom sheet on phone, centered modal on
          desktop, same pattern as ChapterPath.jsx's node confirmation. */}
      {confirming && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => !purchasing && setConfirming(null)}
          />
          <div
            className="fixed z-50 bg-white anim-sheet-in
                       bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-5 pb-8 max-w-sm mx-auto
                       md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto
                       md:rounded-3xl md:max-w-md md:w-full md:px-6 md:pt-6 md:pb-7"
          >
            <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-4 md:hidden" />
            <div className="flex items-center gap-3 mb-4">
              <GiftIconBadge icon={confirming.icon} />
              <div>
                <p className="font-display font-bold text-xl text-gray-900">{confirming.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <CoinIcon size={15} />
                  <span className="font-body font-bold text-sm text-amber-700">{confirming.coin_price} coins</span>
                </div>
              </div>
            </div>
            <p className="font-body text-sm text-gray-400 mb-5">
              Buy this reward? Your parent will need to help make it happen!
            </p>
            <button
              onClick={handleConfirmPurchase}
              disabled={purchasing}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-xl tracking-widest"
            >
              {purchasing ? 'BUYING…' : 'CONFIRM'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
