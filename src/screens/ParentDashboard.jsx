import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchKidStats, fetchStreak } from '../lib/kidData'

const DUO_GREEN      = '#58cc02'
const DUO_GREEN_DARK = '#46a302'
const OPERATIONS     = ['addition', 'subtraction', 'multiplication', 'division']

// ── Icons ─────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 16L6.5 10L12.5 4" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function CoinIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#FFB700" />
      <circle cx="10" cy="10" r="7" fill="#FFD700" />
      <path d="M10 5.5l1.1 3.4h3.6l-2.9 2.1 1.1 3.4L10 12.4 6.9 14.4l1.1-3.4-2.9-2.1h3.6z" fill="#CC7700" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}
function GiftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="9" width="18" height="11" rx="1" />
      <path d="M3 9h18M12 9v11M12 9C9 9 7 7 7 5.5A2.5 2.5 0 0 1 9.5 3C11.5 3 12 6 12 9ZM12 9c3 0 5-2 5-3.5A2.5 2.5 0 0 0 14.5 3C12.5 3 12 6 12 9Z" />
    </svg>
  )
}
function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#FF9600','#9B59B6','#E74C3C','#00B4D8',DUO_GREEN,'#1CB0F6']
function avatarColor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display font-bold text-lg text-gray-900">{title}</h2>
      {action && (
        <button onClick={onAction}
          className="font-body font-bold text-sm px-3 py-1.5 rounded-xl flex items-center gap-1"
          style={{ color: '#1CB0F6', backgroundColor: '#DDF0FB' }}>
          <PlusIcon />{action}
        </button>
      )}
    </div>
  )
}

// ── Kid card ───────────────────────────────────────────────────────────────
function KidCard({ kid, stats, streak, onViewProgress }) {
  const color = avatarColor(kid.id)
  const opIdx = OPERATIONS.indexOf(kid.current_operation)
  const chapterLabel = ['Addition','Subtraction','Multiplication','Division'][opIdx] || 'Addition'
  const totalBatches = 12 * 6 // 72
  const currentBatch = (kid.current_table - 1) * 6 + (kid.current_batch || 1)
  const pct = Math.round((currentBatch / totalBatches) * 100)

  return (
    <button onClick={onViewProgress}
      className="w-full text-left rounded-3xl border-2 border-gray-100 p-4 bg-white
                 transition-transform active:scale-[0.98]"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color }}>
          <span className="font-display font-extrabold text-2xl text-white">
            {kid.name[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-base text-gray-900">{kid.name}</p>
          <p className="font-body text-xs text-gray-400">{chapterLabel} · Day {currentBatch} of 72</p>
        </div>
        <div className="flex items-center gap-1">
          <CoinIcon />
          <span className="font-body font-bold text-sm text-amber-700">{kid.coin_balance}</span>
        </div>
      </div>

      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: DUO_GREEN }} />
      </div>
      <p className="font-body text-xs text-gray-400 mt-1">{pct}% through {chapterLabel}</p>

      {stats && (
        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
          <div className="text-center">
            <p className="font-display font-bold text-base text-gray-900">🔥 {streak ?? 0}</p>
            <p className="font-body text-xs text-gray-400">Day streak</p>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-base text-gray-900">{stats.totalCorrect}</p>
            <p className="font-body text-xs text-gray-400">Correct answers</p>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-base text-gray-900">{stats.nodesPassed}</p>
            <p className="font-body text-xs text-gray-400">Sessions done</p>
          </div>
        </div>
      )}
    </button>
  )
}

// ── Reward item ────────────────────────────────────────────────────────────
function RewardItem({ gift, onDelete }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 px-4 py-3 bg-white">
      <GiftIcon />
      <div className="flex-1 min-w-0">
        <p className="font-body font-bold text-sm text-gray-900 truncate">{gift.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <CoinIcon />
          <span className="font-body text-xs text-amber-700 font-bold">{gift.coin_price} coins</span>
        </div>
      </div>
      <button onClick={() => onDelete(gift.id)}
        className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 active:bg-red-50 active:text-red-400 transition-colors">
        <TrashIcon />
      </button>
    </div>
  )
}

// ── Claim item ─────────────────────────────────────────────────────────────
function ClaimItem({ claim, onApprove }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-100 bg-amber-50 px-4 py-3">
      <span className="text-2xl">🎁</span>
      <div className="flex-1 min-w-0">
        <p className="font-body font-bold text-sm text-gray-900">{claim.kid_name} wants:</p>
        <p className="font-body text-sm text-amber-700 font-bold truncate">{claim.gift_name}</p>
      </div>
      <button onClick={() => onApprove(claim.id)}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-colors active:scale-95"
        style={{ backgroundColor: DUO_GREEN }}>
        <CheckIcon />
      </button>
    </div>
  )
}

