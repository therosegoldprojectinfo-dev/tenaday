import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Numio crashed:', error, info)
    // Send to Sentry so we get alerted on production crashes
    try {
      window.Sentry?.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } }
      })
    } catch (_) {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center', background: 'white'
        }}>
          <img src="/mascot.png" alt="Numio" style={{ width: 80, marginBottom: 24 }} />
          <h2 style={{ fontFamily: 'Baloo 2, sans-serif', fontWeight: 800, fontSize: 24, color: '#1a1a2e', marginBottom: 8 }}>
            Something went wrong 😅
          </h2>
          <p style={{ fontFamily: 'Inter, sans-serif', color: '#777', marginBottom: 32, fontSize: 15 }}>
            Don't worry, your progress is saved. Tap below to reload.
          </p>
          <button
            onClick={() => {
              // Clear trial localStorage so a bad trial exam doesn't re-crash
              ;['numio_trial_exam', 'numio_trial_done', 'numio_trial_used'].forEach(k => localStorage.removeItem(k))
              window.location.reload()
            }}
            style={{
              background: '#58cc02', color: 'white', border: 'none',
              borderRadius: 16, padding: '16px 32px',
              fontFamily: 'Baloo 2, sans-serif', fontWeight: 800, fontSize: 18,
              cursor: 'pointer', boxShadow: '0 4px 0 #46a302'
            }}
          >
            Reload app 🔄
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
