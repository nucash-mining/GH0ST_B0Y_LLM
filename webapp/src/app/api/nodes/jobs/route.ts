import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Agent polls this to claim a pending job
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!auth) return Response.json({ error: 'Missing token' }, { status: 401 });

  const node = await prisma.node.findUnique({ where: { id: auth } })
    ?? await prisma.node.findUnique({ where: { agentToken: auth } });

  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  // Claim the oldest pending job atomically
  const job = await prisma.$transaction(async tx => {
    const pending = await tx.inferenceJob.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    if (!pending) return null;
    return tx.inferenceJob.update({
      where: { id: pending.id },
      data: { status: 'processing', nodeId: node.id, claimedAt: new Date() },
    });
  });

  // Update heartbeat while we're here
  await prisma.node.update({
    where: { id: node.id },
    data: { lastHeartbeat: new Date(), status: 'active' },
  });

  return Response.json({ job: job ?? null });
}