// ── Add reward modal ───────────────────────────────────────────────────────
function AddRewardSheet({ parentId, onAdded, onClose }) {
  const [name, setName]   = useState('')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || !price) return
    setSaving(true)
    try {
      const { error } = await supabase.from('gifts').insert({
        parent_id: parentId,
        name: name.trim(),
        coin_price: parseInt(price, 10),
        icon: 'gift',
      })
      if (error) throw error
      onAdded()
    } catch (err) {
      console.error('Failed to add reward:', err)
      alert('Failed to save reward. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed z-50 bg-white bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-5 pb-10 max-w-sm mx-auto">
        <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-5" />
        <h3 className="font-display font-bold text-xl text-gray-900 mb-4">Add a Reward</h3>

        <div className="flex flex-col gap-4">
          <div>
            <label className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">
              Reward name
            </label>
            <input
              type="text" autoFocus
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. 20 minutes of TV"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 font-body text-base
                         focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">
              Coin price
            </label>
            <input
              type="number" inputMode="numeric" min={1}
              value={price} onChange={e => setPrice(e.target.value)}
              placeholder="e.g. 150"
              className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 font-body text-base
                         focus:border-green-500 focus:outline-none"
            />
          </div>
          <button onClick={handleSave} disabled={!name.trim() || !price || saving}
            className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-lg tracking-wide mt-1">
            {saving ? 'SAVING…' : 'ADD REWARD'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main parent dashboard ──────────────────────────────────────────────────
export default function ParentDashboard({ parentId, onBack, onAddKid }) {
  const [kids,        setKids]        = useState([])
  const [kidStats,    setKidStats]    = useState({})
  const [kidStreaks,   setKidStreaks]   = useState({})
  const [gifts,       setGifts]       = useState([])
  const [claims,      setClaims]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [viewingKid, setViewingKid] = useState(null)
  const [showAddReward, setShowAddReward] = useState(false)
  const [activeTab,   setActiveTab]   = useState('kids') // 'kids' | 'rewards' | 'claims' | 'coins'
  const [coinHistory, setCoinHistory] = useState([])
  const [coinKidId,   setCoinKidId]   = useState(null)
  const [coinLoading, setCoinLoading] = useState(false)

  async function loadAll() {
    try {
      // Kids
      const { data: kidsData } = await supabase
        .from('kids')
        .select('id, name, coin_balance, current_operation, current_table, current_batch, current_node')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true })

      setKids(kidsData || [])

      // Stats + streaks per kid
      if (kidsData?.length) {
        const statsMap = {}
        const streakMap = {}
        await Promise.all(kidsData.map(async k => {
          try { statsMap[k.id] = await fetchKidStats(k.id) } catch {}
          try { streakMap[k.id] = await fetchStreak(k.id) } catch {}
        }))
        setKidStats(statsMap)
        setKidStreaks(streakMap)
      }

      // Parent rewards + global rewards
      const { data: giftsData } = await supabase
        .from('gifts')
        .select('id, name, coin_price, icon, parent_id')
        .or(`parent_id.eq.${parentId},parent_id.is.null`)
        .order('coin_price', { ascending: true })
      setGifts(giftsData || [])

      // Pending claims — get all claims for this parent's kids
      if (kidsData?.length) {
        const kidIds = kidsData.map(k => k.id)
        const { data: claimsData } = await supabase
          .from('gift_claims')
          .select('id, claimed_at, kid_id, gift_id')
          .in('kid_id', kidIds)
          .order('claimed_at', { ascending: false })
          .limit(20)

        if (claimsData?.length) {
          // Enrich with names
          const giftIds = [...new Set(claimsData.map(c => c.gift_id))]
          const { data: giftsForClaims } = await supabase
            .from('gifts').select('id, name').in('id', giftIds)
          const giftsMap = Object.fromEntries((giftsForClaims || []).map(g => [g.id, g.name]))
          const kidsMap  = Object.fromEntries(kidsData.map(k => [k.id, k.name]))

          setClaims(claimsData.map(c => ({
            id: c.id,
            kid_name: kidsMap[c.kid_id] || 'Unknown',
            gift_name: giftsMap[c.gift_id] || 'Unknown',
            claimed_at: c.claimed_at,
          })))
        }
      }
    } catch (err) {
      console.error('Failed to load parent dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [parentId])

  async function handleDeleteReward(giftId) {
    await supabase.from('gifts').delete().eq('id', giftId)
    setGifts(gs => gs.filter(g => g.id !== giftId))
  }

  async function handleApproveClaim(claimId) {
    await supabase.from('gift_claims').delete().eq('id', claimId)
    setClaims(cs => cs.filter(c => c.id !== claimId))
  }

  async function fetchCoinHistory(kidId) {
    setCoinLoading(true)
    setCoinKidId(kidId)
    try {
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('id, amount, reason, balance_after, created_at')
        .eq('kid_id', kidId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setCoinHistory(data || [])
    } catch (err) {
      console.error('Failed to fetch coin history:', err)
      setCoinHistory([])
    } finally {
      setCoinLoading(false)
    }
  }

  const TABS = [
    { id: 'kids',    label: 'Kids',    badge: kids.length },
    { id: 'rewards', label: 'Rewards', badge: gifts.filter(g => g.parent_id !== null).length },
    { id: 'claims',  label: 'Claims',  badge: claims.length, alert: claims.length > 0 },
    { id: 'coins',   label: 'Coins',   badge: 0 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-5 pb-4 sticky top-0 z-20">
        <div className="max-w-sm md:max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 active:bg-gray-100">
              <BackIcon />
            </button>
            <div className="flex-1">
              <h1 className="font-display font-bold text-xl text-gray-900">Parent Zone 🔐</h1>
              <p className="font-body text-xs text-gray-400">Manage your kids and rewards</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl font-body font-bold text-sm transition-colors"
                style={{
                  backgroundColor: activeTab === tab.id ? (tab.alert ? '#FEF3C7' : '#DDF0FB') : 'transparent',
                  color: activeTab === tab.id ? (tab.alert ? '#D97706' : '#1CB0F6') : '#9CA3AF',
                }}>
                {tab.label}
                {tab.badge > 0 && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: tab.alert ? '#F59E0B' : '#1CB0F6', color: 'white' }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-sm md:max-w-md mx-auto px-4 py-5">
        {loading ? (
          <p className="font-body text-gray-400 text-center py-10">Loading…</p>
        ) : (

          /* ── Kids tab ──────────────────────────────────────────── */
          activeTab === 'kids' ? (
            <div>
              <SectionHeader title="Your Kids" action="Add kid" onAction={onAddKid} />
              {kids.length === 0 ? (
                <div className="rounded-3xl bg-white border-2 border-dashed border-gray-200 py-10 text-center">
                  <p className="text-4xl mb-2">👶</p>
                  <p className="font-body text-sm text-gray-400">No kids yet. Add one to get started!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {kids.map(kid => (
                    <KidCard key={kid.id} kid={kid} stats={kidStats[kid.id]} streak={kidStreaks[kid.id] ?? 0}
                      onViewProgress={() => setViewingKid(kid)} />
                  ))}
                </div>
              )}
            </div>

          /* ── Rewards tab ───────────────────────────────────────── */
          ) : activeTab === 'rewards' ? (
            <div>
              <SectionHeader title="Rewards" action="Add reward" onAction={() => setShowAddReward(true)} />

              {/* Parent's custom rewards */}
              {gifts.filter(g => g.parent_id === parentId).length > 0 && (
                <div className="mb-4">
                  <p className="font-body font-bold text-xs text-gray-400 uppercase tracking-wide mb-2">Your rewards</p>
                  <div className="flex flex-col gap-2">
                    {gifts.filter(g => g.parent_id === parentId).map(gift => (
                      <RewardItem key={gift.id} gift={gift} onDelete={handleDeleteReward} />
                    ))}
                  </div>
                </div>
              )}

              {/* Global starter rewards */}
              <p className="font-body font-bold text-xs text-gray-400 uppercase tracking-wide mb-2">Starter rewards</p>
              <div className="flex flex-col gap-2">
                {gifts.filter(g => g.parent_id === null).map(gift => (
                  <div key={gift.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 px-4 py-3 bg-white opacity-70">
                    <GiftIcon />
                    <div className="flex-1">
                      <p className="font-body font-bold text-sm text-gray-700">{gift.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CoinIcon />
                        <span className="font-body text-xs text-amber-700 font-bold">{gift.coin_price} coins</span>
                      </div>
                    </div>
                    <span className="font-body text-xs text-gray-300">Default</span>
                  </div>
                ))}
              </div>

              {gifts.length === 0 && (
                <div className="rounded-3xl bg-white border-2 border-dashed border-gray-200 py-10 text-center">
                  <p className="text-4xl mb-2">🎁</p>
                  <p className="font-body text-sm text-gray-400">No rewards yet. Add one!</p>
                </div>
              )}
            </div>

          /* ── Coins tab ─────────────────────────────────────────── */
          ) : activeTab === 'coins' ? (
            <div>
              <SectionHeader title="Coin History" />
              {/* Kid selector */}
              {kids.length > 1 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {kids.map(k => (
                    <button key={k.id} onClick={() => fetchCoinHistory(k.id)}
                      className="px-3 py-1.5 rounded-full font-body font-bold text-xs transition-colors"
                      style={{
                        backgroundColor: coinKidId === k.id ? '#DDF0FB' : '#F3F4F6',
                        color: coinKidId === k.id ? '#1CB0F6' : '#6B7280',
                      }}>
                      {k.name}
                    </button>
                  ))}
                </div>
              )}
              {/* Auto-load first kid */}
              {!coinKidId && kids.length > 0 && (() => { fetchCoinHistory(kids[0].id); return null })()}

              {coinLoading ? (
                <p className="font-body text-gray-400 text-center py-8">Loading…</p>
              ) : coinHistory.length === 0 ? (
                <div className="rounded-3xl bg-white border-2 border-dashed border-gray-200 py-10 text-center">
                  <p className="mb-2"><img src="/ChatGPT Image 28 juin 2026, 09_27_20.png" width="40" height="40" alt="coin" /></p>
                  <p className="font-body text-sm text-gray-400">No transactions yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {coinHistory.map(tx => {
                    const isPositive = tx.amount > 0
                    const reasonLabels = {
                      node_pass:      '✅ Node passed',
                      review_pass:    '✅ Review passed',
                      entry_fee:      '🎮 Started activity',
                      exit_refund:    '↩️ Exited activity',
                      heart_recharge: '♥ Recharged heart',
                      gift_purchase:  '🎁 Bought reward',
                    }
                    const label = reasonLabels[tx.reason] || tx.reason
                    const date  = new Date(tx.created_at)
                    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                    return (
                      <div key={tx.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 px-4 py-3 bg-white">
                        <div className="flex-1 min-w-0">
                          <p className="font-body font-bold text-sm text-gray-900">{label}</p>
                          <p className="font-body text-xs text-gray-400">{dateStr} · {timeStr}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-body font-bold text-sm ${isPositive ? 'text-green-500' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{tx.amount} coins
                          </p>
                          <p className="font-body text-xs text-gray-400">Balance: {tx.balance_after}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          /* ── Claims tab ─────────────────────────────────────────── */
          ) : (
            <div>
              <SectionHeader title="Pending Claims" />
              {claims.length === 0 ? (
                <div className="rounded-3xl bg-white border-2 border-dashed border-gray-200 py-10 text-center">
                  <p className="text-4xl mb-2">✅</p>
                  <p className="font-body text-sm text-gray-400">No pending claims — all clear!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {claims.map(claim => (
                    <ClaimItem key={claim.id} claim={claim} onApprove={handleApproveClaim} />
                  ))}
                  <p className="font-body text-xs text-gray-400 text-center mt-2">
                    Tap ✓ to confirm you've given the reward in real life
                  </p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {showAddReward && (
        <AddRewardSheet
          parentId={parentId}
          onAdded={() => { setShowAddReward(false); loadAll() }}
          onClose={() => setShowAddReward(false)}
        />
      )}

      {/* Kid progress modal */}
      {viewingKid && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setViewingKid(null)} />
          <div className="fixed z-50 bg-white bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-5 pb-10 max-w-sm mx-auto">
            <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: avatarColor(viewingKid.id) }}>
                <span className="font-display font-extrabold text-2xl text-white">
                  {viewingKid.name[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-gray-900">{viewingKid.name}</h3>
                <p className="font-body text-sm text-gray-400">
                  {['Addition','Subtraction','Multiplication','Division'][OPERATIONS.indexOf(viewingKid.current_operation)] || 'Addition'}
                  {' · Day '}{(viewingKid.current_table - 1) * 6 + (viewingKid.current_batch || 1)} of 72
                </p>
              </div>
            </div>
            {kidStats[viewingKid.id] ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Day streak', value: kidStreaks[viewingKid.id] ?? 0, emoji: '🔥' },
                  { label: 'Correct answers', value: kidStats[viewingKid.id].totalCorrect, emoji: '✅' },
                  { label: 'Sessions done', value: kidStats[viewingKid.id].nodesPassed, emoji: '⭐' },
                  { label: 'Coin balance', value: viewingKid.coin_balance, icon: <img src="/ChatGPT Image 28 juin 2026, 09_27_20.png" width="18" height="18" alt="coin" /> },
                ].map(({ label, value, emoji }) => (
                  <div key={label} className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-2xl mb-1">{emoji}</p>
                    <p className="font-display font-bold text-2xl text-gray-900">{value}</p>
                    <p className="font-body text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body text-gray-400 text-center py-4">Loading stats…</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
