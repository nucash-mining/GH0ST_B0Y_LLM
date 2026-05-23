import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export const PLANS = {
  starter: {
    name: 'Starter',
    tokens: 500_000,
    price: 5,
    priceId: null as string | null,
    description: '500K tokens',
  },
  pro: {
    name: 'Pro',
    tokens: 2_000_000,
    price: 15,
    priceId: null as string | null,
    description: '2M tokens / month',
    subscription: true,
  },
  oracle: {
    name: 'Oracle',
    tokens: 10_000_000,
    price: 50,
    priceId: null as string | null,
    description: '10M tokens / month + priority',
    subscription: true,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function tokensFromAmount(usdAmount: number): number {
  const tokensPerUsd = Number(process.env.TOKENS_PER_USD ?? 100_000);
  return Math.floor(usdAmount * tokensPerUsd);
}
