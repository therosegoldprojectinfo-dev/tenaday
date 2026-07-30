import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function firePixel(type, event, params = {}) {
  try { if (window.fbq) window.fbq(type, event, params) } catch (_) {}
}
function fireGtag(eventName, params = {}) {
  try { if (window.gtag) window.gtag('event', eventName, params) } catch (_) {}
}

export default function Onboarding({ onComplete }) {
  const [screen,    setScreen]   = useState('account')
  const [username,  setUsername] = useState('')
  const [pin,       setPin]      = useState('')
  const [isSignIn,  setIsSignIn] = useState(false)
  const [loading,   setLoading]  = useState(false)
  const [authError, setAuthError] = useState('')
  const [savedName, setSavedName] = useState('')

  async function derivePassword(usernameRaw, pinRaw) {
    const input = `numio:${usernameRaw.trim().toLowerCase()}:${pinRaw}:v2`
    const encoded = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function hashPin(pinRaw) {
    const input = `numio-pin:${pinRaw}`
    const encoded = new TextEncoder().encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

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
        await supabase.from('profiles').upsert({
          id: user.id,
          parent_pin: pinHash,
          display_name: username.trim(),
        })
      }
      firePixel('track', 'CompleteRegistration', { content_name: 'Try For Free' })
      fireGtag('account_created')
      setSavedName(username.trim())
      setScreen('how')
    } catch (e) {
      setAuthError(e.message || 'Something went wrong')
    } finally { setLoading(false) }
  }

  // ── HOW IT WORKS ──────────────────────────────────────────────────
  if (screen === 'how') {
    return (
      <div className="bg-white w-full" style={{ minHeight: '100dvh' }}>
        <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center px-6 gap-8" style={{ minHeight: '100dvh' }}>
          <img src="/mascot.png" alt="Numio" className="w-28 h-auto" />
          <div className="text-center">
            <h1 className="font-display font-extrabold text-3xl text-ink mb-1">Here's how it works</h1>
            <p className="font-body text-muted text-base">3 simple steps 🚀</p>
          </div>
          <div className="flex flex-col gap-4 w-full">
            {[
              { icon: '📸', title: 'Take a picture', desc: 'Snap any textbook page or notes.' },
              { icon: '🧠', title: 'Practice', desc: 'Answer a quiz Numio built just for you.' },
              { icon: '🎁', title: 'Earn & claim rewards', desc: 'Collect coins and claim rewards set by your parents.' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-2xl px-5 py-4">
                <span style={{ fontSize: 36 }}>{step.icon}</span>
                <div>
                  <p className="font-display font-bold text-base text-ink">{step.title}</p>
                  <p className="font-body text-sm text-muted">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => onComplete(savedName)}
            className="w-full bg-duo text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
            style={{ boxShadow: '0 4px 0 #46a302' }}
          >
            Let's start 🚀
          </button>
        </div>
      </div>
    )
  }

  // ── ACCOUNT SCREEN ────────────────────────────────────────────────
  return (
    <div className="bg-white w-full" style={{ minHeight: '100dvh' }}>
      <div className="w-full max-w-md mx-auto flex flex-col px-6" style={{ minHeight: '100dvh' }}>

        {/* Hook */}
        <div className="flex-shrink-0 pt-10 pb-4 text-center">
          <h1 className="font-display font-extrabold text-3xl text-ink">Get better at school with just a picture! 📸</h1>
        </div>

        {/* Hero image */}
        <div className="flex-shrink-0 pb-4">
          <img src="/onboarding-hero.png" alt="Take a photo, get a quiz" className="w-full object-contain" style={{ maxHeight: 200 }} />
        </div>

        {/* Mascot bubble */}
        <div className="flex items-start gap-3 mb-6">
          <img src="/mascot.png" alt="" className="w-14 h-14 object-contain flex-shrink-0" />
          <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3">
            <p className="font-display font-bold text-base text-ink">
              {isSignIn ? 'Welcome back! 👋' : 'Select a username to try Numio for free. — No email needed'}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
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

          {!isSignIn && (
            <p className="font-body text-xs text-muted text-center">
              By continuing, you agree to our{' '}
              <a href="/privacy.html" target="_blank" className="text-duo underline">Privacy Policy</a>
            </p>
          )}

          {authError && <p className="font-body text-sm text-red-500 font-bold text-center">{authError}</p>}

          <button
            onClick={isSignIn ? handleSignIn : handleCreateAccount}
            disabled={loading || !username.trim() || pin.length !== 4}
            className="w-full bg-duo disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:translate-y-1"
            style={{ boxShadow: '0 4px 0 #46a302' }}
          >
            {loading ? 'Loading...' : isSignIn ? 'Log in →' : "Try for free now →"}
          </button>

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
