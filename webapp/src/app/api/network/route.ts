import { prisma } from '@/lib/prisma';

export const revalidate = 30;

export async function GET() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);

  const [nodes, totalJobs, totalTokens] = await Promise.all([
    prisma.node.findMany({
      where: { approved: true },
      select: {
        id: true,
        name: true,
        gpuModel: true,
        cpuModel: true,
        vramGb: true,
        ramGb: true,
        modelsLoaded: true,
        tokensServed: true,
        benchmarkScore: true,
        chainRegistered: true,
        chainAddress: true,
        status: true,
        lastHeartbeat: true,
        nodeType: true,
        resources: true,
      },
      orderBy: { tokensServed: 'desc' },
    }),
    prisma.inferenceJob.count({ where: { status: 'completed' } }),
    prisma.inferenceJob.aggregate({
      _sum: { tokensUsed: true },
      where: { status: 'completed' },
    }),
  ]);

  const liveNodes = nodes.filter(n =>
    n.lastHeartbeat && n.lastHeartbeat >= cutoff
  );

  const totalVram = liveNodes.reduce((s, n) => s + (n.vramGb ?? 0), 0);
  const chainVerified = liveNodes.filter(n => n.chainRegistered).length;

  return Response.json({
    nodes: nodes.map(n => ({
      ...n,
      online: n.lastHeartbeat ? n.lastHeartbeat >= cutoff : false,
    })),
    stats: {
      totalNodes: nodes.length,
      onlineNodes: liveNodes.length,
      chainVerifiedNodes: chainVerified,
      totalVramGb: totalVram,
      totalJobsCompleted: totalJobs,
      totalTokensServed: totalTokens._sum.tokensUsed ?? 0,
    },
  });
}
