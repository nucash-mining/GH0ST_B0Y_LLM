'use client';
import { useEffect, useState } from 'react';
import { GlowCard } from '../ui/GlowCard';

interface Chain {
  name: string;
  type: string;
  proof: string;
  status: 'online' | 'offline' | 'syncing';
  blockHeight: number;
  peers: number;
  hashRate?: string;
}

const CHAIN_COLORS: Record<string, 'cyan' | 'purple' | 'green'> = {
  CPU: 'cyan',
  GPU: 'purple',
  MEMORY: 'green',
  STORAGE: 'cyan',
  NETWORK: 'green',
  INPUT: 'purple',
  OUTPUT: 'cyan',
};

export function ChainStatus() {
  const [data, setData] = useState<{ chains: Chain[]; genesisHash: string } | null>(null);

  useEffect(() => {
    fetch('/api/chains/status')
      .then(r => r.json())
      .then(setData);
    const id = setInterval(() => {
      fetch('/api/chains/status').then(r => r.json()).then(setData);
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-32 bg-ghost-card rounded-xl animate-pulse border border-ghost-border" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-mono text-ghost-muted">genesis:</span>
        <span className="text-xs font-mono text-ghost-cyan truncate">{data.genesisHash}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.chains.map((chain) => (
          <GlowCard key={chain.name} glow={CHAIN_COLORS[chain.name] ?? 'cyan'} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-mono font-bold text-ghost-cyan text-sm">{chain.name}</div>
                <div className="text-ghost-muted text-xs">{chain.type}</div>
              </div>
              <span className={`w-2 h-2 rounded-full mt-1 ${
                chain.status === 'online' ? 'bg-ghost-green animate-pulse' : 'bg-ghost-red'
              }`} />
            </div>
            <div className="space-y-1 mt-3">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ghost-muted">block</span>
                <span className="text-ghost-text">{chain.blockHeight.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ghost-muted">peers</span>
                <span className="text-ghost-text">{chain.peers}</span>
              </div>
              {chain.hashRate && (
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-ghost-muted">hash</span>
                  <span className="text-ghost-green">{chain.hashRate}</span>
                </div>
              )}
            </div>
          </GlowCard>
        ))}
      </div>
    </div>
  );
}
