import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const STRINGS = {
  en: {
    dir: 'ltr',
    welcome_title: "Turn your kid's lessons into custom quizzes for free.",
    welcome_sub: 'Snap. Learn. Earn rewards. 📸',
    welcome_cta: "Let's start →",
    lang_question: 'Select a language to start',
    goal_question: 'Why do you want to use Numio?',
    goal_options: [
      { label: 'Help my child do better at school', icon: '📈', value: 'improve' },
      { label: 'Help my child prepare for exams', icon: '🎯', value: 'exam' },
      { label: 'Build better study habits', icon: '💪', value: 'habits' },
      { label: 'Help my child feel more confident', icon: '😊', value: 'confidence' },
    ],
    how_title: "Here's how it works",
    how_sub: '3 simple steps to learning 🚀',
    how_steps: [
      { icon: '📸', title: 'Take a picture', desc: 'Snap any textbook page or notes.' },
      { icon: '🧠', title: 'Practice', desc: 'Answer a quiz Numio built just for you.' },
      { icon: '🎁', title: 'Earn & claim rewards', desc: 'Collect coins and claim rewards set by your parents.' },
    ],
    how_cta: "Let's go! 🚀",
    account_bubble: 'Create your family account!',
    phone_label: 'Phone number',
    phone_placeholder: '+1 234 567 8900',
    pin_label: '4-digit PIN',
    confirm_pin_label: 'Confirm PIN',
    create_cta: 'Create Account →',
    creating: 'Creating...',
    error_pin_match: 'PINs do not match',
    error_pin_length: 'PIN must be 4 digits',
    error_phone: 'Enter a valid phone number',
    welcome_back: 'Welcome! 🎉',
    account_ready: 'Your account is ready!',
    name_question: "What's your name? 😊",
    name_placeholder: 'Enter your name...',
    name_cta: "That's me! →",
    continue: 'Continue →',
  },
  ar: {
    dir: 'rtl',
    welcome_title: '!مرحباً بك في Numio',
    welcome_sub: 'صوّر. تعلّم. اكسب مكافآت. 📸',
    welcome_cta: 'هيا نبدأ ←',
    lang_question: 'ما اللغة التي تفضلها؟',
    goal_question: 'لماذا تريد استخدام Numio؟',
    goal_options: [
      { label: 'مساعدة طفلي على التفوق في المدرسة', icon: '📈', value: 'improve' },
      { label: 'مساعدة طفلي على الاستعداد للامتحانات', icon: '🎯', value: 'exam' },
      { label: 'بناء عادات دراسية أفضل', icon: '💪', value: 'habits' },
      { label: 'مساعدة طفلي على الشعور بالثقة', icon: '😊', value: 'confidence' },
    ],
    how_title: 'كيف يعمل التطبيق',
    how_sub: '٣ خطوات بسيطة للتعلم 🚀',
    how_steps: [
      { icon: '📸', title: 'التقط صورة', desc: 'صوّر أي صفحة من كتابك أو ملاحظاتك.' },
      { icon: '🧠', title: 'تدرّب', desc: 'أجب على اختبار أعدّه كلود خصيصاً لك.' },
      { icon: '🎁', title: 'اكسب واستبدل المكافآت', desc: 'اجمع العملات واستبدلها بمكافآت حددها والداك.' },
    ],
    how_cta: 'هيا بنا! 🚀',
    account_bubble: '!أنشئ حساب عائلتك',
    phone_label: 'رقم الهاتف',
    phone_placeholder: '٩٦٦ ٥٠٠ ٠٠٠ ٠٠٠+',
    pin_label: 'رمز PIN من ٤ أرقام',
    confirm_pin_label: 'تأكيد رمز PIN',
    create_cta: 'إنشاء الحساب ←',
    creating: 'جارٍ الإنشاء...',
    error_pin_match: 'رمزا PIN غير متطابقين',
    error_pin_length: 'يجب أن يتكون PIN من ٤ أرقام',
    error_phone: 'أدخل رقم هاتف صحيح',
    welcome_back: '!مرحباً 🎉',
    account_ready: 'حسابك جاهز!',
    name_question: 'ما اسمك؟ 😊',
    name_placeholder: 'أدخل اسمك...',
    name_cta: 'هذا أنا! ←',
    continue: 'استمر ←',
  },
}

const TOTAL_QUESTIONS = 3

// Centered card shell for desktop
function OnboardingShell({ children, dir = 'ltr' }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center" style={{ height: '100dvh' }} dir={dir}>
      <div className="w-full max-w-md bg-white flex flex-col overflow-hidden" style={{ maxHeight: '100dvh', minHeight: 500 }}>
        {children}
      </div>
    </div>
  )
}

function ProgressBar({ step }) {
  const pct = (step / TOTAL_QUESTIONS) * 100
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-duo rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}

