import { useState, useEffect } from 'react'

const STORAGE_KEY = 'numio_trial_banner_dismissed'
const LANDING     = '/productpage.html'

export default function TrialEndingBanner({ trialDaysLeft }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (trialDaysLeft !== 1) return
    const dismissed = localStorage.getItem(STORAGE_KEY)
    const today     = new Date().toDateString()
    if (dismissed === today) return
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [trialDaysLeft])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, new Date().toDateString())
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <div onClick={dismiss} style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.45)',
        animation: 'fadeIn 0.2s ease',
      }} />

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 1000, background: '#fff',
        borderRadius: '28px 28px 0 0',
        padding: '32px 28px 40px',
        maxWidth: 480, margin: '0 auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        textAlign: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>

        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb', margin: '0 auto 24px' }} />

        <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 10, lineHeight: 1.2 }}>
          Your free trial ends tomorrow!
        </h2>

        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, marginBottom: 28, maxWidth: 280, margin: '0 auto 28px' }}>
          Hope your child has been loving Numio 🎉<br />
          Get full access so the learning never stops.
        </p>

        <a href={LANDING} style={{
          display: 'block', width: '100%',
          background: '#7c3aed', color: '#fff',
          textDecoration: 'none', borderRadius: 18,
          padding: '18px 0', marginBottom: 12,
          fontWeight: 800, fontSize: 18,
          boxShadow: '0 4px 0 #5b21b6',
        }}>
          Get full access →
        </a>

        <button onClick={dismiss} style={{
          background: 'none', border: 'none',
          color: '#9ca3af', fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
          padding: '8px 0',
        }}>
          Maybe later
        </button>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </>
  )
}
