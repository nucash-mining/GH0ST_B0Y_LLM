import { prisma } from './prisma';

export type ActiveNode = {
  id: string;
  ollamaUrl: string;
  modelsLoaded: string[];
  tokensServed: number;
};

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function getAvailableNodes(model?: string): Promise<ActiveNode[]> {
  const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_MS);

  const nodes = await prisma.node.findMany({
    where: {
      approved: true,
      status: 'active',
      lastHeartbeat: { gte: cutoff },
      ...(model ? { modelsLoaded: { has: model } } : {}),
    },
    orderBy: { tokensServed: 'asc' }, // least loaded first
    select: {
      id: true,
      ollamaUrl: true,
      modelsLoaded: true,
      tokensServed: true,
    },
  });

  return nodes;
}

export async function pickNode(model?: string): Promise<ActiveNode | null> {
  const nodes = await getAvailableNodes(model);
  if (nodes.length === 0) return null;
  return nodes[0]; // already sorted by least loaded
}

export async function getFallbackUrl(): Promise<string> {
  return process.env.OLLAMA_URL ?? 'http://localhost:11434';
}

export async function resolveOllamaUrl(model?: string): Promise<{ url: string; nodeId: string | null }> {
  const node = await pickNode(model);
  if (node) return { url: node.ollamaUrl, nodeId: node.id };
  return { url: await getFallbackUrl(), nodeId: null };
}

export async function recordNodeUsage(nodeId: string, userId: string, tokens: number): Promise<void> {
  const usdValue = (tokens / Number(process.env.TOKENS_PER_USD ?? 100_000)) * 1;

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

export async function updateHeartbeat(nodeId: string, modelsLoaded?: string[]): Promise<void> {
  await prisma.node.update({
    where: { id: nodeId },
    data: {
      lastHeartbeat: new Date(),
      status: 'active',
      ...(modelsLoaded ? { modelsLoaded } : {}),
    },
  });
}
