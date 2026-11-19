import { useState, useEffect } from 'react'
import { getRewards, getCoinBalance, claimReward, getClaims } from '../lib/economy'
import { useLang } from '../lib/LangContext'

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 1.2,
    duration: 1.8 + Math.random() * 1.2,
    color: ['#7c3aed','#a78bfa','#c4b5fd','#fbbf24','#f472b6','#34d399'][i % 6],
    size: 8 + Math.random() * 8, rotate: Math.random() * 360,
  }))
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, bottom: '-20px',
          width: p.size, height: p.size, backgroundColor: p.color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          transform: `rotate(${p.rotate}deg)`,
          animation: `confetti-up ${p.duration}s ${p.delay}s ease-out forwards`,
        }} />
      ))}
      <style>{`@keyframes confetti-up{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(-110vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  )
}

function CelebrationScreen({ rewardName, onParentZone, lang }) {
  const [showParentModal, setShowParentModal] = useState(false)
  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col items-center justify-center px-8 text-center">
      <Confetti />
      <div className="relative z-50 mb-6" style={{ animation: 'pop-in 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>
        <img src="/nav-profile.png" alt="" className="w-44 h-auto" />
      </div>
      <div className="relative z-50 mb-8">
        <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{lang === 'ar' ? '🎉 تهانينا!' : '🎉 Congrats!'}</h1>
        <p className="font-body text-lg text-muted">
          {lang === 'ar' ? <> لقد حصلت على <span className="font-bold text-ink">{rewardName}</span></> : <> You unlocked <span className="font-bold text-ink">{rewardName}</span></>}
        </p>
      </div>
      <button onClick={() => setShowParentModal(true)} className="relative z-50 w-full max-w-xs text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
        style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
        {lang === 'ar' ? 'استلام المكافأة 🎁' : 'Claim Reward 🎁'}
      </button>
      {showParentModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 text-center">
            <span style={{ fontSize: 48 }}>👋</span>
            <h2 className="font-display font-extrabold text-xl text-ink">{lang === 'ar' ? 'هل أنت أحد الوالدين؟' : 'Are you the parent?'}</h2>
            <p className="font-body text-sm text-muted">{lang === 'ar' ? 'يحتاج استلام المكافأة موافقة الوالدين' : 'Claiming a reward needs parent approval'}</p>
            <button onClick={onParentZone} className="w-full py-4 text-white font-display font-bold text-lg rounded-2xl" style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
              {lang === 'ar' ? 'نعم، أنا الوالد' : "Yes, I'm the parent"}
            </button>
            <button onClick={() => setShowParentModal(false)} className="w-full py-3 bg-gray-100 text-ink font-display font-bold text-base rounded-2xl">
              {lang === 'ar' ? 'سأذهب لأريه للوالدين' : "I'll go show it"}
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes pop-in{0%{transform:scale(0.3);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  )
}

export default function Rewards({ kidId, onNavigateToParentZone }) {
  const lang = useLang()
  const [rewards, setRewards]         = useState([])
  const [claims, setClaims]           = useState([])
  const [balance, setBalance]         = useState(0)
  const [loading, setLoading]         = useState(true)
  const [claiming, setClaiming]       = useState(null)
  const [claimError, setClaimError]   = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [celebration, setCelebration] = useState(null)

  useEffect(() => { load() }, [kidId])

  async function load() {
    try {
      const [r, b, c] = await Promise.all([getRewards(), getCoinBalance(kidId), getClaims(kidId)])
      setRewards(r); setBalance(b); setClaims(c)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleClaim(reward) {
    if (balance < reward.cost) return
    setClaiming(reward.id); setClaimError('')
    try {
      const { newBalance } = await claimReward(reward.id, kidId)
      setBalance(newBalance); await load()
      setCelebration({ rewardName: reward.name })
    } catch { setClaimError(lang === 'ar' ? 'فشل الاستبدال، حاول مرة أخرى' : 'Échec de l’achat, réessaie.') }
    finally { setClaiming(null) }
  }

  if (celebration) return <CelebrationScreen rewardName={celebration.rewardName} lang={lang} onParentZone={() => { setCelebration(null); onNavigateToParentZone?.() }} />

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-gray-100 animate-spin" style={{ borderTopColor: '#7c3aed' }} />
    </div>
  )

  /* ── History view (claims) ── */
  if (showHistory) {
    return (
      <div className="bg-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
        <div className="w-full max-w-lg mx-auto px-5 flex flex-col flex-1 overflow-y-auto pb-10">
          <button
            onClick={() => setShowHistory(false)}
            className="flex-shrink-0 font-body font-bold text-sm mt-12 mb-5 flex items-center gap-1.5 active:opacity-60 self-start"
            style={{ color: '#9ca3af' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 3L5 9L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
          <h1 className="font-display font-bold text-lg text-ink mb-3">Historique</h1>

          {claims.length === 0 ? (
            <p className="font-body text-sm text-center py-10" style={{ color: '#9ca3af' }}>
              Tu n’as encore rien acheté.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {claims.map(claim => {
                const st = claim.status
                return (
                  <div key={claim.id} className="flex items-center gap-4 bg-white"
                    style={{ padding: 14, borderRadius: 28, border: '1.5px solid #eef0f3', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <div className="flex items-center justify-center flex-shrink-0"
                      style={{ width: 56, height: 56, borderRadius: 18, fontSize: 26,
                        background: st === 'approved' ? '#dcfce7' : st === 'rejected' ? '#fee2e2' : '#fef9c3' }}>
                      {st === 'approved' ? '✅' : st === 'rejected' ? '❌' : '⏳'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-extrabold text-base text-ink truncate">{claim.rewards?.name}</p>
                      <p className="font-body text-sm" style={{ color: '#6b7280' }}>
                        {st === 'approved' ? 'Approuvée' : st === 'rejected' ? 'Refusée par un parent' : 'En attente d’un parent'}
                      </p>
                    </div>
                    <p className="font-display font-bold text-sm flex-shrink-0" style={{ color: '#f59e0b' }}>{claim.rewards?.cost}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── Main view ── */
  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="w-full max-w-lg mx-auto px-5 flex flex-col flex-1 overflow-y-auto pb-10 min-w-0">

        {/* Mes récompenses */}
        <div className="flex-shrink-0 flex items-center justify-between mt-12 mb-3">
          <h1 className="font-display font-bold text-lg text-ink">Mes récompenses</h1>
          {claims.length > 0 && (
            <button onClick={() => setShowHistory(true)} className="font-body text-base active:opacity-60" style={{ color: '#4b5563' }}>
              Historique
            </button>
          )}
        </div>

        {claimError && (
          <div className="rounded-2xl px-4 py-3 text-center mb-3" style={{ background: '#fff5f5' }}>
            <p className="font-body text-sm text-red-500 font-bold">{claimError}</p>
          </div>
        )}

        {rewards.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center py-6">
            <img src="/nav-gift.png" alt="" className="w-24 h-auto" />
            <p className="font-display font-extrabold text-lg text-ink">Aucune récompense pour le moment</p>
            <p className="font-body text-sm max-w-xs" style={{ color: '#9ca3af' }}>
              Demande à un parent d’en ajouter dans l’espace parents !
            </p>
          </div>
        ) : (
          <div
            className="no-scrollbar flex gap-3 overflow-x-auto pb-2 flex-shrink-0"
            style={{ scrollSnapType: 'x mandatory', marginRight: -20, paddingRight: 20 }}
          >
            {rewards.map(reward => (
              <RewardCard
                key={reward.id}
                reward={reward}
                balance={balance}
                single={rewards.length === 1}
                claiming={claiming === reward.id}
                onClaim={() => handleClaim(reward)}
              />
            ))}
          </div>
        )}

        {/* Mes Pièces */}
        <h2 className="flex-shrink-0 font-display font-bold text-lg text-ink mt-8 mb-3">Mes Pièces</h2>
        <div
          className="flex-shrink-0 flex flex-col items-center bg-white"
          style={{ borderRadius: 28, border: '1.5px solid #eef0f3', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '24px 16px' }}
        >
          <img
            src="/chest_transparent.gif"
            alt="Coffre"
            style={{ width: '100%', maxWidth: 240, height: 'auto' }}
          />
          <p className="font-display font-extrabold text-xl text-ink mt-3">
            Tu as <span style={{ color: '#f59e0b' }}>{balance}</span> pièce{balance > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <style>{`.no-scrollbar{scrollbar-width:none}.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
    </div>
  )
}

