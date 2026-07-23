import { useRef, useState, useEffect } from 'react'
import { signUp, logIn, AuthError, isValidPhone } from '../lib/parentAuth'
import { trackEvent } from '../lib/analytics'
import { trackPageView } from '../lib/gtag'
import PrivacyPolicy from './PrivacyPolicy'
import TermsAndConditions from './TermsAndConditions'
import Turnstile from '../components/Turnstile'

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const EXTENDED_ARABIC_INDIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
function toAsciiDigits(str) {
  return str.replace(/[٠-٩۰-۹]/g, (ch) => {
    const arabicIdx = ARABIC_INDIC_DIGITS.indexOf(ch)
    if (arabicIdx !== -1) return String(arabicIdx)
    const extendedIdx = EXTENDED_ARABIC_INDIC_DIGITS.indexOf(ch)
    if (extendedIdx !== -1) return String(extendedIdx)
    return ch
  })
}

// ── Translations ──────────────────────────────────────────────────────────────
const T = {
  en: {
    headline: 'Help your kid get better at addition for free !',
    subheadline: 'Just 2–4 minutes a day with no extra work from you.',
    getStarted: 'GET STARTED FOR FREE',
    next: 'Next →',
    formTitle: "Let's help your kid get better",
    formTitleLogin: 'Welcome back',
    phone: 'Phone number',
    phonePlaceholder: '(555) 123-4567',
    phoneError: 'Enter a valid Canada/US or Saudi Arabia phone number.',
    pin: '4-digit PIN',
    createAccount: 'CREATE ACCOUNT',
    login: 'LOG IN',
    loading: 'PLEASE WAIT…',
    terms: 'Terms and Conditions',
    privacy: 'Privacy Policy',
    switchToLogin: 'Already have an account? Log in',
    switchToSignup: 'New here? Create an account',
    switchLang: 'العربية',
    slides: [
      { src: '/DAILY_PRA__2_.png', alt: 'Get a little better everyday' },
      { src: '/DAILY_PRA.png', alt: 'Earn coins' },
      { src: '/DAILY_PRA__1_.png',     alt: 'Exchange for real-life rewards' },
    ],
  },
  ar: {
    headline: 'ساعد طفلك على إتقان الجمع مجاناً !',
    subheadline: 'دقيقتان إلى أربع دقائق يومياً، بدون أي جهد منك.',
    getStarted: 'ابدأ مجاناً',
    next: 'التالي ←',
    formTitle: 'لنساعد طفلك على التحسّن',
    formTitleLogin: 'مرحباً بعودتك',
    phone: 'رقم الهاتف',
    phonePlaceholder: '05XXXXXXXX',
    phoneError: 'أدخل رقم هاتف سعودي أو كندي أو أمريكي صحيحاً.',
    pin: 'رمز PIN المكوّن من 4 أرقام',
    createAccount: 'إنشاء حساب',
    login: 'تسجيل الدخول',
    loading: 'يرجى الانتظار…',
    terms: 'الشروط والأحكام',
    privacy: 'سياسة الخصوصية',
    switchToLogin: 'لديك حساب بالفعل؟ سجّل الدخول',
    switchToSignup: 'جديد هنا؟ أنشئ حساباً',
    switchLang: 'English',
    slides: [
      { src: '/DAILY_PRA_AR__2_.png', alt: 'تحسّن قليلاً كل يوم' },
      { src: '/DAILY_PRA_AR.png',     alt: 'اكسب العملات' },
      { src: '/DAILY_PRA_AR__1_.png', alt: 'استبدلها بمكافآت حقيقية' },
    ],
  },
}

function PinDots({ value }) {
  return (
    <div className="flex items-center gap-3 justify-center">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="w-4 h-4 rounded-full border-2" style={{
          borderColor: i < value.length ? '#58cc02' : '#D1D5DB',
          backgroundColor: i < value.length ? '#58cc02' : 'transparent',
        }} />
      ))}
    </div>
  )
}

const PEEK = 44
const GAP  = 12

