/**
 * compute-mesh.ts
 *
 * VRAM-aware job routing and multi-node compute pooling.
 *
 * Routing priority:
 *   1. Single node that fits the model in VRAM (least-loaded first)
 *   2. Quantized fallback (smaller model on available node)
 *   3. Job queue (no nodes online → waits for one to come up)
 *
 * Multi-node combining (ComputeCluster):
 *   When no single node has enough VRAM, we build a cluster. The first node
 *   in the cluster acts as the primary inference server; other nodes are
 *   registered as RPC workers via llama.cpp --rpc (if the agent supports it).
 *   In Ollama-only mode, the cluster falls back to the single best node.
 */

import { prisma } from './prisma';

// ── Model VRAM requirements (GB) ──────────────────────────────────────────────

const MODEL_VRAM: Record<string, number> = {
  'llama3.2:1b':   2,
  'llama3.2:3b':   3,
  'llama3.2':      4,   // alias for 8b
  'llama3.2:8b':   5,
  'llama3.1:8b':   5,
  'mistral':       6,
  'mistral:7b':    6,
  'llama3.1:13b':  10,
  'llama3.1:30b':  20,
  'llama3.1:70b':  40,
  'llama3.3:70b':  40,
  'deepseek-r1':   8,
  'deepseek-r1:7b': 5,
  'deepseek-r1:32b': 20,
  'deepseek-r1:70b': 40,
  'qwen2.5:7b':    5,
  'qwen2.5:14b':   10,
  'qwen2.5:32b':   20,
  'qwen2.5:72b':   42,
  'phi3':          4,
  'phi3:mini':     2,
  'gemma2:9b':     6,
  'gemma2:27b':    18,
  'codellama':     6,
  'codellama:13b': 10,
  'codellama:34b': 22,
};

// Quantized fallbacks: if preferred model won't fit, try these in order
const QUANT_FALLBACK: Record<string, string[]> = {
  'llama3.1:70b':  ['llama3.1:30b', 'llama3.1:13b', 'llama3.1:8b', 'llama3.2:3b'],
  'llama3.3:70b':  ['llama3.1:30b', 'llama3.1:13b', 'llama3.1:8b', 'llama3.2:3b'],
  'deepseek-r1:70b': ['deepseek-r1:32b', 'deepseek-r1:7b', 'llama3.2'],
  'qwen2.5:72b':   ['qwen2.5:32b', 'qwen2.5:14b', 'qwen2.5:7b', 'llama3.2'],
  'llama3.1:30b':  ['llama3.1:13b', 'llama3.1:8b', 'llama3.2:3b'],
  'codellama:34b': ['codellama:13b', 'codellama', 'llama3.2'],
};

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000;

export function vramRequired(model: string): number {
  const exact = MODEL_VRAM[model];
  if (exact) return exact;
  // Fuzzy match prefix
  for (const [k, v] of Object.entries(MODEL_VRAM)) {
    if (model.startsWith(k) || k.startsWith(model)) return v;
  }
  return 6; // conservative default
}

// ── Node query helpers ────────────────────────────────────────────────────────

export type LiveNode = {
  id: string;
  ollamaUrl: string;
  peerUrl: string | null;
  modelsLoaded: string[];
  tokensServed: number;
  vramGb: number | null;
  benchmarkScore: number | null;
  chainRegistered: boolean;
};

export async function getLiveNodes(model?: string): Promise<LiveNode[]> {
  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);
  const vram = model ? vramRequired(model) : 0;

  const rows = await prisma.node.findMany({
    where: {
      approved: true,
      status: 'active',
      lastHeartbeat: { gte: cutoff },
      ...(model ? { modelsLoaded: { has: model } } : {}),
      ...(vram > 0 ? { vramGb: { gte: vram } } : {}),
    },
    orderBy: [
      { benchmarkScore: 'desc' }, // fastest first
      { tokensServed: 'asc' },    // then least loaded
    ],
    select: {
      id: true,
      ollamaUrl: true,
      peerUrl: true,
      modelsLoaded: true,
      tokensServed: true,
      vramGb: true,
      benchmarkScore: true,
      chainRegistered: true,
    },
  });

  return rows as LiveNode[];
}

export async function getAllLiveNodes(): Promise<LiveNode[]> {
  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);

  const rows = await prisma.node.findMany({
    where: {
      approved: true,
      status: 'active',
      lastHeartbeat: { gte: cutoff },
    },
    orderBy: { tokensServed: 'asc' },
    select: {
      id: true,
      ollamaUrl: true,
      peerUrl: true,
      modelsLoaded: true,
      tokensServed: true,
      vramGb: true,
      benchmarkScore: true,
      chainRegistered: true,
    },
  });

  return rows as LiveNode[];
}

// ── Compute resolution ────────────────────────────────────────────────────────

export type ComputeResolution =
  | { type: 'single';   nodeId: string; url: string; model: string }
  | { type: 'cluster';  clusterId: string; primaryNodeId: string; url: string; model: string; rpcUrls: string[] }
  | { type: 'queued';   model: string }
  | { type: 'fallback'; url: string; model: string }; // env OLLAMA_URL

/**
 * Resolve where to run inference for the given model.
 * Prefers on-chain registered nodes.
 */
