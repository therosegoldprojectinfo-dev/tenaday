import { Component } from 'react'

const WHATSAPP = 'https://wa.me/14384102068'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, errorId: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Numio crashed:', error, info)
    try {
      const id = window.Sentry?.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } }
      })
      this.setState({ errorId: id })
    } catch (_) {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '32px 24px', textAlign: 'center', background: '#fff'
        }}>
          {/* Mascot */}
          <div style={{ marginBottom: 24, animation: 'float 3s ease-in-out infinite' }}>
            <img src="/nav-profile.png" alt="Numio" style={{ width: 100, height: 'auto' }} />
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800,
            fontSize: 26, color: '#1a1a2e', marginBottom: 10
          }}>
            Something went wrong 😅
          </h2>

          {/* Subtitle */}
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15,
            color: '#6b7280', marginBottom: 8, lineHeight: 1.6, maxWidth: 300
          }}>
            Don't worry — your progress is saved.
          </p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15,
            color: '#6b7280', marginBottom: 32, lineHeight: 1.6, maxWidth: 300
          }}>
            Tap below to reload. If the problem persists, contact us on WhatsApp.
          </p>

          {/* Reload button */}
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#7c3aed', color: '#fff', border: 'none',
              borderRadius: 18, padding: '16px 40px', marginBottom: 16,
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18,
              cursor: 'pointer', boxShadow: '0 4px 0 #5b21b6', width: '100%', maxWidth: 320,
            }}
          >
            Reload app 🔄
          </button>

          {/* WhatsApp support */}
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#f5f3ff', color: '#7c3aed', border: '2px solid #ede9fe',
              borderRadius: 18, padding: '14px 32px',
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16,
              textDecoration: 'none', width: '100%', maxWidth: 320,
              boxSizing: 'border-box',
            }}
          >
            💬 Contact support on WhatsApp
          </a>

          {this.state.errorId && (
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11,
              color: '#d1d5db', marginTop: 24
            }}>
              Error ID: {this.state.errorId}
            </p>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
