import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export function useSubscription(onboarded) {
  const [status,       setStatus]       = useState('inactive')
  const [checked,      setChecked]      = useState(false)
  const [isTrial,      setIsTrial]      = useState(false)
  const [trialEndsAt,  setTrialEndsAt]  = useState(null)
  const [trialDaysLeft, setTrialDaysLeft] = useState(null)

  useEffect(() => {
    if (!onboarded) return
    check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [onboarded])

  // Handle return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscribed') === 'true') {
      check()
      window.history.replaceState({}, '', '/')
    }
  }, [])

  async function check() {
    try {
      const { data, error } = await supabase.rpc('get_subscription_status')
      if (error) throw error

      setStatus(data.status)

      const trial = data.trial === true
      setIsTrial(trial)

      if (trial && data.trial_ends_at) {
        const endsAt = new Date(data.trial_ends_at)
        setTrialEndsAt(endsAt)

        const now       = new Date()
        const msLeft    = endsAt - now
        const daysLeft  = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
        setTrialDaysLeft(Math.max(0, daysLeft))
      } else {
        setTrialEndsAt(null)
        setTrialDaysLeft(null)
      }
    } catch (e) {
      console.error('Subscription check failed:', e)
    } finally {
      setChecked(true)
    }
  }

  return {
    status,
    checked,
    isTrial,
    trialEndsAt,
    trialDaysLeft,
    isActive:   checked && status === 'active',
    isInactive: checked && status !== 'active',
    refetch:    check,
  }
}
