import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
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
    const sig     = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
    const computed = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return computed === parts['v1']
  } catch {
    return false
  }
}

serve(async (req) => {
  try {
    const payload   = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    const valid = await verifyStripeSignature(payload, signature, STRIPE_WEBHOOK_SECRET)
    if (!valid) return new Response('Invalid signature', { status: 400 })

    const event = JSON.parse(payload)
    const sb    = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // We only care about checkout.session.completed
    // This is a one-time payment product — no subscriptions, no invoices
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object

      // Only process fully paid sessions — ignore free trials or pending
      if (session.payment_status !== 'paid') {
        console.log('Session not paid yet, ignoring:', session.id)
        return new Response(JSON.stringify({ received: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // For one-time payments: use payment_intent as the reference ID
      // (session.subscription will be null — that's expected)
      const referenceId = session.payment_intent ?? session.id
      const userId      = session.metadata?.supabase_user_id

      if (userId) {
        // Old flow — user was logged in when they paid
        const { error } = await sb.rpc('set_stripe_data', {
          p_user_id:         userId,
          p_customer_id:     session.customer,
          p_subscription_id: referenceId,
          p_status:          'active',
        })
        if (error) {
          console.error('set_stripe_data failed:', error)
          return new Response('DB error', { status: 500 })
        }
      } else {
        // Pay-first flow — user pays before creating account
        // Store session so PostPaymentSetup can claim it via link_pending_subscription
        const { error } = await sb.from('pending_subscriptions').upsert({
          session_id:             session.id,
          stripe_customer_id:     session.customer,
          stripe_subscription_id: referenceId, // stores payment_intent ID — column name is legacy
          email:                  session.customer_details?.email || '',
        })
        if (error) {
          console.error('Failed to store pending subscription:', error)
          return new Response('DB error', { status: 500 })
        }
      }
    }

    // All other event types (charge.*, payment_intent.*, etc.) are ignored
    // We don't handle subscription events because this is a one-time payment product

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Webhook error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
