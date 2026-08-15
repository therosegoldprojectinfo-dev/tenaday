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
    const signedPayload = `${parts['t']}.${payload}`
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    return computed === parts['v1']
  } catch { return false }
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
          // Old flow (existing users paying again) — link directly
          await sb.rpc('set_stripe_data', {
            p_user_id:         userId,
            p_customer_id:     session.customer,
            p_subscription_id: session.subscription,
            p_status:          'active',
          })
        } else {
          // New flow — store as pending, linked by session_id
          // User will claim it after creating their account
          await sb.from('pending_subscriptions').upsert({
            session_id:             session.id,
            stripe_customer_id:     session.customer,
            stripe_subscription_id: session.subscription,
            email:                  session.customer_details?.email || '',
          })
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object
        const subRes  = await fetch(`https://api.stripe.com/v1/subscriptions/${invoice.subscription}`, {
          headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
        })
        const sub    = await subRes.json()
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break
        await sb.rpc('set_stripe_data', {
          p_user_id:         userId,
          p_customer_id:     invoice.customer,
          p_subscription_id: invoice.subscription,
          p_status:          'active',
        })
        break
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const sub    = event.data.object
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break
        await sb.from('profiles').update({ subscription_status: 'inactive' }).eq('id', userId)
        break
      }

      case 'customer.subscription.updated': {
        const sub    = event.data.object
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break
        await sb.from('profiles').update({
          subscription_status: sub.status === 'active' ? 'active' : 'inactive'
        }).eq('id', userId)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
