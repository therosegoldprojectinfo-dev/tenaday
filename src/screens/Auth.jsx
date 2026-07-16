import { useState } from 'react'
import { signUp, logIn, AuthError } from '../lib/parentAuth'
import { trackEvent } from '../lib/analytics'
import PrivacyPolicy from './PrivacyPolicy'
import TermsAndConditions from './TermsAndConditions'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 16L6.5 10L12.5 4" />
    </svg>
  )
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

export default function Auth({ onAuthenticated, onBack }) {
  const [mode, setMode] = useState('signup')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const isSignup = mode === 'signup'
  const pinsMismatch = isSignup && pinConfirm.length === 4 && pin !== pinConfirm
  const canSubmit =
    phone.trim().length >= 7 &&
    pin.length === 4 &&
    (!isSignup || (pinConfirm.length === 4 && pin === pinConfirm)) &&
    !submitting

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const parentId = isSignup ? await signUp(phone, pin) : await logIn(phone, pin)
      trackEvent(isSignup ? 'parent_signup' : 'parent_login')
      onAuthenticated(parentId, isSignup) // isSignup=true means new account
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handlePinChange(setter) {
    return (e) => {
      const digits = e.target.value.replace(/\D/g, '').slice(0, 4)
      setter(digits)
    }
  }

  if (showPrivacy) return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
  if (showTerms) return <TermsAndConditions onBack={() => setShowTerms(false)} />

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center px-4 pt-5">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 transition-colors active:bg-gray-100"
            aria-label="Back"
          >
            <BackIcon />
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">

          {/* Brand identity — logo */}
          <div className="flex flex-col items-center mb-8">
            <img
              src="/numiologoapp.png"
              alt="Numio"
              className="h-24 w-auto object-contain"
              draggable={false}
            />
          </div>

          <h1 className="font-display font-bold text-2xl text-gray-900 text-center mb-1">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
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
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                placeholder="(555) 123-4567"
                className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 font-body text-base text-gray-900
                           focus:border-green-500 focus:outline-none transition-colors"
              />
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

            {isSignup && (
              <div>
                <label className="font-body font-bold text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={pinConfirm}
                  onChange={handlePinChange(setPinConfirm)}
                  placeholder="****"
                  className={`w-full rounded-2xl border-2 px-4 py-3.5 font-body text-base text-gray-900
                             text-center tracking-[0.5em] focus:outline-none transition-colors ${
                               pinsMismatch ? 'border-red-300' : 'border-gray-200 focus:border-green-500'
                             }`}
                />
                {pinsMismatch && (
                  <p className="font-body text-xs text-red-500 mt-1.5">PINs don't match.</p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                <p className="font-body text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-duo w-full py-4 rounded-2xl font-body font-bold text-lg tracking-wide mt-2"
            >
              {submitting ? 'PLEASE WAIT…' : isSignup ? 'CREATE ACCOUNT' : 'LOG IN'}
            </button>

            {/* Legal text — signup and login */}
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

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="font-body font-bold text-xs text-gray-400 uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google/Facebook are visible but intentionally disabled — real
              OAuth (Supabase Auth + app registration with each provider)
              is a separate, larger build phase. Phone + PIN is the only
              working method right now, matching the product spec. */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl border-2 border-gray-200 py-3.5
                         font-body font-bold text-sm text-gray-400 cursor-not-allowed opacity-60"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl border-2 border-gray-200 py-3.5
                         font-body font-bold text-sm text-gray-400 cursor-not-allowed opacity-60"
            >
              <FacebookIcon />
              Continue with Facebook
            </button>
          </div>
          <p className="font-body text-xs text-gray-300 text-center mt-3">Coming soon</p>

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
