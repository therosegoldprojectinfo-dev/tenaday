import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const WHATSAPP      = 'https://wa.me/14384102068'
const HARDCODED_URL = 'https://buy.stripe.com/fZufZh2w12kDd6u6nv1ZS06'
const EDGE_FN       = 'https://lyedpfhzrvyaskmzhyhl.supabase.co/functions/v1/create-checkout-session'

const S = {
  wrap: {
    minHeight: '100dvh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '32px 24px', background: '#fff', textAlign: 'center',
  },
  mascot: { width: 90, marginBottom: 24, animation: 'float 3s ease-in-out infinite' },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#fef3c7', border: '2px solid #fde68a',
    borderRadius: 100, padding: '6px 16px', marginBottom: 16,
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700,
    fontSize: 13, color: '#92400e',
  },
  h2: {
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800,
    fontSize: 26, color: '#1a1a2e', marginBottom: 10,
  },
  p: {
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 15,
    color: '#6b7280', marginBottom: 32, lineHeight: 1.6, maxWidth: 300,
  },
  cta: {
    display: 'block', width: '100%', maxWidth: 320,
    background: '#7c3aed', color: '#fff', textDecoration: 'none',
    borderRadius: 18, padding: '18px 0', marginBottom: 16,
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800,
    fontSize: 19, boxShadow: '0 4px 0 #5b21b6', boxSizing: 'border-box',
    border: 'none', cursor: 'pointer',
  },
  ctaDisabled: {
    opacity: 0.6, cursor: 'not-allowed',
  },
  wa: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', maxWidth: 320,
    background: '#f5f3ff', color: '#7c3aed', border: '2px solid #ede9fe',
    borderRadius: 18, padding: '14px 0', textDecoration: 'none',
    fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700,
    fontSize: 16, boxSizing: 'border-box',
  },
}

export default function Paywall() {
  const [wasTrial, setWasTrial] = useState(false)
  const [userId,   setUserId]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase
        .from('profiles')
        .select('trial_started_at, stripe_customer_id')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.trial_started_at && !data?.stripe_customer_id) setWasTrial(true)
        })
        .catch(() => {})
    })
  }, [])

  async function handlePay() {
    setError('')

    // Trial user + signed in → dynamic checkout with their user ID in metadata
    if (wasTrial && userId) {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res  = await fetch(EDGE_FN, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ supabase_user_id: userId }),
        })
        const json = await res.json()
        if (json.error) throw new Error(json.error)
        // Edge fn returns a hosted checkout URL for trial users
        window.location.href = json.url
      } catch (e) {
        console.error('Checkout error:', e)
        setError('Something went wrong. Please try again or contact support.')
        setLoading(false)
      }
      return
    }

    // Non-trial user → hardcoded link as before
    window.location.href = HARDCODED_URL
  }

  return (
    <div style={S.wrap}>
      <img src="/nav-profile.png" alt="Numio" style={S.mascot} />

      {wasTrial ? (
        <>
          <div style={S.badge}>🎉 Your free trial has ended</div>
          <h2 style={S.h2}>Hope you enjoyed Numio!</h2>
          <p style={S.p}>
            Your 7-day free trial is over. Get full access to keep generating
            quizzes and tracking your child's progress.
          </p>
        </>
      ) : (
        <>
          <h2 style={S.h2}>Your subscription has ended</h2>
          <p style={S.p}>
            Renew your Numio subscription to continue generating quizzes
            and tracking your child's progress.
          </p>
        </>
      )}

      {error && (
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 16, maxWidth: 300 }}>
          {error}
        </p>
      )}

      <button
        onClick={handlePay}
        disabled={loading}
        style={{ ...S.cta, ...(loading ? S.ctaDisabled : {}) }}>
        {loading ? 'Preparing checkout…' : (wasTrial ? 'Get full access →' : 'Renew Numio →')}
      </button>

      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={S.wa}>
        💬 Contact support
      </a>

      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
    </div>
  )
}
