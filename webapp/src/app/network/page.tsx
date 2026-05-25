'use client';
import { useEffect, useState } from 'react';
import { GlowCard } from '@/components/ui/GlowCard';
import { Cpu, Zap, Link2, Globe, CheckCircle, Clock, Activity } from 'lucide-react';

const CONTRACT = '0x54b8c1c669bceb0574d0622b2cf4c18e6efb15b8';
const ETHERSCAN = `https://sepolia.etherscan.io/address/${CONTRACT}`;

type NodeRow = {
  id: string;
  name: string;
  gpuModel: string | null;
  cpuModel: string | null;
  vramGb: number | null;
  ramGb: number | null;
  modelsLoaded: string[];
  tokensServed: number;
  benchmarkScore: number | null;
  chainRegistered: boolean;
  chainAddress: string | null;
  nodeType: string;
  resources: string[];
  online: boolean;
};

type Stats = {
  totalNodes: number;
  onlineNodes: number;
  chainVerifiedNodes: number;
  totalVramGb: number;
  totalJobsCompleted: number;
  totalTokensServed: number;
};

export default function NetworkPage() {
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(d => { setNodes(d.nodes); setStats(d.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function grade(score: number | null) {
    if (!score) return { label: '—', color: 'text-ghost-muted' };
    const tps = score / 100;
    if (tps >= 80) return { label: `S  ${tps.toFixed(0)} tok/s`, color: 'text-ghost-green' };
    if (tps >= 40) return { label: `A  ${tps.toFixed(0)} tok/s`, color: 'text-ghost-cyan' };
    if (tps >= 20) return { label: `B  ${tps.toFixed(0)} tok/s`, color: 'text-ghost-purple' };
    return { label: `C  ${tps.toFixed(0)} tok/s`, color: 'text-ghost-muted' };
  }

  return (
    <div className="relative max-w-6xl mx-auto px-4 py-12 space-y-10">

      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-ghost-cyan/10 border border-ghost-cyan/30 rounded-full font-mono text-xs text-ghost-cyan">
          <Activity size={12} />
          LIVE COMPUTE NETWORK
        </div>
        <h1 className="text-3xl font-mono font-bold text-ghost-text">
          WATTx <span className="text-ghost-cyan">Hardware Mesh</span>
        </h1>
        <p className="text-ghost-muted font-mono text-sm max-w-xl mx-auto">
          Decentralized GPU nodes providing inference compute for the EV-LLM network.
          On-chain nodes are staked on the ComputeRegistry contract.
        </p>
        <a
          href={ETHERSCAN}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-ghost-purple font-mono text-xs hover:text-ghost-cyan transition-colors"
        >
          <Link2 size={12} />
          ComputeRegistry · {CONTRACT.slice(0, 10)}…{CONTRACT.slice(-6)} · Sepolia
        </a>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Nodes',      value: stats.totalNodes.toString(),                        color: 'text-ghost-text' },
            { label: 'Online Now',       value: stats.onlineNodes.toString(),                       color: 'text-ghost-green' },
            { label: 'On-Chain',         value: stats.chainVerifiedNodes.toString(),                color: 'text-ghost-purple' },
            { label: 'Total VRAM',       value: `${stats.totalVramGb} GB`,                         color: 'text-ghost-cyan' },
            { label: 'Jobs Completed',   value: stats.totalJobsCompleted.toLocaleString(),          color: 'text-ghost-cyan' },
            { label: 'Tokens Served',    value: (stats.totalTokensServed / 1000).toFixed(1) + 'K', color: 'text-ghost-green' },
          ].map(s => (
            <GlowCard key={s.label} glow="cyan" className="text-center p-4">
              <div className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</div>
              <div className="text-ghost-muted font-mono text-xs mt-1">{s.label}</div>
            </GlowCard>
          ))}
        </div>
      )}

      {/* Contract info */}
      <GlowCard glow="purple" className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={14} className="text-ghost-purple" />
            <span className="font-mono text-sm font-bold text-ghost-purple">ComputeRegistry Contract · Sepolia</span>
          </div>
          <p className="text-ghost-muted font-mono text-xs">
            Nodes stake 0.01 ETH to join the on-chain registry. The oracle settles completed
            inference jobs on-chain, crediting node operators. Earnings are withdrawable at any time.
          </p>
        </div>
        <div className="space-y-1 shrink-0 font-mono text-xs">
          <div className="text-ghost-muted">Address</div>
          <div className="text-ghost-cyan break-all">{CONTRACT}</div>
          <div className="text-ghost-muted mt-2">Min stake</div>
          <div className="text-ghost-green">0.01 ETH</div>
        </div>
      </GlowCard>

      {/* Node table */}
      <div>
        <h2 className="text-sm font-mono font-bold text-ghost-cyan tracking-widest mb-4">
          REGISTERED NODES
        </h2>

        {loading ? (
          <div className="text-ghost-muted font-mono text-sm text-center py-12 animate-pulse">
            Loading node data…
          </div>
        ) : nodes.length === 0 ? (
          <GlowCard glow="cyan" className="text-center py-12">
            <Globe size={32} className="text-ghost-muted mx-auto mb-3 opacity-40" />
            <div className="text-ghost-muted font-mono text-sm">No nodes registered yet.</div>
            <div className="text-ghost-muted/60 font-mono text-xs mt-1">
              Be the first — <a href="/contribute" className="text-ghost-cyan hover:underline">contribute your hardware</a>.
            </div>
          </GlowCard>
        ) : (
          <div className="space-y-3">
            {nodes.map(node => {
              const g = grade(node.benchmarkScore);
              return (
                <GlowCard
                  key={node.id}
                  glow={node.online ? (node.chainRegistered ? 'purple' : 'green') : 'cyan'}
                  className="p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                    {/* Status dot + name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${node.online ? 'bg-ghost-green animate-pulse' : 'bg-ghost-muted'}`} />
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-ghost-text text-sm truncate">{node.name}</div>
                        <div className="text-ghost-muted font-mono text-xs">
                          {node.gpuModel ?? node.cpuModel ?? 'Unknown hardware'}
                          {node.vramGb ? ` · ${node.vramGb} GB VRAM` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Online/offline */}
                      <span className={`px-2 py-0.5 rounded font-mono text-xs border ${
                        node.online
                          ? 'border-ghost-green/40 bg-ghost-green/10 text-ghost-green'
                          : 'border-ghost-border bg-ghost-darker text-ghost-muted'
                      }`}>
                        {node.online ? '● ONLINE' : '○ OFFLINE'}
                      </span>

                      {/* On-chain badge */}
                      {node.chainRegistered ? (
                        <span className="px-2 py-0.5 rounded font-mono text-xs border border-ghost-purple/40 bg-ghost-purple/10 text-ghost-purple flex items-center gap-1">
                          <CheckCircle size={10} />
                          ON-CHAIN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-mono text-xs border border-ghost-border text-ghost-muted/60">
                          off-chain
                        </span>
                      )}

                      {/* Benchmark */}
                      <span className={`px-2 py-0.5 rounded font-mono text-xs border border-ghost-border ${g.color}`}>
                        {g.label}
                      </span>
                    </div>
                  </div>

                  {/* Models + stats row */}
                  <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {node.modelsLoaded.slice(0, 4).map(m => (
                        <span key={m} className="px-1.5 py-0.5 bg-ghost-darker border border-ghost-border rounded font-mono text-xs text-ghost-muted">
                          {m}
                        </span>
                      ))}
                      {node.modelsLoaded.length === 0 && (
                        <span className="font-mono text-xs text-ghost-muted/50">No models loaded</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-ghost-muted/60 font-mono text-xs shrink-0">
                      <Zap size={10} />
                      {node.tokensServed.toLocaleString()} tokens served
                    </div>
                  </div>

                  {/* Chain address if registered */}
                  {node.chainRegistered && node.chainAddress && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-ghost-muted/50 font-mono text-xs">Operator:</span>
                      <a
                        href={`https://sepolia.etherscan.io/address/${node.chainAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ghost-purple font-mono text-xs hover:text-ghost-cyan transition-colors"
                      >
                        {node.chainAddress.slice(0, 10)}…{node.chainAddress.slice(-6)}
                      </a>
                    </div>
                  )}
                </GlowCard>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA */}
      <GlowCard glow="green" className="text-center space-y-4">
        <Cpu size={28} className="text-ghost-green mx-auto" />
        <div className="font-mono font-bold text-ghost-text text-lg">Add your hardware to the mesh</div>
        <p className="text-ghost-muted font-mono text-sm max-w-md mx-auto">
          Any PC with a GPU can contribute. The agent auto-detects your hardware, benchmarks it,
          and connects to the network. On-chain registration stakes 0.01 ETH and unlocks settlement rewards.
        </p>
        <a
          href="/contribute"
          className="inline-block px-6 py-2.5 bg-ghost-green/10 border border-ghost-green/40 rounded-lg font-mono text-sm text-ghost-green hover:bg-ghost-green/20 hover:border-ghost-green transition-all"
        >
          Contribute Hardware →
        </a>
      </GlowCard>
    </div>
  );
}
