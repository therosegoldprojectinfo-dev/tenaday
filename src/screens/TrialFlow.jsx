import { useState, useRef } from 'react'
import { generateExam } from '../lib/generateExam'
import Quiz from './Quiz'

const LS_TRIAL_EXAM = 'numio_trial_exam'
const LS_TRIAL_DONE = 'numio_trial_done'
const LS_TRIAL_USED = 'numio_trial_used'

const strings = {
  en: {
    hook_title:     'Turn any lesson into a quiz instantly',
    hook_sub:       'Take a photo of a textbook page and Numio builds a personalized quiz for your child in seconds.',
    hook_cta:       '📸 Try it free — snap a photo',
    hook_login:     'Already have an account →',
    loading_title:  'Building your quiz…',
    loading_sub:    'This takes just a few seconds ✨',
    ready_title:    'Your quiz is ready!',
    ready_sub:      'Your child can start practicing right now.',
    ready_cta:      '🚀 Start quiz',
    error_title:    'Something went wrong',
    error_retry:    'Try again',
    resume_title:   'Welcome back!',
    resume_sub:     'You have a quiz waiting.',
    resume_cta:     'Continue quiz →',
    resume_new:     'Start over',
    capped_title:   'Come back tomorrow 🌙',
    capped_sub:     "You've hit today's free limit. Create a free account for unlimited quizzes anytime.",
    used_title:     'Your free trial is done 🌟',
    used_sub:       'Create a free account to keep going with unlimited quizzes.',
    used_cta:       'Create free account →',
    congrats_title: 'Amazing! First quiz complete 🎉',
    congrats_sub:   "Create your free account to save progress and generate unlimited quizzes.",
    username_label: 'USERNAME',
    pin_label:      'PASSWORD',
    username_ph:    'e.g. sarah_mom',
    pin_ph:         'At least 6 characters',
    cta:            'Create my free account',
    loading_signup: 'Creating account...',
    terms_pre:      'By continuing you agree to our',
    terms_privacy:  'Privacy Policy',
    terms_and:      'and',
    terms_terms:    'Terms of Use',
  },
  ar: {
    hook_title:     'حوّل أي درس إلى اختبار في ثوانٍ',
    hook_sub:       'التقط صورة لصفحة الكتاب المدرسي وسيبني Numio اختباراً مخصصاً لطفلك فوراً.',
    hook_cta:       '📸 جرّب مجاناً — التقط صورة',
    hook_login:     'لديّ حساب بالفعل ←',
    loading_title:  'جارٍ بناء الاختبار…',
    loading_sub:    'هذا يستغرق ثوانٍ فقط ✨',
    ready_title:    'اختبارك جاهز!',
    ready_sub:      'طفلك جاهز للبدء الآن.',
    ready_cta:      '🚀 ابدأ الاختبار',
    error_title:    'حدث خطأ ما',
    error_retry:    'حاول مرة أخرى',
    resume_title:   'مرحباً بعودتك!',
    resume_sub:     'لديك اختبار في انتظارك.',
    resume_cta:     'أكمل الاختبار ←',
    resume_new:     'ابدأ من جديد',
    capped_title:   'عد غداً 🌙',
    capped_sub:     'وصلت للحد اليومي المجاني. أنشئ حساباً مجانياً للحصول على اختبارات غير محدودة.',
    used_title:     'انتهت تجربتك المجانية 🌟',
    used_sub:       'أنشئ حساباً مجانياً للحصول على اختبارات غير محدودة.',
    used_cta:       'أنشئ حساباً مجانياً ←',
    congrats_title: 'رائع! أكملت أول اختبار 🎉',
    congrats_sub:   'أنشئ حسابك المجاني لحفظ التقدم وتوليد اختبارات غير محدودة.',
    username_label: 'اسم المستخدم',
    pin_label:      'كلمة المرور',
    username_ph:    'مثال: sarah_mom',
    pin_ph:         '٦ أحرف على الأقل',
    cta:            'أنشئ حسابي المجاني',
    loading_signup: 'جاري إنشاء الحساب...',
    terms_pre:      'بالمتابعة أنت توافق على',
    terms_privacy:  'سياسة الخصوصية',
    terms_and:      'و',
    terms_terms:    'شروط الاستخدام',
  },
}

