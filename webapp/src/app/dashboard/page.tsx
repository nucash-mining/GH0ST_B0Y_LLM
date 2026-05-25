'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';

type NodeData = {
  id: string;
  name: string;
  status: string;
  approved: boolean;
  ollamaUrl: string;
  gpuModel: string | null;
  vramGb: number | null;
  storageGb: number | null;
  modelsLoaded: string[];
  tokensServed: number;
  lastHeartbeat: string | null;
  chainRegistered: boolean;
  chainAddress: string | null;
  chainTxHash: string | null;
  benchmarkScore: number | null;
  hardwareFingerprint: string | null;
  agentVersion: string | null;
};

type RegisterForm = {
  name: string;
  ollamaUrl: string;
  gpuModel: string;
  vramGb: string;
  storageGb: string;
  walletAddress: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [node, setNode] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RegisterForm>({
    name: '', ollamaUrl: '', gpuModel: '', vramGb: '', storageGb: '', walletAddress: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/admin/nodes')
      .then(r => r.json())
      .then(d => {
        const myNode = d.nodes?.find((n: NodeData) => true); // first node owned by this user
        if (myNode) {
          setNode(myNode);
          setForm({
            name: myNode.name,
            ollamaUrl: myNode.ollamaUrl,
            gpuModel: myNode.gpuModel ?? '',
            vramGb: myNode.vramGb?.toString() ?? '',
            storageGb: myNode.storageGb?.toString() ?? '',
            walletAddress: '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/nodes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          vramGb: form.vramGb ? parseInt(form.vramGb) : undefined,
          storageGb: form.storageGb ? parseInt(form.storageGb) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNode(data.node);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><span className="text-ghost-cyan font-mono animate-pulse">Loading…</span></div>;
  }

  const isOnline = node?.lastHeartbeat
    ? Date.now() - new Date(node.lastHeartbeat).getTime() < 5 * 60 * 1000
    : false;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-ghost-text">Node Dashboard</h1>
          <p className="text-ghost-muted font-mono text-sm mt-1">{session?.user?.email}</p>
        </div>
        {node && (
          <div className={`flex items-center gap-2 font-mono text-xs px-3 py-1.5 rounded-full border ${
            isOnline ? 'border-ghost-green/40 bg-ghost-green/10 text-ghost-green' : 'border-ghost-red/40 bg-ghost-red/10 text-ghost-red'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-ghost-green animate-pulse' : 'bg-ghost-red'}`} />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
        )}
      </div>

      {node && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Tokens Served',   value: node.tokensServed.toLocaleString() },
            { label: 'Models Loaded',  value: node.modelsLoaded.length.toString() },
            { label: 'VRAM',           value: node.vramGb ? `${node.vramGb} GB` : '—' },
            { label: 'Benchmark',      value: node.benchmarkScore ? `${Math.round(node.benchmarkScore / 100)} tok/s` : '—' },
          ].map(stat => (
            <GlowCard key={stat.label} glow="cyan" className="text-center">
              <div className="text-2xl font-mono font-bold text-ghost-cyan">{stat.value}</div>
              <div className="text-ghost-muted font-mono text-xs mt-1">{stat.label}</div>
            </GlowCard>
          ))}
        </div>
      )}

      {/* On-chain status */}
      {node && (
        <GlowCard glow={node.chainRegistered ? 'purple' : 'cyan'}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-ghost-purple font-mono text-sm tracking-widest uppercase">Blockchain Status</h2>
            {node.chainRegistered ? (
              <span className="px-2 py-0.5 rounded font-mono text-xs border border-ghost-purple/40 bg-ghost-purple/10 text-ghost-purple">
                ✓ ON-CHAIN · SEPOLIA
              </span>
            ) : (
              <a href="/contribute" className="text-ghost-muted font-mono text-xs hover:text-ghost-cyan">
                Register on-chain →
              </a>
            )}
          </div>
          {node.chainRegistered ? (
            <div className="space-y-2 font-mono text-xs">
              <div className="flex gap-3">
                <span className="text-ghost-muted w-28 shrink-0">Operator wallet</span>
                <a
                  href={`https://sepolia.etherscan.io/address/${node.chainAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-ghost-purple hover:text-ghost-cyan break-all"
                >
                  {node.chainAddress}
                </a>
              </div>
              {node.chainTxHash && (
                <div className="flex gap-3">
                  <span className="text-ghost-muted w-28 shrink-0">Registration tx</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${node.chainTxHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-ghost-cyan hover:text-ghost-purple break-all"
                  >
                    {node.chainTxHash.slice(0, 24)}…
                  </a>
                </div>
              )}
              {node.hardwareFingerprint && (
                <div className="flex gap-3">
                  <span className="text-ghost-muted w-28 shrink-0">HW fingerprint</span>
                  <span className="text-ghost-muted/70">{node.hardwareFingerprint.slice(0, 20)}…</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-ghost-muted font-mono text-xs leading-relaxed">
              Your node is registered off-chain. Stake 0.01 ETH on Sepolia to join the on-chain registry —
              on-chain nodes earn ETH directly from job settlements and are prioritised for routing.
            </p>
          )}
        </GlowCard>
      )}

      {node && (
        <GlowCard glow="purple">
          <h2 className="text-ghost-purple font-mono text-sm tracking-widest uppercase mb-3">Models Loaded</h2>
          {node.modelsLoaded.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {node.modelsLoaded.map(m => (
                <span key={m} className="px-2 py-1 bg-ghost-purple/10 border border-ghost-purple/30 rounded font-mono text-xs text-ghost-purple">{m}</span>
              ))}
            </div>
          ) : (
            <p className="text-ghost-muted font-mono text-xs">No models detected — make sure Ollama is running at your URL.</p>
          )}
        </GlowCard>
      )}

      {!node?.approved && node && (
        <GlowCard glow="cyan">
          <div className="flex items-start gap-3">
            <div className="text-ghost-cyan text-xl">⏳</div>
            <div>
              <div className="text-ghost-cyan font-mono text-sm font-semibold">Pending Approval</div>
              <p className="text-ghost-muted font-mono text-xs mt-1">Your node is registered and waiting for admin approval. You'll receive an email at {session?.user?.email} once approved.</p>
            </div>
          </div>
        </GlowCard>
      )}

      <GlowCard glow="cyan">
        <h2 className="text-ghost-cyan font-mono text-sm tracking-widest uppercase mb-4">
          {node ? 'Update Node' : 'Register Your Node'}
        </h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-ghost-muted font-mono text-xs mb-1 block">Node Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My DGX Air Node" required
                className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-3 py-2 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none" />
            </div>
            <div>
              <label className="text-ghost-muted font-mono text-xs mb-1 block">Ollama URL *</label>
              <input value={form.ollamaUrl} onChange={e => setForm(f => ({ ...f, ollamaUrl: e.target.value }))} placeholder="https://your-node.example.com" required
                className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-3 py-2 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none" />
            </div>
            <div>
              <label className="text-ghost-muted font-mono text-xs mb-1 block">GPU Model</label>
              <input value={form.gpuModel} onChange={e => setForm(f => ({ ...f, gpuModel: e.target.value }))} placeholder="NVIDIA DGX Air H100"
                className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-3 py-2 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none" />
            </div>
            <div>
              <label className="text-ghost-muted font-mono text-xs mb-1 block">VRAM (GB)</label>
              <input type="number" value={form.vramGb} onChange={e => setForm(f => ({ ...f, vramGb: e.target.value }))} placeholder="96"
                className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-3 py-2 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none" />
            </div>
            <div>
              <label className="text-ghost-muted font-mono text-xs mb-1 block">Storage (GB)</label>
              <input type="number" value={form.storageGb} onChange={e => setForm(f => ({ ...f, storageGb: e.target.value }))} placeholder="500"
                className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-3 py-2 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none" />
            </div>
            <div>
              <label className="text-ghost-muted font-mono text-xs mb-1 block">Payout Wallet</label>
              <input value={form.walletAddress} onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))} placeholder="0x..."
                className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-3 py-2 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none" />
            </div>
          </div>

          {error && <p className="text-ghost-red font-mono text-xs">{error}</p>}

          <Button type="submit" loading={saving}>
            {node ? 'Update Node' : 'Register Node'}
          </Button>
        </form>
      </GlowCard>

      {node && (
        <GlowCard glow="purple">
          <h2 className="text-ghost-purple font-mono text-sm tracking-widest uppercase mb-3">Heartbeat Agent</h2>
          <p className="text-ghost-muted font-mono text-xs mb-3">Run this script on your node server to stay marked as online and report loaded models every 60 seconds:</p>
          <pre className="bg-ghost-darker rounded-lg p-4 text-xs font-mono text-ghost-cyan overflow-x-auto">{`#!/bin/bash
# Save as heartbeat.sh and run: bash heartbeat.sh
NODE_ID="${node.id}"
API="https://ghost-boy-llm.vercel.app/api/nodes/heartbeat"

while true; do
  curl -s -X POST "$API" \\
    -H "Authorization: Bearer $NODE_ID" \\
    -H "Content-Type: application/json"
  sleep 60
done`}</pre>
        </GlowCard>
      )}
    </div>
  );
}
