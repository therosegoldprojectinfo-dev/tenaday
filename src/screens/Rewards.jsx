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

function CoinIcon({ size = 24 }) {
  return <img src="/Cr%C3%A9ation%20sans%20titre%20(27).png" width={size} height={size} alt="" style={{objectFit:"contain"}} />
}

function TvIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="13" rx="2" />
      <path d="M8 20h8M12 20v-1M8 7l4-4 4 4" />
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
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M2 9h5M17 9h5M2 15h5M17 15h5" />
    </svg>
  )
}

function GiftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="9" width="20" height="13" rx="1" />
      <path d="M2 9h20M12 9v13M12 9C9.5 9 8 7.5 8 6a2 2 0 0 1 4 0ZM12 9c2.5 0 4-1.5 4-3a2 2 0 0 0-4 0Z" />
    </svg>
  )
}

const ICONS = { tv: TvIcon, utensils: UtensilsIcon, moon: MoonIcon, tree: TreeIcon, film: FilmIcon, gift: GiftIcon }

function GiftIconBadge({ icon }) {
  const Icon = ICONS[icon] || GiftIcon
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EAF8DC', color: DUO_GREEN_DARK }}>
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
          <CoinIcon size={24} />
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
  const [confirming, setConfirming] = useState(null)
  const [purchasing, setPurchasing] = useState(false)
  const [unlockedReward, setUnlockedReward] = useState(null) // full celebration screen

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
      const freshKid = await fetchKid(kidId)
      const newBalance = await purchaseGift(kidId, confirming, freshKid.coin_balance)
      setKid(k => ({ ...k, coin_balance: newBalance }))
      setUnlockedReward(confirming) // show celebration screen
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

  // ── Reward unlocked celebration screen ───────────────────────────────
  if (unlockedReward) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 35%, #3d2800 0%, #1a1000 50%, #0a0800 100%)',
        padding: '40px 24px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      }}>
        <style>{`
          @keyframes float-up { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
          @keyframes pop-in { 0% { opacity:0; transform: scale(0.7); } 60% { transform: scale(1.1); } 100% { opacity:1; transform: scale(1); } }
          @keyframes fade-up { from { opacity:0; transform: translateY(24px); } to { opacity:1; transform: translateY(0); } }
          @keyframes sparkle { 0%,100% { opacity:0; transform: scale(0); } 50% { opacity:1; transform: scale(1); } }
        `}</style>

        {/* Sparkles */}
        {[
          { top: '12%', left: '18%', delay: '0s', size: 18 },
          { top: '8%',  left: '72%', delay: '0.4s', size: 14 },
          { top: '28%', left: '82%', delay: '0.7s', size: 16 },
          { top: '32%', left: '10%', delay: '0.3s', size: 12 },
        ].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', top: s.top, left: s.left, zIndex: 2,
            animation: `sparkle 2s ${s.delay} ease-in-out infinite`,
          }}>
            <svg width={s.size} height={s.size} viewBox="0 0 24 24">
              <path d="M12 0 L13.5 10.5 L24 12 L13.5 13.5 L12 24 L10.5 13.5 L0 12 L10.5 10.5 Z" fill="#FFD700"/>
            </svg>
          </div>
        ))}

        {/* Celebration image */}
        <div style={{ position: 'relative', zIndex: 3, animation: 'float-up 2.5s ease-in-out infinite', marginBottom: 32 }}>
          <img
            src="/reward-celebration.png"
            alt="Reward"
            style={{ width: 280, height: 'auto', display: 'block', animation: 'pop-in 0.5s ease both' }}
          />
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center', zIndex: 3, animation: 'fade-up 0.5s 0.3s ease both', opacity: 0 }}>
          <h1 style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 28,
            color: '#FFD700', margin: '0 0 10px', textShadow: '0 0 20px rgba(255,215,0,0.5)',
          }}>
            Congrats! 🎉
          </h1>
          <p style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 18,
            color: '#fff', margin: '0 0 6px',
          }}>
            You unlocked
          </p>
          <p style={{
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22,
            color: '#FFD700', margin: '0 0 40px',
          }}>
            {unlockedReward.name}
          </p>
        </div>

        {/* Golden button */}
        <button
          onClick={() => setUnlockedReward(null)}
          style={{
            zIndex: 3,
            width: '100%', maxWidth: 340,
            border: 'none', cursor: 'pointer',
            padding: '18px 0', borderRadius: 16,
            background: '#FFD700', boxShadow: '0 5px 0 #b8970a',
            color: '#5c3d00', fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800, fontSize: 18,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            animation: 'fade-up 0.5s 0.5s ease both', opacity: 0,
          }}
        >
          Show to your parent! →
        </button>
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
          <div className="flex items-center gap-1.5">
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
                  <CoinIcon size={24} />
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
