import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://numiomath.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
  }

  try {
    const { priceId } = await req.json()

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Missing priceId' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Create a Stripe Checkout Session in embedded mode
    // No supabase_user_id in metadata → triggers the "pay-first" flow in your webhook
    // The pending_subscription gets stored and claimed in PostPaymentSetup.jsx after signup
    const params = new URLSearchParams({
      'mode':                          'subscription',
      'ui_mode':                       'embedded',
      'line_items[0][price]':          priceId,
      'line_items[0][quantity]':       '1',
      'return_url':                    'https://numiomath.app/success?session_id={CHECKOUT_SESSION_ID}',
      'payment_method_types[0]':       'card',
      'subscription_data[trial_period_days]': '0',
    })

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!stripeRes.ok) {
      const err = await stripeRes.text()
      console.error('Stripe error:', err)
      return new Response(
        JSON.stringify({ error: 'Failed to create payment session' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const session = await stripeRes.json()

    // Return the clientSecret — this is what the frontend Payment Element needs
    return new Response(
      JSON.stringify({ clientSecret: session.client_secret }),
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
