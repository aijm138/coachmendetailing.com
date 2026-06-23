import React from 'react';
import type { PaymentMode } from '../../types/booking';

interface PaymentOptionSelectorProps {
  value: PaymentMode;
  onChange: (mode: PaymentMode) => void;
  disabled?: boolean;
}

const OPTIONS: { value: PaymentMode; label: string; description: string }[] = [
  {
    value: 'now',
    label: 'Pay now',
    description: 'Secure your spot with a card payment today.',
  },
  {
    value: 'later',
    label: 'Pay after service',
    description: 'Pay when the detailing is complete.',
  },
];

export function PaymentOptionSelector({ value, onChange, disabled }: PaymentOptionSelectorProps) {
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-[color:var(--fg-dim)] mb-2">
        Payment option
      </legend>

      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
              isSelected
                ? 'border-[color:var(--gold)] bg-[color:var(--gold)]/5'
                : 'border-[color:var(--border)] hover:border-[color:var(--gray)]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="paymentOption"
              value={opt.value}
              checked={isSelected}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 accent-[color:var(--gold)]"
              disabled={disabled}
            />
            <div>
              <span className="block text-sm font-medium text-[color:var(--fg)]">{opt.label}</span>
              <span className="block text-xs text-[color:var(--fg-dim)]">{opt.description}</span>
            </div>
          </label>
        );
      })}
    </fieldset>
  );
}

export default PaymentOptionSelector;
