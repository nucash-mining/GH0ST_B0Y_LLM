'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Check, Server } from 'lucide-react';
import Link from 'next/link';
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

  const regularPlans = PRICING_PLANS.filter(p => !p.nodeProgram);
  const nodePlan = PRICING_PLANS.find(p => p.nodeProgram)!;
  const glows: ('cyan' | 'purple' | 'green')[] = ['cyan', 'purple', 'green'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-mono font-bold text-ghost-cyan mb-3 tracking-widest">ORACLE ACCESS</h1>
        <p className="text-ghost-muted font-mono text-sm">
          Pay-as-you-go tokens or monthly subscriptions. Tokens never expire on one-time purchases.
        </p>
        <p className="text-ghost-green font-mono text-xs mt-2">
          ✦ New accounts receive 10,000 free tokens
        </p>
      </div>

      {/* Regular plans */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        {regularPlans.map((plan, i) => (
          <GlowCard
            key={plan.key}
            glow={glows[i]}
            className={`flex flex-col relative ${plan.highlight ? 'ring-1 ring-ghost-cyan/40' : ''}`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-ghost-cyan text-ghost-black font-mono text-xs font-bold rounded-full">
                POPULAR
              </div>
            )}
            <div className="mb-4">
              <div className="font-mono text-xs text-ghost-muted mb-1">
                {plan.subscription ? 'MONTHLY' : 'ONE-TIME'}
              </div>
              <div className="font-mono font-bold text-ghost-cyan text-xl">{plan.name}</div>
              <div className="text-3xl font-mono font-bold text-ghost-text mt-1">${plan.price}</div>
              <div className="text-ghost-muted text-xs font-mono mt-1">{plan.description}</div>
            </div>
            <div className="text-ghost-green font-mono text-sm mb-4">
              {formatTokens(plan.tokens)} tokens{plan.subscription ? ' / mo' : ''}
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
              variant={plan.highlight ? 'primary' : 'secondary'}
              loading={loading === plan.key}
              onClick={() => handleStripe(plan.key)}
            >
              {plan.subscription ? 'Subscribe' : 'Buy Tokens'}
            </Button>
          </GlowCard>
        ))}
      </div>

      {/* Node Operator plan — full-width featured card */}
      <div
        className="relative rounded-2xl border p-8 mb-10 overflow-hidden"
        style={{ borderColor: '#7b2fff40', background: 'linear-gradient(135deg, #13131f 60%, #7b2fff08)' }}
      >
        <div className="absolute inset-0 bg-radial-ghost opacity-60 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Server size={16} className="text-ghost-purple" />
              <span className="font-mono text-xs text-ghost-purple tracking-widest">NODE OPERATOR PROGRAM</span>
            </div>
            <div className="font-mono font-bold text-ghost-cyan text-2xl mb-1">{nodePlan.name}</div>
            <div className="text-4xl font-mono font-bold text-ghost-text mb-1">
              ${nodePlan.price}
              <span className="text-ghost-muted text-base font-normal"> / year</span>
            </div>
            <div className="text-ghost-muted text-xs font-mono mb-4">{nodePlan.description}</div>
            <p className="text-ghost-text font-mono text-sm leading-relaxed max-w-lg">
              Your own GH0ST_B0Y EV-LLM instance on dedicated NVIDIA DGX Air hardware.
              Run any model. Earn by contributing compute, storage, and bandwidth to the
              WATTX decentralized network.
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col justify-between">
            <ul className="space-y-2 mb-6">
              {nodePlan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs font-mono text-ghost-text">
                  <Check size={12} className={f.includes('wattxchain') ? 'text-ghost-muted' : 'text-ghost-green'} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <Link href="/node-program">
                <Button variant="secondary" className="w-full justify-center border-ghost-purple/40 text-ghost-purple hover:border-ghost-purple">
                  Learn More
                </Button>
              </Link>
              <p className="text-ghost-muted/50 font-mono text-xs text-center">
                Applications open when @wattxchain.org<br />email accounts are available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ETH payment */}
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
