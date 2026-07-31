import { useState, useRef, useEffect } from 'react'
import { generateExam } from '../lib/generateExam'
import Quiz from './Quiz'

// localStorage keys
const LS_TRIAL_EXAM    = 'numio_trial_exam'
const LS_TRIAL_ANSWERS = 'numio_trial_answers'
const LS_TRIAL_IDX     = 'numio_trial_idx'
const LS_TRIAL_DONE    = 'numio_trial_done'
const LS_TRIAL_USED    = 'numio_trial_used' // true once Claude was called

const strings = {
  en: {
    hook_title:    'Get better at school with just a picture! 📸',
    hook_sub:      'Take a photo of any page — Numio turns it into a fun 5-question challenge.',
    hook_cta:      'Create your first quiz 🚀',
    loading_title: '✨ Building your quiz...',
    loading_sub:   'Numio is reading your page...',
    error_title:   'Something went wrong 😅',
    error_retry:   'Try again',
    congrats_title: 'You crushed it! 🎉',
    congrats_sub:   'You just did your first Numio challenge.',
    congrats_cta:   'Start for free →',
    congrats_desc:  'Create your free account to unlock unlimited quizzes and earn rewards with your child.',
    resume_title:  'Welcome back! 👋',
    resume_sub:    'You have a quiz in progress.',
    resume_cta:    'Continue quiz →',
    resume_new:    'Start over',
    used_title:    'Your trial is complete 🌟',
    used_sub:      'Create a free account to keep going with unlimited quizzes.',
    used_cta:      'Create free account →',
  },
  ar: {
    hook_title:    'تحسَّن في المدرسة بصورة واحدة! 📸',
    hook_sub:      'التقط صورة لأي صفحة — سيحوّلها Numio إلى تحدٍّ ممتع من 5 أسئلة.',
    hook_cta:      'أنشئ أول اختبار 🚀',
    loading_title: '✨ جاري بناء اختبارك...',
    loading_sub:   'Numio يقرأ صفحتك...',
    error_title:   'حدث خطأ ما 😅',
    error_retry:   'حاول مرة أخرى',
    congrats_title: 'أحسنت! 🎉',
    congrats_sub:   'لقد أتممت أول تحدّي Numio.',
    congrats_cta:   'ابدأ مجاناً ←',
    congrats_desc:  'أنشئ حسابك المجاني لتفتح اختبارات غير محدودة وتكسب مكافآت مع طفلك.',
    resume_title:  'مرحباً بعودتك! 👋',
    resume_sub:    'لديك اختبار لم تكمله بعد.',
    resume_cta:    'أكمل الاختبار ←',
    resume_new:    'ابدأ من جديد',
    used_title:    'انتهت تجربتك المجانية 🌟',
    used_sub:      'أنشئ حساباً مجانياً لتحصل على اختبارات غير محدودة.',
    used_cta:      'أنشئ حساباً مجانياً ←',
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

  // Check localStorage for in-progress or completed trial
  const [status, setStatus] = useState(() => {
    if (localStorage.getItem(LS_TRIAL_DONE) === 'true') return 'congrats'
    if (localStorage.getItem(LS_TRIAL_EXAM))            return 'resume'
    if (localStorage.getItem(LS_TRIAL_USED) === 'true') return 'used'
    return 'hook'
  })

  const [exam,   setExam]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_TRIAL_EXAM) || 'null') } catch { return null }
  })
  const [errorMsg, setErrorMsg] = useState('')

  // Persist exam to localStorage whenever it changes
  useEffect(() => {
    if (exam) localStorage.setItem(LS_TRIAL_EXAM, JSON.stringify(exam))
  }, [exam])

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus('loading')
    try {
      const compressed = await compressImage(file)
      // Mark trial as used immediately (before Claude call)
      localStorage.setItem(LS_TRIAL_USED, 'true')
      const result = await generateExam([compressed], { isTrial: true })
      // Shape exam like a saved exam object Quiz.jsx expects
      const trialExam = {
        id:        'trial',
        topic:     result.topic,
        questions: result.questions,
        isTrial:   true,
      }
      setExam(trialExam)
      localStorage.setItem(LS_TRIAL_EXAM, JSON.stringify(trialExam))
      localStorage.removeItem(LS_TRIAL_ANSWERS)
      localStorage.removeItem(LS_TRIAL_IDX)
      setStatus('quiz')
    } catch (err) {
      setErrorMsg(err.message === 'RATE_LIMIT'
        ? (lang === 'ar' ? 'تجربة واحدة فقط مسموحة.' : 'Only one trial quiz is allowed.')
        : (lang === 'ar' ? 'حدث خطأ ما. حاول مرة أخرى.' : 'Something went wrong. Please try again.')
      )
      setStatus('error')
    }
  }

  function handleQuizDone() {
    localStorage.setItem(LS_TRIAL_DONE, 'true')
    localStorage.removeItem(LS_TRIAL_ANSWERS)
    localStorage.removeItem(LS_TRIAL_IDX)
    setStatus('congrats')
  }

  function clearTrial() {
    localStorage.removeItem(LS_TRIAL_EXAM)
    localStorage.removeItem(LS_TRIAL_ANSWERS)
    localStorage.removeItem(LS_TRIAL_IDX)
    localStorage.removeItem(LS_TRIAL_DONE)
    localStorage.removeItem(LS_TRIAL_USED)
    setExam(null)
    setStatus('hook')
  }

  // ── HOOK ──────────────────────────────────────────────────
  if (status === 'hook') return (
    <div className="bg-white w-full flex flex-col" style={{ minHeight: '100dvh' }} dir={dir}>
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center px-6 gap-8" style={{ minHeight: '100dvh' }}>

        {/* Language toggle */}
        <div className="flex gap-2 self-end pt-6">
          <button onClick={() => onLanguageChange?.('en')}
            className={`px-3 py-1 rounded-full font-body font-bold text-sm ${lang === 'en' ? 'bg-duo text-white' : 'bg-gray-100 text-muted'}`}>
            EN
          </button>
          <button onClick={() => onLanguageChange?.('ar')}
            className={`px-3 py-1 rounded-full font-body font-bold text-sm ${lang === 'ar' ? 'bg-duo text-white' : 'bg-gray-100 text-muted'}`}>
            عربي
          </button>
        </div>

        <img src="/mascot.png" alt="Numio" className="w-36 h-auto" style={{ animation: 'float 3s ease-in-out infinite' }} />

        <div className="text-center">
          <h1 className="font-display font-extrabold text-3xl text-ink mb-3">{s.hook_title}</h1>
          <p className="font-body text-base text-muted leading-relaxed">{s.hook_sub}</p>
        </div>

        <img src="/onboarding-hero.png" alt="" className="w-full object-contain" style={{ maxHeight: 180 }} />

        <button
          onClick={() => inputRef.current?.click()}
          className="w-full bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
          style={{ boxShadow: '0 4px 0 #46a302' }}>
          {s.hook_cta}
        </button>

        <button onClick={onSignup} className="font-body font-bold text-sm text-muted py-1">
          {lang === 'ar' ? 'لدي حساب بالفعل →' : 'Already have an account →'}
        </button>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
      </div>
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
      <button
        onClick={() => setStatus('quiz')}
        className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
        style={{ boxShadow: '0 4px 0 #46a302' }}>
        {s.resume_cta}
      </button>
      <button onClick={clearTrial} className="font-body font-bold text-sm text-muted py-1">
        {s.resume_new}
      </button>
    </div>
  )

  // ── LOADING ───────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-8 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-duo animate-spin" />
      <div>
        <h2 className="font-display font-extrabold text-2xl text-ink mb-2">{s.loading_title}</h2>
        <p className="font-body text-base text-muted">{s.loading_sub}</p>
      </div>
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
      <button
        onClick={() => { setStatus('hook'); setErrorMsg('') }}
        className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5"
        style={{ boxShadow: '0 4px 0 #46a302' }}>
        {s.error_retry}
      </button>
    </div>
  )

  // ── QUIZ ──────────────────────────────────────────────────
  if (status === 'quiz' && exam) return (
    <Quiz
      exam={exam}
      kidId={null}       // no kid yet — trial mode
      isTrial={true}     // Quiz.jsx skips coin RPC in trial mode
      onDone={handleQuizDone}
    />
  )

  // ── CONGRATS ──────────────────────────────────────────────
  if (status === 'congrats') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-8 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <span style={{ fontSize: 80 }}>🎉</span>
      <div>
        <h1 className="font-display font-extrabold text-3xl text-ink mb-3">{s.congrats_title}</h1>
        <p className="font-body font-bold text-lg text-ink mb-2">{s.congrats_sub}</p>
        <p className="font-body text-base text-muted leading-relaxed">{s.congrats_desc}</p>
      </div>
      <button
        onClick={onSignup}
        className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
        style={{ boxShadow: '0 4px 0 #46a302' }}>
        {s.congrats_cta}
      </button>
    </div>
  )

  // ── USED (already did trial, didn't sign up) ──────────────
  if (status === 'used') return (
    <div className="bg-white w-full flex flex-col items-center justify-center px-6 gap-8 text-center" style={{ minHeight: '100dvh' }} dir={dir}>
      <span style={{ fontSize: 80 }}>🌟</span>
      <div>
        <h1 className="font-display font-extrabold text-3xl text-ink mb-3">{s.used_title}</h1>
        <p className="font-body text-base text-muted leading-relaxed">{s.used_sub}</p>
      </div>
      <button
        onClick={onSignup}
        className="w-full max-w-xs bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
        style={{ boxShadow: '0 4px 0 #46a302' }}>
        {s.used_cta}
      </button>
    </div>
  )

  return null
}
