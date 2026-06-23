import React from 'react';
import { Spinner } from '../../common/Spinner';
import type { BookingState } from '../../../types/booking';

interface StepConfirmationProps {
  state: BookingState;
}

/**
 * Shown briefly while the payment/booking is being processed server-side.
 * This is a passive "processing" interstitial — no user action required.
 */
export function StepConfirmation({ state }: StepConfirmationProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
      <Spinner size="h-10 w-10" className="text-[color:var(--gold)]" />

      <h3 className="text-lg font-semibold text-[color:var(--fg)]">
        {state.status === 'confirming'
          ? 'Confirming your payment…'
          : state.status === 'requires_action'
            ? 'Completing authentication…'
            : 'Setting up your booking…'}
      </h3>

      <p className="text-sm text-[color:var(--fg-dim)] max-w-xs">
        Please don't close this window. This should only take a moment.
      </p>
    </div>
  );
}

export default StepConfirmation;