async function compressImage(file, maxWidthPx = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidthPx / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality)
    }
    img.src = url
  })
}

function fireGtag(event) {
  try {
    window.gtag?.('event', event)
    if (event === 'CompleteRegistration') window.fbq?.('track', 'CompleteRegistration')
    else window.fbq?.('trackCustom', event)
  } catch (_) {}
}

function LangToggle({ lang, onLanguageChange }) {
  return (
    <div className="flex gap-2 justify-end pt-6 flex-shrink-0">
      {['en', 'ar'].map(code => (
        <button key={code} onClick={() => onLanguageChange?.(code)}
          className="px-4 py-1.5 rounded-full font-body font-bold text-sm transition-all"
          style={{ background: lang === code ? '#7c3aed' : '#f3f4f6', color: lang === code ? 'white' : '#AFAFAF' }}>
          {code === 'en' ? 'EN' : 'عربي'}
        </button>
      ))}
    </div>
  )
}

export default function TrialFlow({ lang = 'en', onSignup, onLanguageChange }) {
  const s   = strings[lang] || strings.en
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const inputRef = useRef(null)

  const [status, setStatus] = useState(() => {
    if (localStorage.getItem(LS_TRIAL_DONE) === 'true') return 'congrats'
    if (localStorage.getItem(LS_TRIAL_EXAM))            return 'resume'
    if (localStorage.getItem(LS_TRIAL_USED) === 'true') return 'used'
    return 'hook'
  })

  const [exam, setExam] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_TRIAL_EXAM) || 'null') } catch { return null }
  })

  const [errorMsg,  setErrorMsg]  = useState('')
  const [username,  setUsername]  = useState('')
  const [password,  setPassword]  = useState('')
  const [signupErr, setSignupErr] = useState('')
  const [signing,   setSigning]   = useState(false)

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('loading')
    fireGtag('TrialPhotoUploaded')
    try {
      const compressed = await compressImage(file)
      const result = await generateExam([compressed], { isTrial: true })
      localStorage.setItem(LS_TRIAL_USED, 'true')
      fireGtag('TrialQuizGenerated')
      const trialExam = { id: 'trial', topic: result.topic, questions: result.questions, isTrial: true }
      setExam(trialExam)
      localStorage.setItem(LS_TRIAL_EXAM, JSON.stringify(trialExam))
      setStatus('ready')
    } catch (err) {
      const isTrialUsed = err.message?.includes('Trial already used')
      const isCapHit = err.message?.includes('temporarily unavailable') || err.message?.includes('DAILY_LIMIT')
      if (isTrialUsed) setStatus('used')
      else if (isCapHit) setStatus('capped')
      else setStatus('error')
      setErrorMsg(isCapHit || isTrialUsed ? '' : (lang === 'ar' ? 'حدث خطأ ما. حاول مرة أخرى.' : 'Something went wrong. Please try again.'))
    }
  }

  function handleQuizDone() {
    localStorage.setItem(LS_TRIAL_DONE, 'true')
    fireGtag('TrialQuizCompleted')
    setStatus('congrats')
  }

  function clearTrial() {
    ;[LS_TRIAL_EXAM, LS_TRIAL_DONE, LS_TRIAL_USED].forEach(k => localStorage.removeItem(k))
    setExam(null)
    setStatus('hook')
  }

  async function handleCreateAccount() {
    if (!username.trim()) { setSignupErr(lang === 'ar' ? 'أدخل اسم مستخدم' : 'Enter a username'); return }
    if (password.length < 6) { setSignupErr(lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters'); return }
    setSigning(true); setSignupErr('')
    try {
      await onSignup({ username: username.trim(), password, lang, trialExam: exam })
      fireGtag('CompleteRegistration')
    } catch (e) {
      setSignupErr(e.message || (lang === 'ar' ? 'حدث خطأ ما' : 'Something went wrong'))
      setSigning(false)
    }
  }

  // shared input style
  const inputStyle = { border: '2px solid #e5e7eb', background: '#fafafa' }
  const inputFocus = e => e.target.style.borderColor = '#7c3aed'
  const inputBlur  = e => e.target.style.borderColor = '#e5e7eb'

  // ── HOOK ──────────────────────────────────────────────────
  if (status === 'hook') return (
    <div className="bg-white w-full flex flex-col" style={{ minHeight: '100dvh' }} dir={dir}>
      <div className="w-full max-w-md mx-auto flex flex-col px-6" style={{ minHeight: '100dvh' }}>

        <LangToggle lang={lang} onLanguageChange={onLanguageChange} />

        {/* Logo */}
        <div className="flex-shrink-0 pt-8 pb-2">
          <img src="/nav-logo.png" alt="Numio" className="h-10 w-auto" />
        </div>

        {/* Hero */}
        <div className="flex-shrink-0 py-6 flex justify-center">
          <div style={{ animation: 'float 3s ease-in-out infinite' }}>
            <img src="/nav-profile.png" alt="" className="w-44 h-auto" />
          </div>
        </div>

        {/* Copy */}
        <div className="flex-shrink-0 text-center mb-8">
          <h1 className="font-display font-extrabold text-3xl text-ink leading-tight mb-3">{s.hook_title}</h1>
          <p className="font-body text-base text-muted leading-relaxed">{s.hook_sub}</p>
        </div>

        {/* CTA */}
        <button onClick={() => { fireGtag('TrialStarted'); inputRef.current?.click() }}
          className="w-full text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95 flex-shrink-0"
          style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
          {s.hook_cta}
        </button>

        <p className="font-body text-xs text-muted text-center flex-shrink-0 mt-4">
          {lang === 'ar'
            ? <> بالمتابعة، أنت توافق على <a href="/privacy.html" target="_blank" className="underline" style={{ color: '#7c3aed' }}>سياسة الخصوصية</a> و<a href="/terms.html" target="_blank" className="underline" style={{ color: '#7c3aed' }}>شروط الاستخدام</a></>
            : <> By continuing, you agree to our <a href="/privacy.html" target="_blank" className="underline" style={{ color: '#7c3aed' }}>Privacy Policy</a> and <a href="/terms.html" target="_blank" className="underline" style={{ color: '#7c3aed' }}>Terms of Use</a></>
          }
        </p>

        <button onClick={() => onSignup({ showLogin: true })}
          className="w-full font-body font-bold text-sm text-muted py-3 text-center mt-2">
          {s.hook_login}
        </button>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
      </div>
    </div>
  )

  // ── LOADING ───────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-6 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <div style={{ animation: 'float 2s ease-in-out infinite' }}>
        <img src="/nav-profile.png" alt="" className="w-36 h-auto" />
      </div>
      <div className="w-12 h-12 rounded-full border-4 border-gray-100 animate-spin" style={{ borderTopColor: '#7c3aed' }} />
      <div>
        <h2 className="font-display font-extrabold text-2xl text-ink">{s.loading_title}</h2>
        <p className="font-body text-base text-muted mt-1">{s.loading_sub}</p>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )

  // ── READY ─────────────────────────────────────────────────
  if (status === 'ready') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-6 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <div style={{ animation: 'float 3s ease-in-out infinite' }}>
        <img src="/nav-profile.png" alt="" className="w-40 h-auto" />
      </div>
      <div>
        <h2 className="font-display font-extrabold text-3xl text-ink mb-2">{s.ready_title}</h2>
        <p className="font-body text-base text-muted">{s.ready_sub}</p>
      </div>
      <button onClick={() => { fireGtag('TrialQuizStarted'); setStatus('quiz') }}
        className="w-full max-w-xs text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
        style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
        {s.ready_cta}
      </button>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
    </div>
  )

  // ── ERROR ─────────────────────────────────────────────────
  if (status === 'error') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-6 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <span style={{ fontSize: 72 }}>😅</span>
      <div>
        <h2 className="font-display font-extrabold text-2xl text-ink mb-2">{s.error_title}</h2>
        <p className="font-body text-base text-muted">{errorMsg}</p>
      </div>
      <button onClick={() => { setStatus('hook'); setErrorMsg('') }}
        className="w-full max-w-xs text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
        style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
        {s.error_retry}
      </button>
    </div>
  )

  // ── RESUME ────────────────────────────────────────────────
  if (status === 'resume') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-6 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <div style={{ animation: 'float 3s ease-in-out infinite' }}>
        <img src="/nav-profile.png" alt="" className="w-36 h-auto" />
      </div>
      <div>
        <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{s.resume_title} 👋</h1>
        <p className="font-body text-base text-muted">{s.resume_sub}</p>
      </div>
      <button onClick={() => { fireGtag('TrialQuizStarted'); setStatus('quiz') }}
        className="w-full max-w-xs text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
        style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
        {s.resume_cta}
      </button>
      <button onClick={clearTrial} className="font-body font-bold text-sm text-muted py-1">{s.resume_new}</button>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )

  // ── QUIZ ──────────────────────────────────────────────────
  if (status === 'quiz' && exam) return (
    <Quiz exam={exam} kidId={null} isTrial={true} onDone={handleQuizDone} onQuit={() => setStatus('capped')} />
  )

  // ── CAPPED ────────────────────────────────────────────────
  if (status === 'capped') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-6 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <span style={{ fontSize: 80 }}>🌙</span>
      <div>
        <h1 className="font-display font-extrabold text-3xl text-ink mb-3">{s.capped_title}</h1>
        <p className="font-body text-base text-muted leading-relaxed max-w-xs">{s.capped_sub}</p>
      </div>
      <button onClick={() => onSignup({ showLogin: true })}
        className="w-full max-w-xs text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
        style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
        {lang === 'ar' ? 'سجّل الدخول أو أنشئ حساباً' : 'Log in or create account'}
      </button>
    </div>
  )

  // ── CONGRATS + SIGNUP ─────────────────────────────────────
  if (status === 'congrats' || status === 'used') return (
    <div className="bg-white w-full flex flex-col" style={{ minHeight: '100dvh' }} dir={dir}>
      <div className="w-full max-w-md mx-auto flex flex-col px-6 py-10 gap-5" style={{ minHeight: '100dvh' }}>

        {/* Hero */}
        <div className="text-center pt-2">
          <div style={{ animation: 'float 3s ease-in-out infinite', display: 'inline-block' }}>
            <img src="/nav-profile.png" alt="" className="w-28 h-auto mx-auto mb-4" />
          </div>
          <h1 className="font-display font-extrabold text-2xl text-ink mb-2">
            {status === 'used' ? s.used_title : s.congrats_title}
          </h1>
          <p className="font-body text-base text-muted leading-relaxed">
            {status === 'used' ? s.used_sub : s.congrats_sub}
          </p>
        </div>

        {/* Signup form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{s.username_label}</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={s.username_ph}
              className="w-full rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none transition-colors"
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{s.pin_label}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={s.pin_ph}
              className="w-full rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none transition-colors"
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
          </div>

          <p className="font-body text-xs text-muted text-center">
            {s.terms_pre}{' '}
            <a href="/privacy.html" target="_blank" className="underline" style={{ color: '#7c3aed' }}>{s.terms_privacy}</a>
            {' '}{s.terms_and}{' '}
            <a href="/terms.html" target="_blank" className="underline" style={{ color: '#7c3aed' }}>{s.terms_terms}</a>
          </p>

          {signupErr && <p className="font-body text-sm text-red-500 font-bold text-center">{signupErr}</p>}

          <button onClick={handleCreateAccount} disabled={signing || !username.trim() || password.length < 6}
            className="w-full disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
            style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
            {signing ? s.loading_signup : s.cta}
          </button>

          <button onClick={() => onSignup({ showLogin: true })}
            className="w-full font-body font-bold text-sm text-muted py-2 text-center">
            {s.hook_login}
          </button>
        </div>
        <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
      </div>
    </div>
  )

  return null
}
