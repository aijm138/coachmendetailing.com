import React, { useId } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => React.ReactNode;
}

/**
 * Accessible form field wrapper.
 * Renders a label, delegates the input to a render-prop child,
 * and shows an error message with proper ARIA linkage.
 */
export function FormField({ label, error, required, children }: FormFieldProps) {
  const autoId = useId();
  const errorId = `${autoId}-error`;

  return (
    <div className="space-y-1">
      <label htmlFor={autoId} className="block text-sm font-medium text-[color:var(--fg-dim)]">
        {label}
        {required && <span className="text-kano-red ml-0.5" aria-hidden="true">*</span>}
      </label>

      {children({
        id: autoId,
        'aria-invalid': !!error,
        'aria-describedby': error ? errorId : undefined,
      })}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-kano-red mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
