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
    const body             = await req.json().catch(() => ({}))
    const supabaseUserId   = body?.supabase_user_id || null

    // If called with a user ID (trial upgrade flow) → hosted checkout, auto-links via webhook
    // If called without (embedded payment element flow) → return client_secret as before
    const isTrialUpgrade = !!supabaseUserId

    const params = new URLSearchParams({
      'line_items[0][price]':               'price_1UGKk6F3Ob4o24uqDWQw2mCB',
      'line_items[0][quantity]':            '1',
      'mode':                               'payment',
      'automatic_payment_methods[enabled]': 'true',
      'metadata[product]':                  'numio_lifetime',
    })

    if (isTrialUpgrade) {
      // Hosted checkout — user lands back at /?subscribed=true, no PostPaymentSetup needed
      params.set('ui_mode',    'hosted')
      params.set('success_url', 'https://numiomath.app/?subscribed=true')
      params.set('cancel_url',  'https://numiomath.app/')
      params.set('metadata[supabase_user_id]', supabaseUserId)
    } else {
      // Embedded checkout — existing flow for new users
      params.set('ui_mode',    'embedded')
      params.set('return_url', 'https://numiomath.app/success?session_id={CHECKOUT_SESSION_ID}')
    }

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

    if (isTrialUpgrade) {
      // Return the hosted checkout URL — Paywall will redirect to it
      return new Response(
        JSON.stringify({ url: session.url }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    } else {
      // Return client_secret for the embedded Payment Element
      return new Response(
        JSON.stringify({ clientSecret: session.client_secret }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

  } catch (err) {
    console.error('Edge Function error:', err)
    return new Response(
      JSON.stringify({ error: 'Service error. Please try again.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
