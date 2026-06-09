export interface PricingPlan {
  id: 'basic' | 'deluxe' | 'platinum';
  name: string;
  price: number; // USD
  features: string[];
  ctaHref: string;
}