function RewardCard({ reward, balance, single, claiming, onClaim }) {
  const canAfford = balance >= reward.cost
  const pct = reward.cost > 0 ? Math.min(100, Math.round((balance / reward.cost) * 100)) : 100

  return (
    <div
      className="bg-white flex flex-col gap-4"
      style={{
        flexShrink: 0,
        width: single ? '100%' : '88%',
        padding: 18,
        borderRadius: 28,
        border: '1.5px solid #eef0f3',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        scrollSnapAlign: 'start',
      }}
    >
      {/* Icon + name + price */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center flex-shrink-0" style={{ width: 64, height: 64, borderRadius: 20, background: '#f5f3ff' }}>
          <img src="/nav-gift.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-extrabold text-base text-ink truncate">{reward.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <img src="/coin-flower.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
            <span className="font-display font-bold text-sm" style={{ color: '#f59e0b' }}>{reward.cost}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 overflow-hidden" style={{ height: 14, borderRadius: 999, background: '#f1f5f9' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: '#22c55e', transition: 'width 0.4s ease' }} />
        </div>
        <span className="font-display font-extrabold text-sm flex-shrink-0" style={{ color: '#16a34a' }}>
          {Math.min(balance, reward.cost)}/{reward.cost}
        </span>
      </div>

      {/* Achetez ! */}
      <button
        onClick={onClaim}
        disabled={!canAfford || claiming}
        className="w-full font-display font-bold text-base rounded-full py-3.5 transition-all active:scale-95"
        style={{
          background: canAfford ? '#7c3aed' : 'white',
          color: canAfford ? 'white' : '#9ca3af',
          border: canAfford ? '1.5px solid #7c3aed' : '1.5px solid #e5e7eb',
          boxShadow: canAfford ? '0 4px 16px rgba(124,58,237,0.3)' : 'none',
          opacity: !canAfford ? 0.8 : 1,
        }}
      >
        {claiming ? '...' : 'Achetez !'}
      </button>
    </div>
  )
}
