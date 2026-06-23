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

    const body = await req.json();
    const { payment_intent_id, payment_method_id, mode } = body;

    if (!payment_intent_id || typeof payment_intent_id !== 'string') {
      return new Response(
        JSON.stringify({ error: { code: 'invalid_request', message: 'payment_intent_id is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pay Later path: mark the intent with metadata and return a queued status + ETA
    if (mode === 'pay_later') {
      const paymentIntent = await stripe.paymentIntents.update(payment_intent_id, {
        metadata: {
          ...(body.metadata ?? {}),
          payment_option: 'after',
        },
      });

      const eta = calculateEta();

      return new Response(
        JSON.stringify({
          status: 'queued',
          etaMessage: eta,
          paymentStatus: paymentIntent.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pay Now path: confirm the payment intent with the provided payment method
    if (!payment_method_id || typeof payment_method_id !== 'string') {
      return new Response(
        JSON.stringify({ error: { code: 'invalid_request', message: 'payment_method_id is required for pay-now' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentIntent = await stripe.paymentIntents.confirm(payment_intent_id, {
      payment_method: payment_method_id,
    });

    // If 3D Secure or further action is needed, tell the client
    if (paymentIntent.status === 'requires_action') {
      return new Response(
        JSON.stringify({
          status: 'requires_action',
          client_secret: paymentIntent.client_secret,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const eta = calculateEta();

    return new Response(
      JSON.stringify({
        status: 'succeeded',
        etaMessage: eta,
        paymentStatus: paymentIntent.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment confirmation failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to confirm payment';
    return new Response(
      JSON.stringify({ error: { code: 'payment_error', message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/** Mock ETA — replace with real distance/scheduling logic in production */
function calculateEta(): string {
  const baseMinutes = 15;
  const variance = Math.floor(Math.random() * 10);
  return `${baseMinutes + variance}-${baseMinutes + variance + 5} minutes`;
}