function OptionCard({ label, icon, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 font-display font-bold text-lg text-left transition-all active:scale-[0.98] ${
        selected ? 'border-duo bg-green-50 text-duo' : 'border-gray-200 bg-white text-ink'
      }`}
    >
      <span style={{ fontSize: 28 }}>{icon}</span>
      {label}
    </button>
  )
}

// flow: welcome → language → goal → how → account → graffiti → name
// ── Meta Pixel helper (onboarding only, stops after account creation) ──
function firePixel(type, event, params = {}) {
  try { if (window.fbq) window.fbq(type, event, params) } catch (_) {}
}

// ── Google Analytics helper ──────────────────────────────────────
function fireGtag(eventName, params = {}) {
  try { if (window.gtag) window.gtag('event', eventName, params) } catch (_) {}
}

export default function Onboarding({ onComplete, onLanguageChange }) {
  const [screen, setScreen]         = useState('language')
  const [language, setLanguage]     = useState('en')
  const [goal, setGoal]             = useState(null)
  const [phone, setPhone]           = useState('')
  const [pin, setPin]               = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [authError, setAuthError]   = useState('')
  const [loading, setLoading]       = useState(false)
  const [name, setName]             = useState('')
  const [isSignIn, setIsSignIn]     = useState(false)

  const s = STRINGS[language] || STRINGS.en
  const dir = s.dir

  // Derive a high-entropy password from phone + PIN using SHA-256
  // This means the Auth password is never guessable from PIN alone
  async function derivePassword(phoneRaw, pinRaw) {
    const normalized = phoneRaw.replace(/\s+/g, '')
    const input = `numio:${normalized}:${pinRaw}:v2`
    const encoded = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Hash PIN with SHA-256 before storing in DB (never store plaintext)
  async function hashPin(pinRaw) {
    const input = `numio-pin:${pinRaw}`
    const encoded = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function handleSignIn() {
    if (phone.length < 8)  { setAuthError(s.error_phone); return }
    if (pin.length !== 4)  { setAuthError(s.error_pin_length); return }
    setLoading(true)
    setAuthError('')
    try {
      const fakeEmail = `${phone.replace(/\s+/g, '')}@numio.app`
      const password = await derivePassword(phone, pin)
      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password })
      if (error) throw error
      onComplete(null)
    } catch (e) {
      setAuthError(language === 'ar' ? 'رقم الهاتف أو الرمز السري غير صحيح' : 'Wrong phone number or PIN')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAccount() {
    if (pin !== confirmPin) { setAuthError(s.error_pin_match); return }
    if (pin.length !== 4)   { setAuthError(s.error_pin_length); return }
    if (phone.length < 8)   { setAuthError(s.error_phone); return }
    setLoading(true)
    setAuthError('')
    try {
      const fakeEmail = `${phone.replace(/\s+/g, '')}@numio.app`
      const password = await derivePassword(phone, pin)
      const { error } = await supabase.auth.signUp({ email: fakeEmail, password })
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const pinHash = await hashPin(pin)
        await supabase.from('profiles').upsert({ id: user.id, parent_pin: pinHash })
      }
      firePixel('track', 'CompleteRegistration', { content_name: 'Family Account Created' }); fireGtag('account_created')
      setScreen('graffiti')
    } catch (e) {
      setAuthError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveName() {
    if (!name.trim()) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('profiles').upsert({
        id: user.id,
        display_name: name.trim(),
        language: language || 'en',
        coin_balance: 0,
        streak_count: 0,
      })
    } catch (e) { console.error(e) }
    onComplete(name.trim())
  }

  useEffect(() => {
    // no auto-advance — user taps Continue
  }, [screen])

  // ── Pixel: fire ViewContent when welcome screen appears ──
  useEffect(() => {
    if (screen === 'language') firePixel('track', 'ViewContent', { content_name: 'Onboarding Welcome' })
    if (screen === 'account' && !isSignIn) firePixel('trackCustom', 'InitiateAccountCreation')
  }, [screen, isSignIn])

  // ── WELCOME ───────────────────────────────────────────────────────
  // ── LANGUAGE ──────────────────────────────────────────────────────
  if (screen === 'language') {
    return (
      <OnboardingShell dir="ltr">
        <div className="flex flex-col flex-1 px-6 overflow-y-auto">
          <div className="flex-shrink-0 pt-6 pb-4"><ProgressBar step={1} /></div>
          <div className="flex-shrink-0 mb-4">
            <h1 className="font-display font-extrabold text-3xl text-ink">Turn your kid's lessons into custom quizzes for free.</h1>
          </div>
          <div className="flex-shrink-0 flex items-start gap-3 mb-6">
            <img src="/mascot.png" alt="" className="w-12 h-12 object-contain flex-shrink-0" />
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
              <p className="font-display font-bold text-base text-ink">Select a language to start</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            <OptionCard label="English" icon="🇺🇸" selected={language === 'en'} onSelect={() => { setLanguage('en'); onLanguageChange?.('en') }} />
            <OptionCard label="العربية" icon="🇸🇦" selected={language === 'ar'} onSelect={() => { setLanguage('ar'); onLanguageChange?.('ar') }} />
          </div>
          <div className="flex-shrink-0 py-6">
            <button onClick={() => { firePixel('trackCustom', 'LanguageSelected', { language }); fireGtag('language_selected', { language }); setScreen('goal') }} disabled={!language}
              className="w-full bg-duo disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-4 shadow-[0_4px_0_#58a700] active:shadow-none active:translate-y-1 transition-all">
              Continue →
            </button>
            <button
              onClick={() => { setIsSignIn(true); setScreen('account') }}
              className="w-full text-center font-body font-bold text-sm text-muted py-2">
              Already have an account? Log in
            </button>
          </div>
        </div>
      </OnboardingShell>
    )
  }

  // ── GOAL ──────────────────────────────────────────────────────────
  if (screen === 'goal') {
    return (
      <OnboardingShell dir={dir}>
        <div className="flex flex-col flex-1 px-6 overflow-y-auto">
          <div className="flex-shrink-0 pt-6 pb-4"><ProgressBar step={2} /></div>
          <div className="flex-shrink-0 flex items-start gap-3 mb-6">
            <img src="/mascot.png" alt="" className="w-12 h-12 object-contain flex-shrink-0" />
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
              <p className="font-display font-bold text-base text-ink">{s.goal_question}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 flex-1">
            {s.goal_options.map(opt => (
              <OptionCard key={opt.value} label={opt.label} icon={opt.icon} selected={goal === opt.value} onSelect={() => setGoal(opt.value)} />
            ))}
          </div>
          <div className="flex-shrink-0 py-6">
            <button onClick={() => { firePixel('trackCustom', 'GoalSelected', { goal }); fireGtag('goal_selected', { goal }); setScreen('how') }} disabled={!goal}
              className="w-full bg-duo disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-4 shadow-[0_4px_0_#58a700] active:shadow-none active:translate-y-1 transition-all">
              {s.continue}
            </button>
          </div>
        </div>
      </OnboardingShell>
    )
  }

  // ── HOW IT WORKS (before account) ────────────────────────────────
  if (screen === 'how') {
    return (
      <OnboardingShell dir={dir}>
        <div className="flex flex-col items-center flex-1 px-6 py-6 overflow-y-auto gap-6">
          <img src="/mascot.png" alt="" className="w-20 h-auto" />
          <div className="text-center">
            <h1 className="font-display font-extrabold text-2xl text-ink">{s.how_title}</h1>
            <p className="font-body text-sm text-muted mt-1">{s.how_sub}</p>
          </div>
          <div className="w-full flex flex-col gap-3">
            {s.how_steps.map((step, i) => (
              <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-white border-2 border-gray-100 flex items-center justify-center flex-shrink-0">
                  <span style={{ fontSize: 22 }}>{step.icon}</span>
                </div>
                <div>
                  <p className="font-display font-bold text-sm text-ink">{step.title}</p>
                  <p className="font-body text-xs text-muted">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => { firePixel('trackCustom', 'HowItWorksUnderstood'); fireGtag('how_it_works_understood'); setScreen('account') }}
            className="w-full bg-duo text-white font-display font-bold text-xl rounded-2xl py-4 shadow-[0_4px_0_#58a700] active:shadow-none active:translate-y-1 transition-all mt-auto">
            {s.how_cta}
          </button>
        </div>
      </OnboardingShell>
    )
  }

  // ── ACCOUNT ───────────────────────────────────────────────────────
  if (screen === 'account') {
    return (
      <OnboardingShell dir={dir}>
        <div className="flex flex-col flex-1 px-6 overflow-y-auto">
          <div className="flex-shrink-0 pt-6 pb-4"><ProgressBar step={3} /></div>
          <div className="flex-shrink-0 flex items-center gap-3 mb-5">
            <img src="/mascot.png" alt="" className="w-10 h-10 object-contain" />
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
              <p className="font-display font-bold text-sm text-ink">
                {isSignIn
                  ? (language === 'ar' ? 'مرحباً بعودتك! 👋' : 'Welcome back! 👋')
                  : s.account_bubble}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4 pb-6">
            <div className="flex flex-col gap-1.5">
              <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{s.phone_label}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder={s.phone_placeholder}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none focus:border-duo transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{s.pin_label}</label>
              <input type="password" inputMode="numeric" maxLength={4} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-display font-bold text-2xl text-ink outline-none focus:border-duo transition-colors tracking-[1rem]" />
            </div>
            {!isSignIn && (
              <div className="flex flex-col gap-1.5">
                <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">{s.confirm_pin_label}</label>
                <input type="password" inputMode="numeric" maxLength={4} value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-display font-bold text-2xl text-ink outline-none focus:border-duo transition-colors tracking-[1rem]" />
              </div>
            )}
            {!isSignIn && (
              <p className="font-body text-xs text-muted text-center">
                {language === 'ar'
                  ? 'بالمتابعة، أنت توافق على '
                  : 'By continuing, you agree to our '}
                <a href="/privacy.html" target="_blank" className="text-duo underline">
                  {language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
                </a>
              </p>
            )}
            {authError && <p className="font-body text-sm text-red-500 font-bold text-center">{authError}</p>}
            <button
              onClick={isSignIn ? handleSignIn : handleCreateAccount}
              disabled={loading || !phone || pin.length !== 4 || (!isSignIn && confirmPin.length !== 4)}
              className="w-full bg-duo disabled:opacity-40 text-white font-display font-bold text-lg rounded-2xl py-4 shadow-[0_4px_0_#58a700] active:shadow-none active:translate-y-1 transition-all">
              {loading
                ? s.creating
                : isSignIn
                  ? (language === 'ar' ? 'تسجيل الدخول ←' : 'Log in →')
                  : s.create_cta}
            </button>
            <button
              onClick={() => { setIsSignIn(!isSignIn); setAuthError(''); setPin(''); setConfirmPin('') }}
              className="w-full text-muted font-body font-bold text-sm py-2 text-center">
              {isSignIn
                ? (language === 'ar' ? 'ليس لديك حساب؟ أنشئ واحداً' : "Don't have an account? Create one")
                : (language === 'ar' ? 'لديك حساب بالفعل؟ سجّل الدخول' : 'Already have an account? Log in')}
            </button>
          </div>
        </div>
      </OnboardingShell>
    )
  }

  // ── GRAFFITI ──────────────────────────────────────────────────────
  if (screen === 'graffiti') {
    return (
      <OnboardingShell dir={dir}>
        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-6 relative overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => {
            const colors = ['#58cc02','#a78bfa','#fbbf24','#f472b6','#60a5fa','#34d399','#fb923c']
            const left = Math.random() * 100
            const delay = Math.random() * 0.6
            const duration = 0.9 + Math.random() * 0.8
            const size = 8 + Math.random() * 10
            const color = colors[i % colors.length]
            const isCircle = i % 3 === 0
            return (
              <div key={i} style={{
                position: 'absolute', bottom: -20, left: `${left}%`,
                width: size, height: size,
                borderRadius: isCircle ? '50%' : 3,
                backgroundColor: color,
                animation: `confetti-rise ${duration}s ${delay}s cubic-bezier(0.2,0.8,0.3,1) both`,
                transform: `rotate(${Math.random() * 360}deg)`,
                pointerEvents: 'none',
              }} />
            )
          })}
          <div style={{ animation: 'pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both', position: 'relative', zIndex: 1 }}>
            <img src="/mascot.png" alt="Numio" className="w-32 h-auto" />
          </div>
          <div className="text-center" style={{ animation: 'pop-in 0.5s 0.15s cubic-bezier(0.34,1.56,0.64,1) both', position: 'relative', zIndex: 1 }}>
            <h1 className="font-display font-extrabold text-4xl text-ink">{s.welcome_back}</h1>
            <p className="font-body text-lg text-muted mt-2">{s.account_ready}</p>
          </div>
          <button onClick={() => setScreen('name')}
            className="w-full bg-duo text-white font-display font-bold text-xl rounded-2xl py-4 shadow-[0_4px_0_#58a700] active:shadow-none active:translate-y-1 transition-all"
            style={{ position: 'relative', zIndex: 1, animation: 'pop-in 0.5s 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            {s.continue}
          </button>
          <style>{`
            @keyframes pop-in { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
            @keyframes confetti-rise { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-110vh) rotate(720deg); opacity: 0; } }
          `}</style>
        </div>
      </OnboardingShell>
    )
  }

  if (screen === 'name') {
    return (
      <OnboardingShell dir={dir}>
        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-6">
          <div className="flex items-start gap-3 w-full">
            <img src="/mascot.png" alt="" className="w-14 h-14 object-contain flex-shrink-0" />
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
              <p className="font-display font-bold text-base text-ink">{s.name_question}</p>
            </div>
          </div>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={s.name_placeholder} autoFocus
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 font-display font-bold text-2xl text-ink outline-none focus:border-duo transition-colors text-center" />
          <button onClick={handleSaveName} disabled={!name.trim()}
            className="w-full bg-duo disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-4 shadow-[0_4px_0_#58a700] active:shadow-none active:translate-y-1 transition-all">
            {s.name_cta}
          </button>
        </div>
      </OnboardingShell>
    )
  }

  return null
}
