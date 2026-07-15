import { useEffect } from 'react'

export default function PrivacyPolicy({ onBack }) {
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
          Privacy Policy
        </h1>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 24px 48px', flex: 1 }}>
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>
          Last updated: July 2026
        </p>

        <Section title="What we collect">
          We collect only what is necessary to run the app:
          <ul>
            <li>Parent phone number (used to create and access your account)</li>
            <li>Parent PIN (stored encrypted — we cannot read it)</li>
            <li>Child's first name and age</li>
            <li>Child's learning progress (activities, coins, streaks)</li>
          </ul>
          <br />
          We do <strong>not</strong> collect payment information, email addresses, location data, or device identifiers.
        </Section>

        <Section title="How we use your information">
          We use your information solely to run the app — managing your account, tracking your child's progress, and displaying stats in the parent dashboard. We do not use your information for advertising. We do not sell your information to anyone. Ever.
        </Section>

        <Section title="Children's privacy">
          Numio is designed for children aged 6 to 10, used under parental supervision. Parents create accounts and set up their child's profile. We do not knowingly collect information directly from children without parental consent. If you believe we have collected information about a child without proper consent, contact us and we will delete it immediately.
        </Section>

        <Section title="How we protect your data">
          <ul>
            <li>Parent PINs are encrypted using PBKDF2 hashing. We cannot read your PIN — ever.</li>
            <li>Parent account data is protected by server-side security. No third party can read your phone number through our API.</li>
            <li>All data is transmitted over HTTPS.</li>
          </ul>
        </Section>

        <Section title="Data sharing">
          We do not share your personal information with third parties, except for the infrastructure services required to operate the app (Supabase for database hosting, Vercel for app hosting). These providers do not use your data for any other purpose.
        </Section>

        <Section title="Data retention">
          We retain your data as long as your account is active. To delete your account and all associated data, contact us at <strong>WhatsApp: +1 438 410 2068</strong> and we will delete everything within 7 days.
        </Section>

        <Section title="Your rights">
          You have the right to access, correct, or delete the data we hold about you, and to withdraw consent at any time by deleting your account.
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
