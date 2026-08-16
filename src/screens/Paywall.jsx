const WHATSAPP = 'https://wa.me/14384104068'
const LANDING  = '/landingpage.html'

export default function Paywall() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: '#fff', textAlign: 'center' }}>

      <img src="/nav-profile.png" alt="Numio" style={{ width: 90, marginBottom: 24, animation: 'float 3s ease-in-out infinite' }} />

      <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 26, color: '#1a1a2e', marginBottom: 10 }}>
        Your subscription has ended
      </h2>

      <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15, color: '#6b7280', marginBottom: 32, lineHeight: 1.6, maxWidth: 300 }}>
        Renew your Numio subscription to continue generating quizzes and tracking your child's progress.
      </p>

      {/* Renew button */}
      <a href={LANDING}
        style={{
          display: 'block', width: '100%', maxWidth: 320,
          background: '#7c3aed', color: '#fff', textDecoration: 'none',
          borderRadius: 18, padding: '18px 0', marginBottom: 16,
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 19,
          boxShadow: '0 4px 0 #5b21b6', boxSizing: 'border-box',
        }}>
        Renew Numio →
      </a>

      {/* WhatsApp support */}
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', maxWidth: 320,
          background: '#f5f3ff', color: '#7c3aed', border: '2px solid #ede9fe',
          borderRadius: 18, padding: '14px 0', textDecoration: 'none',
          fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 16,
          boxSizing: 'border-box',
        }}>
        💬 Contact support
      </a>

      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}
