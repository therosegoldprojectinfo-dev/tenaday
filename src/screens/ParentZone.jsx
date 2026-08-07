import { useState, useEffect } from 'react'
import { getRewards, createReward, deleteReward, getClaims, approveClaim, rejectClaim, isParentSessionError, getQuizResults } from '../lib/economy'
import { getKids } from '../lib/kids'
import { useLang } from '../lib/LangContext'
import { useKid } from '../lib/KidContext'
import { t } from '../lib/i18n'
import { supabase } from '../lib/supabaseClient'

function CoinIcon({ size = 24 }) {
  return <img src="/coin.png" width={size} height={size} alt="coin" style={{ objectFit: 'contain' }} />
}

const PLANET_AVATARS = ['🪐', '🌍', '🌙', '⭐', '🌟', '☀️', '🌎', '🌏', '🌑', '💫']
const ACCENT_COLORS  = ['#ede9fe', '#fce7f3', '#dbeafe', '#dcfce7', '#ffedd5']

export default function ParentZone({ defaultTab = 'rewards' }) {
  const lang = useLang()
  const { kids } = useKid()
  const [rewards, setRewards]         = useState([])
  const [claims, setClaims]           = useState([])
  const [quizResults, setQuizResults] = useState({})
  const [kidBalances, setKidBalances] = useState({})
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState(defaultTab)
  const [showModal, setShowModal]     = useState(false)
  const [approving, setApproving]     = useState(null)
  const [rejecting, setRejecting]     = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmRejectId, setConfirmRejectId] = useState(null)
  const [deleteBusy, setDeleteBusy]   = useState(false)
  const [rejectBusy, setRejectBusy]   = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  function handleSessionExpiry() { setSessionExpired(true) }

  useEffect(() => { load() }, [kids.length])

  async function load() {
    try {
      const [r, c] = await Promise.all([getRewards(), getClaims()])
      setRewards(r); setClaims(c)
      if (kids.length > 0) {
        const kidIds = kids.map(k => k.id)
        const { data: kidData } = await supabase.from('kid_profiles').select('id, coin_balance').in('id', kidIds)
        const balances = {}
        for (const k of (kidData || [])) balances[k.id] = k.coin_balance || 0
        setKidBalances(balances)
        const resultsMap = {}
        await Promise.all(kidIds.map(async kidId => {
          try { resultsMap[kidId] = await getQuizResults(kidId) } catch { resultsMap[kidId] = [] }
        }))
        setQuizResults(resultsMap)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function handleCreate(name, cost) {
    try { await createReward({ name, cost }); setShowModal(false); await load() }
    catch (e) { if (isParentSessionError(e)) handleSessionExpiry(); else { console.error(e); throw e } }
  }

  async function confirmDelete() {
    try { await deleteReward(confirmDeleteId); setConfirmDeleteId(null); await load() }
    catch (e) { setConfirmDeleteId(null); if (isParentSessionError(e)) handleSessionExpiry(); else console.error(e) }
  }

  async function handleApprove(claimId) {
    setApproving(claimId)
    try { await approveClaim(claimId); await load() }
    catch (e) { if (isParentSessionError(e)) handleSessionExpiry(); else console.error(e) }
    finally { setApproving(null) }
  }

  async function handleReject(claimId) {
    setRejecting(claimId)
    try { await rejectClaim(claimId); await load() }
    catch (e) { if (isParentSessionError(e)) handleSessionExpiry(); else console.error(e) }
    finally { setRejecting(null) }
  }

  const getKidName   = kidId => kids.find(k => k.id === kidId)?.name || '?'
  const getKidAvatar = kidId => PLANET_AVATARS[kids.findIndex(k => k.id === kidId) % PLANET_AVATARS.length] || '🌍'
  const pendingClaims = claims.filter(c => c.status === 'pending')

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-gray-100 animate-spin" style={{ borderTopColor: '#7c3aed' }} />
    </div>
  )

  const TABS = [
    { id: 'rewards', label: t(lang, 'parent_tab_rewards') },
    { id: 'claims',  label: t(lang, 'parent_tab_claims', pendingClaims.length) },
    { id: 'progress', label: lang === 'ar' ? '📊 التقدم' : '📊 Progress' },
  ]

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="w-full max-w-lg mx-auto px-5 flex flex-col flex-1">

        {/* Header */}
        <div className="flex-shrink-0 pt-12 pb-4 flex items-start justify-between">
          <div>
            <h1 className="font-display font-extrabold text-3xl text-ink">{t(lang, 'parent_title')}</h1>
            <p className="text-muted font-body text-sm mt-1">{t(lang, 'parent_sub')}</p>
          </div>
          {pendingClaims.length > 0 && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#ef4444' }}>
              <span className="font-display font-bold text-white text-xs">{pendingClaims.length}</span>
            </div>
          )}
        </div>

        {/* Kid balances */}
        {kids.length > 0 && (
          <div className="flex-shrink-0 flex gap-3 mb-5 overflow-x-auto pb-1">
            {kids.map((kid, i) => (
              <div key={kid.id} className="flex-shrink-0 flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: ACCENT_COLORS[i % ACCENT_COLORS.length] }}>
                <span style={{ fontSize: 22 }}>{PLANET_AVATARS[i % PLANET_AVATARS.length]}</span>
                <div>
                  <p className="font-display font-bold text-sm text-ink">{kid.name}</p>
                  <div className="flex items-center gap-1">
                    <CoinIcon size={12} />
                    <span className="font-body font-bold text-xs" style={{ color: '#7c3aed' }}>{kidBalances[kid.id] ?? '...'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex-shrink-0 flex gap-1 mb-4 p-1 rounded-2xl" style={{ background: '#f3f4f6' }}>
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex-1 py-2 rounded-xl font-display font-bold text-xs transition-all relative"
              style={{ background: tab === id ? 'white' : 'transparent', color: tab === id ? '#7c3aed' : '#AFAFAF', boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}
            >
              {label}
              {id === 'claims' && pendingClaims.length > 0 && tab !== 'claims' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center" style={{ background: '#ef4444', fontSize: 9 }}>{pendingClaims.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pb-6">

          {/* REWARDS TAB */}
          {tab === 'rewards' && (
            <div className="flex flex-col gap-3">
              {rewards.map(reward => (
                <div key={reward.id} className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center justify-center rounded-2xl flex-shrink-0" style={{ width: 44, height: 44, background: '#f5f3ff' }}>
                    <span style={{ fontSize: 22 }}>🎁</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-base text-ink">{reward.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <CoinIcon size={12} />
                      <span className="font-body text-xs font-bold" style={{ color: '#7c3aed' }}>{reward.cost} {t(lang, 'rewards_balance_unit')}</span>
                    </div>
                  </div>
                  <button onClick={() => setConfirmDeleteId(reward.id)} className="text-gray-200 text-lg active:text-red-400 transition-colors">🗑️</button>
                </div>
              ))}
              <button onClick={() => setShowModal(true)}
                className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95"
                style={{ border: '2px dashed #e5e7eb', color: '#AFAFAF', background: 'white' }}
              >
                {t(lang, 'parent_add_reward')}
              </button>
            </div>
          )}

          {/* CLAIMS TAB */}
          {tab === 'claims' && (
            <div className="flex flex-col gap-3">
              {claims.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center">
                  <span style={{ fontSize: 64 }}>📋</span>
                  <p className="font-display font-extrabold text-xl text-ink">{t(lang, 'parent_no_claims')}</p>
                </div>
              ) : claims.map(claim => (
                <div key={claim.id} className="rounded-2xl px-5 py-4 flex flex-col gap-3"
                  style={{ background: claim.status === 'pending' ? '#fffbeb' : 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: claim.status === 'pending' ? '1px solid #fde68a' : 'none' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 16 }}>{getKidAvatar(claim.kid_id)}</span>
                    <span className="font-body font-bold text-sm text-muted">{getKidName(claim.kid_id)}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span style={{ fontSize: 22 }}>{claim.status === 'approved' ? '✅' : claim.status === 'rejected' ? '❌' : '⏳'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-base text-ink">{claim.rewards?.name}</p>
                      <div className="flex items-center gap-1">
                        <CoinIcon size={12} />
                        <span className="font-body text-xs font-bold" style={{ color: '#7c3aed' }}>{claim.rewards?.cost} {t(lang, 'rewards_balance_unit')}</span>
                      </div>
                    </div>
                    {claim.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(claim.id)} disabled={approving === claim.id || rejecting === claim.id}
                          className="px-3 py-2 rounded-xl text-white font-display font-bold text-xs transition-all active:scale-95"
                          style={{ background: '#7c3aed', boxShadow: '0 3px 0 #5b21b6' }}>
                          {approving === claim.id ? '...' : t(lang, 'parent_approve')}
                        </button>
                        <button onClick={() => setConfirmRejectId(claim.id)} disabled={approving === claim.id || rejecting === claim.id}
                          className="px-3 py-2 rounded-xl font-display font-bold text-xs bg-red-50 text-red-500 transition-all active:scale-95">
                          {rejecting === claim.id ? '...' : t(lang, 'parent_deny')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PROGRESS TAB */}
          {tab === 'progress' && (
            <div className="flex flex-col gap-6">
              {kids.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center">
                  <span style={{ fontSize: 64 }}>📊</span>
                  <p className="font-display font-extrabold text-xl text-ink">{lang === 'ar' ? 'لا يوجد أطفال بعد' : 'No kids yet'}</p>
                </div>
              ) : kids.map((kid, i) => {
                const results = quizResults[kid.id] || []
                const avg = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.score_pct, 0) / results.length) : null
                return (
                  <div key={kid.id} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-xl text-2xl" style={{ width: 44, height: 44, background: ACCENT_COLORS[i % ACCENT_COLORS.length] }}>
                        {PLANET_AVATARS[i % PLANET_AVATARS.length]}
                      </div>
                      <div className="flex-1">
                        <p className="font-display font-bold text-base text-ink">{kid.name}</p>
                        <p className="font-body text-xs text-muted">
                          {results.length === 0 ? (lang === 'ar' ? 'لا توجد اختبارات بعد' : 'No quizzes yet') : lang === 'ar' ? `${results.length} اختبار · متوسط ${avg}%` : `${results.length} quiz${results.length > 1 ? 'zes' : ''} · Avg ${avg}%`}
                        </p>
                      </div>
                      {avg !== null && (
                        <div className="px-3 py-1 rounded-xl font-display font-bold text-sm"
                          style={{ background: avg >= 80 ? '#dcfce7' : avg >= 60 ? '#fef9c3' : '#fee2e2', color: avg >= 80 ? '#16a34a' : avg >= 60 ? '#ca8a04' : '#ef4444' }}>
                          {avg}%
                        </div>
                      )}
                    </div>
                    {results.length === 0 ? (
                      <div className="rounded-2xl px-5 py-6 text-center" style={{ background: '#fafafa' }}>
                        <p className="font-body text-sm text-muted">{lang === 'ar' ? 'سيظهر تقدم طفلك هنا بعد إكمال اختباراتهم.' : "Your child's progress will appear here after they complete quizzes."}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {results.map(r => {
                          const date = new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en', { month: 'short', day: 'numeric' })
                          const pct = r.score_pct
                          return (
                            <div key={r.result_id} className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                              <div className="flex-1 min-w-0">
                                <p className="font-display font-bold text-sm text-ink truncate">{r.topic}</p>
                                <p className="font-body text-xs text-muted">{r.correct}/{r.total} · {date}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="font-display font-bold text-sm" style={{ color: pct >= 80 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#ef4444' }}>{pct}%</span>
                                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? '#4ade80' : pct >= 60 ? '#facc15' : '#f87171' }} />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && <RewardModal lang={lang} onConfirm={handleCreate} onClose={() => setShowModal(false)} />}

      {/* Confirm reject modal */}
      {confirmRejectId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-display font-extrabold text-xl text-ink text-center">{lang === 'ar' ? 'رفض الطلب؟' : 'Reject this claim?'}</h2>
            <p className="font-body text-sm text-muted text-center">{lang === 'ar' ? 'سيُعاد رصيد العملات إلى الطفل.' : 'Coins will be refunded to the child.'}</p>
            <button disabled={rejectBusy} onClick={async () => { setRejectBusy(true); await handleReject(confirmRejectId); setRejectBusy(false); setConfirmRejectId(null) }}
              className="w-full py-4 text-white font-display font-bold text-lg rounded-2xl disabled:opacity-50 active:opacity-80" style={{ background: '#ef4444' }}>
              {rejectBusy ? '...' : lang === 'ar' ? 'نعم، ارفض' : 'Yes, reject'}
            </button>
            <button onClick={() => setConfirmRejectId(null)} className="w-full py-3 text-muted font-body font-bold text-sm text-center">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-display font-extrabold text-xl text-ink text-center">{lang === 'ar' ? 'حذف المكافأة؟' : 'Delete reward?'}</h2>
            <p className="font-body text-sm text-muted text-center">{lang === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This cannot be undone.'}</p>
            <button disabled={deleteBusy} onClick={async () => { setDeleteBusy(true); await confirmDelete(); setDeleteBusy(false) }}
              className="w-full py-4 text-white font-display font-bold text-lg rounded-2xl disabled:opacity-50 active:opacity-80" style={{ background: '#ef4444' }}>
              {deleteBusy ? '...' : lang === 'ar' ? 'نعم، احذف' : 'Yes, delete'}
            </button>
            <button onClick={() => setConfirmDeleteId(null)} className="w-full py-3 text-muted font-body font-bold text-sm text-center">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </div>
      )}

      {/* Session expired modal */}
      {sessionExpired && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 text-center">
            <span style={{ fontSize: 48 }}>🔒</span>
            <h2 className="font-display font-extrabold text-xl text-ink">{lang === 'ar' ? 'انتهت جلسة الوالدين' : 'Parent session expired'}</h2>
            <p className="font-body text-sm text-muted">{lang === 'ar' ? 'يرجى التحقق مرة أخرى للمتابعة.' : 'Please verify again to continue.'}</p>
            <button onClick={() => { setSessionExpired(false); window.location.reload() }}
              className="w-full py-4 text-white font-display font-bold text-lg rounded-2xl" style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
              {lang === 'ar' ? 'تحقق مجدداً' : 'Verify again'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RewardModal({ lang, onConfirm, onClose }) {
  const [name, setName]     = useState('')
  const [cost, setCost]     = useState(50)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const PRESETS = t(lang, 'parent_presets')

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true); setError('')
    try { await onConfirm(name.trim(), cost) }
    catch (e) { setError(lang === 'ar' ? 'حدث خطأ ما. حاول مجدداً.' : 'Something went wrong. Try again.'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '85dvh' }}>
        <div className="flex-shrink-0 pt-3 pb-1 flex justify-center"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-5">
          <h2 className="font-display font-extrabold text-2xl text-ink text-center pt-2">{t(lang, 'parent_modal_title')}</h2>
          <div className="flex flex-col gap-2">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{t(lang, 'parent_modal_presets')}</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => { setName(p.label); setCost(p.cost) }}
                  className="px-3 py-1.5 rounded-xl font-body font-bold text-sm border-2 transition-all"
                  style={{ borderColor: name === p.label ? '#7c3aed' : '#e5e7eb', background: name === p.label ? '#f5f3ff' : 'white', color: name === p.label ? '#7c3aed' : '#AFAFAF' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{t(lang, 'parent_modal_name_label')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t(lang, 'parent_modal_name_placeholder')}
              className="w-full rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none transition-colors"
              style={{ border: '2px solid #e5e7eb', background: '#fafafa' }}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{t(lang, 'parent_modal_cost_label')}</label>
            <div className="flex items-center gap-3">
              <input type="range" min={10} max={200} step={10} value={cost} onChange={e => setCost(Number(e.target.value))} className="flex-1" style={{ accentColor: '#7c3aed' }} />
              <div className="flex items-center gap-1 w-20">
                <CoinIcon size={20} />
                <span className="font-display font-bold text-lg" style={{ color: '#7c3aed' }}>{cost}</span>
              </div>
            </div>
          </div>
          {error && <p className="font-body text-sm text-red-500 font-bold text-center">{error}</p>}
          <button onClick={handleSubmit} disabled={!name.trim() || saving}
            className="w-full disabled:opacity-40 text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:scale-95"
            style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
            {saving ? t(lang, 'parent_modal_creating') : t(lang, 'parent_modal_cta')}
          </button>
          <button onClick={onClose} className="w-full text-muted font-body font-bold text-sm py-2 text-center">{t(lang, 'parent_modal_cancel')}</button>
        </div>
      </div>
    </div>
  )
}
