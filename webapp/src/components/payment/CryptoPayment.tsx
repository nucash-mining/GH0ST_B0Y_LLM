'use client';
import { useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { Button } from '../ui/Button';
import { GlowCard } from '../ui/GlowCard';
import { formatTokens } from '@/lib/utils';

const RECEIVER = process.env.NEXT_PUBLIC_PAYMENT_RECEIVER as `0x${string}` | undefined;
const ETH_PRICE = 3000;
const TOKENS_PER_USD = 100_000;

const ETH_PACKAGES = [
  { eth: '0.001', label: '0.001 ETH', tokens: Math.floor(0.001 * ETH_PRICE * TOKENS_PER_USD) },
  { eth: '0.005', label: '0.005 ETH', tokens: Math.floor(0.005 * ETH_PRICE * TOKENS_PER_USD) },
  { eth: '0.01', label: '0.01 ETH', tokens: Math.floor(0.01 * ETH_PRICE * TOKENS_PER_USD) },
];

export function CryptoPayment({ onSuccess }: { onSuccess: () => void }) {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [selected, setSelected] = useState(ETH_PACKAGES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePay() {
    if (!isConnected || !RECEIVER) return;
    setLoading(true);
    setError('');

    try {
      const hash = await sendTransactionAsync({
        to: RECEIVER,
        value: parseEther(selected.eth),
      });

      const res = await fetch('/api/payments/crypto/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: hash }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setLoading(false);
    }
  }

  if (!isConnected) {
    return (
      <GlowCard glow="purple">
        <p className="text-ghost-muted font-mono text-sm text-center">
          Connect your wallet to pay with ETH
        </p>
      </GlowCard>
    );
  }

  return (
    <GlowCard glow="purple" className="space-y-4">
      <h3 className="font-mono font-bold text-ghost-cyan">Pay with ETH</h3>
      <div className="grid grid-cols-3 gap-2">
        {ETH_PACKAGES.map(pkg => (
          <button
            key={pkg.eth}
            onClick={() => setSelected(pkg)}
            className={`p-3 rounded-lg border font-mono text-sm transition-all ${
              selected.eth === pkg.eth
                ? 'border-ghost-purple bg-ghost-purple/10 text-ghost-cyan'
                : 'border-ghost-border text-ghost-muted hover:border-ghost-purple/50'
            }`}
          >
            <div>{pkg.label}</div>
            <div className="text-xs text-ghost-green mt-1">{formatTokens(pkg.tokens)} tkn</div>
          </button>
        ))}
      </div>
      {error && <p className="text-ghost-red text-xs font-mono">{error}</p>}
      <Button onClick={handlePay} loading={loading} className="w-full justify-center">
        Send {selected.eth} ETH → {formatTokens(selected.tokens)} tokens
      </Button>
    </GlowCard>
  );
}
