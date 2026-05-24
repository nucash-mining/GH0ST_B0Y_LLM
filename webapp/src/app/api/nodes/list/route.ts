import { prisma } from '@/lib/prisma';

export async function GET() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);

  const nodes = await prisma.node.findMany({
    where: { approved: true },
    select: {
      id: true,
      name: true,
      gpuModel: true,
      vramGb: true,
      modelsLoaded: true,
      tokensServed: true,
      status: true,
      lastHeartbeat: true,
    },
    orderBy: { tokensServed: 'asc' },
  });

  return Response.json({
    nodes: nodes.map(n => ({
      ...n,
      online: n.lastHeartbeat ? n.lastHeartbeat >= cutoff : false,
    })),
  });
}
