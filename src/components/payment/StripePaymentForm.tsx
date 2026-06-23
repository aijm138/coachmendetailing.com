import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Spinner } from '../common/Spinner';

interface StripePaymentFormProps {
  /** Called with paymentMethodId after successful createPaymentMethod */
  onPaymentMethod: (paymentMethodId: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  processing?: boolean;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#DCD7BA', // --fg
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      '::placeholder': {
        color: '#727169', // --gray
      },
    },
    invalid: {
      color: '#E46876', // --red
      iconColor: '#E46876',
    },
  },
};

/**
 * Renders a Stripe CardElement and handles createPaymentMethod.
 * Must be rendered inside an <Elements> provider.
 */
export function StripePaymentForm({
  onPaymentMethod,
  onError,
  disabled = false,
  processing = false,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardComplete, setCardComplete] = useState(false);
  const [localProcessing, setLocalProcessing] = useState(false);

  const isProcessing = processing || localProcessing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please wait a moment and try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card input not found.');
      return;
    }

    setLocalProcessing(true);

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      onError(error.message ?? 'Card validation failed.');
      setLocalProcessing(false);
      return;
    }

    if (paymentMethod) {
      onPaymentMethod(paymentMethod.id);
    }

    setLocalProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-alt)] p-4">
        <label className="block text-sm font-medium text-[color:var(--fg-dim)] mb-2">
          Card details
        </label>
        <CardElement
          options={CARD_ELEMENT_OPTIONS}
          onChange={(e) => setCardComplete(e.complete)}
        />
      </div>

      <button
        type="submit"
        disabled={disabled || isProcessing || !stripe || !cardComplete}
        className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Spinner size="h-4 w-4" />
            Processing…
          </>
        ) : (
          'Pay now'
        )}
      </button>

      <p className="text-xs text-center text-[color:var(--gray)]">
        Secured by Stripe. We never see your card details.
      </p>
    </form>
  );
}

export default StripePaymentForm;
