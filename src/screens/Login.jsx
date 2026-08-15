import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const strings = {
  en: {
    title:       'Welcome back!',
    sub:         'Log in to continue with your child.',
    username:    'USERNAME',
    password:    'PASSWORD',
    username_ph: 'e.g. sarah_mom',
    password_ph: 'Your password',
    cta:         'Log in →',
    loading:     'Logging in...',
    forgot:      'Forgot password? Contact us on WhatsApp',
    no_account:  "Don't have an account?",
    try_free:    'Try for free →',
    err_empty_u: 'Enter your username',
    err_empty_p: 'Enter your password',
    err_wrong:   'Wrong username or password',
    err_generic: 'Something went wrong. Try again.',
  },
  ar: {
    title:       'مرحباً بعودتك!',
    sub:         'سجّل الدخول لمتابعة رحلة طفلك.',
    username:    'اسم المستخدم',
    password:    'كلمة المرور',
    username_ph: 'مثال: sarah_mom',
    password_ph: 'كلمة المرور',
    cta:         'تسجيل الدخول ←',
    loading:     'جارٍ تسجيل الدخول...',
    forgot:      'نسيت كلمة المرور؟ تواصل معنا عبر واتساب',
    no_account:  'ليس لديك حساب؟',
    try_free:    'جرّب مجاناً ←',
    err_empty_u: 'أدخل اسم المستخدم',
    err_empty_p: 'أدخل كلمة المرور',
    err_wrong:   'اسم المستخدم أو كلمة المرور غير صحيحة',
    err_generic: 'حدث خطأ ما. حاول مرة أخرى.',
  },
}

async function derivePassword(username, password) {
  const input = `numio:${username.trim().toLowerCase()}:${password}:v3`
  const encoded = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function Login({ lang = 'en', onSuccess, onTryFree, onLanguageChange }) {
  const s = strings[lang] || strings.en
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin() {
    if (!username.trim()) { setError(s.err_empty_u); return }
    if (!password)        { setError(s.err_empty_p); return }
    setLoading(true); setError('')
    try {
      const fakeEmail = `${username.trim().toLowerCase().replace(/\s+/g, '_')}@numio.app`
      const derivedPw = await derivePassword(username.trim(), password)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: fakeEmail, password: derivedPw })
      if (signInErr) { setError(s.err_wrong); return }
      await onSuccess(setError)
    } catch {
      setError(s.err_generic)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white w-full flex flex-col" style={{ minHeight: '100dvh' }} dir={dir}>
      <div className="w-full max-w-md mx-auto flex flex-col px-6" style={{ minHeight: '100dvh' }}>

        {/* Language toggle */}
        <div className="flex gap-2 justify-end pt-6 flex-shrink-0">
          {['en', 'ar'].map(code => (
            <button key={code} onClick={() => onLanguageChange?.(code)}
              className="px-4 py-1.5 rounded-full font-body font-bold text-sm transition-all"
              style={{ background: lang === code ? '#7c3aed' : '#f3f4f6', color: lang === code ? 'white' : '#AFAFAF' }}>
              {code === 'en' ? 'EN' : 'عربي'}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="flex-shrink-0 pt-10 pb-8">
          <img src="/nav-logo.png" alt="Numio" className="h-10 w-auto mb-8" />
          <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{s.title} 👋</h1>
          <p className="font-body text-base text-muted">{s.sub}</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{s.username}</label>
            <input type="text" value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder={s.username_ph} autoCapitalize="none" autoCorrect="off"
              className="w-full rounded-2xl px-4 py-4 font-display font-bold text-lg text-ink outline-none transition-colors"
              style={{ border: '2px solid #e5e7eb', background: '#fafafa' }}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{s.password}</label>
            <input type="password" value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder={s.password_ph}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full rounded-2xl px-4 py-4 font-display font-bold text-lg text-ink outline-none transition-colors"
              style={{ border: '2px solid #e5e7eb', background: '#fafafa' }}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          {error && <p className="font-body text-sm text-red-500 font-bold text-center">{error}</p>}

          <button onClick={handleLogin} disabled={loading || !username.trim() || !password}
            className="w-full disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
            style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
            {loading ? s.loading : s.cta}
          </button>

          <a href={`https://wa.me/14384104068?text=${encodeURIComponent('Hi, I forgot my Numio password. My username is: ')}`}
            target="_blank" rel="noopener noreferrer"
            className="font-body font-bold text-sm text-center py-1"
            style={{ color: '#7c3aed' }}>
            {s.forgot}
          </a>

          <p className="font-body text-xs text-muted text-center">
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#7c3aed' }}>
              {lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </a>
            {' · '}
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#7c3aed' }}>
              {lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}
            </a>
          </p>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="font-body text-xs text-muted">{s.no_account}</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

        </div>
        <div className="pb-8" />
      </div>
    </div>
  )
}
