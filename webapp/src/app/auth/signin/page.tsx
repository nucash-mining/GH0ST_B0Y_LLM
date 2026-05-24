'use client';
import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/Button';
import { GlowCard } from '@/components/ui/GlowCard';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/chat';
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [email, setEmail] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState('');

  async function signInWithWallet() {
    if (!address) return;
    setLoadingWallet(true);
    setError('');
    try {
      const message = `Sign in to GH0ST_B0Y Oracle\nAddress: ${address}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      const result = await signIn('wallet', {
        walletAddress: address,
        signature,
        message,
        redirect: false,
      });
      if (result?.error) throw new Error(result.error);
      router.push(callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet sign-in failed');
    } finally {
      setLoadingWallet(false);
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoadingEmail(true);
    setError('');
    try {
      const result = await signIn('email', { email, redirect: false });
      if (result?.error) throw new Error(result.error);
      router.push(callbackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email sign-in failed');
    } finally {
      setLoadingEmail(false);
    }
  }

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-ghost-cyan mb-2 animate-flicker">
            𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐
          </div>
          <p className="text-ghost-muted font-mono text-sm">Sign in to access the Oracle</p>
        </div>

        {error && (
          <div className="p-3 bg-ghost-red/10 border border-ghost-red/30 rounded-lg text-ghost-red text-xs font-mono">
            {error}
          </div>
        )}

        {/* Wallet sign-in */}
        <GlowCard glow="purple">
          <p className="text-ghost-muted text-xs font-mono mb-4">WALLET (recommended)</p>
          {!isConnected ? (
            <ConnectButton />
          ) : (
            <Button
              className="w-full justify-center"
              onClick={signInWithWallet}
              loading={loadingWallet}
            >
              Sign message with {address?.slice(0, 6)}…{address?.slice(-4)}
            </Button>
          )}
        </GlowCard>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-ghost-border" />
          <span className="text-ghost-muted text-xs font-mono">or</span>
          <div className="flex-1 h-px bg-ghost-border" />
        </div>

        {/* Email sign-in */}
        <GlowCard glow="cyan">
          <p className="text-ghost-muted text-xs font-mono mb-4">EMAIL</p>
          <form onSubmit={signInWithEmail} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="oracle@example.com"
              className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-4 py-2.5 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none"
            />
            <Button
              type="submit"
              variant="secondary"
              className="w-full justify-center"
              loading={loadingEmail}
            >
              Continue with email
            </Button>
          </form>
        </GlowCard>

        <p className="text-center text-ghost-muted text-xs font-mono">
          New accounts receive 10,000 free tokens
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-[90vh] flex items-center justify-center"><span className="text-ghost-cyan font-mono animate-pulse">Loading…</span></div>}>
      <SignInContent />
    </Suspense>
  );
}
