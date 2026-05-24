'use client';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// Wagmi/WalletConnect access indexedDB at module init — must be client-only
const Providers = dynamic(() => import('./providers').then(m => ({ default: m.Providers })), {
  ssr: false,
});

export function ClientProviders({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
