import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export function useSubscription(onboarded) {
  const [status,       setStatus]       = useState('trial') // trial | active | expired
  const [daysLeft,     setDaysLeft]     = useState(2)
  const [subChecked,   setSubChecked]   = useState(false)

  useEffect(() => {
    if (!onboarded) return
    checkSubscription()

    // Re-check on window focus (user returns from Stripe)
    window.addEventListener('focus', checkSubscription)
    return () => window.removeEventListener('focus', checkSubscription)
  }, [onboarded])

  // Also check on URL param ?subscribed=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscribed') === 'true') {
      checkSubscription()
      window.history.replaceState({}, '', '/')
    }
  }, [])

  async function checkSubscription() {
    try {
      const { data, error } = await supabase.rpc('get_subscription_status')
      if (error) throw error
      setStatus(data.status)
      setDaysLeft(data.trial_days_left ?? 0)
    } catch (e) {
      console.error('Subscription check failed:', e)
    } finally {
      setSubChecked(true)
    }
  }

  const isBlocked = subChecked && status === 'expired'
  const isTrialEndingSoon = status === 'trial' && daysLeft <= 1

  return { status, daysLeft, subChecked, isBlocked, isTrialEndingSoon, refetch: checkSubscription }
}
