import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'nucash@wattxchain.org';

function isAdmin(email?: string | null) {
  return email === ADMIN_EMAIL;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nodes = await prisma.node.findMany({
    orderBy: { createdAt: 'desc' },
    include: { earnings: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });

  return Response.json({ nodes });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session?.user?.email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { nodeId, approved, status } = await req.json();
  if (!nodeId) return Response.json({ error: 'nodeId required' }, { status: 400 });

  const node = await prisma.node.update({
    where: { id: nodeId },
    data: {
      ...(approved !== undefined ? { approved } : {}),
      ...(status ? { status } : {}),
    },
  });

  return Response.json({ node });
}
