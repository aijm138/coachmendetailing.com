import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { FormField } from '../../common/FormField';
import { PaymentOptionSelector } from '../../payment/PaymentOptionSelector';
import { StripePaymentForm } from '../../payment/StripePaymentForm';
import { Spinner } from '../../common/Spinner';
import {
  getPublishableKey,
  createPaymentIntent,
  confirmPaymentNow,
  confirmPaymentLater,
} from '../../../lib/payments';
import type { ApiError } from '../../../lib/payments';
import type { BookingContact, BookingState, PaymentMode } from '../../../types/booking';

interface StepContactPaymentProps {
  state: BookingState;
  contact: BookingContact;
  onContactChange: (contact: BookingContact) => void;
  paymentMode: PaymentMode;
  onPaymentModeChange: (mode: PaymentMode) => void;
  onPI: (id: string, clientSecret: string) => void;
  onStatus: (status: BookingState['status']) => void;
  onEta: (eta: string) => void;
  onError: (error: string | null) => void;
  onSuccess: () => void;
  onBack: () => void;
  isBusy: boolean;
}

/* ── Simple validators ── */

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return null;
}

function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'Phone number is required';
  if (digits.length < 10) return 'Enter a 10-digit phone number';
  return null;
}

function validateName(name: string): string | null {
  if (!name.trim()) return 'Name is required';
  return null;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function StepContactPayment({
  state,
  contact,
  onContactChange,
  paymentMode,
  onPaymentModeChange,
  onPI,
  onStatus,
  onEta,
  onError,
  onSuccess,
  onBack,
  isBusy,
}: StepContactPaymentProps) {
  /* ── Stripe initialization ── */
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const stripeInitialized = useRef(false);

  // Keep a ref to the PI so async handlers always see the latest value
  const piRef = useRef<{ id: string; clientSecret: string } | null>(null);

  // Sync ref with parent state
  useEffect(() => {
    if (state.paymentIntentId && state.clientSecret) {
      piRef.current = { id: state.paymentIntentId, clientSecret: state.clientSecret };
    }
  }, [state.paymentIntentId, state.clientSecret]);

  useEffect(() => {
    if (stripeInitialized.current) return;
    stripeInitialized.current = true;
    setStripeLoading(true);
    getPublishableKey()
      .then((key) => {
        setStripePromise(loadStripe(key));
      })
      .catch((err: unknown) => {
        const msg = (err as ApiError)?.message ?? 'Failed to load payment provider';
        console.warn('Stripe init error:', msg);
      })
      .finally(() => setStripeLoading(false));
  }, []);

  /* ── Local validation state ── */
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  /* ── Helpers ── */
  const updateContact = (field: keyof BookingContact, value: string) => {
    onContactChange({ ...contact, [field]: value });
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateAll = (): boolean => {
    const errors: typeof fieldErrors = {};
    const nameErr = validateName(contact.name);
    const emailErr = validateEmail(contact.email);
    const phoneErr = validatePhone(contact.phone);
    if (nameErr) errors.name = nameErr;
    if (emailErr) errors.email = emailErr;
    if (phoneErr) errors.phone = phoneErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildMetadata = (mode: 'now' | 'later'): Record<string, string> => ({
    planId: state.plan?.id ?? '',
    planLabel: state.plan?.label ?? '',
    email: contact.email,
    phone: contact.phone.replace(/\D/g, ''),
    name: contact.name,
    payMode: mode,
    address: `${state.location.address1}, ${state.location.city}, ${state.location.state} ${state.location.zip}`,
  });

  /**
   * Creates a PaymentIntent if one doesn't exist yet.
   * Returns the PI id and client_secret, or null on failure.
   */
  const ensurePI = async (
    mode: 'now' | 'later'
  ): Promise<{ id: string; clientSecret: string } | null> => {
    // Already have one
    if (piRef.current) return piRef.current;

    if (!state.plan) {
      onError('No plan selected.');
      return null;
    }

    onStatus('creating_intent');
    onError(null);

    try {
      const result = await createPaymentIntent({
        amount: state.plan.amountCents,
        metadata: buildMetadata(mode),
      });
      const pi = { id: result.id, clientSecret: result.client_secret };
      piRef.current = pi;
      onPI(pi.id, pi.clientSecret);
      onStatus('idle');
      return pi;
    } catch (err: unknown) {
      const msg = (err as ApiError)?.message ?? 'Failed to set up payment. Please try again.';
      onError(msg);
      onStatus('failed');
      return null;
    }
  };

  /* ── Pay Now: after Stripe form collects card ── */
  const handlePaymentMethod = async (paymentMethodId: string) => {
    const pi = await ensurePI('now');
    if (!pi) return;

    onStatus('confirming');
    try {
      const confirmResult = await confirmPaymentNow({
        payment_intent_id: pi.id,
        payment_method_id: paymentMethodId,
      });

      if (confirmResult.status === 'requires_action' && confirmResult.client_secret) {
        onStatus('requires_action');
        if (!stripePromise) {
          onError('Stripe not available for authentication.');
          onStatus('failed');
          return;
        }
        const stripe = await stripePromise;
        if (!stripe) {
          onError('Stripe failed to load.');
          onStatus('failed');
          return;
        }
        const { error: authError } = await stripe.confirmCardPayment(confirmResult.client_secret);
        if (authError) {
          onError(authError.message ?? 'Authentication failed.');
          onStatus('failed');
          return;
        }
      }

      if (confirmResult.etaMessage) {
        onEta(confirmResult.etaMessage);
      }
      onStatus('succeeded');
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as ApiError)?.message ?? 'Payment confirmation failed.';
      onError(msg);
      onStatus('failed');
    }
  };

  /* ── Pay Later flow ── */
  const handlePayLater = async () => {
    if (!validateAll()) return;

    const pi = await ensurePI('later');
    if (!pi) return;

    onStatus('confirming');
    try {
      const result = await confirmPaymentLater({ payment_intent_id: pi.id });
      if (result.etaMessage) {
        onEta(result.etaMessage);
      }
      onStatus('queued');
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as ApiError)?.message ?? 'Booking failed.';
      onError(msg);
      onStatus('failed');
    }
  };

  /* ── Continue button ── */
  const handleContinue = async () => {
    if (!validateAll()) return;
    if (paymentMode === 'later') {
      await handlePayLater();
    }
    // For 'now', the StripePaymentForm handles submission via handlePaymentMethod
  };

  const inputClass =
    'w-full rounded-md border border-[color:var(--border)] bg-[color:var(--bg-alt)] px-3 py-2 text-sm text-[color:var(--fg)] placeholder-[color:var(--gray)] focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)] focus:border-transparent';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[color:var(--fg)]">Contact & payment</h3>
        <p className="text-sm text-[color:var(--fg-dim)] mt-1">
          {"We'll send updates to your phone. Choose how you'd like to pay."}
        </p>
      </div>

      {/* Contact fields */}
      <div className="space-y-3">
        <FormField label="Full name" required error={fieldErrors.name}>
          {(props) => (
            <input
              {...props}
              type="text"
              value={contact.name}
              onChange={(e) => updateContact('name', e.target.value)}
              placeholder="Jane Smith"
              autoComplete="name"
              className={inputClass}
            />
          )}
        </FormField>

        <FormField label="Email" required error={fieldErrors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              value={contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
              placeholder="jane@example.com"
              autoComplete="email"
              className={inputClass}
            />
          )}
        </FormField>

        <FormField label="Phone number" required error={fieldErrors.phone}>
          {(props) => (
            <input
              {...props}
              type="tel"
              value={formatPhone(contact.phone)}
              onChange={(e) => updateContact('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="(555) 123-4567"
              autoComplete="tel"
              inputMode="tel"
              className={inputClass}
            />
          )}
        </FormField>
      </div>

      {/* Payment option */}
      <PaymentOptionSelector
        value={paymentMode}
        onChange={onPaymentModeChange}
        disabled={isBusy}
      />

      {/* Stripe card form (Pay Now only) */}
      {paymentMode === 'now' && (
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-alt)] p-4">
          {stripeLoading ? (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-[color:var(--fg-dim)]">
              <Spinner size="h-4 w-4" />
              Loading payment form…
            </div>
          ) : stripePromise ? (
            <Elements stripe={stripePromise}>
              <StripePaymentForm
                onPaymentMethod={handlePaymentMethod}
                onError={(msg) => onError(msg)}
                disabled={isBusy}
                processing={isBusy}
              />
            </Elements>
          ) : (
            <p className="text-sm text-kano-red py-2">
              Unable to load payment form. Please choose &ldquo;Pay after service&rdquo; or refresh the page.
            </p>
          )}
        </div>
      )}

      {/* Error display */}
      {state.error && (
        <p role="alert" className="text-sm text-kano-red">
          {state.error}
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-[color:var(--border)]">
        <button
          type="button"
          onClick={onBack}
          disabled={isBusy}
          className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        {paymentMode === 'later' && (
          <button
            type="button"
            onClick={handleContinue}
            disabled={isBusy}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBusy ? (
              <>
                <Spinner size="h-4 w-4" />
                Booking…
              </>
            ) : (
              'Book now — pay later'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default StepContactPayment;