function Carousel({ slides, next, isRTL }) {
  const [active, setActive] = useState(0)
  const containerRef = useRef(null)
  const startX = useRef(null)
  const [cardWidth, setCardWidth] = useState(null)

  useEffect(() => { setActive(0) }, [slides])

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return
      setCardWidth(Math.min(containerRef.current.offsetWidth - PEEK - GAP, 340))
    }
    const t = setTimeout(measure, 30)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [])

  function onTouchStart(e) { startX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (startX.current === null) return
    const diff = startX.current - e.changedTouches[0].clientX
    if (diff > 40)  setActive(i => isRTL ? (i - 1 + slides.length) % slides.length : (i + 1) % slides.length)
    if (diff < -40) setActive(i => isRTL ? (i + 1) % slides.length : (i - 1 + slides.length) % slides.length)
    startX.current = null
  }

  const leftPad = cardWidth !== null ? (PEEK + GAP) / 2 : 0
  const offset  = cardWidth !== null ? active * (cardWidth + GAP) : 0

  return (
    <div style={{ width: '100%', paddingBottom: 40 }}>
      <div ref={containerRef} style={{ overflow: 'hidden', width: '100%' }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={{
          display: 'flex',
          paddingLeft: isRTL ? 0 : leftPad,
          paddingRight: isRTL ? leftPad : 0,
          transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
          transform: isRTL ? `translateX(${offset}px)` : `translateX(-${offset}px)`,
        }}>
          {[...slides, slides[0]].map((slide, i) => {
            const isActive = i % slides.length === active
            return (
              <div key={i} onClick={() => setActive(i % slides.length)} style={{
                flex: `0 0 ${cardWidth ?? 0}px`,
                marginRight: GAP,
                borderRadius: 24,
                overflow: 'hidden',
                transition: 'transform 0.35s, opacity 0.35s',
                transform: isActive ? 'scale(1)' : 'scale(0.93)',
                opacity: isActive ? 1 : 0.45,
                boxShadow: isActive ? '0 8px 32px rgba(0,0,0,0.13)' : 'none',
              }}>
                <img src={slide.src} alt={slide.alt}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  draggable={false} />
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: '16px 0 0' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} style={{
              width: i === active ? 24 : 8, height: 8, borderRadius: 4,
              background: i === active ? '#58cc02' : '#D1D5DB',
              border: 'none', padding: 0, cursor: 'pointer',
              transition: 'width 0.3s, background 0.3s',
            }} />
          ))}
        </div>
        <button onClick={() => setActive(i => (i + 1) % slides.length)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: "'Baloo 2', sans-serif", fontWeight: 700,
          fontSize: 14, color: '#58cc02', padding: 0,
        }}>
          {next}
        </button>
      </div>
    </div>
  )
}

