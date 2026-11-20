import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useKid } from '../lib/KidContext'
import { createKid, getKids } from '../lib/kids'

const AVATARS = ['🪐', '🌍', '🌙', '⭐', '🌟', '☀️', '🌎', '🌏', '🌑', '💫']

const CARD = { background: 'white', border: '1.5px solid #eef0f3', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }
const PILL = { background: 'white', border: '1.5px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }

export default function Profile({ onLogout }) {
  const { activeKid, kids, setActiveKid, setKids } = useKid()
  const [showAddKid, setShowAddKid] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    getKids().then(fresh => { if (fresh.length) setKids(fresh) }).catch(() => {})
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').select('display_name').eq('id', user.id).single()
        .then(({ data }) => { if (data?.display_name) setUsername(data.display_name) })
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    try { const { ensureAuth } = await import('../lib/auth'); await ensureAuth() } catch {}
    onLogout()
  }

  async function handleAddKid(name) {
    const newKid = await createKid(name)
    setKids(prev => [...prev, newKid])
    setActiveKid(newKid)
    setShowAddKid(false)
  }

  const activeIndex = Math.max(0, kids.findIndex(k => k.id === activeKid?.id))
  const activeCoins = (kids.find(k => k.id === activeKid?.id) || activeKid)?.coin_balance || 0

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-12 pb-10 max-w-lg mx-auto w-full">

        {/* Titre */}
        <h1 className="font-display font-extrabold text-2xl text-ink mb-5">Profil</h1>

        {/* Carte résumé */}
        {activeKid && (
          <div className="mb-8" style={{ ...CARD, borderRadius: 28, padding: 18 }}>
            <div className="flex items-center gap-4">
              <IconTile size={64}><span style={{ fontSize: 32 }}>{AVATARS[activeIndex % AVATARS.length]}</span></IconTile>
              <div className="min-w-0">
                <p className="font-body text-sm" style={{ color: '#9ca3af' }}>Bonjour,</p>
                <p className="font-display font-extrabold text-2xl text-ink truncate">{activeKid.name}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <div className="flex-1 text-center" style={{ background: '#f9fafb', border: '1.5px solid #eef0f3', borderRadius: 20, padding: '12px 8px' }}>
                <div className="flex items-center justify-center gap-1.5">
                  <img src="/coin-flower.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                  <p className="font-display font-extrabold text-xl" style={{ color: '#f59e0b' }}>{activeCoins}</p>
                </div>
                <p className="font-body text-xs mt-0.5" style={{ color: '#9ca3af' }}>Pièces</p>
              </div>
              <div className="flex-1 text-center" style={{ background: '#f9fafb', border: '1.5px solid #eef0f3', borderRadius: 20, padding: '12px 8px' }}>
                <p className="font-display font-extrabold text-xl text-ink">{kids.length}</p>
                <p className="font-body text-xs mt-0.5" style={{ color: '#9ca3af' }}>Enfant{kids.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enfants */}
        <h2 className="font-display font-bold text-lg text-ink mb-3">Enfants du compte</h2>
        <div className="flex flex-col gap-3 mb-8">
          {kids.map((kid, i) => {
            const isActive = kid.id === activeKid?.id
            return (
              <button key={kid.id} onClick={() => setActiveKid(kid)}
                className="w-full flex items-center gap-4 text-left transition-all active:scale-95"
                style={{
                  ...CARD,
                  borderRadius: 28,
                  padding: 14,
                  border: isActive ? '1.5px solid #7c3aed' : CARD.border,
                }}>
                <IconTile size={52}><span style={{ fontSize: 26 }}>{AVATARS[i % AVATARS.length]}</span></IconTile>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-extrabold text-base truncate" style={{ color: '#1a1a2e' }}>{kid.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <img src="/coin-flower.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                    <span className="font-display font-bold text-xs" style={{ color: '#f59e0b' }}>{kid.coin_balance || 0}</span>
                  </div>
                </div>
                {isActive && (
                  <div className="flex items-center justify-center flex-shrink-0"
                    style={{ width: 28, height: 28, borderRadius: '50%', background: '#7c3aed' }}>
                    <Svg size={16} color="white"><path d="M5 12l5 5L20 7" /></Svg>
                  </div>
                )}
              </button>
            )
          })}

          <button onClick={() => setShowAddKid(true)}
            className="w-full flex items-center justify-center gap-2.5 rounded-full py-4 font-display font-bold text-base text-ink transition-all active:scale-95"
            style={PILL}>
            <Svg size={20}><path d="M12 5v14M5 12h14" /></Svg>
            Ajouter un enfant
          </button>
        </div>

        {/* Liens légaux */}
        <div className="flex gap-4 justify-center mb-6">
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="font-body text-xs underline" style={{ color: '#9ca3af' }}>
            Politique de confidentialité
          </a>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="font-body text-xs underline" style={{ color: '#9ca3af' }}>
            Conditions d'utilisation
          </a>
        </div>

        {/* Remboursement */}
        <a href="https://wa.me/14384102068" target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2.5 rounded-full py-4 font-display font-bold text-base text-ink transition-all active:scale-95 mb-3"
          style={{ ...PILL, textDecoration: 'none' }}>
          <Svg size={20}><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20" /></Svg>
          Demander un remboursement
        </a>

        {/* Déconnexion */}
        <button onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2.5 rounded-full py-4 font-display font-bold text-base text-ink transition-all active:scale-95"
          style={PILL}>
          <Svg size={20}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Svg>
          Se déconnecter
        </button>

        {/* Support WhatsApp */}
        <a href="https://wa.me/14384102068" target="_blank" rel="noopener noreferrer"
          className="text-center block mt-4"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>
          Un problème ? <span style={{ color: '#7c3aed', fontWeight: 700 }}>Contactez-nous sur WhatsApp</span>
        </a>
      </div>

      {showAddKid && <AddKidModal onConfirm={handleAddKid} onClose={() => setShowAddKid(false)} />}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-display font-extrabold text-xl text-ink text-center">Se déconnecter ?</h2>
            <p className="font-body text-sm text-center" style={{ color: '#9ca3af' }}>
              Vous aurez besoin de votre nom d'utilisateur et de votre mot de passe pour vous reconnecter.
            </p>
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-4 text-white font-display font-bold text-base rounded-full transition-all active:scale-95"
              style={{ background: '#1a1a2e' }}>
              Oui, me déconnecter
            </button>
            <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-3 font-body font-bold text-sm text-center" style={{ color: '#9ca3af' }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddKidModal({ onConfirm, onClose }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true); setError('')
    try { await onConfirm(name.trim()) }
    catch { setError('Une erreur est survenue.'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-white rounded-t-3xl px-5 pb-8 pt-4">
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <h2 className="font-display font-extrabold text-2xl text-ink text-center mb-5">Ajouter un enfant</h2>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Prénom de l'enfant..."
          autoFocus
          className="w-full rounded-2xl px-4 py-4 font-display font-bold text-xl text-ink outline-none transition-colors mb-4"
          style={{ border: '1.5px solid #e5e7eb', background: 'white' }}
          onFocus={e => e.target.style.borderColor = '#7c3aed'}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
        {error && <p className="font-body text-sm font-bold text-center mb-2" style={{ color: '#6b7280' }}>{error}</p>}
        <button onClick={handleSubmit} disabled={!name.trim() || saving}
          className="w-full disabled:opacity-40 text-white font-display font-bold text-lg rounded-full py-4 transition-all active:scale-95"
          style={{ background: '#7c3aed', boxShadow: name.trim() ? '0 4px 16px rgba(124,58,237,0.3)' : 'none' }}>
          {saving ? '...' : 'Ajouter'}
        </button>
        <button onClick={onClose} className="w-full font-body font-bold text-sm py-3 text-center mt-1" style={{ color: '#9ca3af' }}>
          Annuler
        </button>
      </div>
    </div>
  )
}

/* ── petits composants ── */
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
