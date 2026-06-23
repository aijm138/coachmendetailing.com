/**
 * API wrapper for Supabase Edge Functions that handle Stripe operations.
 *
 * All amounts are in cents (e.g. 9900 = $99.00).
 * Errors are normalized to { code, message } shape.
 */

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

const authHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
});

/* ── Error normalization ── */

export interface ApiError {
  code: string;
  message: string;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    if (body?.error?.message) return body.error as ApiError;
    if (typeof body?.error === 'string') return { code: 'api_error', message: body.error };
    return { code: 'api_error', message: response.statusText || 'Unknown error' };
  } catch {
    return { code: 'api_error', message: response.statusText || 'Unknown error' };
  }
}

/* ── Get Stripe publishable key ── */

export async function getPublishableKey(): Promise<string> {
  const res = await fetch(`${BASE_URL}/get-publishable-key`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
  const data: { publishableKey: string } = await res.json();
  return data.publishableKey;
}

/* ── Create PaymentIntent ── */

export interface CreatePaymentIntentParams {
  amount: number; // cents
  currency?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResult {
  id: string;
  client_secret: string;
}

export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResult> {
  const res = await fetch(`${BASE_URL}/create-payment-intent`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency ?? 'usd',
      metadata: params.metadata ?? {},
    }),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<CreatePaymentIntentResult>;
}

/* ── Confirm payment (Pay Now) ── */

export interface ConfirmPayNowParams {
  payment_intent_id: string;
  payment_method_id: string;
}

export interface ConfirmPayNowResult {
  status: 'succeeded' | 'requires_action';
  client_secret?: string;
  etaMessage?: string;
  paymentStatus?: string;
}

export async function confirmPaymentNow(
  params: ConfirmPayNowParams
): Promise<ConfirmPayNowResult> {
  const res = await fetch(`${BASE_URL}/confirm-payment`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<ConfirmPayNowResult>;
}

/* ── Confirm payment (Pay Later) ── */

export interface ConfirmPayLaterParams {
  payment_intent_id: string;
  metadata?: Record<string, string>;
}

export interface ConfirmPayLaterResult {
  status: 'queued';
  etaMessage: string;
  paymentStatus?: string;
}

export async function confirmPaymentLater(
  params: ConfirmPayLaterParams
): Promise<ConfirmPayLaterResult> {
  const res = await fetch(`${BASE_URL}/confirm-payment`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...params, mode: 'pay_later' }),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<ConfirmPayLaterResult>;
}
