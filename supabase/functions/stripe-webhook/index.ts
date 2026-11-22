import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const STRIPE_SECRET_KEY     = Deno.env.get('STRIPE_SECRET_KEY')!
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = signature.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=')
      acc[k] = v
      return acc
    }, {} as Record<string, string>)

    // Reject if timestamp is older than 5 minutes
    const ts = parseInt(parts['t'], 10)
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false

    const signedPayload = `${parts['t']}.${payload}`
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig      = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
    const computed = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return computed === parts['v1']
  } catch {
    return false
  }
}

// Récupère l'abonnement chez Stripe pour avoir la date de fin de période
async function fetchSubscription(id: string) {
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${id}`, {
    headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
  })
  const sub = await res.json()
  if (!res.ok) throw new Error(sub.error?.message || 'Stripe subscription fetch failed')
  return sub
}

const toIso = (sec?: number | null) => (sec ? new Date(sec * 1000).toISOString() : null)

// Statut Stripe -> statut Numio
function mapStatus(s: string): string {
  if (s === 'active') return 'active'
  if (s === 'canceled') return 'canceled'
  if (s === 'past_due' || s === 'unpaid') return 'past_due'
  return 'incomplete'
}

serve(async (req) => {
  try {
    const payload   = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    if (!(await verifyStripeSignature(payload, signature, STRIPE_WEBHOOK_SECRET))) {
      return new Response('Invalid signature', { status: 400 })
    }

    const event = JSON.parse(payload)
    const obj   = event.data.object
    const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const ok    = () => new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

    switch (event.type) {
      // Premier paiement : on lie le client, l'abonnement et la date de fin
      case 'checkout.session.completed': {
        if (obj.mode !== 'subscription' || obj.payment_status !== 'paid' || !obj.subscription) return ok()

        const sub       = await fetchSubscription(obj.subscription)
        const periodEnd = toIso(sub.current_period_end)
        const userId    = obj.metadata?.supabase_user_id

        if (userId) {
          const { error: e1 } = await sb.rpc('set_stripe_data', {
            p_user_id: userId, p_customer_id: obj.customer,
            p_subscription_id: sub.id, p_status: 'active',
          })
          if (e1) throw e1
          const { error: e2 } = await sb.rpc('update_subscription_by_customer', {
            p_customer_id: obj.customer, p_subscription_id: sub.id,
            p_status: 'active', p_period_end: periodEnd,
          })
          if (e2) throw e2
        } else {
          // Flux « payer d'abord » : stocké pour PostPaymentSetup
          const { error } = await sb.from('pending_subscriptions').upsert({
            session_id:             obj.id,
            stripe_customer_id:     obj.customer,
            stripe_subscription_id: sub.id,
            subscription_end_date:  periodEnd,
            email:                  obj.customer_details?.email || '',
          })
          if (error) throw error
        }
        break
      }

      // Chaque paiement mensuel réussi : on prolonge la période
      case 'invoice.paid': {
        if (!obj.subscription) return ok()
        const periodEnd = obj.lines?.data?.[0]?.period?.end
        const { error } = await sb.rpc('update_subscription_by_customer', {
          p_customer_id: obj.customer, p_subscription_id: obj.subscription,
          p_status: 'active', p_period_end: toIso(periodEnd),
        })
        if (error) throw error
        break
      }

      // Échec de paiement : accès coupé jusqu'à régularisation
      case 'invoice.payment_failed': {
        if (!obj.subscription) return ok()
        const { error } = await sb.rpc('update_subscription_by_customer', {
          p_customer_id: obj.customer, p_subscription_id: obj.subscription,
          p_status: 'past_due', p_period_end: null,
        })
        if (error) throw error
        break
      }

      // Changement ou annulation : on suit le statut Stripe
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const status = event.type === 'customer.subscription.deleted' ? 'canceled' : mapStatus(obj.status)
        const { error } = await sb.rpc('update_subscription_by_customer', {
          p_customer_id: obj.customer, p_subscription_id: obj.id,
          p_status: status, p_period_end: toIso(obj.current_period_end),
        })
        if (error) throw error
        break
      }
    }

    return ok()
  } catch (err) {
    // 500 = Stripe réessaie automatiquement
    console.error('Webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
