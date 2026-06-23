export interface PricingPlan {
  id: 'basic' | 'deluxe' | 'platinum';
  name: string;
  price: number; // USD display price
  amountCents: number; // Stripe amount in cents
  features: string[];
}
