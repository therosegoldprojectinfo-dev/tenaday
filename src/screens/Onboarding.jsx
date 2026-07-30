import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// ── Meta Pixel helper ─────────────────────────────────────────────
function firePixel(type, event, params = {}) {
  try { if (window.fbq) window.fbq(type, event, params) } catch (_) {}
}

// ── Google Analytics helper ───────────────────────────────────────
function fireGtag(eventName, params = {}) {
  try { if (window.gtag) window.gtag('event', eventName, params) } catch (_) {}
}

export default function Onboarding({ onComplete, onLanguageChange }) {
  const [username,   setUsername]   = useState('')
  const [pin,        setPin]        = useState('')
  const [isSignIn,   setIsSignIn]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [authError,  setAuthError]  = useState('')

  // ── Crypto helpers ────────────────────────────────────────────────
  async function derivePassword(usernameRaw, pinRaw) {
    const input = `numio:${usernameRaw.trim().toLowerCase()}:${pinRaw}:v2`
    const encoded = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function hashPin(pinRaw) {
    const input = `numio-pin:${pinRaw}`
    const encoded = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // ── Sign in ───────────────────────────────────────────────────────
  async function handleSignIn() {
    if (!username.trim()) { setAuthError('Enter your username'); return }
    if (pin.length !== 4) { setAuthError('PIN must be 4 digits'); return }
    setLoading(true); setAuthError('')
    try {
      const fakeEmail = `${username.trim().toLowerCase().replace(/\s+/g, '_')}@numio.app`
      const password = await derivePassword(username, pin)
      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password })
      if (error) throw error
      onComplete(null)
    } catch {
      setAuthError('Wrong username or PIN')
    } finally { setLoading(false) }
  }

  // ── Create account ────────────────────────────────────────────────
  async function handleCreateAccount() {
    if (!username.trim()) { setAuthError('Enter a username'); return }
    if (pin.length !== 4) { setAuthError('PIN must be 4 digits'); return }
    setLoading(true); setAuthError('')
    try {
      const fakeEmail = `${username.trim().toLowerCase().replace(/\s+/g, '_')}@numio.app`
      const password = await derivePassword(username, pin)
      const { error } = await supabase.auth.signUp({ email: fakeEmail, password })
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const pinHash = await hashPin(pin)
        await supabase.from('profiles').upsert({ id: user.id, parent_pin: pinHash })
      }
      firePixel('track', 'CompleteRegistration', { content_name: 'Family Account Created' })
      fireGtag('account_created')
      onComplete(username.trim())
    } catch (e) {
      setAuthError(e.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-white w-full" style={{ minHeight: '100dvh' }}>
      <div className="w-full max-w-md mx-auto flex flex-col px-6" style={{ minHeight: '100dvh' }}>

        {/* Hero image */}
        <div className="flex-shrink-0 pt-10 pb-4">
          <img src="/onboarding-hero.png" alt="Take a photo, get a quiz" className="w-full object-contain" style={{ maxHeight: 220 }} />
        </div>

        {/* Hook */}
        <div className="flex-shrink-0 pb-6 text-center">
          <h1 className="font-display font-extrabold text-3xl text-ink">Get better at school with just a picture! 📸</h1>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4 flex-1">

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">
              {isSignIn ? 'Username' : 'Choose a username'}
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. sarah_mom"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-display font-bold text-lg text-ink outline-none focus:border-duo transition-colors"
            />
          </div>

          {/* PIN */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">4-digit PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 font-display font-bold text-2xl text-ink outline-none focus:border-duo transition-colors tracking-[1rem]"
            />
          </div>

          {/* Privacy */}
          {!isSignIn && (
            <p className="font-body text-xs text-muted text-center">
              By continuing, you agree to our{' '}
              <a href="/privacy.html" target="_blank" className="text-duo underline">Privacy Policy</a>
            </p>
          )}

          {/* Error */}
          {authError && <p className="font-body text-sm text-red-500 font-bold text-center">{authError}</p>}

          {/* CTA */}
          <button
            onClick={isSignIn ? handleSignIn : handleCreateAccount}
            disabled={loading || !username.trim() || pin.length !== 4}
            className="w-full bg-duo disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 shadow-[0_4px_0_#46a302] active:shadow-none active:translate-y-1 transition-all"
          >
            {loading ? 'Loading...' : isSignIn ? 'Log in →' : "Let's start →"}
          </button>

          {/* Toggle */}
          <button
            onClick={() => { setIsSignIn(!isSignIn); setAuthError(''); setPin('') }}
            className="w-full text-muted font-body font-bold text-sm py-2 text-center"
          >
            {isSignIn ? "Don't have an account? Create one" : 'Already have an account? Log in'}
          </button>

        </div>
      </div>
    </div>
  )
}
