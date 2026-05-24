import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'nucash@wattxchain.org';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const applications = await prisma.nodeApplication.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({ applications });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { applicationId, status } = await req.json();
  if (!applicationId || !status) {
    return Response.json({ error: 'applicationId and status required' }, { status: 400 });
  }

  const application = await prisma.nodeApplication.update({
    where: { id: applicationId },
    data: { status },
  });

  return Response.json({ application });
}
