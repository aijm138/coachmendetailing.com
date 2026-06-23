import React from 'react';
import Button from './ui/Button';
import type { PricingPlan } from '../types/pricing';
import type { Plan } from '../types/booking';

const plans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 99,
    amountCents: 9900,
    features: [
      'Exterior hand wash',
      'Tire shine',
      'Quick interior vacuum',
      'Window clean',
    ],
  },
  {
    id: 'deluxe',
    name: 'Deluxe',
    price: 179,
    amountCents: 17900,
    features: [
      'Everything in Basic',
      'Interior deep clean',
      'Spray wax protection',
      'Plastic and trim refresh',
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: 299,
    amountCents: 29900,
    features: [
      'Everything in Deluxe',
      'Paint decontamination',
      'Ceramic spray sealant',
      'Leather clean and condition',
    ],
  },
];

interface PricingProps {
  onSelectPlan: (plan: Plan) => void;
}

export function Pricing({ onSelectPlan }: PricingProps) {
  const handleSelect = (plan: PricingPlan) => {
    onSelectPlan({
      id: plan.id,
      label: plan.name,
      amountCents: plan.amountCents,
      features: plan.features,
    });
  };

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="py-20">
      <div className="container-page">
        <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
          Simple, transparent pricing
        </h2>
        <p className="mt-3 text-[color:var(--fg-dim)] max-w-2xl">
          Choose a package that matches your needs. Same-day appointments available.
        </p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <article key={plan.id} className="card card-hover flex flex-col" aria-labelledby={`${plan.id}-title`}>
              <div className="p-6 flex-1">
                <h3 id={`${plan.id}-title`} className="text-2xl font-semibold">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold" style={{color: 'var(--gold)'}}>${plan.price}</span>
                  <span className="ml-1 text-sm text-[color:var(--fg-dim)]">/ sedan</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm text-[color:var(--fg-dim)] list-disc list-inside">
                  {plan.features.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
              <div className="p-6 pt-0">
                <Button
                  onClick={() => handleSelect(plan)}
                  aria-label={`Choose ${plan.name} plan`}
                  className="w-full"
                >
                  Let's Go
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Pricing;
