import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

async function derivePassword(username, password) {
  const input = `numio:${username.trim().toLowerCase()}:${password}:v3`
  const encoded = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function Login({ onSuccess }) {
  const [tab, setTab] = useState('login') // 'login' | 'signup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!username.trim()) { setError('Entrez votre nom d\'utilisateur'); return }
    if (!password)        { setError('Entrez votre mot de passe'); return }
    setLoading(true); setError('')
    try {
      const fakeEmail = `${username.trim().toLowerCase().replace(/\s+/g, '_')}@numio.app`
      const derivedPw = await derivePassword(username.trim(), password)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: fakeEmail, password: derivedPw })
      if (signInErr) { setError('Nom d\'utilisateur ou mot de passe incorrect'); return }
      await onSuccess(setError)
    } catch {
      setError('Une erreur s\'est produite. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const waLink = `https://wa.me/14384102068?text=${encodeURIComponent('Bonjour, j\'ai oublié mon mot de passe Numio. Mon nom d\'utilisateur est : ')}`

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Logo */}
        <div style={styles.logoWrap}>
          <img src="/nav-logo.png" alt="Numio" style={styles.logo} />
        </div>

        {/* Headline */}
        <h1 style={styles.headline}>Commençons !</h1>

        {/* Tab pill */}
        <div style={styles.tabPill}>
          <button
            onClick={() => { setTab('login'); setError('') }}
            style={{ ...styles.tabBtn, ...(tab === 'login' ? styles.tabBtnActive : styles.tabBtnInactive) }}
          >
            Connexion
          </button>
          <button
            onClick={() => { setTab('signup'); setError('') }}
            style={{ ...styles.tabBtn, ...(tab === 'signup' ? styles.tabBtnActive : styles.tabBtnInactive) }}
          >
            Inscription
          </button>
        </div>

        {/* ── LOGIN TAB ── */}
        {tab === 'login' && (
          <div style={styles.form}>
            {/* Username */}
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Nom d'utilisateur</label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="ex. sarah_maman"
                autoCapitalize="none"
                autoCorrect="off"
                style={styles.input}
                onFocus={e => e.target.style.borderColor = '#4a6fa5'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Password */}
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Votre mot de passe"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={styles.input}
                onFocus={e => e.target.style.borderColor = '#4a6fa5'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            {/* CTA */}
            <button
              onClick={handleLogin}
              disabled={loading || !username.trim() || !password}
              style={{
                ...styles.ctaBtn,
                opacity: (loading || !username.trim() || !password) ? 0.45 : 1,
              }}
            >
              {loading ? 'Connexion en cours…' : 'Entrer'}
            </button>

            {/* Forgot */}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.forgot}
            >
              Mot de passe oublié ?
            </a>

            {/* Legal */}
            <div style={styles.legal}>
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={styles.legalLink}>
                Politique de confidentialité
              </a>
              <span style={styles.dot}>·</span>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={styles.legalLink}>
                Conditions d'utilisation
              </a>
            </div>
          </div>
        )}

        {/* ── SIGNUP TAB ── */}
        {tab === 'signup' && (
          <div style={styles.form}>
            <a
              href="https://buy.stripe.com/fZufZh2w12kDd6u6nv1ZS06"
              style={styles.getBtn}
            >
              <span style={styles.getBtnIcon}>🛒</span>
              Obtenir Numio maintenant
            </a>

            {/* Legal */}
            <div style={{ ...styles.legal, marginTop: 24 }}>
              <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={styles.legalLink}>
                Politique de confidentialité
              </a>
              <span style={styles.dot}>·</span>
              <a href="/terms.html" target="_blank" rel="noopener noreferrer" style={styles.legalLink}>
                Conditions d'utilisation
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

/* ── Styles ── */
const styles = {
  page: {
    minHeight: '100dvh',
    background: '#f8f9fb',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  container: {
    width: '100%',
    maxWidth: 420,
    padding: '48px 28px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoWrap: {
    marginBottom: 20,
  },
  logo: {
    height: 44,
    width: 'auto',
  },
  headline: {
    fontSize: 28,
    fontWeight: 800,
    color: '#1a202c',
    margin: '0 0 28px',
    textAlign: 'center',
    letterSpacing: '-0.5px',
  },
  /* Tab pill — mirrors the Gizmo Sign up / Sign in pill */
  tabPill: {
    display: 'flex',
    background: '#edf0f4',
    borderRadius: 999,
    padding: 4,
    marginBottom: 36,
    width: '100%',
    maxWidth: 320,
  },
  tabBtn: {
    flex: 1,
    padding: '10px 0',
    border: 'none',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
    fontFamily: 'inherit',
  },
  tabBtnActive: {
    background: '#ffffff',
    color: '#1a202c',
    boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
  },
  tabBtnInactive: {
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
  fieldWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    border: '1.5px solid #e2e8f0',
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
  ctaBtn: {
    width: '100%',
    padding: '16px 0',
    borderRadius: 14,
    border: 'none',
    background: '#4a6fa5',
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
    fontFamily: 'inherit',
    marginTop: 4,
    boxShadow: '0 3px 0 #2d4f80',
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
    marginTop: 4,
  },
  legalLink: {
    fontSize: 12,
    color: '#8a94a6',
    textDecoration: 'underline',
    textDecorationColor: '#c8d0dd',
  },
  dot: {
    color: '#c8d0dd',
    fontSize: 12,
  },

  /* Signup tab */
  getBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '18px 0',
    borderRadius: 14,
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#1a202c',
    fontSize: 17,
    fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
    marginTop: 8,
    fontFamily: 'inherit',
  },
  getBtnIcon: {
    fontSize: 20,
  },
}
