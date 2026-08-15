import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export function useSubscription(onboarded) {
  const [status,     setStatus]     = useState('inactive')
  const [checked,    setChecked]    = useState(false)

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
    } catch (e) {
      console.error('Subscription check failed:', e)
    } finally {
      setChecked(true)
    }
  }

  return {
    status,
    checked,
    isActive:   checked && status === 'active',
    isInactive: checked && status !== 'active',
    refetch:    check,
  }
}
