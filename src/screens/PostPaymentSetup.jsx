import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { createKid, getKids } from '../lib/kids'

const WHATSAPP = 'https://wa.me/14384102068'

export default function PostPaymentSetup({ sessionId, onComplete }) {
  const [email,    setEmail]    = useState('')
  const [username, setUsername] = useState('')
  const [kidName,  setKidName]  = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // 'choose' | 'existing' | 'new'
  const [mode, setMode] = useState('choose')

  // Fire FB Purchase event once on mount
  useEffect(() => {
    try {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', {
          value:        5.00,
          currency:     'USD',
          num_items:    1,
          content_name: 'Numio Lifetime Access',
        })
      }
    } catch (e) { console.warn('FB pixel error:', e) }
  }, [])

  // Fetch email directly from Stripe via edge function
  useEffect(() => {
    if (!sessionId) return
    fetch('https://lyedpfhzrvyaskmzhyhl.supabase.co/functions/v1/get-session-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(r => r.json())
      .then(data => { if (data.email) setEmail(data.email) })
      .catch(e => console.warn('Could not fetch email:', e))
  }, [sessionId])

  const inputStyle = {
    border: '2px solid #e5e7eb', background: '#fafafa',
    width: '100%', borderRadius: 16, padding: '14px 16px',
    fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
    fontSize: 17, color: '#1a1a2e', outline: 'none', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  async function handleSubmit() {
    if (!email.trim())       { setError('Please enter your email address'); return }
    if (!username.trim())    { setError('Enter a username'); return }
    if (mode === 'new' && !kidName.trim()) { setError("Enter your child's name"); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    setError('')

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Setup is taking too long. Please tap retry.')), 30000)
    )

    try {
      await Promise.race([setupAccount(), timeout])
    } catch (e) {
      console.error('PostPaymentSetup error:', e)
      setError(e.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  async function setupAccount() {
    const hashBuffer = async (input) => {
      const encoded = new TextEncoder().encode(input)
      const buf = await crypto.subtle.digest('SHA-256', encoded)
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    }

    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_')
    const fakeEmail     = `${cleanUsername}@numio.app`
    const derivedPw     = await hashBuffer(`numio:${cleanUsername}:${password}:v3`)
    const pwHash        = await hashBuffer(`numio-pin:${password}`)

    let user = null

    if (mode === 'existing') {
      // ── EXISTING TRIAL ACCOUNT: just sign in ──
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: fakeEmail, password: derivedPw,
      })
      if (signInErr) {
        throw new Error('Wrong username or password — these should be the ones you created during your free trial.')
      }
      user = signInData?.user
    } else {
      // ── NEW ACCOUNT: sign up ──
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: fakeEmail, password: derivedPw,
      })

      if (signUpErr) {
        if (signUpErr.message?.toLowerCase().includes('already registered') ||
            signUpErr.message?.toLowerCase().includes('already been registered') ||
            signUpErr.status === 422 || signUpErr.message?.includes('{}')) {
          throw new Error('This username is already taken — try adding a number or your initial, like Osman2 or OsmanA.')
        } else {
          throw new Error(signUpErr.message)
        }
      }
      user = signUpData?.user
    }

    if (!user) throw new Error('Something went wrong creating your account. Please tap retry.')

    // ── Create profile if missing (idempotent) ──
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: user.id, display_name: username.trim(), language: 'en', stripe_email: email.trim(),
    })
    if (insertErr && insertErr.code !== '23505') throw new Error('Account setup interrupted. Tap retry — your payment is safe.')

    // Check if already subscribed
    const { data: subData } = await supabase.rpc('get_subscription_status')
    const alreadyActive = subData?.status === 'active'

    // ── Set parent PIN if not already set ──
    try {
      await supabase.rpc('set_parent_pin', { p_pin_hash: pwHash })
    } catch (_) {
      // Already set — fine
    }

    // ── Link Stripe session ──
    if (!alreadyActive) {
      const { error: linkErr } = await supabase.rpc('link_pending_subscription', {
        p_session_id: sessionId,
        p_user_id:    user.id,
      })
      if (linkErr) {
        await new Promise(r => setTimeout(r, 2000))
        await supabase.rpc('link_pending_subscription', {
          p_session_id: sessionId,
          p_user_id:    user.id,
        })
      }
    }

    // ── Kid: reuse existing or create new ──
    let kid = null
    const existingKids = await getKids().catch(() => [])
    if (existingKids && existingKids.length > 0) {
      kid = existingKids[0]
    } else {
      kid = await createKid(mode === 'existing' ? (existingKids?.[0]?.name || 'My Child') : kidName.trim())
    }

    if (!kid) throw new Error("Almost there! Tap retry to finish setting up your child's profile.")

    onComplete({ kid })
    setTimeout(() => { window.location.href = '/?subscribed=true' }, 2000)
  }

  // ─────────────────────────────────────────────
  // SCREEN: Choose mode (existing trial vs new)
  // ─────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div style={{ background: '#fff', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '40px 24px', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>

          <img src="/nav-logo.png" alt="Numio" style={{ height: 40, marginBottom: 32 }} />

          {/* Success banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, padding: 16, borderRadius: 16, background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15, color: '#15803d', margin: 0 }}>Payment successful!</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#166534', margin: 0 }}>Now let's set up your account.</p>
            </div>
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 26, color: '#1a1a2e', marginBottom: 8 }}>Did you use the free trial?</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, color: '#6b7280', marginBottom: 32, lineHeight: 1.6 }}>
            If you created an account during the 7-day trial, continue with it and <strong>keep all your quizzes, coins and progress.</strong>
          </p>

          {/* Option A — continue trial account */}
          <button
            onClick={() => setMode('existing')}
            style={{
              width: '100%', background: '#7c3aed', color: '#fff', border: 'none',
              borderRadius: 18, padding: '20px 24px', marginBottom: 14,
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17,
              cursor: 'pointer', boxShadow: '0 4px 0 #5b21b6', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
            <span>
              <span style={{ display: 'block', fontSize: 19 }}>✅ Yes, I had a trial account</span>
              <span style={{ fontWeight: 500, fontSize: 13, opacity: 0.85 }}>Keep my quizzes, coins & progress</span>
            </span>
            <span style={{ fontSize: 22 }}>→</span>
          </button>

          {/* Option B — fresh start */}
          <button
            onClick={() => setMode('new')}
            style={{
              width: '100%', background: '#fff', color: '#1a1a2e',
              border: '2px solid #e5e7eb', borderRadius: 18, padding: '20px 24px',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 17,
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
            <span>
              <span style={{ display: 'block', fontSize: 19 }}>🆕 No, start fresh</span>
              <span style={{ fontWeight: 500, fontSize: 13, color: '#6b7280' }}>Create a brand new account</span>
            </span>
            <span style={{ fontSize: 22 }}>→</span>
          </button>

        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // SCREEN: Form (existing or new, slightly different copy)
  // ─────────────────────────────────────────────
  return (
    <div style={{ background: '#fff', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>

        <div style={{ paddingTop: 40, paddingBottom: 24 }}>
          <img src="/nav-logo.png" alt="Numio" style={{ height: 40, marginBottom: 24 }} />

          {/* Back link */}
          <button
            onClick={() => { setMode('choose'); setError('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16, fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14, color: '#7c3aed' }}>
            ← Back
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: 16, borderRadius: 16, background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15, color: '#15803d', margin: 0 }}>Payment successful!</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#166534', margin: 0 }}>
                {mode === 'existing' ? 'Sign in to restore your trial progress.' : 'Set up your new account below.'}
              </p>
            </div>
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 28, color: '#1a1a2e', marginBottom: 6 }}>
            {mode === 'existing' ? 'Continue your trial account' : 'Create your account'}
          </h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, color: '#6b7280', margin: 0 }}>
            {mode === 'existing'
              ? 'Enter the username and password you used during your free trial.'
              : 'One last step — set up your login details.'}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img src="/nav-profile.png" alt="" style={{ width: 90, height: 'auto', animation: 'float 3s ease-in-out infinite' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

          {error && (
            <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#dc2626', margin: '0 0 6px 0' }}>{error}</p>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#7c3aed', textDecoration: 'underline' }}>
                💬 Contact us on WhatsApp →
              </a>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>YOUR EMAIL</label>
            <input type="email" value={email} readOnly
              placeholder="Fetching your email…" style={{ ...inputStyle, background: '#f3f4f6', color: '#6b7280', cursor: 'default' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {mode === 'existing' ? 'YOUR TRIAL USERNAME' : 'YOUR USERNAME'}
            </label>
            <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder={mode === 'existing' ? 'The username from your trial' : 'e.g. sarah_mom'}
              autoCapitalize="none" autoCorrect="off" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          {/* Only ask for kid name on new account */}
          {mode === 'new' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>YOUR CHILD'S NAME</label>
              <input type="text" value={kidName} onChange={e => { setKidName(e.target.value); setError('') }}
                placeholder="e.g. Adam" style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7c3aed'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {mode === 'existing' ? 'YOUR TRIAL PASSWORD' : 'PASSWORD'}
            </label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder={mode === 'existing' ? 'The password from your trial' : 'At least 6 characters'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: '#9ca3af', textAlign: 'center', margin: 0 }}>
            By continuing you agree to our{' '}
            <a href="/privacy.html" target="_blank" style={{ color: '#7c3aed' }}>Privacy Policy</a>
            {' '}and{' '}
            <a href="/terms.html" target="_blank" style={{ color: '#7c3aed' }}>Terms of Use</a>
          </p>

          <button onClick={handleSubmit} disabled={loading}
            style={{
              background: loading ? '#a78bfa' : '#7c3aed', color: '#fff', border: 'none',
              borderRadius: 18, padding: '18px 0', width: '100%',
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 19,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 0 #5b21b6',
              transition: 'all 0.15s',
            }}>
            {loading
              ? (mode === 'existing' ? 'Restoring your account...' : 'Setting up your account...')
              : (mode === 'existing' ? 'Restore my account →' : 'Enter Numio →')}
          </button>

          <div style={{ paddingBottom: 32 }} />
        </div>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}
