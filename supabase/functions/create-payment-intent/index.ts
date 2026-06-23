import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: { code: 'method_not_allowed', message: 'Only POST is accepted' } }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-12-18.acacia',
    });

    const { amount, currency = 'usd', metadata = {} } = await req.json();

    // Validate amount — Stripe minimum is $0.50 (50 cents); we enforce $5.00 (500 cents)
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 500) {
      return new Response(
        JSON.stringify({ error: { code: 'invalid_amount', message: 'Amount must be at least $5.00 (500 cents)' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cap at a reasonable max ($10,000)
    if (amount > 1000000) {
      return new Response(
        JSON.stringify({ error: { code: 'invalid_amount', message: 'Amount exceeds maximum allowed' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        ...metadata,
        service: 'coachmen-detailing',
      },
    });

    return new Response(
      JSON.stringify({
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment intent creation failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to create payment intent';
    return new Response(
      JSON.stringify({ error: { code: 'payment_error', message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
