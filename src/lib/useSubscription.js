import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export function useSubscription(onboarded) {
  const [status,  setStatus]  = useState('inactive')
  const [checked, setChecked] = useState(false)
  const [endsAt,  setEndsAt]  = useState(null)

  useEffect(() => {
    if (!onboarded) return
    check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [onboarded])

  // Retour de Stripe
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
      setEndsAt(data.ends_at ? new Date(data.ends_at) : null)
    } catch (e) {
      console.error('Subscription check failed:', e)
    } finally {
      setChecked(true)
    }
  }

  return {
    status,
    checked,
    endsAt,
    isActive:   checked && status === 'active',
    isInactive: checked && status !== 'active',
    refetch:    check,
  }
}
