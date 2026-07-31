import { useState, useRef } from 'react'
import { generateExam } from '../lib/generateExam'
import Quiz from './Quiz'

const LS_TRIAL_EXAM = 'numio_trial_exam'
const LS_TRIAL_DONE = 'numio_trial_done'
const LS_TRIAL_USED = 'numio_trial_used'

const strings = {
  en: {
    hook_title:     '✨ Ready to see magic?',
    hook_sub:       'Take a photo of a lesson and watch Numio transform it into a custom challenge.',
    hook_cta:       '📸 Create my first challenge',
    hook_login:     'Already have an account →',
    loading_title:  '✨ Turning your lesson into a challenge…',
    ready_title:    '🎉 Your challenge is ready!',
    ready_sub:      'Your child is ready to start practicing.',
    ready_cta:      '🚀 Start challenge',
    error_title:    'Something went wrong 😅',
    error_retry:    'Try again',
    resume_title:   'Welcome back! 👋',
    resume_sub:     'You have a quiz in progress.',
    resume_cta:     'Continue quiz →',
    resume_new:     'Start over',
    used_title:     'Your trial is complete 🌟',
    used_sub:       'Create a free account to keep going with unlimited quizzes.',
    used_cta:       'Create free account →',
    congrats_title: '🎉 Awesome! Your first challenge is complete.',
    congrats_sub:   "Create your free account to save your child's progress and generate unlimited personalized challenges.",
    username_label: 'USERNAME',
    pin_label:      'PASSWORD',
    username_ph:    'e.g. sarah_mom',
    pin_ph:         'At least 6 characters',
    cta:            'Create my free account',
    loading_signup: 'Creating account...',
    terms_pre:      'By continuing, you agree to our',
    terms_privacy:  'Privacy Policy',
    terms_and:      'and',
    terms_terms:    'Terms of Use',
  },
  ar: {
    hook_title:     '✨ هل أنت مستعد لرؤية السحر؟',
    hook_sub:       'التقط صورة لدرس وشاهد Numio يحوّلها إلى تحدٍّ مخصص.',
    hook_cta:       '📸 أنشئ أول تحدٍّ',
    hook_login:     'لديّ حساب بالفعل ←',
    loading_title:  '✨ نحوّل درسك إلى تحدٍّ…',
    ready_title:    '🎉 تحدّيك جاهز!',
    ready_sub:      'طفلك جاهز للبدء في الممارسة.',
    ready_cta:      '🚀 ابدأ التحدّي',
    error_title:    'حدث خطأ ما 😅',
    error_retry:    'حاول مرة أخرى',
    resume_title:   'مرحباً بعودتك! 👋',
    resume_sub:     'لديك اختبار لم تكمله بعد.',
    resume_cta:     'أكمل الاختبار ←',
    resume_new:     'ابدأ من جديد',
    used_title:     'انتهت تجربتك المجانية 🌟',
    used_sub:       'أنشئ حساباً مجانياً لتحصل على اختبارات غير محدودة.',
    used_cta:       'أنشئ حساباً مجانياً ←',
    congrats_title: '🎉 رائع! لقد أكملت تحدّيك الأول.',
    congrats_sub:   'أنشئ حسابك المجاني لحفظ تقدّم طفلك وتوليد تحديات مخصصة غير محدودة.',
    username_label: 'اسم المستخدم',
    pin_label:      'كلمة المرور',
    username_ph:    'مثال: sarah_mom',
    pin_ph:         '٦ أحرف على الأقل',
    cta:            'أنشئ حسابي المجاني',
    loading_signup: 'جاري إنشاء الحساب...',
    terms_pre:      'بالمتابعة، أنت توافق على',
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
    try {
      const compressed = await compressImage(file)
      const result = await generateExam([compressed], { isTrial: true })
      // Mark trial as used AFTER successful generation
      localStorage.setItem(LS_TRIAL_USED, 'true')
      const trialExam = { id: 'trial', topic: result.topic, questions: result.questions, isTrial: true }
      setExam(trialExam)
      localStorage.setItem(LS_TRIAL_EXAM, JSON.stringify(trialExam))
      setStatus('ready')
    } catch (err) {
      setErrorMsg(lang === 'ar' ? 'حدث خطأ ما. حاول مرة أخرى.' : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  function handleQuizDone() {
    localStorage.setItem(LS_TRIAL_DONE, 'true')
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
    } catch (e) {
      setSignupErr(e.message || (lang === 'ar' ? 'حدث خطأ ما' : 'Something went wrong'))
      setSigning(false)
    }
  }

  // ── HOOK ──────────────────────────────────────────────────
  if (status === 'hook') return (
    <div className="bg-white w-full flex flex-col" style={{ minHeight: '100dvh' }} dir={dir}>
      <div className="w-full max-w-md mx-auto flex flex-col px-6" style={{ minHeight: '100dvh' }}>

        {/* Language toggle */}
        <div className="flex gap-2 justify-end pt-6 flex-shrink-0">
          <button onClick={() => onLanguageChange?.('en')}
            className={`px-3 py-1 rounded-full font-body font-bold text-sm transition-all ${lang === 'en' ? 'bg-duo text-white' : 'bg-gray-100 text-muted'}`}>
            EN
          </button>
          <button onClick={() => onLanguageChange?.('ar')}
            className={`px-3 py-1 rounded-full font-body font-bold text-sm transition-all ${lang === 'ar' ? 'bg-duo text-white' : 'bg-gray-100 text-muted'}`}>
            عربي
          </button>
        </div>

        {/* Title */}
        <div className="flex-shrink-0 pt-6 pb-2 text-center">
          <h1 className="font-display font-extrabold text-3xl text-ink">{s.hook_title}</h1>
        </div>

        {/* Hero image */}
        <div className="flex-shrink-0 py-4">
          <img src="/onboarding-hero.png" alt="" className="w-full object-contain" style={{ maxHeight: 220 }} />
        </div>

        {/* Sub */}
        <p className="font-body text-base text-muted text-center leading-relaxed flex-shrink-0 mb-6">
          {s.hook_sub}
        </p>

        {/* CTA */}
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1 flex-shrink-0"
          style={{ boxShadow: '0 4px 0 #46a302' }}>
          {s.hook_cta}
        </button>

        <button
          onClick={() => onSignup({ showLogin: true })}
          className="w-full font-body font-bold text-sm text-muted py-3 text-center mt-2">
          {s.hook_login}
        </button>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>
    </div>
  )

  // ── LOADING ───────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-8 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
      <h2 className="font-display font-extrabold text-2xl text-ink">{s.loading_title}</h2>
    </div>
  )

  // ── READY ─────────────────────────────────────────────────
  if (status === 'ready') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-8 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <img src="/mascot.png" alt="Numio" className="w-36 h-auto" style={{ animation: 'float 3s ease-in-out infinite' }} />
      <div>
        <h2 className="font-display font-extrabold text-3xl text-ink mb-2">{s.ready_title}</h2>
        <p className="font-body text-base text-muted">{s.ready_sub}</p>
      </div>
      <button
        onClick={() => setStatus('quiz')}
        className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
        style={{ boxShadow: '0 4px 0 #46a302' }}>
        {s.ready_cta}
      </button>
      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
    </div>
  )

  // ── ERROR ─────────────────────────────────────────────────
  if (status === 'error') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-8 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <span style={{ fontSize: 64 }}>😅</span>
      <div>
        <h2 className="font-display font-extrabold text-2xl text-ink mb-2">{s.error_title}</h2>
        <p className="font-body text-base text-muted">{errorMsg}</p>
      </div>
      <button onClick={() => { setStatus('hook'); setErrorMsg('') }}
        className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5"
        style={{ boxShadow: '0 4px 0 #46a302' }}>
        {s.error_retry}
      </button>
    </div>
  )

  // ── RESUME ────────────────────────────────────────────────
  if (status === 'resume') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-8 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <img src="/mascot.png" alt="Numio" className="w-28 h-auto" />
      <div>
        <h1 className="font-display font-extrabold text-3xl text-ink mb-2">{s.resume_title}</h1>
        <p className="font-body text-base text-muted">{s.resume_sub}</p>
      </div>
      <button onClick={() => setStatus('quiz')}
        className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
        style={{ boxShadow: '0 4px 0 #46a302' }}>
        {s.resume_cta}
      </button>
      <button onClick={clearTrial} className="font-body font-bold text-sm text-muted py-1">
        {s.resume_new}
      </button>
    </div>
  )

  // ── QUIZ ──────────────────────────────────────────────────
  if (status === 'quiz' && exam) return (
    <Quiz exam={exam} kidId={null} isTrial={true} onDone={handleQuizDone} />
  )

  // ── CONGRATS + SIGNUP (merged) ────────────────────────────
  if (status === 'congrats' || status === 'used') return (
    <div className="bg-white w-full flex flex-col" style={{ minHeight: '100dvh' }} dir={dir}>
      <div className="w-full max-w-md mx-auto flex flex-col px-6 py-10 gap-6" style={{ minHeight: '100dvh' }}>

        {/* Congrats header */}
        <div className="text-center pt-4">
          <h1 className="font-display font-extrabold text-2xl text-ink mb-3">
            {status === 'used' ? s.used_title : s.congrats_title}
          </h1>
          <p className="font-body text-base text-muted leading-relaxed">
            {status === 'used' ? s.used_sub : s.congrats_sub}
          </p>
        </div>

        {/* Signup form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">
              {s.username_label}
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={s.username_ph}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none focus:border-duo transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">
              {s.pin_label}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={s.pin_ph}
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none focus:border-duo transition-colors"
            />
          </div>

          <p className="font-body text-xs text-muted text-center">
            {s.terms_pre}{' '}
            <a href="/privacy.html" target="_blank" className="text-duo underline">{s.terms_privacy}</a>
            {' '}{s.terms_and}{' '}
            <a href="/terms.html" target="_blank" className="text-duo underline">{s.terms_terms}</a>
          </p>

          {signupErr && <p className="font-body text-sm text-red-500 font-bold text-center">{signupErr}</p>}

          <button
            onClick={handleCreateAccount}
            disabled={signing || !username.trim() || password.length < 6}
            className="w-full bg-duo disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
            style={{ boxShadow: '0 4px 0 #46a302' }}>
            {signing ? s.loading_signup : s.cta}
          </button>
        </div>
      </div>
    </div>
  )

  return null
}
