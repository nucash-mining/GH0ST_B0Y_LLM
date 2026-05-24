import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const jobId = req.nextUrl.searchParams.get('jobId');
  if (!jobId) return Response.json({ error: 'jobId required' }, { status: 400 });

  const job = await prisma.inferenceJob.findFirst({
    where: { id: jobId, userId: session.user.id },
    select: { status: true, result: true, tokensUsed: true },
  });

  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

  return Response.json(job);
}
