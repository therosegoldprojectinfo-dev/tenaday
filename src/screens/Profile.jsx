import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLang } from '../lib/LangContext'
import { useKid } from '../lib/KidContext'
import { createKid, getKids, updateKidEducationProfile } from '../lib/kids'
import { COUNTRIES, getRegionsForCountry, getGradesForCountryRegion, getFlagEmoji } from '../lib/regions'

const AVATARS = ['🪐', '🌍', '🌙', '⭐', '🌟', '☀️', '🌎', '🌏', '🌑', '💫']
const ACCENT_COLORS = ['#ede9fe', '#fce7f3', '#dbeafe', '#dcfce7', '#ffedd5']

export default function Profile({ onLogout, onLanguageChange }) {
  const lang = useLang()
  const { activeKid, kids, setActiveKid, setKids } = useKid()
  const [showAddKid, setShowAddKid] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showEducationModal, setShowEducationModal] = useState(false)
  const [langSaving, setLangSaving] = useState(false)
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

  async function handleSaveEducationProfile({ country, region, grade }) {
    const updated = await updateKidEducationProfile(activeKid.id, { country, region, grade })
    setKids(prev => prev.map(k => k.id === updated.id ? updated : k))
    setActiveKid(updated)
    setShowEducationModal(false)
  }

  const activeIndex = kids.findIndex(k => k.id === activeKid?.id)
  const totalQuizzes = 0 // placeholder — could wire to quiz results later

  return (
    <div className="bg-white flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>
      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-10 max-w-lg mx-auto w-full">

        {/* Page title */}
        <h1 className="font-display font-extrabold text-3xl text-ink mb-6">
          {lang === 'ar' ? 'الملف الشخصي' : 'Profile'}
        </h1>

        {/* Hero summary card — like "Hello Anna" */}
        {activeKid && (
          <div className="rounded-3xl px-6 py-5 mb-6 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', boxShadow: '0 8px 32px rgba(124,58,237,0.25)' }}>
            {/* Decorative blobs */}
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: -30, right: 40, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                {AVATARS[activeIndex % AVATARS.length]}
              </div>
              <div>
                <p className="font-body text-sm text-white/70">
                  {lang === 'ar' ? 'مرحباً،' : 'Hello,'}
                </p>
                <p className="font-display font-extrabold text-2xl text-white">{activeKid.name}</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="relative flex gap-3 mt-4">
              <div className="flex-1 rounded-2xl px-4 py-3 text-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <p className="font-display font-extrabold text-xl text-white">
                  {(kids.find(k => k.id === activeKid.id) || activeKid).coin_balance || 0}
                </p>
                <p className="font-body text-xs text-white/70 mt-0.5">{lang === 'ar' ? 'نقاط' : 'Points'}</p>
              </div>
              <div className="flex-1 rounded-2xl px-4 py-3 text-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <p className="font-display font-extrabold text-xl text-white">{kids.length}</p>
                <p className="font-body text-xs text-white/70 mt-0.5">{lang === 'ar' ? 'أطفال' : 'Kids'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Kids section */}
        <p className="font-body font-bold text-xs text-muted uppercase tracking-widest mb-3">
          {lang === 'ar' ? 'الأطفال في هذا الحساب' : 'Kids on this account'}
        </p>
        <div className="flex flex-col gap-3 mb-6">
          {kids.map((kid, i) => {
            const isActive = kid.id === activeKid?.id
            return (
              <button key={kid.id} onClick={() => setActiveKid(kid)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-95"
                style={{
                  background: isActive ? '#f5f3ff' : 'white',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                  border: isActive ? '1.5px solid #c4b5fd' : '1.5px solid transparent',
                }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: ACCENT_COLORS[i % ACCENT_COLORS.length] }}>
                  {AVATARS[i % AVATARS.length]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-base truncate" style={{ color: isActive ? '#7c3aed' : '#1a1a2e' }}>{kid.name}</p>
                  <p className="font-body text-xs text-muted mt-0.5">{kid.coin_balance || 0} {lang === 'ar' ? 'نقطة' : 'pts'}</p>
                </div>
                {isActive && <span className="font-bold text-lg flex-shrink-0" style={{ color: '#7c3aed' }}>✓</span>}
              </button>
            )
          })}

          <button onClick={() => setShowAddKid(true)}
            className="w-full py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95"
            style={{ border: '2px dashed #c4b5fd', color: '#7c3aed', background: 'white' }}>
            {lang === 'ar' ? '+ إضافة طفل' : '+ Add a kid'}
          </button>
        </div>

        {/* Numio+ Customization — country/region/grade feeding curriculum alignment */}
        {activeKid && (
          <>
            <p className="font-body font-bold text-xs text-muted uppercase tracking-widest mb-3">
              {lang === 'ar' ? 'نوميو+ التخصيص' : 'Numio+ Customization'}
            </p>
            <button onClick={() => setShowEducationModal(true)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all active:scale-95 mb-6"
              style={{ background: 'white', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1.5px solid transparent' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: '#ede9fe' }}>
                🎓
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-base" style={{ color: '#1a1a2e' }}>
                  {lang === 'ar' ? 'الدولة، المنطقة، والصف' : 'Country, region & grade'}
                </p>
                <p className="font-body text-xs text-muted mt-0.5 truncate">
                  {activeKid.country
                    ? [activeKid.country, activeKid.region, activeKid.grade].filter(Boolean).join(' · ')
                    : (lang === 'ar' ? 'لم يتم الضبط بعد — اضغط للإضافة' : 'Not set yet — tap to add')}
                </p>
              </div>
              <span className="font-bold text-lg flex-shrink-0 text-muted">›</span>
            </button>
          </>
        )}

        {/* Language */}
        <p className="font-body font-bold text-xs text-muted uppercase tracking-widest mb-3">
          {lang === 'ar' ? 'اللغة' : 'Language'}
        </p>
        <div className="flex gap-3 mb-6">
          {[{ code: 'en', label: '🇺🇸 English' }, { code: 'ar', label: '🇸🇦 عربي' }].map(({ code, label }) => (
            <button key={code} onClick={() => handleLanguageChange(code)} disabled={langSaving}
              className="flex-1 py-4 rounded-2xl font-display font-bold text-base transition-all active:scale-95"
              style={{
                background: lang === code ? '#7c3aed' : 'white',
                color: lang === code ? 'white' : '#AFAFAF',
                boxShadow: lang === code ? '0 4px 0 #5b21b6' : '0 2px 16px rgba(0,0,0,0.06)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Legal links */}
        <div className="flex gap-4 justify-center mb-5">
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="font-body text-xs text-muted underline">
            {lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </a>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="font-body text-xs text-muted underline">
            {lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}
          </a>
        </div>

        {/* Refund */}
        <a href="https://wa.me/14384102068" target="_blank" rel="noopener noreferrer"
          className="w-full py-4 rounded-2xl font-display font-bold text-base text-center block transition-all active:scale-95 mb-3"
          style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#16a34a', textDecoration: 'none' }}>
          {lang === 'ar'
            ? '💸 تريد استرداد الأموال؟ تواصل معنا'
            : '💸 Want a refund? Contact us on WhatsApp'}
        </a>

        {/* Logout — clean card not a button */}
        <div onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-4 rounded-2xl font-display font-bold text-base text-center cursor-pointer transition-all active:scale-95"
          style={{ background: '#fff5f5', boxShadow: '0 2px 16px rgba(239,68,68,0.08)', color: '#ef4444' }}>
          {lang === 'ar' ? '🚪 تسجيل الخروج' : '🚪 Log out'}
        </div>

        {/* WhatsApp support */}
        <a href="https://wa.me/14384102068" target="_blank" rel="noopener noreferrer"
          className="text-center block"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>
          {lang === 'ar'
            ? <>واجهت مشكلة؟ <span style={{ color: '#7c3aed', fontWeight: 700 }}>تواصل معنا على واتساب</span></>
            : <>Encounter any issues? <span style={{ color: '#7c3aed', fontWeight: 700 }}>Contact us on WhatsApp</span></>
          }
        </a>
      </div>

      {showAddKid && <AddKidModal lang={lang} onConfirm={handleAddKid} onClose={() => setShowAddKid(false)} />}

      {showEducationModal && activeKid && (
        <EducationProfileModal
          lang={lang}
          kid={activeKid}
          onConfirm={handleSaveEducationProfile}
          onClose={() => setShowEducationModal(false)}
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
            <button onClick={handleLogout} className="w-full py-4 text-white font-display font-bold text-lg rounded-2xl" style={{ background: '#ef4444' }}>
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
    catch { setError(lang === 'ar' ? 'حدث خطأ ما.' : 'Something went wrong.'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-white rounded-t-3xl px-5 pb-8 pt-4">
        <div className="flex justify-center mb-4"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <h2 className="font-display font-extrabold text-2xl text-ink text-center mb-5">
          {lang === 'ar' ? 'إضافة طفل' : 'Add a kid'}
        </h2>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder={lang === 'ar' ? 'اسم الطفل...' : "Kid's name..."}
          autoFocus
          className="w-full rounded-2xl px-4 py-4 font-display font-bold text-xl text-ink outline-none transition-colors mb-4"
          style={{ border: '2px solid #e5e7eb', background: '#fafafa' }}
          onFocus={e => e.target.style.borderColor = '#7c3aed'}
          onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
        {error && <p className="font-body text-sm text-red-500 font-bold text-center mb-2">{error}</p>}
        <button onClick={handleSubmit} disabled={!name.trim() || saving}
          className="w-full disabled:opacity-40 text-white font-display font-bold text-lg rounded-2xl py-4 transition-all active:scale-95"
          style={{ background: '#7c3aed', boxShadow: name.trim() ? '0 4px 0 #5b21b6' : 'none' }}>
          {saving ? '...' : lang === 'ar' ? 'إضافة ←' : 'Add kid →'}
        </button>
        <button onClick={onClose} className="w-full text-muted font-body font-bold text-sm py-3 text-center mt-1">
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}

// ── Education Profile modal ─────────────────────────────────────────
// Step 1: country (with flag emoji). Step 2: region (auto-skipped if
// country has none). Step 3: grade (real local names per country/region).
// All 3 saved together so curriculum alignment never runs half-filled.
function EducationProfileModal({ lang, kid, onConfirm, onClose }) {
  const [step, setStep] = useState(1)
  const [countryName, setCountryName] = useState(kid.country || '')
  const [countryCode, setCountryCode] = useState(
    () => COUNTRIES.find(c => c.name === kid.country)?.code || ''
  )
  const [region, setRegion] = useState(kid.region || '')
  const [grade, setGrade] = useState(kid.grade || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const availableRegions = getRegionsForCountry(countryName)
  const hasRegionStep = !!availableRegions

  // Grades are dynamic: depend on country + region (e.g. Quebec vs Ontario)
  const grades = getGradesForCountryRegion(countryCode, region || null)

  function handlePickCountry(c) {
    setCountryName(c.name)
    setCountryCode(c.code)
    if (c.name !== kid.country) setRegion('')
    setStep(getRegionsForCountry(c.name) ? 2 : 3)
  }

  function handlePickRegion(r) {
    setRegion(r)
    setStep(3)
  }

  async function handlePickGrade(g) {
    setGrade(g)
    setSaving(true); setError('')
    try {
      await onConfirm({ country: countryName, region: hasRegionStep ? region : null, grade: g })
    } catch {
      setError(lang === 'ar' ? 'حدث خطأ ما.' : 'Something went wrong.')
      setSaving(false)
    }
  }

  function handleBack() {
    if (step === 3 && hasRegionStep) setStep(2)
    else if (step === 3 || step === 2) setStep(1)
  }

  const titles = {
    1: lang === 'ar' ? 'في أي دولة يدرس طفلك؟' : 'What country does your child study in?',
    2: lang === 'ar' ? 'أي منطقة أو مقاطعة؟' : 'Which province/state/region?',
    3: lang === 'ar' ? 'في أي صف دراسي؟' : 'What grade is your child in?',
  }

  const totalSteps = hasRegionStep ? 3 : 2
  const displayStep = step === 3 ? totalSteps : step

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-white rounded-t-3xl px-5 pb-8 pt-4" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex justify-center mb-4 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>

        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          {step > 1
            ? <button onClick={handleBack} className="font-body font-bold text-sm text-muted active:opacity-60">
                {lang === 'ar' ? '→ رجوع' : '← Back'}
              </button>
            : <span />}
          <span className="font-body text-xs text-muted">{displayStep}/{totalSteps}</span>
        </div>

        <h2 className="font-display font-extrabold text-xl text-ink text-center mb-5 flex-shrink-0">
          {titles[step]}
        </h2>

        {error && <p className="font-body text-sm text-red-500 font-bold text-center mb-3 flex-shrink-0">{error}</p>}

        <div className="overflow-y-auto flex flex-col gap-2" style={{ flex: 1 }}>
          {step === 1 && COUNTRIES.map(c => {
            const flag = getFlagEmoji(c.code)
            const isSelected = countryName === c.name
            return (
              <button key={c.code} onClick={() => handlePickCountry(c)}
                disabled={saving}
                className="w-full text-left px-4 py-3 rounded-2xl font-body font-bold text-base transition-all active:scale-95 disabled:opacity-40 flex items-center gap-3"
                style={{
                  background: isSelected ? '#f5f3ff' : '#fafafa',
                  color: isSelected ? '#7c3aed' : '#1a1a2e',
                  border: isSelected ? '1.5px solid #c4b5fd' : '1.5px solid transparent',
                }}>
                <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{flag}</span>
                <span>{c.name}</span>
              </button>
            )
          })}

          {step === 2 && availableRegions?.map(r => (
            <button key={r} onClick={() => handlePickRegion(r)}
              disabled={saving}
              className="w-full text-left px-4 py-3 rounded-2xl font-body font-bold text-base transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: region === r ? '#f5f3ff' : '#fafafa',
                color: region === r ? '#7c3aed' : '#1a1a2e',
                border: region === r ? '1.5px solid #c4b5fd' : '1.5px solid transparent',
              }}>
              {r}
            </button>
          ))}

          {step === 3 && grades.map(g => (
            <button key={g} onClick={() => handlePickGrade(g)}
              disabled={saving}
              className="w-full text-left px-4 py-3 rounded-2xl font-body font-bold text-base transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: grade === g ? '#f5f3ff' : '#fafafa',
                color: grade === g ? '#7c3aed' : '#1a1a2e',
                border: grade === g ? '1.5px solid #c4b5fd' : '1.5px solid transparent',
              }}>
              {saving && grade === g ? '...' : g}
            </button>
          ))}
        </div>

        <button onClick={onClose} disabled={saving} className="w-full text-muted font-body font-bold text-sm py-3 text-center mt-2 flex-shrink-0">
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}
