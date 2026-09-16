import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://numiomath.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  try {
    const params = new URLSearchParams({
      'line_items[0][price]':               'price_1UGKk6F3Ob4o24uqDWQw2mCB',
      'line_items[0][quantity]':            '1',
      'mode':                               'payment',
      'automatic_payment_methods[enabled]': 'true',
      'success_url':                        'https://numiomath.app/success?session_id={CHECKOUT_SESSION_ID}',
      'cancel_url':                         'https://numiomath.app/checkout',
      'metadata[product]':                  'numio_lifetime',
    })

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const session = await res.json()

    if (!res.ok) {
      console.error('Stripe error:', JSON.stringify(session))
      throw new Error(session.error?.message || 'Failed to create session')
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Edge Function error:', err)
    return new Response(
      JSON.stringify({ error: 'Service error. Please try again.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
