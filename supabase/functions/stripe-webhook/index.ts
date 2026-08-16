import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY     = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',').reduce((acc, part) => {
      const [k, v] = part.split('='); acc[k] = v; return acc
    }, {} as Record<string, string>)

    // Reject if timestamp is older than 5 minutes
    const ts = parseInt(parts['t'], 10)
    if (Math.abs(Date.now() / 1000 - ts) > 300) return false

    const signedPayload = `${parts['t']}.${payload}`
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    return computed === parts['v1']
  } catch { return false }
}

// Resolve user_id from stripe_customer_id — works even when metadata is missing
async function getUserIdByCustomer(sb: any, customerId: string): Promise<string | null> {
  const { data } = await sb
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()
  return data?.id || null
}

serve(async (req) => {
  try {
    const payload   = await req.text()
    const signature = req.headers.get('stripe-signature') || ''
    const valid     = await verifyStripeSignature(payload, signature, STRIPE_WEBHOOK_SECRET)
    if (!valid) return new Response('Invalid signature', { status: 400 })

    const event = JSON.parse(payload)
    const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object
        const userId  = session.metadata?.supabase_user_id

        if (userId) {
          // Old flow — direct link
          await sb.rpc('set_stripe_data', {
            p_user_id:         userId,
            p_customer_id:     session.customer,
            p_subscription_id: session.subscription,
            p_status:          'active',
          })
        } else {
          // New pay-first flow — store as pending for PostPaymentSetup to claim
          const { error } = await sb.from('pending_subscriptions').upsert({
            session_id:             session.id,
            stripe_customer_id:     session.customer,
            stripe_subscription_id: session.subscription,
            email:                  session.customer_details?.email || '',
          })
          if (error) {
            console.error('Failed to store pending subscription:', error)
            return new Response('DB error', { status: 500 }) // Make Stripe retry
          }
        }
        break
      }

      case 'invoice.paid': {
        const invoice  = event.data.object
        const customerId = invoice.customer
        // Resolve by customer_id — works without metadata
        const userId = await getUserIdByCustomer(sb, customerId)
        if (!userId) break
        const { error } = await sb.rpc('set_stripe_data', {
          p_user_id:         userId,
          p_customer_id:     customerId,
          p_subscription_id: invoice.subscription,
          p_status:          'active',
        })
        if (error) {
          console.error('invoice.paid set_stripe_data failed:', error)
          return new Response('DB error', { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const sub      = event.data.object
        const userId   = await getUserIdByCustomer(sb, sub.customer)
        if (!userId) break
        const { error } = await sb.from('profiles')
          .update({ subscription_status: 'inactive' })
          .eq('id', userId)
        if (error) {
          console.error('subscription revoke failed:', error)
          return new Response('DB error', { status: 500 })
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub    = event.data.object
        const userId = await getUserIdByCustomer(sb, sub.customer)
        if (!userId) break
        const { error } = await sb.from('profiles')
          .update({ subscription_status: sub.status === 'active' ? 'active' : 'inactive' })
          .eq('id', userId)
        if (error) {
          console.error('subscription update failed:', error)
          return new Response('DB error', { status: 500 })
        }
        break
      }

      case 'invoice.payment_failed': {
        // Grace period — don't immediately revoke, let Stripe retry
        // If it keeps failing, customer.subscription.updated will fire with status != active
        const invoice = event.data.object
        console.log('Payment failed for customer:', invoice.customer)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('Webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
