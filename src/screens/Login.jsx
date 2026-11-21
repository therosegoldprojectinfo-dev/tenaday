import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

async function derivePassword(username, password) {
  const input = `numio:${username.trim().toLowerCase()}:${password}:v3`
  const encoded = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function Login({ onSuccess }) {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!username.trim()) { setError("Entrez votre nom d'utilisateur"); return }
    if (!password)        { setError('Entrez votre mot de passe'); return }
    setLoading(true); setError('')
    try {
      const fakeEmail = `${username.trim().toLowerCase().replace(/\s+/g, '_')}@numio.app`
      const derivedPw = await derivePassword(username.trim(), password)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: fakeEmail, password: derivedPw })
      if (signInErr) { setError("Nom d'utilisateur ou mot de passe incorrect"); return }
      await onSuccess(setError)
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const waLink = `https://wa.me/14384102068?text=${encodeURIComponent("Bonjour, j'ai oublié mon mot de passe Numio. Mon nom d'utilisateur est : ")}`

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Logo — bigger */}
        <img src="/nav-logo.png" alt="Numio" style={s.logo} />

        {/* Headline */}
        <h1 style={s.headline}>Commençons !</h1>

        {/* Tab pill */}
        <div style={s.pill}>
          {['login', 'signup'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              style={{ ...s.pillBtn, ...(tab === t ? s.pillBtnOn : s.pillBtnOff) }}
            >
              {t === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        {/* ── LOGIN ── */}
        {tab === 'login' && (
          <div style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Nom d'utilisateur</label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="ex. sarah_maman"
                autoCapitalize="none"
                autoCorrect="off"
                style={s.input}
                onFocus={e => e.target.style.borderColor = '#1a202c'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Votre mot de passe"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={s.input}
                onFocus={e => e.target.style.borderColor = '#1a202c'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {error && <p style={s.error}>{error}</p>}

            <button
              onClick={handleLogin}
              disabled={loading || !username.trim() || !password}
              style={{ ...s.ctaBtn, opacity: (loading || !username.trim() || !password) ? 0.4 : 1 }}
            >
              {loading ? 'Connexion en cours…' : 'Entrer'}
            </button>

            <a href={waLink} target="_blank" rel="noopener noreferrer" style={s.forgot}>
              Mot de passe oublié ?
            </a>

            <div style={s.legal}>
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={s.legalLink}>Politique de confidentialité</a>
              <span style={s.dot}>·</span>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={s.legalLink}>Conditions d'utilisation</a>
            </div>
          </div>
        )}

        {/* ── SIGNUP ── */}
        {tab === 'signup' && (
          <div style={s.form}>
            <a
              href="https://buy.stripe.com/fZufZh2w12kDd6u6nv1ZS06"
              style={s.getBtn}
            >
              <span style={{ fontSize: 22 }}>🛒</span>
              Obtenir Numio maintenant
            </a>

            <div style={{ ...s.legal, marginTop: 20 }}>
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={s.legalLink}>Politique de confidentialité</a>
              <span style={s.dot}>·</span>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={s.legalLink}>Conditions d'utilisation</a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const RADIUS = 999   // fully pill-shaped everywhere
const BORDER = '1.5px solid #e2e8f0'

const s = {
  page: {
    minHeight: '100dvh',
    background: '#f4f5f7',
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

  /* Logo — large */
  logo: {
    height: 64,
    width: 'auto',
    marginBottom: 24,
  },

  headline: {
    fontSize: 30,
    fontWeight: 800,
    color: '#1a202c',
    margin: '0 0 28px',
    textAlign: 'center',
    letterSpacing: '-0.5px',
  },

  /* Tab pill */
  pill: {
    display: 'flex',
    background: '#e8eaed',
    borderRadius: RADIUS,
    padding: 4,
    marginBottom: 32,
    width: '100%',
    maxWidth: 310,
  },
  pillBtn: {
    flex: 1,
    padding: '11px 0',
    border: 'none',
    borderRadius: RADIUS,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
    fontFamily: 'inherit',
  },
  pillBtnOn: {
    background: '#ffffff',
    color: '#1a202c',
    boxShadow: '0 1px 8px rgba(0,0,0,0.13)',
  },
  pillBtnOff: {
    background: 'transparent',
    color: '#8a94a6',
  },

  /* Form */
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
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    paddingLeft: 4,
  },
  input: {
    width: '100%',
    padding: '15px 20px',
    borderRadius: RADIUS,          // pill-shaped inputs
    border: BORDER,
    background: '#ffffff',
    fontSize: 16,
    fontWeight: 500,
    color: '#1a202c',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  error: {
    fontSize: 13,
    color: '#e53e3e',
    fontWeight: 600,
    textAlign: 'center',
    margin: 0,
  },

  /* Primary CTA — pill, dark */
  ctaBtn: {
    width: '100%',
    padding: '17px 0',
    borderRadius: RADIUS,
    border: 'none',
    background: '#1a202c',
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    fontFamily: 'inherit',
    marginTop: 2,
  },

  forgot: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 600,
    color: '#4a6fa5',
    textDecoration: 'none',
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

  /* Signup CTA — pill, outlined like reference image 2 */
  getBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '18px 0',
    borderRadius: RADIUS,
    border: BORDER,
    background: '#ffffff',
    color: '#1a202c',
    fontSize: 17,
    fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
}
