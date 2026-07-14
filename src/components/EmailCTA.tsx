import React, { useState, type FormEvent } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function EmailCTA() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? 'Failed to sign up');
      }

      setStatus('success');
      setMessage("You're on the list! We'll send your early-bird discount soon.");
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    }
  };

  const isDisabled = status === 'loading' || status === 'success';

  return (
    <section id="early-bird" aria-labelledby="early-bird-heading" className="py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="early-bird-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Early Bird Get's a Discount
          </h2>
          <p className="mt-4 leading-relaxed text-[color:var(--fg-dim)]">
            We're just getting started — and we want to reward the first customers
            who believe in us. Sign up with your email during this limited-time
            early-bird period, and you'll receive an exclusive discount on your
            first detail. No catch, just a thank-you for being an early supporter.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 max-w-md space-y-4"
            noValidate
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              <label htmlFor="cta-email" className="sr-only">
                Email address
              </label>
              <input
                id="cta-email"
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                className="flex-1 rounded-md border border-[color:var(--border)] bg-[color:var(--bg-alt)] px-4 py-3 text-sm text-[color:var(--fg)] placeholder-[color:var(--fg-dim)] transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)] disabled:opacity-50"
                disabled={isDisabled}
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={isDisabled}
                className="btn-primary whitespace-nowrap disabled:opacity-50"
              >
                {status === 'loading' && 'Signing up…'}
                {status === 'success' && 'Signed up!'}
                {status !== 'loading' && status !== 'success' && 'Get Discount'}
              </button>
            </div>

            {message && (
              <p
                role="alert"
                className={`text-sm ${
                  status === 'success'
                    ? 'text-[color:var(--green)]'
                    : 'text-[color:var(--red)]'
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

export default EmailCTA;
