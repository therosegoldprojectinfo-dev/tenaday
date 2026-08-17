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
    if (!kidName.trim())     { setError("Enter your child's name"); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    setError('')

    // Hard 30s timeout — if anything hangs, user sees error + retry instead of infinite spinner
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
    return
  }

  async function setupAccount() {
    try {
      const hashBuffer = async (input) => {
        const encoded = new TextEncoder().encode(input)
        const buf = await crypto.subtle.digest('SHA-256', encoded)
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
      }

      const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_')
      const fakeEmail     = `${cleanUsername}@numio.app`
      const derivedPw     = await hashBuffer(`numio:${cleanUsername}:${password}:v3`)
      const pwHash        = await hashBuffer(`numio-pin:${password}`)

      // ── STEP 1: Sign up directly — handle existing user gracefully ──
      let user = null
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: fakeEmail, password: derivedPw,
      })

      if (signUpErr) {
        if (signUpErr.message?.toLowerCase().includes('already registered') ||
            signUpErr.message?.toLowerCase().includes('already been registered') ||
            signUpErr.status === 422 || signUpErr.message?.includes('{}')) {
          // Try signing in — if it works, this user already set up their account
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: fakeEmail, password: derivedPw,
          })
          if (signInErr) {
            // Sign in failed = username is taken by someone else
            throw new Error('This username is already taken — try adding a number or your initial, like Osman2 or OsmanA.')
          }
          user = signInData?.user
        } else {
          throw new Error(signUpErr.message)
        }
      } else {
        user = signUpData?.user
      }

      if (!user) throw new Error('Something went wrong creating your account. Please tap retry.')

      // ── STEP 2: Create profile if missing (idempotent) ──
      // Insert — 23505 conflict means profile already exists, that's fine
      const { error: insertErr } = await supabase.from('profiles').insert({
        id: user.id, display_name: username.trim(), language: 'en', stripe_email: email.trim(),
      })
      if (insertErr && insertErr.code !== '23505') throw new Error('Account setup interrupted. Tap retry — your payment is safe.')

      // Check if already subscribed via RPC (respects RLS properly)
      const { data: subData } = await supabase.rpc('get_subscription_status')
      const alreadyActive = subData?.status === 'active'

      // ── STEP 3: Set parent PIN if not already set (idempotent) ──
      try {
        await supabase.rpc('set_parent_pin', { p_pin_hash: pwHash })
      } catch (_) {
        // Already set — fine, continue
      }

      // ── STEP 4: Link Stripe session ──
      // Stripe ALWAYS delivers the webhook — just sometimes takes a few seconds.
      // So we try to link, and if session_not_found we let them in anyway.
      // The webhook will fire shortly and set subscription_status = active automatically.
      // alreadyActive already determined above
      if (!alreadyActive) {
        const { data: linkResult, error: linkErr } = await supabase.rpc('link_pending_subscription', {
          p_session_id: sessionId,
          p_user_id:    user.id,
        })

        if (linkErr) {
          // DB error — retry once after 2s
          await new Promise(r => setTimeout(r, 2000))
          await supabase.rpc('link_pending_subscription', {
            p_session_id: sessionId,
            p_user_id:    user.id,
          })
          // Either way — let them in. Webhook will activate subscription shortly.
        }
        // session_not_found = webhook not fired yet — let them in, webhook is coming
      }

      // ── STEP 5: Create kid if none exists (idempotent) ──
      let kid = null
      const existingKids = await getKids().catch(() => [])
      if (existingKids && existingKids.length > 0) {
        kid = existingKids[0]
      } else {
        kid = await createKid(kidName.trim())
      }

      if (!kid) throw new Error('Almost there! Tap retry to finish setting up your child\'s profile.')

      // ── Done! ──
      onComplete({ kid })

      // Fallback: if onComplete doesn't navigate within 2s, force reload
      setTimeout(() => {
        window.location.href = '/?subscribed=true'
      }, 2000)

    } catch (e) {
      throw e
    }
  }

  return (
    <div style={{ background: '#fff', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>

        <div style={{ paddingTop: 40, paddingBottom: 24 }}>
          <img src="/nav-logo.png" alt="Numio" style={{ height: 40, marginBottom: 24 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: 16, borderRadius: 16, background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 15, color: '#15803d', margin: 0 }}>Payment successful!</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: '#166534', margin: 0 }}>Now set up your account to get started.</p>
            </div>
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 28, color: '#1a1a2e', marginBottom: 6 }}>Create your account</h1>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, color: '#6b7280', margin: 0 }}>One last step — set up your login details.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <img src="/nav-profile.png" alt="" style={{ width: 90, height: 'auto', animation: 'float 3s ease-in-out infinite' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

          {error && (
            <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#dc2626', margin: '0 0 6px 0' }}>{error}</p>
              {error.length > 0 && (
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: 700, color: '#7c3aed', textDecoration: 'underline' }}>
                  💬 Contact us on WhatsApp →
                </a>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>YOUR EMAIL</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="your@email.com" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>YOUR USERNAME</label>
            <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="e.g. sarah_mom" autoCapitalize="none" autoCorrect="off" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>YOUR CHILD'S NAME</label>
            <input type="text" value={kidName} onChange={e => { setKidName(e.target.value); setError('') }}
              placeholder="e.g. Adam" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="At least 6 characters"
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
            {loading ? 'Setting up your account...' : 'Enter Numio →'}
          </button>

          <div style={{ paddingBottom: 32 }} />
        </div>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}
