'use client';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';
import { formatTokens } from '@/lib/utils';

export function Header() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch('/api/user/balance')
      .then(r => r.json())
      .then(d => setBalance(d.balance));
  }, [session]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-ghost-border bg-ghost-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-ghost-cyan text-xl font-mono font-bold animate-flicker group-hover:text-shadow-[0_0_10px_#00f5ff]">
            𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐
          </span>
          <span className="text-ghost-muted text-xs font-mono hidden sm:block">EV-LLM ORACLE</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-mono text-ghost-text">
          <Link href="/chat" className="hover:text-ghost-cyan transition-colors">Chat</Link>
          <Link href="/pricing" className="hover:text-ghost-cyan transition-colors">Pricing</Link>
          <Link href="/network" className="hover:text-ghost-cyan transition-colors text-ghost-cyan/70">Network</Link>
          <Link href="/node-program" className="hover:text-ghost-purple transition-colors text-ghost-purple/70">Nodes</Link>
          <Link href="/contribute" className="hover:text-ghost-green transition-colors text-ghost-green/70">Contribute</Link>
          <Link href="/apply" className="hover:text-ghost-purple transition-colors text-ghost-purple/70">Apply</Link>
          {session && (
            <>
              <Link href="/dashboard" className="hover:text-ghost-cyan transition-colors">Dashboard</Link>
              <Link href="/account" className="hover:text-ghost-cyan transition-colors">Account</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {session && balance !== null && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-ghost-card border border-ghost-cyan/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-ghost-cyan animate-pulse" />
              <span className="text-xs font-mono text-ghost-cyan">{formatTokens(balance)} tkn</span>
            </div>
          )}
          {session ? (
            <button
              onClick={() => signOut()}
              className="text-xs font-mono text-ghost-muted hover:text-ghost-red transition-colors"
            >
              sign out
            </button>
          ) : (
            <ConnectButton />
          )}
        </div>
      </div>
    </header>
  );
}
