import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY  = Deno.env.get('STRIPE_SECRET_KEY')!
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PRICE_ID           = 'price_1U48VKFZ4rsYNIj4VGwtcsg7'
const APP_URL            = 'https://numiomath.app'

const CORS = {
  'Access-Control-Allow-Origin':  APP_URL,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Verify user auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: CORS })

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: { user }, error: authErr } = await sb.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return new Response('Unauthorized', { status: 401, headers: CORS })

    // Get profile for existing stripe customer id
    const { data: profile } = await sb.from('profiles').select('stripe_customer_id, display_name').eq('id', user.id).single()

    // Create or reuse Stripe customer
    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email || '',
          name:  profile?.display_name || '',
          'metadata[supabase_user_id]': user.id,
        }),
      })
      const customer = await customerRes.json()
      customerId = customer.id
      await sb.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    // Create Stripe Checkout session
    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer:                          customerId,
        'line_items[0][price]':            PRICE_ID,
        'line_items[0][quantity]':         '1',
        mode:                              'subscription',
        success_url:                       `${APP_URL}?subscribed=true`,
        cancel_url:                        `${APP_URL}?subscribed=false`,
        'metadata[supabase_user_id]':      user.id,
        'subscription_data[metadata][supabase_user_id]': user.id,
      }),
    })

    const session = await sessionRes.json()
    if (!session.url) throw new Error(session.error?.message || 'Failed to create checkout session')

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
