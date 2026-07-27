import { useState, useEffect } from 'react'
import { getRewards, getCoinBalance, claimReward, getClaims } from '../lib/economy'
import { useLang } from '../lib/LangContext'
import { t } from '../lib/i18n'

function CoinIcon({ size = 24 }) {
  return <img src="/coin.png" width={size} height={size} alt="coin" style={{ objectFit: 'contain' }} />
}

export default function Rewards({ kidId }) {
  const lang = useLang()
  const [rewards, setRewards]   = useState([])
  const [claims, setClaims]     = useState([])
  const [balance, setBalance]   = useState(0)
  const [loading, setLoading]   = useState(true)
  const [claiming, setClaiming] = useState(null)
  const [claimError, setClaimError] = useState('')
  const [tab, setTab]           = useState('rewards')

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
    setClaiming(reward.id)
    setClaimError('')
    try {
      const { newBalance } = await claimReward(reward.id, reward.cost, kidId)
      setBalance(newBalance)
      await load()
    } catch (e) {
      setClaimError(lang === 'ar' ? 'فشل الاستبدال، حاول مرة أخرى' : 'Failed to claim, please try again')
    } finally {
      setClaiming(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="w-full max-w-lg mx-auto px-5 flex flex-col flex-1">
        <div className="flex-shrink-0 pt-12 pb-4">
          <h1 className="font-display font-extrabold text-3xl text-ink">{t(lang, 'rewards_title')}</h1>
          <p className="text-muted font-body text-sm mt-1">{t(lang, 'rewards_sub')}</p>
        </div>

        <div className="flex-shrink-0 flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-4 mb-5">
          <CoinIcon size={80} />
          <div>
            <p className="font-body text-xs text-amber-600 font-bold uppercase tracking-widest">{t(lang, 'rewards_balance_label')}</p>
            <p className="font-display font-extrabold text-3xl text-amber-500">{balance} {t(lang, 'rewards_balance_unit')}</p>
          </div>
        </div>

        <div className="flex-shrink-0 flex gap-2 mb-4">
          {['rewards', 'history'].map(tabId => (
            <button key={tabId} onClick={() => setTab(tabId)}
              className={`flex-1 py-2 rounded-xl font-display font-bold text-sm capitalize transition-all ${
                tab === tabId ? 'bg-duo text-white' : 'bg-gray-100 text-muted'
              }`}>
              {tabId === 'rewards' ? t(lang, 'rewards_tab_rewards') : t(lang, 'rewards_tab_history')}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          {tab === 'rewards' && (
            <>
              {claimError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center mb-3">
                  <p className="font-body text-sm text-red-500 font-bold">{claimError}</p>
                </div>
              )}
              {rewards.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center">
                  <span style={{ fontSize: 64 }}>🎁</span>
                  <p className="font-display font-extrabold text-xl text-ink">{t(lang, 'rewards_empty_title')}</p>
                  <p className="text-muted font-body text-sm">{t(lang, 'rewards_empty_sub')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {rewards.map(reward => {
                    const canAfford = balance >= reward.cost
                    const isClaiming = claiming === reward.id
                    return (
                      <div key={reward.id}
                        className={`rounded-2xl border-2 px-5 py-4 flex items-center gap-4 ${
                          canAfford ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white opacity-60'
                        }`}>
                        <span style={{ fontSize: 36 }}>🎁</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-lg text-ink">{reward.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <CoinIcon size={16} />
                            <span className="font-body font-bold text-sm text-amber-600">{reward.cost} {t(lang, 'rewards_balance_unit')}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleClaim(reward)}
                          disabled={!canAfford || isClaiming}
                          className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all active:translate-y-0.5 ${
                            canAfford ? 'bg-duo text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                          style={{ boxShadow: canAfford ? '0 3px 0 #46a302' : 'none' }}>
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
                <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center">
                  <span style={{ fontSize: 64 }}>📋</span>
                  <p className="font-display font-extrabold text-xl text-ink">{t(lang, 'rewards_history_empty_title')}</p>
                  <p className="text-muted font-body text-sm">{t(lang, 'rewards_history_empty_sub')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {claims.map(claim => (
                    <div key={claim.id} className="bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 flex items-center gap-4">
                      <span style={{ fontSize: 32 }}>{claim.status === 'approved' ? '✅' : claim.status === 'rejected' ? '❌' : '⏳'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-base text-ink truncate">{claim.rewards?.name}</p>
                        <p className="font-body text-xs text-muted">
                          {claim.status === 'approved'
                            ? t(lang, 'rewards_approved')
                            : claim.status === 'rejected'
                              ? (lang === 'ar' ? 'تم الرفض من أحد الوالدين' : 'Denied by parent')
                              : t(lang, 'rewards_pending')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <CoinIcon size={16} />
                        <span className="font-body font-bold text-sm text-amber-600">{claim.rewards?.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
