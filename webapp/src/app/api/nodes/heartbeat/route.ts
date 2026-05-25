import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listModels } from '@/lib/ollama';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!auth) return Response.json({ error: 'Missing token' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    ollamaUrl: reportedUrl,
    peerUrl,
    gpuModel,
    cpuModel,
    vramGb,
    ramGb,
    hardwareFingerprint,
    benchmarkScore,
    agentVersion,
  } = body;

  const node = await prisma.node.findUnique({ where: { id: auth } })
    ?? await prisma.node.findUnique({ where: { agentToken: auth } });

  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  const ollamaUrl   = reportedUrl ?? node.ollamaUrl;
  const modelsLoaded = ollamaUrl
    ? await listModels(ollamaUrl).catch(() => node.modelsLoaded)
    : node.modelsLoaded;

  await prisma.node.update({
    where: { id: node.id },
    data: {
      lastHeartbeat: new Date(),
      status:        'active',
      modelsLoaded,
      ...(ollamaUrl            ? { ollamaUrl }            : {}),
      ...(peerUrl              ? { peerUrl }              : {}),
      ...(gpuModel             ? { gpuModel }             : {}),
      ...(cpuModel             ? { cpuModel }             : {}),
      ...(vramGb               ? { vramGb }               : {}),
      ...(ramGb                ? { ramGb }                : {}),
      ...(hardwareFingerprint  ? { hardwareFingerprint }  : {}),
      ...(benchmarkScore       ? { benchmarkScore }       : {}),
      ...(agentVersion         ? { agentVersion }         : {}),
    },
  });

  // Return peer list so the agent knows who else is online
  const peers = await prisma.node.findMany({
    where: {
      approved:      true,
      status:        'active',
      lastHeartbeat: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      id:            { not: node.id },
      peerUrl:       { not: null },
    },
    select: { id: true, peerUrl: true, vramGb: true, modelsLoaded: true },
    take: 20,
  });

  return Response.json({
    ok:          true,
    modelsLoaded,
    nodeId:      node.id,
    chainRegistered: node.chainRegistered,
    peers,
  });
}
