import { useState } from 'react'
import { useLang } from '../lib/LangContext'

const strings = {
  en: {
    title:       'Create your account',
    sub:         'Set up Numio for your child in seconds.',
    parent_label: 'YOUR USERNAME',
    parent_ph:   'e.g. sarah_mom',
    kid_label:   "YOUR CHILD'S NAME",
    kid_ph:      "e.g. Adam",
    pass_label:  'PASSWORD',
    pass_ph:     'At least 6 characters',
    cta:         'Create my free account →',
    loading:     'Creating account...',
    login:       'Already have an account →',
    err_user:    'Enter a username',
    err_kid:     "Enter your child's name",
    err_pass:    'Password must be at least 6 characters',
    terms_pre:   'By continuing you agree to our',
    terms_pp:    'Privacy Policy',
    terms_and:   'and',
    terms_tu:    'Terms of Use',
  },
  ar: {
    title:       'أنشئ حسابك',
    sub:         'سجّل في Numio لطفلك في ثوانٍ.',
    parent_label: 'اسم المستخدم',
    parent_ph:   'مثال: sarah_mom',
    kid_label:   'اسم طفلك',
    kid_ph:      'مثال: آدم',
    pass_label:  'كلمة المرور',
    pass_ph:     '٦ أحرف على الأقل',
    cta:         'أنشئ حسابي المجاني ←',
    loading:     'جاري إنشاء الحساب...',
    login:       'لديّ حساب بالفعل ←',
    err_user:    'أدخل اسم مستخدم',
    err_kid:     'أدخل اسم طفلك',
    err_pass:    'كلمة المرور يجب أن تكون ٦ أحرف على الأقل',
    terms_pre:   'بالمتابعة أنت توافق على',
    terms_pp:    'سياسة الخصوصية',
    terms_and:   'و',
    terms_tu:    'شروط الاستخدام',
  },
}

export default function AccountCreation({ onSignup, onLogin, onLanguageChange }) {
  const lang = useLang()
  const s    = strings[lang] || strings.en
  const dir  = lang === 'ar' ? 'rtl' : 'ltr'

  const [username, setUsername] = useState('')
  const [kidName,  setKidName]  = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit() {
    if (!username.trim()) { setError(s.err_user); return }
    if (!kidName.trim())  { setError(s.err_kid);  return }
    if (password.length < 6) { setError(s.err_pass); return }
    setLoading(true); setError('')
    try {
      await onSignup({ username: username.trim(), kidName: kidName.trim(), password, lang })
    } catch (e) {
      setError(e.message || (lang === 'ar' ? 'حدث خطأ ما' : 'Something went wrong'))
      setLoading(false)
    }
  }

  const inputStyle = {
    border: '2px solid #e5e7eb', background: '#fafafa',
    width: '100%', borderRadius: 16, padding: '14px 16px',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
    fontSize: 17, color: '#1a1a2e', outline: 'none', transition: 'border-color 0.15s',
  }

  return (
    <div className="bg-white w-full flex flex-col" style={{ minHeight: '100dvh' }} dir={dir}>
      <div className="w-full max-w-md mx-auto flex flex-col px-6" style={{ minHeight: '100dvh' }}>

        {/* Lang toggle */}
        <div className="flex gap-2 justify-end pt-6 flex-shrink-0">
          {['en', 'ar'].map(code => (
            <button key={code} onClick={() => onLanguageChange?.(code)}
              className="px-4 py-1.5 rounded-full font-body font-bold text-sm transition-all"
              style={{ background: lang === code ? '#7c3aed' : '#f3f4f6', color: lang === code ? 'white' : '#AFAFAF' }}>
              {code === 'en' ? 'EN' : 'عربي'}
            </button>
          ))}
        </div>

        {/* Logo + header */}
        <div className="flex-shrink-0 pt-8 pb-6">
          <img src="/nav-logo.png" alt="Numio" className="h-10 w-auto mb-6" />
          <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{s.title}</h1>
          <p className="font-body text-base text-muted">{s.sub}</p>
        </div>

        {/* Mascot */}
        <div className="flex justify-center mb-6 flex-shrink-0">
          <div style={{ animation: 'float 3s ease-in-out infinite' }}>
            <img src="/nav-profile.png" alt="" className="w-28 h-auto" />
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 flex-1">

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{s.parent_label}</label>
            <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder={s.parent_ph} autoCapitalize="none" autoCorrect="off"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          {/* Kid name */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{s.kid_label}</label>
            <input type="text" value={kidName} onChange={e => { setKidName(e.target.value); setError('') }}
              placeholder={s.kid_ph}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{s.pass_label}</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder={s.pass_ph}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          {error && <p className="font-body text-sm font-bold text-center" style={{ color: '#ef4444' }}>{error}</p>}

          {/* Terms */}
          <p className="font-body text-xs text-muted text-center">
            {s.terms_pre}{' '}
            <a href="/privacy.html" target="_blank" className="underline" style={{ color: '#7c3aed' }}>{s.terms_pp}</a>
            {' '}{s.terms_and}{' '}
            <a href="/terms.html" target="_blank" className="underline" style={{ color: '#7c3aed' }}>{s.terms_tu}</a>
          </p>

          {/* CTA */}
          <button onClick={handleSubmit} disabled={loading || !username.trim() || !kidName.trim() || password.length < 6}
            className="w-full disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
            style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
            {loading ? s.loading : s.cta}
          </button>

          {/* Login link */}
          <button onClick={onLogin}
            className="w-full font-body font-bold text-sm text-muted py-2 text-center active:opacity-60">
            {s.login}
          </button>
        </div>

        <div className="pb-8" />
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}
