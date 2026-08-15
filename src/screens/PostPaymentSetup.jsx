import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { createKid } from '../lib/kids'

export default function PostPaymentSetup({ sessionId, onComplete }) {
  const [username, setUsername] = useState('')
  const [kidName,  setKidName]  = useState('')
  const [password, setPassword] = useState('')
  const [email,    setEmail]    = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Fetch email directly from Stripe via edge function — no race condition
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
  }

  async function handleSubmit() {
    if (!username.trim()) { setError('Enter a username'); return }
    if (!kidName.trim())  { setError("Enter your child's name"); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (!email.trim()) { setError('Please enter your email address'); return }

    setLoading(true)
    setError('')

    try {
      const hashBuffer = async (input) => {
        const encoded = new TextEncoder().encode(input)
        const buf = await crypto.subtle.digest('SHA-256', encoded)
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
      }

      const derivedPw = await hashBuffer(`numio:${username.trim().toLowerCase()}:${password}:v3`)
      const pwHash    = await hashBuffer(`numio-pin:${password}`)

      // 1. Create account using their REAL Stripe email
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email:    email,
        password: derivedPw,
      })
      if (signUpErr) throw new Error(signUpErr.message)

      // Get user from signUp response directly (avoids getUser 403)
      const user = signUpData?.user
      if (!user) throw new Error('Signup failed — please try again')

      // 2. Create profile
      const { error: insertErr } = await supabase.from('profiles').insert({
        id: user.id, display_name: username.trim(), language: 'en',
      })
      if (insertErr && insertErr.code !== '23505') throw new Error(insertErr.message)

      // 3. Set parent PIN
      await supabase.rpc('set_parent_pin', { p_pin_hash: pwHash })

      // 4. Link Stripe session → marks subscription active
      const { data: linkResult } = await supabase.rpc('link_pending_subscription', {
        p_session_id: sessionId,
        p_user_id:    user.id,
      })
      if (linkResult?.error) {
        console.warn('link_pending_subscription:', linkResult.error)
      }

      // 5. Create kid
      const kid = await createKid(kidName.trim())

      // 6. Done!
      onComplete({ kid })

    } catch (e) {
      console.error('PostPaymentSetup error:', e)
      setError(e.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white w-full flex flex-col" style={{ minHeight: '100dvh' }}>
      <div className="w-full max-w-md mx-auto flex flex-col px-6" style={{ minHeight: '100dvh' }}>

        <div className="flex-shrink-0 pt-10 pb-6">
          <img src="/nav-logo.png" alt="Numio" className="h-10 w-auto mb-6" />

          <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl" style={{ background: '#f0fdf4', border: '2px solid #bbf7d0' }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <p className="font-display font-extrabold text-base" style={{ color: '#15803d' }}>Payment successful!</p>
              <p className="font-body text-sm" style={{ color: '#166534' }}>Now set up your account to get started.</p>
            </div>
          </div>

          <h1 className="font-display font-extrabold text-3xl text-ink mb-2">Create your account</h1>
          <p className="font-body text-base text-muted">One last step — set up your login details.</p>
        </div>

        <div className="flex justify-center mb-6 flex-shrink-0">
          <div style={{ animation: 'float 3s ease-in-out infinite' }}>
            <img src="/nav-profile.png" alt="" className="w-24 h-auto" />
          </div>
        </div>

        <div className="flex flex-col gap-4 flex-1">

          {/* Email — auto-filled from Stripe, editable as fallback */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">YOUR EMAIL</label>
            <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="your@email.com"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">YOUR USERNAME</label>
            <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="e.g. sarah_mom" autoCapitalize="none" autoCorrect="off"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">YOUR CHILD'S NAME</label>
            <input type="text" value={kidName} onChange={e => { setKidName(e.target.value); setError('') }}
              placeholder="e.g. Adam"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body font-bold text-xs text-muted uppercase tracking-widest">PASSWORD</label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="At least 6 characters"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7c3aed'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>

          {error && <p className="font-body text-sm font-bold text-center" style={{ color: '#ef4444' }}>{error}</p>}

          <p className="font-body text-xs text-muted text-center">
            By continuing you agree to our{' '}
            <a href="/privacy.html" target="_blank" className="underline" style={{ color: '#7c3aed' }}>Privacy Policy</a>
            {' '}and{' '}
            <a href="/terms.html" target="_blank" className="underline" style={{ color: '#7c3aed' }}>Terms of Use</a>
          </p>

          <button onClick={handleSubmit}
            disabled={loading || !username.trim() || !kidName.trim() || password.length < 6 || !email.trim()}
            className="w-full disabled:opacity-40 text-white font-display font-bold text-xl rounded-2xl py-5 transition-all active:scale-95"
            style={{ background: '#7c3aed', boxShadow: '0 4px 0 #5b21b6' }}>
            {loading ? 'Setting up your account...' : 'Enter Numio →'}
          </button>
        </div>

        <div className="pb-8" />
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}
