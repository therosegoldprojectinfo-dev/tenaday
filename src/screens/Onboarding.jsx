import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function firePixel(type, event, params = {}) {
  try { if (window.fbq) window.fbq(type, event, params) } catch (_) {}
}
function fireGtag(eventName, params = {}) {
  try { if (window.gtag) window.gtag('event', eventName, params) } catch (_) {}
}

export default function Onboarding({ onComplete, onLanguageChange }) {
  const [screen,    setScreen]   = useState('account')
  const [username,  setUsername] = useState('')
  const [password,  setPassword] = useState('')
  const [isSignIn,  setIsSignIn] = useState(false)
  const [loading,   setLoading]  = useState(false)
  const [authError, setAuthError] = useState('')
  const [savedName, setSavedName] = useState('')
  const [lang,      setLang]      = useState('en')

  function switchLang(l) { setLang(l); onLanguageChange?.(l) }

  async function derivePassword(usernameRaw, pinRaw) {
    const input = `numio:${usernameRaw.trim().toLowerCase()}:${pinRaw}:v3`
    const encoded = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function hashPassword(pwRaw) {
    const input = `numio-pin:${pwRaw}`
    const encoded = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function handleSignIn() {
    if (!username.trim()) { setAuthError(lang === 'ar' ? 'أدخل اسم المستخدم' : 'Enter your username'); return }
    if (password.length < 6) { setAuthError(lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters'); return }
    setLoading(true); setAuthError('')
    try {
      const fakeEmail = `${username.trim().toLowerCase().replace(/\s+/g, '_')}@numio.app`
      const derivedPw = await derivePassword(username, password)
      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password: derivedPw })
      if (error) throw error
      onComplete(null)
    } catch {
      setAuthError(lang === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Wrong username or password')
    } finally { setLoading(false) }
  }

  async function handleCreateAccount() {
    if (!username.trim()) { setAuthError(lang === 'ar' ? 'أدخل اسم مستخدم' : 'Enter a username'); return }
    if (password.length < 6) { setAuthError(lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters'); return }
    setLoading(true); setAuthError('')
    try {
      const fakeEmail = `${username.trim().toLowerCase().replace(/\s+/g, '_')}@numio.app`
      const derivedPw = await derivePassword(username, password)
      const { error } = await supabase.auth.signUp({ email: fakeEmail, password: derivedPw })
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const pwHash = await hashPassword(password)
        // INSERT only (not upsert) — v3 revoked UPDATE on parent_pin.
        const { error: insertErr } = await supabase.from('profiles').insert({
          id: user.id,
          display_name: username.trim(),
          language: lang,
        })
        if (insertErr) throw insertErr
        // parent_pin via SECURITY DEFINER RPC (not client-writable after v3)
        // p_old_pin_hash omitted — RPC allows free write when no PIN exists yet (signup only)
        const { error: pinErr } = await supabase.rpc('set_parent_pin', { p_pin_hash: pwHash })
        if (pinErr) {
          // Partial failure: profile row created but PIN not set.
          // Clean up the orphan profile row so the user can retry signup.
          await supabase.from('profiles').delete().eq('id', user.id)
          throw pinErr
        }
      }
      firePixel('track', 'CompleteRegistration', { content_name: 'Try For Free' })
      fireGtag('account_created')
      onComplete(username.trim())
    } catch (e) {
      setAuthError(lang === 'ar' ? 'حدث خطأ ما' : (e.message || 'Something went wrong'))
    } finally { setLoading(false) }
  }

  // ── HOW IT WORKS ──────────────────────────────────────────────────
  if (screen === 'how') {
    return (
      <div className="bg-white w-full" style={{ minHeight: '100dvh' }}>
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center px-6 gap-8" style={{ minHeight: '100dvh' }}>
          <img src="/mascot.png" alt="Numio" className="w-28 h-auto" />
          <div className="text-center">
            <h1 className="font-display font-extrabold text-3xl text-ink mb-1">Here's how it works</h1>
            <p className="font-body text-muted text-base">3 simple steps 🚀</p>
          </div>
          <div className="flex flex-col gap-4 w-full">
            {[
              { icon: '📸', title: 'Take a picture', desc: 'Snap any textbook page or notes.' },
              { icon: '🧠', title: 'Practice', desc: 'Answer a quiz Numio built just for you.' },
              { icon: '🎁', title: 'Earn & claim rewards', desc: 'Collect coins and claim rewards set by your parents.' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-2xl px-5 py-4">
                <span style={{ fontSize: 36 }}>{step.icon}</span>
                <div>
                  <p className="font-display font-bold text-base text-ink">{step.title}</p>
                  <p className="font-body text-sm text-muted">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onComplete(savedName)}
            className="w-full bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
            style={{ boxShadow: '0 4px 0 #46a302' }}
          >
            Let's start 🚀
          </button>
        </div>
      </div>
    )
  }

  // ── ACCOUNT SCREEN ────────────────────────────────────────────────
  return (
    <div className="bg-white w-full" style={{ minHeight: '100dvh' }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md mx-auto flex flex-col px-6" style={{ minHeight: '100dvh' }}>

        {/* Language toggle */}
        <div className="flex-shrink-0 pt-6 flex justify-end gap-2">
          <button onClick={() => switchLang('en')}
            className={`px-3 py-1 rounded-full font-body font-bold text-sm transition-all ${lang === 'en' ? 'bg-duo text-white' : 'bg-gray-100 text-muted'}`}>
            EN
          </button>
          <button onClick={() => switchLang('ar')}
            className={`px-3 py-1 rounded-full font-body font-bold text-sm transition-all ${lang === 'ar' ? 'bg-duo text-white' : 'bg-gray-100 text-muted'}`}>
            عربي
          </button>
        </div>

        {/* Hook */}
        <div className="flex-shrink-0 pt-4 pb-4 text-center">
          <h1 className="font-display font-extrabold text-3xl text-ink">
            {lang === 'ar' ? 'تحسَّن في المدرسة بصورة واحدة! 📸' : 'Get better at school with just a picture! 📸'}
          </h1>
        </div>

        {/* Hero image */}
        <div className="flex-shrink-0 pb-4">
          <img src="/onboarding-hero.png" alt="Take a photo, get a quiz" className="w-full object-contain" style={{ maxHeight: 200 }} />
        </div>

        {/* Mascot bubble */}
        <div className="flex items-start gap-3 mb-6">
          <img src="/mascot.png" alt="" className="w-14 h-14 object-contain flex-shrink-0" />
          <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
            <p className="font-display font-bold text-base text-ink">
              {isSignIn
                ? (lang === 'ar' ? 'مرحباً بعودتك! 👋' : 'Welcome back! 👋')
                : (lang === 'ar' ? 'اختر اسم مستخدم لتجربة Numio مجاناً — لا بريد إلكتروني مطلوب' : 'Select a username to try Numio for free. — No email needed')}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">
              {isSignIn ? (lang === 'ar' ? 'اسم المستخدم' : 'Username') : (lang === 'ar' ? 'اختر اسم مستخدم' : 'Choose a username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={lang === "ar" ? "مثال: sarah_mom" : "e.g. sarah_mom"}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none focus:border-duo transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل كلمة المرور' : 'Enter a password'}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none focus:border-duo transition-colors"
            />
            <p className="font-body text-xs text-muted">
              {lang === 'ar' ? '٦ أحرف على الأقل' : 'At least 6 characters'}
            </p>
          </div>

          {!isSignIn && (
            <p className="font-body text-xs text-muted text-center">
              {lang === 'ar'
                ? <> بالمتابعة، أنت توافق على <a href="/privacy.html" target="_blank" className="text-duo underline">سياسة الخصوصية</a> و<a href="/terms.html" target="_blank" className="text-duo underline">شروط الاستخدام</a></>
                : <> By continuing, you agree to our <a href="/privacy.html" target="_blank" className="text-duo underline">Privacy Policy</a> and <a href="/terms.html" target="_blank" className="text-duo underline">Terms of Use</a></>
              }
            </p>
          )}

          {authError && <p className="font-body text-sm text-red-500 font-bold text-center">{authError}</p>}

          <button
            onClick={isSignIn ? handleSignIn : handleCreateAccount}
            disabled={loading || !username.trim() || password.length < 6}
            className="w-full bg-duo disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
            style={{ boxShadow: '0 4px 0 #46a302' }}
          >
            {loading ? lang === 'ar' ? 'جاري التحميل...' : 'Loading...' : isSignIn ? 'Log in →' : lang === "ar" ? "جرّب مجاناً الآن ←" : "Try for free now →"}
          </button>

          {/* FIX #1: was calling setPin('') which no longer exists — now clears password correctly */}
          <button
            onClick={() => { setIsSignIn(!isSignIn); setAuthError(''); setPassword('') }}
            className="w-full text-muted font-body font-bold text-sm py-2 text-center"
          >
            {isSignIn ? lang === "ar" ? "ليس لديك حساب؟ أنشئ واحداً" : "Don't have an account? Create one" : lang === "ar" ? "لديك حساب بالفعل؟ سجّل الدخول" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  )
}
