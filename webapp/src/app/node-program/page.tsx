import Link from 'next/link';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { Cpu, HardDrive, Zap, Globe, Shield, DollarSign, Server, Network } from 'lucide-react';

export const metadata = {
  title: 'Node Operator Program | GH0ST_B0Y Oracle',
  description: 'Run your own GH0ST_B0Y EV-LLM instance on NVIDIA DGX Air hardware. 96GB VRAM. Earn by sharing compute.',
};

const SPECS = [
  { icon: Cpu, label: 'NVIDIA DGX Air', sub: '96 GB VRAM', color: 'text-ghost-cyan' },
  { icon: HardDrive, label: 'Storage', sub: 'Up to 500 GB per instance', color: 'text-ghost-green' },
  { icon: Zap, label: 'Inference', sub: 'Run any Ollama model locally', color: 'text-ghost-purple' },
  { icon: Globe, label: 'Network relay', sub: 'Route & earn per query', color: 'text-ghost-cyan' },
  { icon: Server, label: 'Node host', sub: 'Serve the decentralized LLM', color: 'text-ghost-green' },
  { icon: DollarSign, label: 'Earn', sub: 'Rent GPU · RAM · Storage · BW', color: 'text-ghost-purple' },
];

const EARN_ROWS = [
  { resource: 'GPU compute', unit: 'per token served', rate: 'variable' },
  { resource: 'Storage rental', unit: 'per GB / month', rate: 'variable' },
  { resource: 'Network relay', unit: 'per MB routed', rate: 'variable' },
  { resource: 'RAM availability', unit: 'per GB reserved', rate: 'variable' },
];

const STEPS = [
  {
    n: '01', title: 'Get a @wattxchain.org email',
    desc: 'Apply for a WATTX Chain organization account. This verifies your identity within the network.',
  },
  {
    n: '02', title: 'Apply for the 1-year trial',
    desc: 'Submit an application for the NVIDIA DGX Air trial program. Slots are allocated as hardware becomes available.',
  },
  {
    n: '03', title: 'Pay $200 / year',
    desc: 'Flat annual fee covers your dedicated GH0ST_B0Y instance, unlimited personal AI use, and access to the node operator dashboard.',
  },
  {
    n: '04', title: 'Your instance comes online',
    desc: 'Your own GH0ST_B0Y EV-LLM Oracle spins up with 96GB VRAM. Configure which models to run, which resources to share, and set your earn rates.',
  },
  {
    n: '05', title: 'Start earning',
    desc: 'Other users\' queries route through your node. You earn token credits for every compute unit, GB of storage, and MB of bandwidth you contribute.',
  },
];

export default function NodeProgramPage() {
  return (
    <div className="relative">
      <div
        className="fixed inset-0 bg-grid-pattern pointer-events-none"
        style={{ backgroundSize: '40px 40px' }}
      />

      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-ghost-purple/10 border border-ghost-purple/30 rounded-full font-mono text-xs text-ghost-purple mb-6">
          <Network size={12} />
          WATTX DECENTRALIZED COMPUTE NETWORK
        </div>
        <h1
          className="font-mono font-bold mb-4"
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            lineHeight: 1.1,
            background: 'linear-gradient(135deg, #00f5ff, #7b2fff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Own Your AI Node.
          <br />Earn From the Network.
        </h1>
        <p className="text-ghost-muted font-mono text-sm max-w-2xl mx-auto leading-relaxed mb-8">
          The GH0ST_B0Y Node Operator Program gives WATTX Chain members access to dedicated
          NVIDIA DGX Air hardware — 96GB VRAM, up to 500GB storage — for a flat $200/year.
          Your instance joins the decentralized LLM infrastructure and earns by sharing compute,
          storage, and bandwidth with the network.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button size="lg">Apply for Trial</Button>
          <Link href="/pricing">
            <Button variant="secondary" size="lg">Compare Plans</Button>
          </Link>
        </div>
        <p className="text-ghost-muted/60 font-mono text-xs mt-4">
          Requires @wattxchain.org email · Limited slots · 1-year term
        </p>
      </section>

      {/* Hardware specs */}
      <section className="relative max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-sm font-mono font-bold text-ghost-cyan tracking-widest mb-6 text-center">
          WHAT YOU GET
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {SPECS.map(({ icon: Icon, label, sub, color }) => (
            <GlowCard key={label} glow="purple" className="flex items-start gap-3 p-4">
              <Icon size={18} className={`${color} shrink-0 mt-0.5`} />
              <div>
                <div className="font-mono font-bold text-ghost-text text-sm">{label}</div>
                <div className="text-ghost-muted font-mono text-xs mt-0.5">{sub}</div>
              </div>
            </GlowCard>
          ))}
        </div>
      </section>

      {/* How you earn */}
      <section className="relative max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-sm font-mono font-bold text-ghost-cyan tracking-widest mb-6 text-center">
          HOW YOU EARN
        </h2>
        <GlowCard glow="green">
          <p className="text-ghost-muted font-mono text-xs mb-4">
            When other users' queries route through your node, you earn token credits
            that can be redeemed against your subscription or exchanged within the WATTX network.
          </p>
          <div className="border border-ghost-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 bg-ghost-darker px-4 py-2 text-xs font-mono text-ghost-muted border-b border-ghost-border">
              <span>Resource</span>
              <span>Billing unit</span>
              <span>Rate</span>
            </div>
            {EARN_ROWS.map(row => (
              <div key={row.resource} className="grid grid-cols-3 px-4 py-2.5 text-xs font-mono border-b border-ghost-border/50 last:border-0">
                <span className="text-ghost-cyan">{row.resource}</span>
                <span className="text-ghost-text">{row.unit}</span>
                <span className="text-ghost-green">{row.rate}</span>
              </div>
            ))}
          </div>
          <p className="text-ghost-muted/60 font-mono text-xs mt-3">
            Rates are set by network demand and will be published at launch.
          </p>
        </GlowCard>
      </section>

      {/* Steps */}
      <section className="relative max-w-3xl mx-auto px-4 pb-16">
        <h2 className="text-sm font-mono font-bold text-ghost-cyan tracking-widest mb-8 text-center">
          HOW TO JOIN
        </h2>
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div key={step.n} className="flex gap-4">
              <div className="shrink-0 flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold border"
                  style={{ borderColor: '#7b2fff60', color: '#7b2fff', background: '#7b2fff15' }}
                >
                  {step.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 mt-1" style={{ background: '#7b2fff30' }} />
                )}
              </div>
              <div className="pb-4">
                <div className="font-mono font-bold text-ghost-text text-sm mb-1">{step.title}</div>
                <div className="text-ghost-muted font-mono text-xs leading-relaxed">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative max-w-2xl mx-auto px-4 pb-24 text-center">
        <GlowCard glow="purple" className="text-center">
          <Shield size={32} className="text-ghost-purple mx-auto mb-4" />
          <h3 className="font-mono font-bold text-ghost-text text-xl mb-2">
            $200 / year
          </h3>
          <p className="text-ghost-muted font-mono text-sm mb-6 leading-relaxed">
            Unlimited personal AI use · Your own GH0ST_B0Y instance · Node operator earnings · 1-year term
          </p>
          <Button size="lg" className="mx-auto">
            Apply for the Node Program
          </Button>
          <p className="text-ghost-muted/50 font-mono text-xs mt-4">
            Applications open when @wattxchain.org email accounts are available.
            <br />Join the waitlist by signing in above.
          </p>
        </GlowCard>
      </section>
    </div>
  );
}
