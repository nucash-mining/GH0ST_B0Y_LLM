import Link from 'next/link';
import { ChainStatus } from '@/components/chains/ChainStatus';
import { Button } from '@/components/ui/Button';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      {/* Background grid */}
      <div
        className="fixed inset-0 bg-grid-pattern opacity-100 pointer-events-none"
        style={{ backgroundSize: '40px 40px' }}
      />
      <div className="fixed inset-0 bg-radial-ghost pointer-events-none" />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-4 text-center">
        <div className="mb-8 animate-float">
          <div className="text-7xl md:text-9xl font-mono font-bold text-ghost-cyan animate-flicker"
            style={{ textShadow: '0 0 30px #00f5ff60, 0 0 60px #00f5ff30' }}>
            𝔾ℍ𝟘𝕊𝕋
          </div>
          <div className="text-4xl md:text-6xl font-mono font-bold text-ghost-purple"
            style={{ textShadow: '0 0 20px #7b2fff60' }}>
            _𝔹𝟘𝕐
          </div>
        </div>

        <p className="text-ghost-text font-mono text-lg md:text-xl mb-2 max-w-xl">
          EV-LLM Oracle
        </p>
        <p className="text-ghost-muted font-mono text-sm mb-2">
          7-Chain Decentralized AI Network
        </p>
        <p className="text-ghost-muted/60 font-mono text-xs mb-10 italic">
          In memory of GHOST — April 7, 2025 🐕
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/chat">
            <Button size="lg">Launch Oracle Chat</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="secondary" size="lg">View Pricing</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 text-center">
          {[
            { label: 'Genesis Chains', value: '7' },
            { label: 'Consensus', value: 'PoW/PoC' },
            { label: 'Models', value: 'Ollama' },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-3xl font-mono font-bold text-ghost-cyan">{stat.value}</div>
              <div className="text-ghost-muted text-xs font-mono mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Chain Dashboard */}
      <section className="relative max-w-7xl mx-auto px-4 pb-20">
        <h2 className="text-xl font-mono font-bold text-ghost-cyan mb-6 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-ghost-green animate-pulse" />
          LIVE CHAIN STATUS
        </h2>
        <ChainStatus />
      </section>

      {/* How it works */}
      <section className="relative max-w-5xl mx-auto px-4 pb-24">
        <h2 className="text-xl font-mono font-bold text-ghost-cyan mb-10 text-center">HOW IT WORKS</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Connect',
              desc: 'Connect your wallet or sign up with email. Receive 10K free tokens to start.',
              color: 'text-ghost-cyan',
            },
            {
              step: '02',
              title: 'Top Up',
              desc: 'Buy token credits with a card or ETH. Tokens never expire on pay-as-you-go plans.',
              color: 'text-ghost-purple',
            },
            {
              step: '03',
              title: 'Query',
              desc: 'Chat with the Oracle. Every prompt routes through the 7-chain consensus network.',
              color: 'text-ghost-green',
            },
          ].map(item => (
            <div key={item.step} className="bg-ghost-card border border-ghost-border rounded-xl p-6">
              <div className={`text-4xl font-mono font-bold mb-3 ${item.color} opacity-40`}>
                {item.step}
              </div>
              <div className="font-mono font-bold text-ghost-text mb-2">{item.title}</div>
              <div className="text-ghost-muted text-sm font-mono">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