export default function Auth({ onAuthenticated }) {
  const formRef = useRef(null)
  const [lang, setLang] = useState('ar')
  const [mode, setMode] = useState('signup')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)

  const t = T[lang]
  const isRTL = lang === 'ar'
  const isSignup = mode === 'signup'

  useEffect(() => {
    trackPageView('/app/auth', 'Auth')
  }, [])

  const phoneEnteredButInvalid = phone.trim().length >= 7 && !isValidPhone(phone)
  const canSubmit = isValidPhone(phone) && pin.length === 4 && !!captchaToken && !submitting

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const parentId = isSignup
        ? await signUp(phone, pin, captchaToken)
        : await logIn(phone, pin, captchaToken)
      if (isSignup) {
        trackEvent('signup_completed', { parentId, language: lang })
        // Fire Meta Pixel Lead event
        try { window.fbq('track', 'Lead') } catch (_) {}
      }
      onAuthenticated(parentId, isSignup)
    } catch (err) {
      setError(err instanceof AuthError
        ? err.message
        : (isRTL ? 'حدث خطأ ما. يرجى المحاولة مجدداً.' : 'Something went wrong. Please try again.'))
      setCaptchaToken(null)
    } finally {
      setSubmitting(false)
    }
  }

  function handlePinChange(setter) {
    return (e) => {
      const digits = toAsciiDigits(e.target.value).replace(/\D/g, '').slice(0, 4)
      setter(digits)
    }
  }

  if (showPrivacy) return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
  if (showTerms)   return <TermsAndConditions onBack={() => setShowTerms(false)} />

  return (
    <div className="min-h-screen bg-white flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── LANGUAGE SWITCHER ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end', padding: '16px 20px 0' }}>
        <button
          type="button"
          onClick={() => { setLang(l => l === 'en' ? 'ar' : 'en'); setError(null) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f3f4f6', border: 'none', borderRadius: 20,
            padding: '6px 14px', cursor: 'pointer',
            fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, fontSize: 14, color: '#374151',
          }}
        >
          {lang === 'en' ? <span style={{ fontSize: 18 }}>🇸🇦</span> : <span style={{ fontSize: 18 }}>🇺🇸</span>}
          {t.switchLang}
        </button>
      </div>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-6" style={{ paddingTop: 32 }}>
        <div className="flex items-center gap-1 mb-8" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <img src="/numio-mascot.png" alt="" style={{ width: 52, height: 52, marginRight: isRTL ? 0 : -10, marginLeft: isRTL ? -10 : 0 }} draggable={false} />
          <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 38, color: '#58cc02', letterSpacing: '-0.01em', lineHeight: 1 }}>Numio</span>
        </div>
        <h1 style={{
          fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : "'Baloo 2', sans-serif",
          fontWeight: 700, fontSize: 26, color: '#1a1a1a',
          textAlign: 'center', margin: '0 0 12px', lineHeight: 1.4, maxWidth: 320,
        }}>{t.headline}</h1>
        <p style={{
          fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : "'Inter', sans-serif",
          fontWeight: 400, fontSize: 17, color: '#6b7280',
          textAlign: 'center', margin: '0 0 28px', lineHeight: 1.6, maxWidth: 300,
        }}>{t.subheadline}</p>
        <button
          type="button"
          onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-lg tracking-wide"
          style={{ maxWidth: 360, fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined }}
        >{t.getStarted}</button>
      </div>

      {/* ── CAROUSEL ──────────────────────────────────────────────── */}
      <div style={{ paddingTop: 40, maxWidth: 480, margin: '0 auto', width: '100%' }}>
        <Carousel slides={t.slides} next={t.next} isRTL={isRTL} />
      </div>

      {/* ── AUTH FORM ──────────────────────────────────────────────── */}
      <div ref={formRef} className="flex-1 px-6 pb-10" style={{ paddingTop: 32 }}>
        <div className="w-full max-w-sm mx-auto">
          <h2 style={{
            fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined,
            fontWeight: 700, fontSize: 24, color: '#111827',
            textAlign: 'center', marginBottom: 28,
          }}>
            {isSignup ? t.formTitle : t.formTitleLogin}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label style={{ fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined, display: 'block', marginBottom: 6 }}
                className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide">
                {t.phone}
              </label>
              <input
                type="tel" inputMode="tel" autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(toAsciiDigits(e.target.value).replace(/[^0-9+\-\s()]/g, ''))}
                placeholder={t.phonePlaceholder}
                dir="ltr"
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 font-body text-base text-gray-900 focus:border-green-500 focus:outline-none transition-colors"
              />
              {phoneEnteredButInvalid && <p className="font-body text-xs text-red-500 mt-1.5">{t.phoneError}</p>}
            </div>

            <div>
              <label style={{ fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined, display: 'block', marginBottom: 6 }}
                className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide">
                {t.pin}
              </label>
              <input
                type="password" inputMode="numeric"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={pin} onChange={handlePinChange(setPin)} placeholder="****"
                dir="ltr"
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 font-body text-base text-gray-900 text-center tracking-[0.5em] focus:border-green-500 focus:outline-none transition-colors"
              />
              <div className="mt-2"><PinDots value={pin} /></div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                <p className="font-body text-sm text-red-600" style={{ fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined }}>{error}</p>
              </div>
            )}

            <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

            <button type="submit" disabled={!canSubmit}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-lg tracking-wide mt-2"
              style={{ fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined }}>
              {submitting ? t.loading : isSignup ? t.createAccount : t.login}
            </button>

            <p className="font-body text-xs text-gray-400 text-center leading-relaxed mt-1"
              style={{ fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined }}>
              {isRTL ? (
                <>
                  بالمتابعة، أنت توافق على{' '}
                  <button type="button" onClick={() => setShowTerms(true)}
                    style={{ color: '#58cc02', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', padding: 0, fontWeight: 700, textDecoration: 'underline' }}>
                    {t.terms}
                  </button>{' '}و{' '}
                  <button type="button" onClick={() => setShowPrivacy(true)}
                    style={{ color: '#58cc02', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', padding: 0, fontWeight: 700, textDecoration: 'underline' }}>
                    {t.privacy}
                  </button>
                </>
              ) : (
                <>
                  By {isSignup ? 'creating an account' : 'logging in'}, you agree to our{' '}
                  <button type="button" onClick={() => setShowTerms(true)}
                    style={{ color: '#58cc02', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', padding: 0, fontWeight: 700, textDecoration: 'underline' }}>
                    {t.terms}
                  </button>{' '}and our{' '}
                  <button type="button" onClick={() => setShowPrivacy(true)}
                    style={{ color: '#58cc02', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', padding: 0, fontWeight: 700, textDecoration: 'underline' }}>
                    {t.privacy}
                  </button>.
                </>
              )}
            </p>
          </form>

          <button type="button"
            onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(null) }}
            className="w-full text-center mt-7 font-body font-bold text-sm"
            style={{ color: '#1CB0F6', fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : undefined }}>
            {isSignup ? t.switchToLogin : t.switchToSignup}
          </button>
        </div>
      </div>
    </div>
  )
}
