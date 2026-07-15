import { useEffect } from 'react'

export default function TermsAndConditions({ onBack }) {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div style={{
      minHeight: '100dvh', background: '#fff',
      fontFamily: "'Baloo 2', sans-serif",
      maxWidth: 480, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: '1px solid #f3f4f6',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 22, color: '#6b7280', padding: 0, lineHeight: 1,
        }}>←</button>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>
          Terms and Conditions
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 24px 48px', flex: 1 }}>
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>
          Last updated: July 2026
        </p>

        <Section title="About Numio">
          Numiomath.app ("Numio") is a math learning application for children aged 6 to 10, designed to be used under parental supervision. The app is operated independently at numiomath.app.
        </Section>

        <Section title="Who can use Numio">
          <ul>
            <li>Numio is intended for children aged 6 to 10.</li>
            <li>A parent or legal guardian must create the account.</li>
            <li>By creating an account, you confirm that you are the parent or legal guardian of the child using the app.</li>
            <li>You are responsible for your child's use of the app.</li>
          </ul>
        </Section>

        <Section title="Accounts">
          One parent account can have multiple child profiles. You are responsible for keeping your PIN secure and for all activity that occurs under your account. If you believe your account has been compromised, contact us immediately.
        </Section>

        <Section title="What Numio provides">
          Numio provides daily math learning activities for children, a coin-based reward system tied to real-world rewards set by the parent, progress tracking, and a streak system to encourage daily practice.
          <br /><br />
          Numio does not provide guaranteed academic outcomes, certified tutoring, or any curriculum approved by any educational authority.
        </Section>

        <Section title="The reward system">
          Parents set up rewards in the app. Children earn coins by completing activities and can redeem them for parent-created rewards. Numio is not responsible for the fulfillment of rewards — that is between you and your child. We do not handle any payments for rewards.
        </Section>

        <Section title="Acceptable use">
          You agree not to attempt to hack or tamper with the app, create fake accounts, or use the app in any way that could harm children.
        </Section>

        <Section title="Availability">
          We do our best to keep Numio available at all times but do not guarantee uninterrupted access. We may update or temporarily take down the app without notice.
        </Section>

        <Section title="Intellectual property">
          All content in Numio — including the mascot character, design, name, and code — is owned by numiomath.app. You may not copy, reproduce, or distribute any part of the app without permission.
        </Section>

        <Section title="Governing law">
          These Terms are governed by the laws of the Province of Quebec, Canada.
        </Section>

        <Section title="Contact us">
          Questions? Reach us on WhatsApp:{'\n'}
          <strong>WhatsApp: +1 438 410 2068</strong>{'\n'}
          numiomath.app
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontSize: 15, fontWeight: 800, color: '#1a1a1a',
        marginBottom: 8,
      }}>{title}</h2>
      <div style={{
        fontSize: 14, color: '#4b5563', lineHeight: 1.7,
      }}>
        {children}
      </div>
    </div>
  )
}
