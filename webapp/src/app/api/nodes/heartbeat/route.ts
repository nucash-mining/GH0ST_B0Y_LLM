import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listModels } from '@/lib/ollama';

// Node operators call this every 60s to stay marked as active.
// Auth: bearer token = node ID (simple — upgrade to signed JWT later).
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const nodeId = auth?.replace('Bearer ', '').trim();
  if (!nodeId) return Response.json({ error: 'Missing node ID' }, { status: 401 });

  const node = await prisma.node.findUnique({ where: { id: nodeId } });
  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  const modelsLoaded = await listModels(node.ollamaUrl).catch(() => node.modelsLoaded);

  await prisma.node.update({
    where: { id: nodeId },
    data: { lastHeartbeat: new Date(), status: 'active', modelsLoaded },
  });

  return Response.json({ ok: true, modelsLoaded });
}
