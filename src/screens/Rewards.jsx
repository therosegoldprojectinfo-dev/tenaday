import { useState, useEffect } from 'react'
import { getRewards, getCoinBalance, claimReward, getClaims } from '../lib/economy'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

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
  const [tab, setTab]                 = useState('rewards')
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
    } catch { setClaimError(lang === 'ar' ? 'فشل الاستبدال، حاول مرة أخرى' : 'Failed to claim, please try again') }
    finally { setClaiming(null) }
  }

  if (celebration) return <CelebrationScreen rewardName={celebration.rewardName} lang={lang} onParentZone={() => { setCelebration(null); onNavigateToParentZone?.() }} />

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-gray-100 animate-spin" style={{ borderTopColor: '#7c3aed' }} />
    </div>
  )

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="w-full max-w-lg mx-auto px-5 flex flex-col flex-1">

        {/* Header */}
        <div className="flex-shrink-0 pt-12 pb-6">
          <h1 className="font-display font-extrabold text-3xl text-ink">{t(lang, 'rewards_title')}</h1>
          <p className="font-body text-sm text-muted mt-1">{t(lang, 'rewards_sub')}</p>
        </div>

        {/* Balance card — clean gradient card like inspo */}
        <div className="flex-shrink-0 rounded-3xl px-6 py-5 mb-6 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 8px 32px rgba(124,58,237,0.25)' }}>
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">{t(lang, 'rewards_balance_label')}</p>
            <p className="font-display font-extrabold text-4xl text-white">{balance}</p>
            <p className="font-body text-sm text-white/70 mt-0.5">{t(lang, 'rewards_balance_unit')}</p>
          </div>
          <div style={{ fontSize: 64, opacity: 0.9 }}>🏆</div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex gap-2 mb-5 p-1 rounded-2xl" style={{ background: '#f5f3ff' }}>
          {['rewards', 'history'].map(tabId => (
            <button key={tabId} onClick={() => setTab(tabId)}
              className="flex-1 py-2.5 rounded-xl font-display font-bold text-sm transition-all"
              style={{
                background: tab === tabId ? '#7c3aed' : 'transparent',
                color: tab === tabId ? 'white' : '#AFAFAF',
                boxShadow: tab === tabId ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
              }}>
              {tabId === 'rewards' ? t(lang, 'rewards_tab_rewards') : t(lang, 'rewards_tab_history')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          {tab === 'rewards' && (
            <>
              {claimError && (
                <div className="rounded-2xl px-4 py-3 text-center mb-3" style={{ background: '#fff5f5' }}>
                  <p className="font-body text-sm text-red-500 font-bold">{claimError}</p>
                </div>
              )}
              {rewards.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-16 gap-5 text-center">
                  <div style={{ animation: 'float 3s ease-in-out infinite' }}>
                    <img src="/nav-gift.png" alt="" className="w-32 h-auto" />
                  </div>
                  <div>
                    <p className="font-display font-extrabold text-xl text-ink">{t(lang, 'rewards_empty_title')}</p>
                    <p className="text-muted font-body text-sm mt-1 max-w-xs">{t(lang, 'rewards_empty_sub')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {rewards.map(reward => {
                    const canAfford = balance >= reward.cost
                    const isClaiming = claiming === reward.id
                    return (
                      <div key={reward.id} className="rounded-2xl px-5 py-4 flex items-center gap-4 transition-all"
                        style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                        {/* Gift icon from nav asset */}
                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl" style={{ background: '#f5f3ff' }}>
                          <img src="/nav-gift.png" alt="" className="w-9 h-9 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-base text-ink">{reward.name}</p>
                          <p className="font-body text-sm mt-0.5" style={{ color: '#7c3aed' }}>{reward.cost} {t(lang, 'rewards_balance_unit')}</p>
                        </div>
                        <button
                          onClick={() => handleClaim(reward)}
                          disabled={!canAfford || isClaiming}
                          className="px-4 py-2 rounded-xl font-display font-bold text-sm transition-all active:scale-95 flex-shrink-0"
                          style={{
                            background: canAfford ? '#7c3aed' : '#f3f4f6',
                            color: canAfford ? 'white' : '#AFAFAF',
                            boxShadow: canAfford ? '0 3px 0 #5b21b6' : 'none',
                          }}>
                          {isClaiming ? '...' : canAfford ? t(lang, 'rewards_claim') : t(lang, 'rewards_need_more')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {claims.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-16 gap-5 text-center">
                  <span style={{ fontSize: 64 }}>📋</span>
                  <div>
                    <p className="font-display font-extrabold text-xl text-ink">{t(lang, 'rewards_history_empty_title')}</p>
                    <p className="text-muted font-body text-sm mt-1">{t(lang, 'rewards_history_empty_sub')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {claims.map(claim => (
                    <div key={claim.id} className="rounded-2xl px-5 py-4 flex items-center gap-4"
                      style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: claim.status === 'approved' ? '#dcfce7' : claim.status === 'rejected' ? '#fee2e2' : '#fef9c3' }}>
                        <span style={{ fontSize: 20 }}>{claim.status === 'approved' ? '✅' : claim.status === 'rejected' ? '❌' : '⏳'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-base text-ink truncate">{claim.rewards?.name}</p>
                        <p className="font-body text-xs text-muted mt-0.5">
                          {claim.status === 'approved' ? t(lang, 'rewards_approved') : claim.status === 'rejected' ? (lang === 'ar' ? 'تم الرفض' : 'Denied by parent') : t(lang, 'rewards_pending')}
                        </p>
                      </div>
                      <p className="font-display font-bold text-sm flex-shrink-0" style={{ color: '#7c3aed' }}>{claim.rewards?.cost} pts</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}
