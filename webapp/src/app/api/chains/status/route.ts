import { isOllamaRunning, listModels } from '@/lib/ollama';

const CHAINS = [
  { name: 'CPU', type: 'The Mind', proof: 'Proof of Work' },
  { name: 'GPU', type: 'The Parallel', proof: 'Proof of Compute' },
  { name: 'MEMORY', type: 'The Living', proof: 'Proof of Memory' },
  { name: 'STORAGE', type: 'The Persistent', proof: 'Proof of Storage' },
  { name: 'NETWORK', type: 'The Connected', proof: 'Proof of Bandwidth' },
  { name: 'INPUT', type: 'The Inward', proof: 'Proof of Input' },
  { name: 'OUTPUT', type: 'The Multiplier', proof: 'Proof of Output' },
];

export async function GET() {
  const [ollamaRunning, models] = await Promise.all([
    isOllamaRunning(),
    listModels(),
  ]);

  const chains = CHAINS.map((chain, i) => ({
    ...chain,
    status: ollamaRunning ? 'online' : 'offline',
    blockHeight: 1_000_000 + i * 42_000 + Math.floor(Math.random() * 100),
    peers: Math.floor(Math.random() * 8) + 1,
    hashRate: chain.name === 'CPU' || chain.name === 'GPU'
      ? `${(Math.random() * 100).toFixed(1)} MH/s`
      : undefined,
  }));

  return Response.json({
    chains,
    ollamaRunning,
    models,
    genesisHash: 'fc2863ac212d5c3b6f4f6d5d0748b31580db92dbb3563dec2953c7f82a4a38d9',
  });
}
