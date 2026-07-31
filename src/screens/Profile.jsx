import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLang } from '../lib/LangContext'
import { useKid } from '../lib/KidContext'
import { createKid } from '../lib/kids'

function CoinIcon({ size = 24 }) {
  return <img src="/coin.png" width={size} height={size} alt="coin" style={{ objectFit: 'contain' }} />
}

const AVATARS = ['🪐', '🌍', '🌙', '⭐', '🌟', '☀️', '🌎', '🌏', '🌑', '💫']

export default function Profile({ onLogout, onLanguageChange }) {
  const lang = useLang()
  const { activeKid, kids, setActiveKid, setKids } = useKid()
  const [showAddKid, setShowAddKid] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [langSaving, setLangSaving] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    onLogout()
  }

  async function handleAddKid(name) {
    const newKid = await createKid(name)
    setKids(prev => [...prev, newKid])
    setActiveKid(newKid)
    setShowAddKid(false)
  }

  // FIX #5: actually save language to DB and call onLanguageChange prop
  async function handleLanguageChange(newLang) {
    if (newLang === lang || langSaving) return
    setLangSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ language: newLang }).eq('id', user.id)
      }
      onLanguageChange?.(newLang)
    } catch (e) {
      console.error('Language save failed:', e)
    } finally {
      setLangSaving(false)
    }
  }

  const avatarIndex = kids.findIndex(k => k.id === activeKid?.id) % AVATARS.length

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-10 max-w-lg mx-auto w-full">
        <h1 className="font-display font-extrabold text-3xl text-ink mb-8">
          {lang === 'ar' ? 'الملف الشخصي' : 'Profile'}
        </h1>

        {/* Active kid card */}
        {activeKid && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-100 rounded-3xl px-6 py-6 mb-6"
            style={{ boxShadow: '0 4px 0 #d1fae5' }}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-green-100 flex items-center justify-center text-4xl">
                {AVATARS[avatarIndex]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-extrabold text-2xl text-ink truncate">{activeKid.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <CoinIcon size={20} />
                  <span className="font-display font-bold text-lg text-amber-500">
                    {activeKid.coin_balance || 0} {lang === 'ar' ? 'عملات' : 'coins'}
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
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all active:translate-y-0.5 ${
                    isActive ? 'border-duo bg-green-50' : 'border-gray-100 bg-white'
                  }`}
                  style={{ boxShadow: isActive ? '0 3px 0 #86efac' : '0 3px 0 #e5e7eb' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {AVATARS[i % AVATARS.length]}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`font-display font-bold text-base truncate ${isActive ? 'text-duo' : 'text-ink'}`}>
                      {kid.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <CoinIcon size={14} />
                      <span className="font-body text-xs text-amber-500 font-bold">{kid.coin_balance || 0}</span>
                    </div>
                  </div>
                  {isActive && <span className="text-duo text-lg flex-shrink-0">✓</span>}
                </button>
              )
            })}

            <button
              onClick={() => setShowAddKid(true)}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-muted font-display font-bold text-base active:bg-gray-50 transition-colors"
            >
              {lang === 'ar' ? '+ إضافة طفل' : '+ Add a kid'}
            </button>
          </div>
        </div>

        {/* FIX #5: Language toggle — saves to DB and propagates up */}
        <div className="mb-6">
          <p className="font-body font-bold text-xs text-muted uppercase tracking-widest mb-3">
            {lang === 'ar' ? 'اللغة' : 'Language'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleLanguageChange('en')}
              disabled={langSaving}
              className={`flex-1 py-3 rounded-2xl border-2 font-display font-bold text-base transition-all ${
                lang === 'en' ? 'border-duo bg-green-50 text-duo' : 'border-gray-200 text-muted bg-white'
              }`}
            >
              🇺🇸 English
            </button>
            <button
              onClick={() => handleLanguageChange('ar')}
              disabled={langSaving}
              className={`flex-1 py-3 rounded-2xl border-2 font-display font-bold text-base transition-all ${
                lang === 'ar' ? 'border-duo bg-green-50 text-duo' : 'border-gray-200 text-muted bg-white'
              }`}
            >
              🇸🇦 عربي
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-4 rounded-2xl border-2 border-red-100 bg-red-50 text-red-500 font-display font-bold text-base active:bg-red-100 transition-colors"
        >
          {lang === 'ar' ? '🚪 تسجيل الخروج' : '🚪 Log out'}
        </button>
      </div>

      {showAddKid && (
        <AddKidModal
          lang={lang}
          onConfirm={handleAddKid}
          onClose={() => setShowAddKid(false)}
        />
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-display font-extrabold text-xl text-ink text-center">
              {lang === 'ar' ? 'تسجيل الخروج؟' : 'Log out?'}
            </h2>
            <p className="font-body text-sm text-muted text-center">
              {lang === 'ar' ? 'ستحتاج إلى اسم المستخدم وكلمة المرور لتسجيل الدخول مرة أخرى.' : "You'll need your username and password to log back in."}
            </p>
            <button
              onClick={handleLogout}
              className="w-full py-4 bg-red-500 text-white font-display font-bold text-lg rounded-2xl active:opacity-80"
            >
              {lang === 'ar' ? 'نعم، اخرج' : 'Yes, log out'}
            </button>
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="w-full py-3 text-muted font-body font-bold text-sm text-center"
            >
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

  async function handleSubmit() {
    if (!name.trim()) return
    setSaving(true)
    await onConfirm(name.trim())
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-white rounded-t-3xl px-5 pb-8 pt-4">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <h2 className="font-display font-extrabold text-2xl text-ink text-center mb-5">
          {lang === 'ar' ? 'إضافة طفل' : 'Add a kid'}
        </h2>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={lang === 'ar' ? 'اسم الطفل...' : "Kid's name..."}
          autoFocus
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 font-display font-bold text-xl text-ink outline-none focus:border-duo transition-colors mb-4"
        />
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="w-full bg-duo disabled:opacity-40 text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:translate-y-1"
          style={{ boxShadow: name.trim() ? '0 4px 0 #46a302' : 'none' }}
        >
          {saving ? '...' : lang === 'ar' ? 'إضافة ←' : 'Add kid →'}
        </button>
        <button onClick={onClose} className="w-full text-muted font-body font-bold text-sm py-3 text-center mt-1">
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}
