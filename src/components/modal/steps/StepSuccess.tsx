import React from 'react';
import type { BookingState } from '../../../types/booking';

interface StepSuccessProps {
  state: BookingState;
  onClose: () => void;
}

export function StepSuccess({ state, onClose }: StepSuccessProps) {
  const isPaid = state.status === 'succeeded';

  return (
    <div className="flex flex-col items-center text-center py-8 space-y-5">
      {/* Checkmark icon */}
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-kano-green/10">
        <svg
          className="h-8 w-8 text-kano-green"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-[color:var(--fg)]">
        {isPaid ? 'Payment confirmed!' : 'Booking confirmed!'}
      </h3>

      <p className="text-sm text-[color:var(--fg-dim)] max-w-sm">
        {isPaid
          ? "Your payment has been processed. We're on our way!"
          : "Your booking is set. You'll pay when the service is complete."}
      </p>

      {/* Plan summary */}
      {state.plan && (
        <div className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-alt)] p-4 text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[color:var(--fg)]">{state.plan.label}</span>
            <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
              ${(state.plan.amountCents / 100).toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-[color:var(--fg-dim)]">
            {state.location.address1}, {state.location.city}, {state.location.state} {state.location.zip}
          </div>
          {state.contact.name && (
            <div className="text-xs text-[color:var(--fg-dim)]">
              {state.contact.name} &middot; {state.contact.email}
            </div>
          )}
        </div>
      )}

      {/* ETA */}
      {state.etaMessage && (
        <div className="rounded-lg border border-kano-green/30 bg-kano-green/5 px-4 py-3">
          <p className="text-sm font-medium text-kano-green">
            Estimated arrival: {state.etaMessage}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="btn-primary mt-2"
      >
        Done
      </button>
    </div>
  );
}

export default StepSuccess;
