import Link from 'next/link';
import { ChainDashboard } from '@/components/chains/ChainDashboard';
import { Button } from '@/components/ui/Button';
import { Server, Cpu, Zap, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <>
      {/* ── FULL-SCREEN FIRST VIEW ─────────────────────────────────── */}
      <div
        className="relative flex flex-col"
        style={{ height: 'calc(100vh - 4rem)' }}
      >
        {/* Background grid + radial */}
        <div
          className="fixed inset-0 bg-grid-pattern pointer-events-none"
          style={{ backgroundSize: '40px 40px' }}
        />
        <div className="fixed inset-0 bg-radial-ghost pointer-events-none" />

        {/* ── HERO ROW ── */}
        <div className="relative flex flex-col md:flex-row items-center justify-between px-6 md:px-12 pt-6 pb-4 gap-4 shrink-0">
          {/* Logo + tagline */}
          <div className="flex flex-col items-start">
            <div
              className="font-mono font-bold leading-none animate-flicker"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                color: '#00f5ff',
                textShadow: '0 0 20px #00f5ff60, 0 0 40px #00f5ff30',
              }}
            >
              𝔾ℍ𝟘𝕊𝕋_𝔹𝟘𝕐
            </div>
            <div
              className="font-mono font-bold leading-none"
              style={{
                fontSize: 'clamp(1.2rem, 2.5vw, 2rem)',
                color: '#7b2fff',
                textShadow: '0 0 15px #7b2fff60',
              }}
            >
              EV-LLM Oracle
            </div>
            <p className="text-ghost-muted font-mono text-xs mt-1 italic">
              In memory of GHOST — April 7, 2025 🐕
            </p>
          </div>

          {/* Stats + CTAs */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-4">
              {[
                { label: '7', sub: 'Chains' },
                { label: 'PoW/PoC', sub: 'Consensus' },
                { label: '96GB', sub: 'VRAM nodes' },
                { label: 'Sepolia', sub: 'On-chain' },
              ].map(s => (
                <div key={s.sub} className="text-center">
                  <div className="font-mono font-bold text-ghost-cyan" style={{ fontSize: 'clamp(1rem,2vw,1.5rem)' }}>
                    {s.label}
                  </div>
                  <div className="text-ghost-muted text-xs font-mono">{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap justify-end">
              <Link href="/chat"><Button size="sm">Launch Chat</Button></Link>
              <Link href="/network"><Button variant="secondary" size="sm">Live Network</Button></Link>
              <Link href="/node-program">
                <Button variant="ghost" size="sm" className="text-ghost-purple hover:text-ghost-purple border border-ghost-purple/30 hover:border-ghost-purple/60">
                  Node Program
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ── CHAIN DASHBOARD (fills remaining space) ── */}
        <div className="relative flex-1 px-4 md:px-8 pb-4 min-h-0">
          <ChainDashboard />
        </div>
      </div>

      {/* ── BELOW FOLD ─────────────────────────────────────────────── */}
      <div className="relative">
        <div className="fixed inset-0 bg-grid-pattern pointer-events-none" style={{ backgroundSize: '40px 40px' }} />

        {/* How it works */}
        <section className="relative max-w-5xl mx-auto px-4 py-20">
          <h2 className="text-lg font-mono font-bold text-ghost-cyan mb-10 text-center tracking-widest">
            HOW IT WORKS
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { step: '01', title: 'Connect', color: 'text-ghost-cyan', border: 'border-ghost-cyan/20',
                desc: 'Connect your wallet or sign in with email. New accounts receive 10,000 free tokens.' },
              { step: '02', title: 'Top Up', color: 'text-ghost-purple', border: 'border-ghost-purple/20',
                desc: 'Buy token credits with card or ETH. One-time packs never expire. Monthly subscriptions for heavy use.' },
              { step: '03', title: 'Query', color: 'text-ghost-green', border: 'border-ghost-green/20',
                desc: 'Chat with the Oracle. Prompts route through the 7-chain consensus network, backed by local Ollama inference.' },
            ].map(item => (
              <div key={item.step} className={`bg-ghost-card border ${item.border} rounded-xl p-6`}>
                <div className={`text-4xl font-mono font-bold mb-3 ${item.color} opacity-30`}>{item.step}</div>
                <div className="font-mono font-bold text-ghost-text mb-2">{item.title}</div>
                <div className="text-ghost-muted text-sm font-mono leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Node Operator Program teaser */}
        <section className="relative max-w-5xl mx-auto px-4 pb-24">
          <div className="border border-ghost-purple/30 rounded-2xl p-8 bg-ghost-card/60 backdrop-blur relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-ghost opacity-50 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <Server size={20} className="text-ghost-purple" />
                <span className="font-mono font-bold text-ghost-purple tracking-widest text-sm">NODE OPERATOR PROGRAM</span>
              </div>
              <h3
                className="font-mono font-bold mb-4"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', color: '#c8c8e0' }}
              >
                Own your AI infrastructure.
              </h3>
              <p className="text-ghost-muted font-mono text-sm mb-6 max-w-2xl leading-relaxed">
                WATTX Chain members can apply for a 1-year trial on NVIDIA DGX Air hardware — 96GB VRAM,
                up to 500GB storage, and a dedicated GH0ST_B0Y EV-LLM instance. Share compute,
                earn token rewards, and become part of the decentralized network.
              </p>
              <div className="grid sm:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: Cpu, label: '96GB VRAM', sub: 'NVIDIA DGX Air' },
                  { icon: Server, label: '500GB', sub: 'Storage per node' },
                  { icon: Zap, label: 'Earn', sub: 'Rent compute & relay' },
                  { icon: Globe, label: '$200/yr', sub: 'Unlimited use' },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex flex-col items-center p-4 bg-ghost-darker rounded-xl border border-ghost-border">
                    <Icon size={18} className="text-ghost-purple mb-2" />
                    <div className="font-mono font-bold text-ghost-cyan text-sm">{label}</div>
                    <div className="text-ghost-muted text-xs font-mono mt-1 text-center">{sub}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 flex-wrap">
                <Link href="/node-program">
                  <Button variant="secondary" className="border-ghost-purple/40 text-ghost-purple hover:border-ghost-purple">
                    Learn about the Node Program
                  </Button>
                </Link>
                <span className="text-ghost-muted font-mono text-xs self-center">
                  Requires @wattxchain.org email
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
