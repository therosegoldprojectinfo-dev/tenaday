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

function PinDots({ value }) {
  return (
    <div className="flex items-center gap-3 justify-center">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full border-2"
          style={{
            borderColor: i < value.length ? '#58cc02' : '#D1D5DB',
            backgroundColor: i < value.length ? '#58cc02' : 'transparent',
          }}
        />
      ))}
    </div>
  )
}

// Carousel slides — practice → earn coins → real rewards
const SLIDES = [
  { src: '/DAILY_PRA__2_.png', alt: 'Daily practice screen' },
  { src: '/DAILY_PRA__1_.png', alt: 'Earn coins screen' },
  { src: '/DAILY_PRA.png',     alt: 'Real-life rewards screen' },
]

function Carousel({ onCTA }) {
  const [active, setActive] = useState(0)
  const startX = useRef(null)

  function onTouchStart(e) { startX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (startX.current === null) return
    const diff = startX.current - e.changedTouches[0].clientX
    if (diff > 40) setActive(i => (i + 1) % SLIDES.length)
    if (diff < -40) setActive(i => (i - 1 + SLIDES.length) % SLIDES.length)
    startX.current = null
  }

  return (
    <div style={{ width: '100%', paddingBottom: 40 }}>

      {/* Slide track — centered active card, peek on sides */}
      <div
        style={{ overflow: 'hidden', width: '100%', cursor: 'grab' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
            transform: `translateX(calc(50% - 39vw - ${active * (78 + 3)}vw))`,
          }}
        >
          {[...SLIDES, SLIDES[0]].map((slide, i) => (
            <div
              key={i}
              onClick={() => setActive(i % SLIDES.length)}
              style={{
                flex: '0 0 78vw',
                maxWidth: 300,
                marginRight: '3vw',
                borderRadius: 24,
                overflow: 'hidden',
                transition: 'transform 0.35s, opacity 0.35s',
                transform: i % SLIDES.length === active ? 'scale(1)' : 'scale(0.92)',
                opacity: i % SLIDES.length === active ? 1 : 0.45,
                boxShadow: i % SLIDES.length === active ? '0 8px 32px rgba(0,0,0,0.13)' : 'none',
              }}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots + next hint */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: '16px 0 24px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                width: i === active ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === active ? '#58cc02' : '#D1D5DB',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          ))}
        </div>
        {true && (
          <button
            onClick={() => setActive(i => (i + 1) % SLIDES.length)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: '#58cc02',
              padding: 0,
            }}
          >
            Next →
          </button>
        )}
      </div>

      {/* CTA button — scrolls to form */}
      <div style={{ padding: '0 24px' }}>
        <button
          type="button"
          onClick={onCTA}
          className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-lg tracking-wide"
        >
          CREATE YOUR FREE ACCOUNT
        </button>
      </div>
    </div>
  )
}

export default function Auth({ onAuthenticated, onBack }) {
  const carouselRef = useRef(null)
  const formRef = useRef(null)
  const [mode, setMode] = useState('signup')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)

  useEffect(() => {
    trackPageView('/app/auth', 'Auth')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isSignup = mode === 'signup'
  const phoneEnteredButInvalid = phone.trim().length >= 7 && !isValidPhone(phone)
  const canSubmit =
    isValidPhone(phone) &&
    pin.length === 4 &&
    !!captchaToken &&
    !submitting

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const parentId = isSignup ? await signUp(phone, pin, captchaToken) : await logIn(phone, pin, captchaToken)
      if (isSignup) trackEvent('signup_completed', { parentId })
      onAuthenticated(parentId, isSignup)
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
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

  function scrollToCarousel() {
    carouselRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (showPrivacy) return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
  if (showTerms) return <TermsAndConditions onBack={() => setShowTerms(false)} />

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── HERO SECTION — fills 100dvh ───────────────────────────── */}
      <div className="flex flex-col items-center px-6 pt-10 pb-8" style={{ minHeight: '100dvh', justifyContent: 'center' }}>

        {/* Logo + wordmark */}
        <div className="flex items-center gap-1 mb-6">
          <img
            src="/numio-mascot.png"
            alt=""
            style={{ width: 52, height: 52, marginRight: -10 }}
            draggable={false}
          />
          <span style={{
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 38,
            color: '#58cc02',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}>
            Numio
          </span>
        </div>

        {/* Hero illustration */}
        <img
          src="/hero-illustration.png"
          alt="Numio mascot with coins and a phone showing the app"
          style={{ width: '100%', maxWidth: 300, height: 'auto', display: 'block' }}
          draggable={false}
        />

        {/* Headline */}
        <h1 style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700,
          fontSize: 28,
          color: '#1a1a1a',
          textAlign: 'center',
          margin: '12px 0 8px',
          lineHeight: 1.3,
          maxWidth: 300,
        }}>
          Help your kid get better at addition for free 👀
        </h1>

        {/* Subheadline */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 400,
          fontSize: 18,
          color: '#6b7280',
          textAlign: 'center',
          margin: '0 0 24px',
          lineHeight: 1.5,
          maxWidth: 280,
        }}>
          Just 2–4 minutes a day with no extra work from you.
        </p>

        {/* SEE HOW IT WORKS — scrolls to carousel */}
        <button
          type="button"
          onClick={scrollToCarousel}
          className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-lg tracking-wide"
          style={{ maxWidth: 360 }}
        >
          SEE HOW IT WORKS
        </button>
      </div>

      {/* ── CAROUSEL SECTION ───────────────────────────────────────── */}
      <div ref={carouselRef} style={{ paddingTop: 40 }}>
        <p style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 700,
          fontSize: 20,
          color: '#1a1a1a',
          textAlign: 'center',
          margin: '0 0 24px',
        }}>
          Here's how Numio works 👇
        </p>
        <Carousel onCTA={scrollToForm} />
      </div>

      {/* ── DIVIDER ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6" style={{ maxWidth: 420, margin: '0 auto 32px', width: '100%' }}>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="font-body font-bold text-xs text-gray-400 uppercase tracking-wide">Join the Numio family</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* ── AUTH FORM SECTION ──────────────────────────────────────── */}
      <div ref={formRef} className="flex-1 px-6 pb-10">
        <div className="w-full max-w-sm mx-auto">

          <h2 className="font-display font-bold text-2xl text-gray-900 text-center mb-1">
            {isSignup ? 'Join the Numio family' : 'Welcome back'}
          </h2>
          <p className="font-body text-sm text-gray-400 text-center mb-7">
            {isSignup
              ? 'A parent account lets you add and manage your kids\u2019 profiles.'
              : 'Log in with your phone number and PIN.'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">
                Phone number
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(toAsciiDigits(e.target.value).replace(/[^0-9+\-\s()]/g, ''))}
                placeholder="(555) 123-4567"
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 font-body text-base text-gray-900
                           focus:border-green-500 focus:outline-none transition-colors"
              />
              {phoneEnteredButInvalid && (
                <p className="font-body text-xs text-red-500 mt-1.5">
                  Enter a valid Canada/US or Saudi Arabia phone number.
                </p>
              )}
            </div>

            <div>
              <label className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">
                4-digit PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={pin}
                onChange={handlePinChange(setPin)}
                placeholder="****"
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 font-body text-base text-gray-900
                           text-center tracking-[0.5em] focus:border-green-500 focus:outline-none transition-colors"
              />
              <div className="mt-2">
                <PinDots value={pin} />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                <p className="font-body text-sm text-red-600">{error}</p>
              </div>
            )}

            <Turnstile
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken(null)}
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-lg tracking-wide mt-2"
            >
              {submitting ? 'PLEASE WAIT…' : isSignup ? 'CREATE ACCOUNT' : 'LOG IN'}
            </button>

            <p className="font-body text-xs text-gray-400 text-center leading-relaxed mt-1">
              By {isSignup ? 'creating an account' : 'logging in'}, you agree to our{' '}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="font-bold underline"
                style={{ color: '#58cc02', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}
              >
                Terms and Conditions
              </button>
              {' '}and our{' '}
              <button
                type="button"
                onClick={() => setShowPrivacy(true)}
                className="font-bold underline"
                style={{ color: '#58cc02', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}
              >
                Privacy Policy
              </button>
              .
            </p>
          </form>

          <button
            type="button"
            onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(null) }}
            className="w-full text-center mt-7 font-body font-bold text-sm"
            style={{ color: '#1CB0F6' }}
          >
            {isSignup ? 'Already have an account? Log in' : 'New here? Create an account'}
          </button>
        </div>
      </div>
    </div>
  )
}
