'use client';
import { useEffect, useState } from 'react';

interface Chain {
  name: string;
  type: string;
  proof: string;
  status: 'online' | 'offline' | 'syncing';
  blockHeight: number;
  peers: number;
  hashRate?: string;
}

interface StatusData {
  chains: Chain[];
  genesisHash: string;
  ollamaRunning: boolean;
  models: string[];
}

const ACCENT: Record<string, string> = {
  CPU: '#00f5ff',
  GPU: '#7b2fff',
  MEMORY: '#00ff88',
  STORAGE: '#00f5ff',
  NETWORK: '#00ff88',
  INPUT: '#7b2fff',
  OUTPUT: '#00f5ff',
};

export function ChainDashboard() {
  const [data, setData] = useState<StatusData | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const load = () =>
      fetch('/api/chains/status').then(r => r.json()).then(setData).catch(() => {});
    load();
    const id = setInterval(() => { load(); setTick(t => t + 1); }, 8_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${data?.ollamaRunning ? 'bg-ghost-green animate-pulse' : 'bg-ghost-red'}`} />
          <span className="font-mono text-xs font-bold text-ghost-cyan tracking-widest">LIVE CHAIN STATUS</span>
          {data && (
            <span className={`text-xs font-mono ml-2 ${data.ollamaRunning ? 'text-ghost-green' : 'text-ghost-red'}`}>
              {data.ollamaRunning ? `● ORACLE ONLINE · ${data.models.length} model${data.models.length !== 1 ? 's' : ''}` : '○ ORACLE OFFLINE'}
            </span>
          )}
        </div>
        {data && (
          <span className="text-ghost-muted font-mono text-xs hidden md:block truncate max-w-xs">
            genesis: {data.genesisHash.slice(0, 24)}…
          </span>
        )}
      </div>

      {/* Chain grid — 4 top + 3 bottom, fills remaining space */}
      {!data ? (
        <div className="grid grid-cols-4 gap-2 flex-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-ghost-card rounded-lg animate-pulse border border-ghost-border" />
          ))}
        </div>
      ) : (
        <div className="flex-1 grid grid-rows-2 gap-2 min-h-0">
          {/* Row 1: CPU GPU MEMORY STORAGE */}
          <div className="grid grid-cols-4 gap-2 min-h-0">
            {data.chains.slice(0, 4).map(chain => (
              <ChainCard key={chain.name} chain={chain} accent={ACCENT[chain.name]} />
            ))}
          </div>
          {/* Row 2: NETWORK INPUT OUTPUT + genesis ticker */}
          <div className="grid grid-cols-4 gap-2 min-h-0">
            {data.chains.slice(4, 7).map(chain => (
              <ChainCard key={chain.name} chain={chain} accent={ACCENT[chain.name]} />
            ))}
            {/* Genesis info card */}
            <GenesisCard hash={data.genesisHash} models={data.models} ollamaRunning={data.ollamaRunning} tick={tick} />
          </div>
        </div>
      )}
    </div>
  );
}

function ChainCard({ chain, accent }: { chain: Chain; accent: string }) {
  return (
    <div
      className="bg-ghost-card rounded-lg border p-3 flex flex-col justify-between overflow-hidden relative transition-all duration-300 min-h-0"
      style={{
        borderColor: `${accent}30`,
        boxShadow: chain.status === 'online' ? `0 0 15px ${accent}15` : 'none',
      }}
    >
      {/* Top bar */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="font-mono font-bold text-sm leading-tight" style={{ color: accent }}>
            {chain.name}
          </div>
          <div className="text-ghost-muted font-mono leading-tight" style={{ fontSize: '0.6rem' }}>
            {chain.type}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="rounded-full"
            style={{
              width: 7, height: 7,
              backgroundColor: chain.status === 'online' ? '#00ff88' : '#ff3366',
              boxShadow: chain.status === 'online' ? '0 0 6px #00ff88' : 'none',
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-0.5">
        <StatRow label="proof" value={chain.proof.replace('Proof of ', '')} color="#c8c8e0" />
        <StatRow label="block" value={chain.blockHeight.toLocaleString()} color={accent} />
        <StatRow label="peers" value={String(chain.peers)} color="#c8c8e0" />
        {chain.hashRate && <StatRow label="hash" value={chain.hashRate} color="#00ff88" />}
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="font-mono text-ghost-muted" style={{ fontSize: '0.6rem' }}>{label}</span>
      <span className="font-mono font-medium truncate ml-1" style={{ fontSize: '0.6rem', color }}>{value}</span>
    </div>
  );
}

function GenesisCard({ hash, models, ollamaRunning, tick }: {
  hash: string; models: string[]; ollamaRunning: boolean; tick: number;
}) {
  const scrollModels = models.length > 0 ? models : ['no models loaded'];
  const current = scrollModels[tick % scrollModels.length];

  return (
    <div
      className="bg-ghost-card rounded-lg border p-3 flex flex-col justify-between overflow-hidden"
      style={{ borderColor: '#7b2fff30' }}
    >
      <div>
        <div className="font-mono font-bold text-ghost-purple text-xs mb-1">GENESIS</div>
        <div
          className="font-mono text-ghost-muted break-all leading-tight"
          style={{ fontSize: '0.5rem' }}
        >
          {hash}
        </div>
      </div>
      <div className="mt-2">
        <div className="text-ghost-muted font-mono mb-0.5" style={{ fontSize: '0.55rem' }}>
          active model
        </div>
        <div
          className="font-mono truncate"
          style={{ fontSize: '0.6rem', color: ollamaRunning ? '#00ff88' : '#ff3366' }}
        >
          {current}
        </div>
      </div>
    </div>
  );
}
