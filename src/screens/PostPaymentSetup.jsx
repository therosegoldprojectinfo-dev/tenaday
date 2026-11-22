import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { createKid, getKids } from '../lib/kids'

const RADIUS = 999
const BORDER = '1.5px solid #e2e8f0'

async function hashBuffer(input) {
  const encoded = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

export default function PostPaymentSetup({ sessionId, onComplete }) {
  const [email,    setEmail]    = useState('')
  const [username, setUsername] = useState('')
  const [kidName,  setKidName]  = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Facebook Purchase event, une fois au chargement
  useEffect(() => {
    try {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', {
          value:        14.98,
          currency:     'USD',
          num_items:    1,
          content_name: 'Numio Monthly',
        })
      }
    } catch (e) { console.warn('FB pixel error:', e) }
  }, [])

  // Récupère le courriel directement depuis Stripe
  useEffect(() => {
    if (!sessionId) return
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-session-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(r => r.json())
      .then(data => { if (data.email) setEmail(data.email) })
      .catch(e => console.warn('Could not fetch email:', e))
  }, [sessionId])

  async function handleSubmit() {
    if (!email.trim())       { setError('Impossible de récupérer votre courriel. Réessayez.'); return }
    if (!username.trim())    { setError("Entrez un nom d'utilisateur"); return }
    if (!kidName.trim())     { setError("Entrez le prénom de votre enfant"); return }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return }

    setLoading(true)
    setError('')

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('La configuration prend trop de temps. Réessayez.')), 60000)
    )

    try {
      await Promise.race([setupAccount(), timeout])
    } catch (e) {
      console.error('PostPaymentSetup error:', e)
      setError(e.message || 'Une erreur est survenue. Réessayez.')
      setLoading(false)
    }
  }

  async function setupAccount() {
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_')
    const fakeEmail     = `${cleanUsername}@numio.app`
    const derivedPw     = await hashBuffer(`numio:${cleanUsername}:${password}:v3`)
    const pwHash        = await hashBuffer(`numio-pin:${password}`)

    // Créer le compte, ou se connecter si la tentative précédente l'a déjà créé
    let user = null
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: fakeEmail, password: derivedPw,
    })

    if (signUpErr) {
      const msg = signUpErr.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already been registered') || signUpErr.status === 422) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: fakeEmail, password: derivedPw,
        })
        if (signInErr) throw new Error("Ce nom d'utilisateur est déjà pris. Essayez un autre, par exemple avec un chiffre.")
        user = signInData?.user
      } else {
        throw new Error(signUpErr.message)
      }
    } else {
      user = signUpData?.user
    }

    if (!user) throw new Error('Un problème est survenu. Réessayez.')

    // Profil (idempotent)
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: user.id, display_name: username.trim(), language: 'fr', stripe_email: email.trim(),
    })
    if (insertErr && insertErr.code !== '23505') {
      throw new Error('Configuration interrompue. Réessayez, votre paiement est en sécurité.')
    }

    // Vérifie si l'abonnement est déjà actif
    const { data: subData } = await supabase.rpc('get_subscription_status')
    const alreadyActive = subData?.status === 'active'

    // NIP parent (ignoré s'il existe déjà)
    try {
      await supabase.rpc('set_parent_pin', { p_pin_hash: pwHash })
    } catch (_) { /* déjà défini */ }

    // Lier la session Stripe. Le webhook peut arriver quelques secondes après le retour,
    // donc on réessaie. La fonction renvoie { error: 'session_not_found' } sans lever d'erreur.
    if (!alreadyActive) {
      let linked = false
      for (let attempt = 0; attempt < 10 && !linked; attempt++) {
        const { data: linkData, error: linkErr } = await supabase.rpc('link_pending_subscription', {
          p_session_id: sessionId,
          p_user_id:    user.id,
        })
        if (!linkErr && linkData?.ok === true) {
          linked = true
        } else {
          await sleep(2000)
        }
      }
      if (!linked) {
        throw new Error('Votre paiement est en cours de confirmation. Patientez un instant puis réessayez.')
      }
    }

    // Enfant : réutiliser s'il existe, sinon le créer
    let kid = null
    const existingKids = await getKids().catch(() => [])
    if (existingKids && existingKids.length > 0) {
      kid = existingKids[0]
    } else {
      kid = await createKid(kidName.trim())
    }
    if (!kid) throw new Error("Presque terminé ! Réessayez pour finaliser le profil de votre enfant.")

    onComplete({ kid })
    setTimeout(() => { window.location.href = '/?subscribed=true' }, 2000)
  }

  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#4a5568', paddingLeft: 4 }

  const inputStyle = {
    width: '100%', padding: '15px 20px', borderRadius: RADIUS, border: BORDER,
    background: '#ffffff', fontSize: 16, fontWeight: 500, color: '#1a202c',
    outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  return (
    <div style={s.page}>
      <div style={s.card}>

        <div style={s.successBox}>
          <span style={s.successTitle}>Paiement réussi</span>
          <span style={s.successText}>Créez votre compte pour commencer.</span>
        </div>

        <h1 style={s.headline}>Créer votre compte</h1>

        <div style={s.form}>
          <div style={s.field}>
            <label style={labelStyle}>Adresse courriel</label>
            <input
              type="email"
              value={email}
              readOnly
              placeholder="Récupération de votre courriel…"
              style={{ ...inputStyle, background: '#f7f8fa', color: '#6b7280', cursor: 'default' }}
            />
          </div>

          <div style={s.field}>
            <label style={labelStyle}>Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="ex. sarah_maman"
              autoCapitalize="none"
              autoCorrect="off"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1a202c'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div style={s.field}>
            <label style={labelStyle}>Prénom de votre enfant</label>
            <input
              type="text"
              value={kidName}
              onChange={e => { setKidName(e.target.value); setError('') }}
              placeholder="ex. Adam"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1a202c'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div style={s.field}>
            <label style={labelStyle}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Au moins 6 caractères"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1a202c'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {error && <p style={s.error}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ ...s.ctaBtn, opacity: loading ? 0.4 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Configuration en cours…' : 'Entrer dans Numio'}
          </button>

          <div style={s.legal}>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={s.legalLink}>Politique de confidentialité</a>
            <span style={s.dot}>·</span>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={s.legalLink}>Conditions d'utilisation</a>
          </div>
        </div>

      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100dvh',
    background: '#ffffff',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 430,
    padding: '52px 28px 48px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  successBox: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '14px 18px',
    borderRadius: 16,
    background: '#f0fdf4',
    border: '1.5px solid #bbf7d0',
    marginBottom: 28,
    boxSizing: 'border-box',
  },
  successTitle: { fontSize: 14, fontWeight: 700, color: '#15803d' },
  successText:  { fontSize: 13, color: '#166534' },
  headline: {
    fontSize: 30,
    fontWeight: 800,
    color: '#1a202c',
    margin: '0 0 28px',
    textAlign: 'center',
    letterSpacing: '-0.5px',
    alignSelf: 'center',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },
  error: {
    fontSize: 13,
    color: '#e53e3e',
    fontWeight: 600,
    textAlign: 'center',
    margin: 0,
  },
  ctaBtn: {
    width: '100%',
    padding: '17px 0',
    borderRadius: RADIUS,
    border: 'none',
    background: '#1a202c',
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 700,
    transition: 'opacity 0.2s',
    fontFamily: 'inherit',
    marginTop: 2,
  },
  legal: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  legalLink: {
    fontSize: 12,
    color: '#9aa5b4',
    textDecoration: 'underline',
    textDecorationColor: '#d1d9e0',
  },
  dot: {
    color: '#d1d9e0',
    fontSize: 12,
  },
}
