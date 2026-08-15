import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const PRICE_ID          = 'price_1U4V4f004XbuCgJZ51il9sJj'
const APP_URL           = 'https://numiomath.app'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Create Stripe Checkout session — no user needed
    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'line_items[0][price]':    PRICE_ID,
        'line_items[0][quantity]': '1',
        mode:                      'subscription',
        // Collect email at checkout so we have it for account creation
        customer_creation:         'always',
        success_url:               `${APP_URL}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:                `https://numiomath.app/landingpage.html`,
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
