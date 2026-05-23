'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { CryptoPayment } from '@/components/payment/CryptoPayment';
import { PRICING_PLANS } from '@/types';
import { formatTokens } from '@/lib/utils';

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showCrypto, setShowCrypto] = useState(false);

  async function handleStripe(planKey: string) {
    if (!session) { router.push('/auth/signin?callbackUrl=/pricing'); return; }
    setLoading(planKey);
    try {
      const res = await fetch('/api/payments/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(null);
    }
  }

  const glows: ('cyan' | 'purple' | 'green')[] = ['cyan', 'purple', 'green'];

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-mono font-bold text-ghost-cyan mb-3">ORACLE ACCESS</h1>
        <p className="text-ghost-muted font-mono text-sm">
          Pay-as-you-go or subscribe. Tokens never expire on one-time purchases.
        </p>
        <p className="text-ghost-green font-mono text-xs mt-2">
          ✦ New accounts receive 10,000 free tokens
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {PRICING_PLANS.map((plan, i) => (
          <GlowCard key={plan.key} glow={glows[i]} className="flex flex-col">
            <div className="mb-4">
              <div className="font-mono text-xs text-ghost-muted mb-1">
                {plan.subscription ? 'MONTHLY' : 'ONE-TIME'}
              </div>
              <div className="font-mono font-bold text-ghost-cyan text-xl">{plan.name}</div>
              <div className="text-3xl font-mono font-bold text-ghost-text mt-1">
                ${plan.price}
              </div>
              <div className="text-ghost-muted text-xs font-mono mt-1">{plan.description}</div>
            </div>

            <div className="text-ghost-green font-mono text-sm mb-4">
              {formatTokens(plan.tokens)} tokens
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs font-mono text-ghost-text">
                  <Check size={12} className="text-ghost-green shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              className="w-full justify-center"
              variant={i === 1 ? 'primary' : 'secondary'}
              loading={loading === plan.key}
              onClick={() => handleStripe(plan.key)}
            >
              {plan.subscription ? 'Subscribe' : 'Buy Tokens'}
            </Button>
          </GlowCard>
        ))}
      </div>

      {/* Crypto payment */}
      <div className="max-w-md mx-auto">
        <button
          onClick={() => setShowCrypto(v => !v)}
          className="w-full text-center text-ghost-muted font-mono text-sm hover:text-ghost-purple transition-colors mb-4"
        >
          {showCrypto ? '▲ Hide' : '▼ Pay with ETH instead'}
        </button>
        {showCrypto && (
          <CryptoPayment onSuccess={() => router.push('/account?payment=success')} />
        )}
      </div>

      <p className="text-center text-ghost-muted text-xs font-mono mt-8">
        1 token ≈ 4 characters · 100K tokens ≈ $1 · ETH rate based on live price
      </p>
    </div>
  );
}
