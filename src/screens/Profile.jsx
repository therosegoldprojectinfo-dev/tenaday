import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLang } from '../lib/LangContext'
import { useKid } from '../lib/KidContext'
import { createKid, getKids } from '../lib/kids'

function CoinIcon({ size = 24 }) {
  return <img src="/coin.png" width={size} height={size} alt="coin" style={{ objectFit: 'contain' }} />
}

const AVATARS = ['🪐', '🌍', '🌙', '⭐', '🌟', '☀️', '🌎', '🌏', '🌑', '💫']
const ACCENT_COLORS = ['#ede9fe', '#fce7f3', '#dbeafe', '#dcfce7', '#ffedd5']

export default function Profile({ onLogout, onLanguageChange }) {
  const lang = useLang()
  const { activeKid, kids, setActiveKid, setKids } = useKid()
  const [showAddKid, setShowAddKid] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [langSaving, setLangSaving] = useState(false)

  useEffect(() => {
    getKids().then(fresh => { if (fresh.length) setKids(fresh) }).catch(() => {})
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    try { const { ensureAuth } = await import('../lib/auth'); await ensureAuth() } catch (e) { console.error(e) }
    onLogout()
  }

  async function handleAddKid(name) {
    const newKid = await createKid(name)
    setKids(prev => [...prev, newKid])
    setActiveKid(newKid)
    setShowAddKid(false)
  }

  async function handleLanguageChange(newLang) {
    if (newLang === lang || langSaving) return
    setLangSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('profiles').update({ language: newLang }).eq('id', user.id)
      onLanguageChange?.(newLang)
    } catch (e) { console.error(e) }
    finally { setLangSaving(false) }
  }

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-10 max-w-lg mx-auto w-full">

        <h1 className="font-display font-extrabold text-3xl text-ink mb-6">
          {lang === 'ar' ? 'الملف الشخصي' : 'Profile'}
        </h1>

        {/* Active kid card */}
        {activeKid && (
          <div className="rounded-3xl px-6 py-5 mb-6" style={{ background: '#f5f3ff', boxShadow: '0 4px 20px rgba(124,58,237,0.1)' }}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl" style={{ background: 'white' }}>
                {AVATARS[kids.findIndex(k => k.id === activeKid?.id) % AVATARS.length]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-extrabold text-2xl text-ink truncate">{activeKid.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <CoinIcon size={18} />
                  <span className="font-display font-bold text-lg" style={{ color: '#7c3aed' }}>
                    {(kids.find(k => k.id === activeKid.id) || activeKid).coin_balance || 0} {lang === 'ar' ? 'عملات' : 'coins'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kids switcher */}
        <div className="mb-6">
          <p className="font-body font-bold text-xs text-muted uppercase tracking-widest mb-3">
            {lang === 'ar' ? 'الأطفال في هذا الحساب' : 'Kids on this account'}
          </p>
          <div className="flex flex-col gap-3">
            {kids.map((kid, i) => {
              const isActive = kid.id === activeKid?.id
              return (
                <button
                  key={kid.id}
                  onClick={() => setActiveKid(kid)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: isActive ? '#f5f3ff' : 'white',
                    boxShadow: isActive ? '0 4px 16px rgba(124,58,237,0.15)' : '0 2px 12px rgba(0,0,0,0.06)',
                    border: isActive ? '2px solid #c4b5fd' : '2px solid transparent',
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: ACCENT_COLORS[i % ACCENT_COLORS.length] }}>
                    {AVATARS[i % AVATARS.length]}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-display font-bold text-base truncate" style={{ color: isActive ? '#7c3aed' : '#3C3C3C' }}>{kid.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <CoinIcon size={12} />
                      <span className="font-body text-xs font-bold" style={{ color: '#7c3aed' }}>{kid.coin_balance || 0}</span>
                    </div>
                  </div>
                  {isActive && <span style={{ color: '#7c3aed', fontSize: 18 }}>✓</span>}
                </button>
              )
            })}
            <button
              onClick={() => setShowAddKid(true)}
              className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95"
              style={{ border: '2px dashed #e5e7eb', color: '#AFAFAF', background: 'white' }}
            >
              {lang === 'ar' ? '+ إضافة طفل' : '+ Add a kid'}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="mb-6">
          <p className="font-body font-bold text-xs text-muted uppercase tracking-widest mb-3">
            {lang === 'ar' ? 'اللغة' : 'Language'}
          </p>
          <div className="flex gap-3">
            {[{ code: 'en', label: '🇺🇸 English' }, { code: 'ar', label: '🇸🇦 عربي' }].map(({ code, label }) => (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                disabled={langSaving}
                className="flex-1 py-3 rounded-2xl font-display font-bold text-base transition-all active:scale-95"
                style={{
                  background: lang === code ? '#7c3aed' : 'white',
                  color: lang === code ? 'white' : '#AFAFAF',
                  boxShadow: lang === code ? '0 4px 0 #5b21b6' : '0 2px 12px rgba(0,0,0,0.06)',
                  border: lang === code ? 'none' : '2px solid #f3f4f6',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="flex gap-4 justify-center pb-4">
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="font-body text-xs text-muted underline">
            {lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </a>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="font-body text-xs text-muted underline">
            {lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}
          </a>
        </div>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95"
          style={{ background: '#fff5f5', border: '2px solid #fee2e2', color: '#ef4444' }}
        >
          {lang === 'ar' ? '🚪 تسجيل الخروج' : '🚪 Log out'}
        </button>
      </div>

      {showAddKid && <AddKidModal lang={lang} onConfirm={handleAddKid} onClose={() => setShowAddKid(false)} />}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-display font-extrabold text-xl text-ink text-center">{lang === 'ar' ? 'تسجيل الخروج؟' : 'Log out?'}</h2>
            <p className="font-body text-sm text-muted text-center">{lang === 'ar' ? 'ستحتاج إلى اسم المستخدم وكلمة المرور لتسجيل الدخول مرة أخرى.' : "You'll need your username and password to log back in."}</p>
            <button onClick={handleLogout} className="w-full py-4 text-white font-display font-bold text-lg rounded-2xl active:opacity-80" style={{ background: '#ef4444' }}>
              {lang === 'ar' ? 'نعم، اخرج' : 'Yes, log out'}
            </button>
            <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-3 text-muted font-body font-bold text-sm text-center">
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddKidModal({ lang, onConfirm, onClose }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true); setError('')
    try { await onConfirm(name.trim()) }
    catch (e) { setError(lang === 'ar' ? 'حدث خطأ ما. حاول مرة أخرى.' : 'Something went wrong. Try again.'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-white rounded-t-3xl px-5 pb-8 pt-4">
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <h2 className="font-display font-extrabold text-2xl text-ink text-center mb-5">{lang === 'ar' ? 'إضافة طفل' : 'Add a kid'}</h2>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder={lang === 'ar' ? 'اسم الطفل...' : "Kid's name..."}
          autoFocus
          className="w-full rounded-2xl px-4 py-4 font-display font-bold text-xl text-ink outline-none transition-colors mb-4"
          style={{ border: '2px solid #e5e7eb', background: '#fafafa' }}
          onFocus={e => e.target.style.borderColor = '#7c3aed'}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'}
        />
        {error && <p className="font-body text-sm text-red-500 font-bold text-center mb-2">{error}</p>}
        <button
          onClick={handleSubmit} disabled={!name.trim() || saving}
          className="w-full disabled:opacity-40 text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:scale-95"
          style={{ background: '#7c3aed', boxShadow: name.trim() ? '0 4px 0 #5b21b6' : 'none' }}
        >
          {saving ? '...' : lang === 'ar' ? 'إضافة ←' : 'Add kid →'}
        </button>
        <button onClick={onClose} className="w-full text-muted font-body font-bold text-sm py-3 text-center mt-1">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
      </div>
    </div>
  )
}
