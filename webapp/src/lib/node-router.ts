// Re-export from compute-mesh for backward compatibility with existing imports
export { recordNodeUsage, getLiveNodes } from './compute-mesh';
export type { LiveNode } from './compute-mesh';

import { prisma } from './prisma';

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000;

/** Legacy helper used by the chat route before compute-mesh existed. */
export async function resolveOllamaUrl(
  model?: string,
): Promise<{ url: string; nodeId: string | null }> {
  const { resolveCompute } = await import('./compute-mesh');
  const resolution = await resolveCompute(model ?? 'llama3.2');

  if (resolution.type === 'single') {
    return { url: resolution.url, nodeId: resolution.nodeId };
  }
  if (resolution.type === 'cluster') {
    return { url: resolution.url, nodeId: resolution.primaryNodeId };
  }
  if (resolution.type === 'fallback') {
    return { url: resolution.url, nodeId: null };
  }
  return { url: process.env.OLLAMA_URL ?? 'http://localhost:11434', nodeId: null };
}

export async function updateHeartbeat(
  nodeId: string,
  modelsLoaded?: string[],
): Promise<void> {
  await prisma.node.update({
    where: { id: nodeId },
    data: {
      lastHeartbeat: new Date(),
      status: 'active',
      ...(modelsLoaded ? { modelsLoaded } : {}),
    },
  });
}
