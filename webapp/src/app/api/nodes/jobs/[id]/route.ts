import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordNodeUsage } from '@/lib/node-router';
import { estimateTokens } from '@/lib/ollama';

// Agent submits completed job result
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!auth) return Response.json({ error: 'Missing token' }, { status: 401 });

  const node = await prisma.node.findUnique({ where: { id: auth } })
    ?? await prisma.node.findUnique({ where: { agentToken: auth } });

  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  const job = await prisma.inferenceJob.findUnique({ where: { id } });
  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });
  if (job.nodeId !== node.id) return Response.json({ error: 'Not your job' }, { status: 403 });

  const { result, failed } = await req.json();

  const tokensUsed = result
    ? estimateTokens(JSON.stringify(job.messages) + result)
    : 0;

  await prisma.$transaction(async tx => {
    await tx.inferenceJob.update({
      where: { id },
      data: {
        status: failed ? 'failed' : 'completed',
        result: result ?? null,
        tokensUsed,
        completedAt: new Date(),
      },
    });

    if (!failed && tokensUsed > 0) {
      await tx.tokenBalance.update({
        where: { userId: job.userId },
        data: { balance: { decrement: tokensUsed } },
      });
      await tx.usageLog.create({
        data: { userId: job.userId, tokensUsed, model: job.model },
      });
    }
  });

  if (!failed && tokensUsed > 0) {
    await recordNodeUsage(node.id, job.userId, tokensUsed);
  }

  return Response.json({ ok: true, tokensUsed });
}
