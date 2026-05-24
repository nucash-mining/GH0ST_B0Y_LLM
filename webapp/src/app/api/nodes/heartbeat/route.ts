import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listModels } from '@/lib/ollama';

// Accepts either node ID (DGX) or agentToken (PC) in Authorization header.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!auth) return Response.json({ error: 'Missing token' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { ollamaUrl: reportedUrl, gpuModel, cpuModel, vramGb, ramGb } = body;

  // Try by node ID first, then by agentToken
  let node = await prisma.node.findUnique({ where: { id: auth } })
    ?? await prisma.node.findUnique({ where: { agentToken: auth } });

  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  const ollamaUrl = reportedUrl ?? node.ollamaUrl;
  const modelsLoaded = ollamaUrl
    ? await listModels(ollamaUrl).catch(() => node!.modelsLoaded)
    : node.modelsLoaded;

  await prisma.node.update({
    where: { id: node.id },
    data: {
      lastHeartbeat: new Date(),
      status: 'active',
      modelsLoaded,
      ...(ollamaUrl ? { ollamaUrl } : {}),
      ...(gpuModel ? { gpuModel } : {}),
      ...(cpuModel ? { cpuModel } : {}),
      ...(vramGb ? { vramGb } : {}),
      ...(ramGb ? { ramGb } : {}),
    },
  });

  return Response.json({ ok: true, modelsLoaded, nodeId: node.id });
}
