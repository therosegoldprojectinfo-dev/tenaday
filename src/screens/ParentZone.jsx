import { useState, useEffect } from 'react'
import { getRewards, createReward, deleteReward, getClaims, approveClaim, rejectClaim, isParentSessionError, getQuizResults } from '../lib/economy'
import { useLang } from '../lib/LangContext'
import { useKid } from '../lib/KidContext'
import { t } from '../lib/i18n'
import { supabase } from '../lib/supabaseClient'

const PLANET_AVATARS = ['🪐', '🌍', '🌙', '⭐', '🌟', '☀️', '🌎', '🌏', '🌑', '💫']

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
    { id: 'rewards',  Icon: IconGift,  label: lang === 'ar' ? 'المكافآت' : 'Rewards' },
    { id: 'claims',   Icon: IconClipboard, label: lang === 'ar' ? 'الطلبات' : 'Claims' },
    { id: 'progress', Icon: IconChart, label: lang === 'ar' ? 'التقدم' : 'Progress' },
  ]

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh' }}>
      <div className="w-full max-w-lg mx-auto px-5 flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 pt-12 pb-5">
          <h1 className="font-display font-extrabold text-2xl text-ink">{t(lang, 'parent_title')}</h1>
          <p className="font-body text-sm mt-1" style={{ color: '#9ca3af' }}>{t(lang, 'parent_sub')}</p>
        </div>

        {/* Kid stat cards */}
        {kids.length > 0 && (
          <div className="no-scrollbar flex-shrink-0 flex gap-3 mb-5 overflow-x-auto pb-1">
            {kids.map((kid, i) => {
              const results = quizResults[kid.id] || []
              const avg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score_pct, 0) / results.length) : null
              return (
                <div key={kid.id} className="flex-shrink-0 flex items-center gap-3"
                  style={{ ...CARD, borderRadius: 22, padding: '12px 16px', minWidth: 150 }}>
                  <span style={{ fontSize: 24 }}>{PLANET_AVATARS[i % PLANET_AVATARS.length]}</span>
                  <div>
                    <p className="font-display font-bold text-sm text-ink">{kid.name}</p>
                    <p className="font-body text-xs" style={{ color: '#9ca3af' }}>
                      {avg !== null ? `${avg}% avg` : lang === 'ar' ? 'لا اختبارات' : 'No quizzes'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tabs — white pills with icons */}
        <div className="flex-shrink-0 grid grid-cols-3 gap-2 mb-5">
          {TABS.map(({ id, Icon, label }) => {
            const active = tab === id
            return (
              <button key={id} onClick={() => setTab(id)}
                className="relative flex items-center justify-center gap-1.5 rounded-full py-3 font-display font-bold text-xs transition-all active:scale-95"
                style={{
                  background: 'white',
                  border: active ? '1.5px solid #7c3aed' : '1.5px solid #e5e7eb',
                  color: active ? '#7c3aed' : '#6b7280',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                <Icon size={16} />
                {label}
                {id === 'claims' && pendingClaims.length > 0 && (
                  <span className="absolute -top-1.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white flex items-center justify-center font-bold"
                    style={{ background: '#7c3aed', fontSize: 10 }}>{pendingClaims.length}</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-6">

          {/* ── REWARDS TAB ── */}
          {tab === 'rewards' && (
            <div className="flex flex-col gap-3">
              {rewards.length === 0 && (
                <div className="flex flex-col items-center justify-center pt-8 pb-2 gap-4 text-center">
                  <img src="/nav-gift.png" alt="" className="w-24 h-auto" style={{ animation: 'float 3s ease-in-out infinite' }} />
                  <p className="font-body text-sm max-w-xs" style={{ color: '#9ca3af' }}>{lang === 'ar' ? 'لا توجد مكافآت بعد. أضف أول مكافأة!' : 'No rewards yet. Add your first one!'}</p>
                </div>
              )}
              {rewards.map(reward => (
                <div key={reward.id} className="flex items-center gap-4" style={{ ...CARD, borderRadius: 28, padding: 14 }}>
                  <IconTile><img src="/nav-gift.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} /></IconTile>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-extrabold text-base text-ink truncate">{reward.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <img src="/coin-flower.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                      <span className="font-display font-bold text-sm" style={{ color: '#f59e0b' }}>{reward.cost}</span>
                    </div>
                  </div>
                  <button onClick={() => setConfirmDeleteId(reward.id)}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
                    style={{ background: 'white', border: '1.5px solid #e5e7eb' }}
                    aria-label="Delete">
                    <IconTrash size={18} />
                  </button>
                </div>
              ))}
              <button onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2.5 rounded-full py-4 font-display font-bold text-base text-ink transition-all active:scale-95"
                style={{ background: 'white', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <IconPlus size={20} />
                {t(lang, 'parent_add_reward')}
              </button>
            </div>
          )}

          {/* ── CLAIMS TAB ── */}
          {tab === 'claims' && (
            <div className="flex flex-col gap-3">
              {claims.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-12 gap-4 text-center">
                  <IconTile size={72}><IconClipboard size={32} /></IconTile>
                  <p className="font-display font-extrabold text-lg text-ink">{t(lang, 'parent_no_claims')}</p>
                </div>
              ) : claims.map(claim => (
                <div key={claim.id} className="flex flex-col gap-4" style={{ ...CARD, borderRadius: 28, padding: 16 }}>
                  {/* Kid row + status */}
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 16 }}>{getKidAvatar(claim.kid_id)}</span>
                    <span className="font-body font-semibold text-xs" style={{ color: '#6b7280' }}>{getKidName(claim.kid_id)}</span>
                    <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full"
                      style={claim.status === 'pending'
                        ? { background: 'white', border: '1.5px solid #7c3aed', color: '#7c3aed' }
                        : { background: '#f3f4f6', border: '1.5px solid transparent', color: '#6b7280' }}>
                      {claim.status === 'pending' ? (lang === 'ar' ? 'معلّق' : 'Pending')
                        : claim.status === 'approved' ? (lang === 'ar' ? 'موافق' : 'Approved')
                        : (lang === 'ar' ? 'مرفوض' : 'Rejected')}
                    </span>
                  </div>
                  {/* Reward info */}
                  <div className="flex items-center gap-3">
                    <IconTile size={48}><img src="/nav-gift.png" alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} /></IconTile>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-extrabold text-base text-ink truncate">{claim.rewards?.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <img src="/coin-flower.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                        <span className="font-display font-bold text-xs" style={{ color: '#f59e0b' }}>{claim.rewards?.cost}</span>
                      </div>
                    </div>
                  </div>
                  {/* Approve / Deny */}
                  {claim.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(claim.id)} disabled={approving === claim.id || rejecting === claim.id}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-white font-display font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
                        style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
                        {approving === claim.id ? '...' : (<><IconCheck size={18} color="white" />{t(lang, 'parent_approve')}</>)}
                      </button>
                      <button onClick={() => setConfirmRejectId(claim.id)} disabled={approving === claim.id || rejecting === claim.id}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-display font-bold text-sm text-ink transition-all active:scale-95 disabled:opacity-60"
                        style={{ background: 'white', border: '1.5px solid #e5e7eb' }}>
                        {rejecting === claim.id ? '...' : (<><IconX size={18} />{t(lang, 'parent_deny')}</>)}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── PROGRESS TAB ── */}
          {tab === 'progress' && (
            <div className="flex flex-col gap-6">
              {kids.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-12 gap-4 text-center">
                  <IconTile size={72}><IconChart size={32} /></IconTile>
                  <p className="font-display font-extrabold text-lg text-ink">{lang === 'ar' ? 'لا يوجد أطفال بعد' : 'No kids yet'}</p>
                </div>
              ) : kids.map((kid, i) => {
                const results = quizResults[kid.id] || []
                const avg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score_pct, 0) / results.length) : null
                const total = results.length

                return (
                  <div key={kid.id}>
                    {/* Kid header */}
                    <div className="flex items-center gap-3 mb-3">
                      <IconTile size={44}><span style={{ fontSize: 22 }}>{PLANET_AVATARS[i % PLANET_AVATARS.length]}</span></IconTile>
                      <p className="font-display font-bold text-lg text-ink">{kid.name}</p>
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: lang === 'ar' ? 'الاختبارات' : 'Quizzes', value: total },
                        { label: lang === 'ar' ? 'المتوسط' : 'Avg Score', value: avg !== null ? `${avg}%` : '—' },
                        { label: lang === 'ar' ? 'الرصيد' : 'Balance', value: kidBalances[kid.id] ?? '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center" style={{ ...CARD, borderRadius: 22, padding: '12px 8px' }}>
                          <p className="font-body text-xs mb-1" style={{ color: '#9ca3af' }}>{label}</p>
                          <p className="font-display font-extrabold text-lg text-ink">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Quiz results list */}
                    {results.length === 0 ? (
                      <div className="text-center" style={{ ...CARD, borderRadius: 22, padding: '20px 16px', boxShadow: 'none' }}>
                        <p className="font-body text-sm" style={{ color: '#9ca3af' }}>{lang === 'ar' ? 'سيظهر تقدم طفلك هنا بعد إكمال اختباراتهم.' : "Progress will appear here after quizzes are completed."}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {results.map(r => {
                          const date = new Date(r.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en', { month: 'short', day: 'numeric' })
                          const pct = r.score_pct
                          return (
                            <div key={r.result_id} className="flex items-center gap-3" style={{ ...CARD, borderRadius: 22, padding: '12px 16px' }}>
                              <div className="flex-1 min-w-0">
                                <p className="font-display font-bold text-sm text-ink truncate">{r.topic}</p>
                                <p className="font-body text-xs" style={{ color: '#9ca3af' }}>{r.correct}/{r.total} · {date}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="font-display font-extrabold text-sm text-ink">{pct}%</span>
                                <div className="overflow-hidden" style={{ width: 64, height: 6, borderRadius: 999, background: '#f1f5f9' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: '#22c55e' }} />
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

      {/* Confirm reject */}
      {confirmRejectId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-display font-extrabold text-xl text-ink text-center">{lang === 'ar' ? 'رفض الطلب؟' : 'Reject this claim?'}</h2>
            <p className="font-body text-sm text-center" style={{ color: '#9ca3af' }}>{lang === 'ar' ? 'سيُعاد رصيد العملات إلى الطفل.' : 'Points will be refunded to the child.'}</p>
            <button disabled={rejectBusy} onClick={async () => { setRejectBusy(true); await handleReject(confirmRejectId); setRejectBusy(false); setConfirmRejectId(null) }}
              className="w-full flex items-center justify-center gap-2 py-4 text-white font-display font-bold text-base rounded-full disabled:opacity-50 transition-all active:scale-95"
              style={{ background: '#1a1a2e' }}>
              {rejectBusy ? '...' : (<><IconX size={18} color="white" />{lang === 'ar' ? 'نعم، ارفض' : 'Yes, reject'}</>)}
            </button>
            <button onClick={() => setConfirmRejectId(null)} className="w-full py-3 font-body font-bold text-sm text-center" style={{ color: '#9ca3af' }}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-display font-extrabold text-xl text-ink text-center">{lang === 'ar' ? 'حذف المكافأة؟' : 'Delete reward?'}</h2>
            <p className="font-body text-sm text-center" style={{ color: '#9ca3af' }}>{lang === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This cannot be undone.'}</p>
            <button disabled={deleteBusy} onClick={async () => { setDeleteBusy(true); await confirmDelete(); setDeleteBusy(false) }}
              className="w-full flex items-center justify-center gap-2 py-4 text-white font-display font-bold text-base rounded-full disabled:opacity-50 transition-all active:scale-95"
              style={{ background: '#1a1a2e' }}>
              {deleteBusy ? '...' : (<><IconTrash size={18} color="white" />{lang === 'ar' ? 'نعم، احذف' : 'Yes, delete'}</>)}
            </button>
            <button onClick={() => setConfirmDeleteId(null)} className="w-full py-3 font-body font-bold text-sm text-center" style={{ color: '#9ca3af' }}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </div>
      )}

      {/* Session expired */}
      {sessionExpired && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center">
            <IconTile size={72}><IconLock size={32} /></IconTile>
            <h2 className="font-display font-extrabold text-xl text-ink">{lang === 'ar' ? 'انتهت جلسة الوالدين' : 'Parent session expired'}</h2>
            <p className="font-body text-sm" style={{ color: '#9ca3af' }}>{lang === 'ar' ? 'يرجى التحقق مرة أخرى للمتابعة.' : 'Please verify again to continue.'}</p>
            <button onClick={() => { setSessionExpired(false); window.location.reload() }}
              className="w-full py-4 text-white font-display font-bold text-base rounded-full transition-all active:scale-95"
              style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
              {lang === 'ar' ? 'تحقق مجدداً' : 'Verify again'}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}.no-scrollbar{scrollbar-width:none}.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
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
    catch { setError(lang === 'ar' ? 'حدث خطأ ما.' : 'Something went wrong.'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '85dvh' }}>
        <div className="flex-shrink-0 pt-3 pb-1 flex justify-center"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-5">
          <h2 className="font-display font-extrabold text-2xl text-ink text-center pt-2">{t(lang, 'parent_modal_title')}</h2>

          {/* Presets */}
          <div className="flex flex-col gap-2">
            <label className="font-body font-bold text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>{t(lang, 'parent_modal_presets')}</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => {
                const sel = name === p.label
                return (
                  <button key={p.label} onClick={() => { setName(p.label); setCost(p.cost) }}
                    className="px-4 py-2 rounded-full font-body font-bold text-sm transition-all active:scale-95"
                    style={{ background: 'white', border: sel ? '1.5px solid #7c3aed' : '1.5px solid #e5e7eb', color: sel ? '#7c3aed' : '#4b5563' }}>
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="font-body font-bold text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>{t(lang, 'parent_modal_name_label')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t(lang, 'parent_modal_name_placeholder')}
              className="w-full rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none transition-colors"
              style={{ border: '1.5px solid #e5e7eb', background: 'white' }}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          {/* Cost slider */}
          <div className="flex flex-col gap-2">
            <label className="font-body font-bold text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>{t(lang, 'parent_modal_cost_label')}</label>
            <div className="flex items-center gap-3">
              <input type="range" min={10} max={200} step={10} value={cost} onChange={e => setCost(Number(e.target.value))} className="flex-1" style={{ accentColor: '#7c3aed' }} />
              <div className="flex items-center gap-1.5 justify-end" style={{ width: 80 }}>
                <img src="/coin-flower.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                <span className="font-display font-extrabold text-xl" style={{ color: '#f59e0b' }}>{cost}</span>
              </div>
            </div>
          </div>

          {error && <p className="font-body text-sm font-bold text-center" style={{ color: '#6b7280' }}>{error}</p>}

          <button onClick={handleSubmit} disabled={!name.trim() || saving}
            className="w-full disabled:opacity-40 text-white font-display font-bold text-lg rounded-full py-4 transition-all active:scale-95"
            style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
            {saving ? t(lang, 'parent_modal_creating') : t(lang, 'parent_modal_cta')}
          </button>
          <button onClick={onClose} className="w-full font-body font-bold text-sm py-2 text-center" style={{ color: '#9ca3af' }}>{t(lang, 'parent_modal_cancel')}</button>
        </div>
      </div>
    </div>
  )
}

/* ── shared style + icons ── */
const CARD = { background: 'white', border: '1.5px solid #eef0f3', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }

function IconTile({ size = 56, children }) {
  return (
    <div className="flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), background: '#f9fafb', border: '1.5px solid #eef0f3' }}>
      {children}
    </div>
  )
}

function Svg({ size = 20, color = '#1a1a2e', children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
const IconGift = ({ size, color = 'currentColor' }) => (
  <Svg size={size} color={color}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" /></Svg>
)
const IconClipboard = ({ size, color = 'currentColor' }) => (
  <Svg size={size} color={color}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 14l2 2 4-4" /></Svg>
)
const IconChart = ({ size, color = 'currentColor' }) => (
  <Svg size={size} color={color}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></Svg>
)
const IconTrash = ({ size, color = '#1a1a2e' }) => (
  <Svg size={size} color={color}><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></Svg>
)
const IconPlus = ({ size, color = '#1a1a2e' }) => (
  <Svg size={size} color={color}><path d="M12 5v14M5 12h14" /></Svg>
)
const IconCheck = ({ size, color = '#1a1a2e' }) => (
  <Svg size={size} color={color}><path d="M5 12l5 5L20 7" /></Svg>
)
const IconX = ({ size, color = '#1a1a2e' }) => (
  <Svg size={size} color={color}><path d="M6 6l12 12M18 6L6 18" /></Svg>
)
const IconLock = ({ size, color = '#1a1a2e' }) => (
  <Svg size={size} color={color}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>
)
