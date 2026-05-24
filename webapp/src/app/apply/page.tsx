'use client';
import { useState } from 'react';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';

const RESOURCE_TYPES = [
  { id: 'gpu', label: 'GPU Compute', desc: 'Rent out VRAM for LLM inference tasks', earn: '$0.10–0.40 / hour' },
  { id: 'cpu', label: 'CPU Compute', desc: 'Handle tokenization, pre/post-processing', earn: '$0.02–0.05 / hour' },
  { id: 'ram', label: 'Memory (RAM)', desc: 'In-memory model caching and context windows', earn: '$0.01–0.03 / GB / hour' },
  { id: 'storage', label: 'Storage (HDD/SSD)', desc: 'Host model weights and datasets', earn: '$0.005–0.01 / GB / month' },
  { id: 'bandwidth', label: 'Network Bandwidth', desc: 'Stream inference results to end users', earn: '$0.01–0.05 / GB' },
  { id: 'relay', label: 'Network Relay', desc: 'Route requests between nodes in the mesh', earn: '$5–20 / month flat' },
];

export default function ApplyPage() {
  const [form, setForm] = useState({ email: '', walletAddress: '', motivation: '' });
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string; status?: string } | null>(null);

  function toggleResource(id: string) {
    setSelectedResources(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/nodes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, resources: selectedResources }),
      });
      const data = await res.json();
      if (!res.ok) setResult({ error: data.error, status: data.status });
      else setResult({ success: true });
    } catch {
      setResult({ error: 'Network error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center space-y-3">
        <div className="text-xs font-mono text-ghost-cyan tracking-widest uppercase">Node Operator Program</div>
        <h1 className="text-3xl font-mono font-bold text-ghost-text">
          Apply to Run a <span className="text-ghost-purple">GH0ST_B0Y Node</span>
        </h1>
        <p className="text-ghost-muted font-mono text-sm max-w-xl mx-auto">
          Rent your hardware to the decentralized LLM network. Requires a @wattxchain.org email — earn tokens for every inference your node serves.
        </p>
      </div>

      {result?.success ? (
        <GlowCard glow="green">
          <div className="text-center space-y-2 py-4">
            <div className="text-2xl font-mono text-ghost-green">Application Submitted</div>
            <p className="text-ghost-muted font-mono text-sm">
              We'll review your application and reply to your @wattxchain.org email within 48 hours.
            </p>
          </div>
        </GlowCard>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <GlowCard glow="cyan">
            <h2 className="text-ghost-cyan font-mono text-sm tracking-widest uppercase mb-4">Contact Info</h2>
            <div className="space-y-4">
              <div>
                <label className="text-ghost-muted font-mono text-xs mb-1 block">@wattxchain.org Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="yourname@wattxchain.org"
                  className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-4 py-2.5 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none"
                />
              </div>
              <div>
                <label className="text-ghost-muted font-mono text-xs mb-1 block">Wallet Address (for earnings)</label>
                <input
                  type="text"
                  value={form.walletAddress}
                  onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))}
                  placeholder="0x..."
                  className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-4 py-2.5 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none"
                />
              </div>
            </div>
          </GlowCard>

          <GlowCard glow="purple">
            <h2 className="text-ghost-purple font-mono text-sm tracking-widest uppercase mb-4">Hardware to Rent</h2>
            <p className="text-ghost-muted font-mono text-xs mb-4">Select all resources you want to contribute to the network:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RESOURCE_TYPES.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleResource(r.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selectedResources.includes(r.id)
                      ? 'border-ghost-purple bg-ghost-purple/10 text-ghost-text'
                      : 'border-ghost-border bg-ghost-darker text-ghost-muted hover:border-ghost-purple/50'
                  }`}
                >
                  <div className="font-mono text-sm font-semibold">{r.label}</div>
                  <div className="font-mono text-xs mt-1 opacity-75">{r.desc}</div>
                  <div className="font-mono text-xs mt-1 text-ghost-green">{r.earn}</div>
                </button>
              ))}
            </div>
          </GlowCard>

          <GlowCard glow="cyan">
            <h2 className="text-ghost-cyan font-mono text-sm tracking-widest uppercase mb-4">Tell Us About Your Setup</h2>
            <textarea
              value={form.motivation}
              onChange={e => setForm(f => ({ ...f, motivation: e.target.value }))}
              placeholder="GPU model, available uptime, location, why you want to join..."
              rows={4}
              className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-4 py-2.5 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none resize-none"
            />
          </GlowCard>

          {result?.error && (
            <div className="p-3 bg-ghost-red/10 border border-ghost-red/30 rounded-lg text-ghost-red text-xs font-mono">
              {result.error}
              {result.status && ` — Current status: ${result.status}`}
            </div>
          )}

          <Button type="submit" className="w-full justify-center" loading={loading}>
            Submit Application
          </Button>
        </form>
      )}
    </div>
  );
}
