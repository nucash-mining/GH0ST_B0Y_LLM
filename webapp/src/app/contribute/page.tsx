'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { CheckCircle, Link2 } from 'lucide-react';

const CONTRACT_ADDRESS = '0x54b8c1c669bceb0574d0622b2cf4c18e6efb15b8' as const;
const CONTRACT_ABI = [
  {
    inputs: [
      { name: 'fingerprint',    type: 'bytes32' },
      { name: 'benchmarkScore', type: 'uint256' },
      { name: 'vramGb',         type: 'uint256' },
      { name: 'ramGb',          type: 'uint256' },
      { name: 'ollamaUrl',      type: 'string'  },
      { name: 'agentVersion',   type: 'string'  },
    ],
    name: 'registerNode',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

const RESOURCES = [
  { id: 'gpu',       label: 'GPU',       icon: '⚡', desc: 'Run LLM inference tasks',        earn: 'up to $0.40/hr' },
  { id: 'cpu',       label: 'CPU',       icon: '🔲', desc: 'Tokenization & preprocessing',    earn: 'up to $0.05/hr' },
  { id: 'ram',       label: 'RAM',       icon: '💾', desc: 'Model caching & context windows', earn: 'up to $0.03/GB/hr' },
  { id: 'storage',   label: 'Storage',   icon: '🗄️', desc: 'Host model weights & datasets',  earn: 'up to $0.01/GB/mo' },
  { id: 'bandwidth', label: 'Bandwidth', icon: '📡', desc: 'Stream results to users',         earn: 'up to $0.05/GB' },
  { id: 'relay',     label: 'Relay',     icon: '🔗', desc: 'Route requests in the mesh',      earn: '$5–20/mo flat' },
];

const SPECS = [
  { label: 'GPU Model',    key: 'gpuModel',   placeholder: 'RTX 4090, RX 7900 XTX…' },
  { label: 'VRAM (GB)',    key: 'vramGb',     placeholder: '24', type: 'number' },
  { label: 'CPU Model',   key: 'cpuModel',   placeholder: 'Ryzen 9 7950X, i9-14900K…' },
  { label: 'RAM (GB)',     key: 'ramGb',      placeholder: '32', type: 'number' },
  { label: 'Storage (GB)', key: 'storageGb',  placeholder: '2000', type: 'number' },
  { label: 'Payout Wallet', key: 'walletAddress', placeholder: '0x…' },
];

export default function ContributePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { address: walletAddress, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContract, data: txHash, isPending: txPending, error: txError } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [resources, setResources] = useState<string[]>(['gpu']);
  const [name, setName] = useState('');
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [chainStep, setChainStep] = useState<'idle' | 'connecting' | 'sending' | 'confirming' | 'done'>('idle');
  const [chainNotified, setChainNotified] = useState(false);

  // After tx confirms, notify backend
  useEffect(() => {
    if (txConfirmed && txHash && walletAddress && !chainNotified) {
      setChainStep('done');
      setChainNotified(true);
      fetch('/api/nodes/chain-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${agentToken}` },
        body: JSON.stringify({ txHash, walletAddress, fingerprint: null }),
      }).catch(() => {});
    }
  }, [txConfirmed, txHash, walletAddress, agentToken, chainNotified]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin?callbackUrl=/contribute');
  }, [status, router]);

  function toggle(id: string) {
    setResources(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  }

  async function registerOnChain() {
    if (!isConnected) { openConnectModal?.(); return; }
    setChainStep('sending');
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'registerNode',
        args: [
          ('0x' + '0'.repeat(64)) as `0x${string}`, // fingerprint set by agent
          BigInt(0),    // benchmarkScore set by agent
          BigInt(specs.vramGb ? parseInt(specs.vramGb) : 0),
          BigInt(specs.ramGb ? parseInt(specs.ramGb) : 0),
          '',           // ollamaUrl set by agent on first heartbeat
          '3.0.0',
        ],
        value: parseEther('0.01'),
      });
      setChainStep('confirming');
    } catch {
      setChainStep('idle');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resources.length) { setError('Select at least one resource to contribute'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/nodes/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || `${session?.user?.email?.split('@')[0]}'s PC`,
          resources,
          gpuModel: specs.gpuModel || undefined,
          cpuModel: specs.cpuModel || undefined,
          vramGb: specs.vramGb ? parseInt(specs.vramGb) : undefined,
          ramGb: specs.ramGb ? parseInt(specs.ramGb) : undefined,
          storageGb: specs.storageGb ? parseInt(specs.storageGb) : undefined,
          walletAddress: specs.walletAddress || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAgentToken(data.agentToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center space-y-3">
        <div className="text-xs font-mono text-ghost-green tracking-widest uppercase">Hardware Network</div>
        <h1 className="text-3xl font-mono font-bold text-ghost-text">
          Contribute Your <span className="text-ghost-green">PC Hardware</span>
        </h1>
        <p className="text-ghost-muted font-mono text-sm max-w-xl mx-auto">
          Turn your idle GPU, CPU, RAM, and storage into passive income. Run the GH0ST_B0Y agent on any PC — it installs Ollama automatically and connects your hardware to the decentralized LLM network.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { v: 'Any GPU', l: 'NVIDIA, AMD, Intel Arc' },
          { v: 'CPU-only OK', l: 'No GPU required' },
          { v: 'Earn tokens', l: 'Per inference served' },
        ].map(s => (
          <GlowCard key={s.v} glow="green">
            <div className="text-ghost-green font-mono text-sm font-bold">{s.v}</div>
            <div className="text-ghost-muted font-mono text-xs mt-1">{s.l}</div>
          </GlowCard>
        ))}
      </div>

      {agentToken ? (
        <div className="space-y-6">
          <GlowCard glow="green">
            <div className="text-center space-y-2 mb-6">
              <div className="text-ghost-green font-mono text-lg font-bold">Node Registered</div>
              <p className="text-ghost-muted font-mono text-xs">Your agent token — keep this secret. It identifies your node.</p>
              <div className="bg-ghost-darker rounded-lg px-4 py-3 font-mono text-xs text-ghost-cyan break-all border border-ghost-cyan/20">
                {agentToken}
              </div>
            </div>

            <h3 className="text-ghost-green font-mono text-sm tracking-widest uppercase mb-3">Start Contributing</h3>
            <p className="text-ghost-muted font-mono text-xs mb-3">
              Download the agent and run it. It auto-installs Ollama and connects your hardware.
            </p>

            <div className="space-y-3">
              <div>
                <div className="text-ghost-muted font-mono text-xs mb-2 uppercase tracking-widest">Linux / macOS — one-line install</div>
                <pre className="bg-ghost-darker rounded-lg p-3 text-xs font-mono text-ghost-cyan overflow-x-auto whitespace-pre-wrap break-all">
{`curl -fsSL https://ghost-boy-llm.vercel.app/install.sh | bash -s -- --token ${agentToken}`}
                </pre>
              </div>
              <div>
                <div className="text-ghost-muted font-mono text-xs mb-2 uppercase tracking-widest">Windows — PowerShell one-liner</div>
                <pre className="bg-ghost-darker rounded-lg p-3 text-xs font-mono text-ghost-cyan overflow-x-auto whitespace-pre-wrap break-all">
{`iex (irm https://ghost-boy-llm.vercel.app/install.ps1); & "$env:USERPROFILE\\.ghostboy\\start.bat"`}
                </pre>
              </div>
              <div>
                <div className="text-ghost-muted font-mono text-xs mb-2 uppercase tracking-widest">Manual (Python 3.8+)</div>
                <pre className="bg-ghost-darker rounded-lg p-3 text-xs font-mono text-ghost-cyan overflow-x-auto whitespace-pre-wrap break-all">
{`curl -O https://ghost-boy-llm.vercel.app/ghostboy-agent.py
python3 ghostboy-agent.py --token ${agentToken}`}
                </pre>
              </div>
            </div>
          </GlowCard>

              {/* On-chain registration */}
          <GlowCard glow="purple">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={14} className="text-ghost-purple" />
              <h3 className="text-ghost-purple font-mono text-sm tracking-widest uppercase">
                Step 2 — Register On-Chain <span className="text-ghost-muted font-mono text-xs normal-case">(optional but recommended)</span>
              </h3>
            </div>

            <p className="text-ghost-muted font-mono text-xs mb-4 leading-relaxed">
              Stake <strong className="text-ghost-cyan">0.01 ETH on Sepolia</strong> to add your node to the{' '}
              <a href="https://sepolia.etherscan.io/address/0x54b8c1c669bceb0574d0622b2cf4c18e6efb15b8"
                target="_blank" rel="noopener noreferrer"
                className="text-ghost-purple hover:text-ghost-cyan underline underline-offset-2">
                ComputeRegistry contract
              </a>.
              On-chain nodes are prioritised for job routing and earn ETH directly from job settlements.
              Your private key never leaves your wallet — the transaction is signed locally by MetaMask.
            </p>

            {chainStep === 'done' || txConfirmed ? (
              <div className="flex items-center gap-3 p-3 bg-ghost-green/10 border border-ghost-green/30 rounded-lg">
                <CheckCircle size={16} className="text-ghost-green shrink-0" />
                <div>
                  <div className="text-ghost-green font-mono text-sm font-bold">Registered on Sepolia</div>
                  {txHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-ghost-muted font-mono text-xs hover:text-ghost-cyan"
                    >
                      {txHash.slice(0, 18)}… ↗
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {!isConnected ? (
                  <Button variant="secondary" className="border-ghost-purple/40 text-ghost-purple" onClick={() => openConnectModal?.()}>
                    Connect Wallet
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-ghost-muted font-mono text-xs">
                      {walletAddress?.slice(0, 10)}…{walletAddress?.slice(-6)}
                    </span>
                    <Button
                      variant="secondary"
                      className="border-ghost-purple/40 text-ghost-purple hover:border-ghost-purple"
                      onClick={registerOnChain}
                      loading={txPending || chainStep === 'confirming'}
                    >
                      {chainStep === 'confirming' ? 'Confirming…' : 'Stake 0.01 ETH & Register'}
                    </Button>
                  </div>
                )}
                {txError && (
                  <p className="text-ghost-red font-mono text-xs">{txError.message?.slice(0, 120)}</p>
                )}
                <p className="text-ghost-muted/60 font-mono text-xs">
                  Network: Sepolia testnet · Contract: 0x54b8…B15B8 · Min stake: 0.01 ETH
                </p>
              </div>
            )}
          </GlowCard>

          <GlowCard glow="cyan">
            <h3 className="text-ghost-cyan font-mono text-sm tracking-widest uppercase mb-2">What happens next</h3>
            <ul className="space-y-2 text-ghost-muted font-mono text-xs">
              <li>• Agent detects your GPU/CPU/RAM and installs Ollama if missing</li>
              <li>• Runs a benchmark test and submits your hardware score to the network</li>
              <li>• Sends a heartbeat every 60 s — your node appears on the <a href="/network" className="text-ghost-cyan hover:underline">network page</a></li>
              <li>• Chat requests route to your node when you're the best fit (VRAM, benchmark, load)</li>
              <li>• On-chain nodes earn ETH per job · Off-chain nodes earn token credits</li>
            </ul>
          </GlowCard>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <GlowCard glow="green">
            <h2 className="text-ghost-green font-mono text-sm tracking-widest uppercase mb-4">What to Contribute</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {RESOURCES.map(r => (
                <button key={r.id} type="button" onClick={() => toggle(r.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    resources.includes(r.id)
                      ? 'border-ghost-green bg-ghost-green/10 text-ghost-text'
                      : 'border-ghost-border bg-ghost-darker text-ghost-muted hover:border-ghost-green/40'
                  }`}>
                  <div className="text-lg mb-1">{r.icon}</div>
                  <div className="font-mono text-sm font-semibold">{r.label}</div>
                  <div className="font-mono text-xs opacity-70 mt-0.5">{r.desc}</div>
                  <div className="font-mono text-xs text-ghost-green mt-1">{r.earn}</div>
                </button>
              ))}
            </div>
          </GlowCard>

          <GlowCard glow="cyan">
            <h2 className="text-ghost-cyan font-mono text-sm tracking-widest uppercase mb-4">Your Hardware</h2>
            <div className="space-y-3">
              <div>
                <label className="text-ghost-muted font-mono text-xs mb-1 block">Node Name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder={`${session?.user?.email?.split('@')[0] ?? 'my'}'s PC`}
                  className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-3 py-2 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SPECS.map(s => (
                  <div key={s.key}>
                    <label className="text-ghost-muted font-mono text-xs mb-1 block">{s.label}</label>
                    <input
                      type={s.type ?? 'text'}
                      value={specs[s.key] ?? ''}
                      onChange={e => setSpecs(p => ({ ...p, [s.key]: e.target.value }))}
                      placeholder={s.placeholder}
                      className="w-full bg-ghost-darker border border-ghost-border rounded-lg px-3 py-2 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>

          {error && <p className="text-ghost-red font-mono text-xs">{error}</p>}

          <Button type="submit" className="w-full justify-center" loading={loading}>
            Register My Hardware
          </Button>
        </form>
      )}
    </div>
  );
}