export async function resolveCompute(
  requestedModel: string,
  jobId?: string,
): Promise<ComputeResolution> {
  const model = requestedModel || process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2';

  // 1. Try single node that has the model loaded and enough VRAM
  const fit = await getLiveNodes(model);
  if (fit.length > 0) {
    // Prefer on-chain registered nodes
    const onChain = fit.filter(n => n.chainRegistered);
    const best = onChain.length > 0 ? onChain[0] : fit[0];
    return { type: 'single', nodeId: best.id, url: best.ollamaUrl, model };
  }

  // 2. Try cluster: combine nodes with enough total VRAM
  const needed = vramRequired(model);
  const cluster = await buildCluster(model, needed, jobId);
  if (cluster) return cluster;

  // 3. Try quantized fallback
  const fallbacks = QUANT_FALLBACK[model] ?? [];
  for (const fallbackModel of fallbacks) {
    const fbNodes = await getLiveNodes(fallbackModel);
    if (fbNodes.length > 0) {
      const best = fbNodes.find(n => n.chainRegistered) ?? fbNodes[0];
      return { type: 'single', nodeId: best.id, url: best.ollamaUrl, model: fallbackModel };
    }
  }

  // 4. Env fallback (centralized Ollama)
  if (process.env.OLLAMA_URL) {
    return { type: 'fallback', url: process.env.OLLAMA_URL, model };
  }

  // 5. Queue
  return { type: 'queued', model };
}

// ── Cluster building ──────────────────────────────────────────────────────────

async function buildCluster(
  model: string,
  neededVram: number,
  jobId?: string,
): Promise<Extract<ComputeResolution, { type: 'cluster' }> | null> {
  const all = await getAllLiveNodes();
  if (all.length === 0) return null;

  // Greedy: pick nodes until combined VRAM >= needed
  let accumulated = 0;
  const selected: LiveNode[] = [];

  // Prefer on-chain nodes first
  const sorted = [...all].sort((a, b) => {
    if (a.chainRegistered && !b.chainRegistered) return -1;
    if (!a.chainRegistered && b.chainRegistered) return 1;
    return (b.vramGb ?? 0) - (a.vramGb ?? 0);
  });

  for (const node of sorted) {
    selected.push(node);
    accumulated += node.vramGb ?? 0;
    if (accumulated >= neededVram) break;
  }

  if (accumulated < neededVram) return null; // not enough combined VRAM

  const primary = selected[0];
  const rpcNodes = selected.slice(1);

  // Record in DB
  const cluster = await prisma.computeCluster.create({
    data: {
      jobId: jobId ?? `cluster-${Date.now()}`,
      model,
      status: 'running',
      nodes: {
        create: selected.map((n, i) => ({
          nodeId: n.id,
          layerStart: null,
          layerEnd: null,
        })),
      },
    },
  });

  return {
    type: 'cluster',
    clusterId: cluster.id,
    primaryNodeId: primary.id,
    url: primary.ollamaUrl,
    model,
    rpcUrls: rpcNodes.map(n => n.peerUrl ?? n.ollamaUrl),
  };
}

// ── Earnings recording ────────────────────────────────────────────────────────

export async function recordNodeUsage(
  nodeId: string,
  userId: string,
  tokens: number,
): Promise<void> {
  const usdValue = tokens / Number(process.env.TOKENS_PER_USD ?? 100_000);

  await prisma.$transaction([
    prisma.node.update({
      where: { id: nodeId },
      data: { tokensServed: { increment: tokens } },
    }),
    prisma.nodeEarning.create({
      data: { nodeId, userId, tokens, usdValue },
    }),
  ]);
}

export async function recordClusterUsage(
  clusterId: string,
  userId: string,
  tokens: number,
): Promise<void> {
  const cluster = await prisma.computeCluster.findUnique({
    where: { id: clusterId },
    include: { nodes: true },
  });
  if (!cluster) return;

  const perNode = Math.floor(tokens / cluster.nodes.length);
  const usdPerNode = perNode / Number(process.env.TOKENS_PER_USD ?? 100_000);

  await prisma.$transaction([
    ...cluster.nodes.map(cn =>
      prisma.node.update({
        where: { id: cn.nodeId },
        data: { tokensServed: { increment: perNode } },
      }),
    ),
    ...cluster.nodes.map(cn =>
      prisma.nodeEarning.create({
        data: { nodeId: cn.nodeId, userId, tokens: perNode, usdValue: usdPerNode },
      }),
    ),
    prisma.computeCluster.update({
      where: { id: clusterId },
      data: { status: 'complete' },
    }),
  ]);
}

// ── Peer list (for agent discovery) ──────────────────────────────────────────

export type PeerInfo = {
  id: string;
  peerUrl: string;
  vramGb: number | null;
  modelsLoaded: string[];
  benchmarkScore: number | null;
};

export async function getPeerList(): Promise<PeerInfo[]> {
  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);

  const rows = await prisma.node.findMany({
    where: {
      approved: true,
      status: 'active',
      lastHeartbeat: { gte: cutoff },
      peerUrl: { not: null },
    },
    select: {
      id: true,
      peerUrl: true,
      vramGb: true,
      modelsLoaded: true,
      benchmarkScore: true,
    },
  });

  return rows
    .filter(r => r.peerUrl !== null)
    .map(r => ({ ...r, peerUrl: r.peerUrl! }));
}
