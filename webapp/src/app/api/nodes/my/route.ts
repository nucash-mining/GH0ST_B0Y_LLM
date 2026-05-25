import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const operatorEmail = session.user.email
    ?? (session.user.walletAddress ? `${session.user.walletAddress}@wallet.ghost` : null);

  try {
    const node = await prisma.node.findFirst({
      where: operatorEmail ? { operatorEmail } : { id: 'none' },
      include: {
        earnings: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    return Response.json({ node: node ?? null });
  } catch (err) {
    console.error('[/api/nodes/my]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const operatorEmail = session.user.email
    ?? (session.user.walletAddress ? `${session.user.walletAddress}@wallet.ghost` : null);

  const { name, ollamaUrl, gpuModel, vramGb, storageGb, walletAddress: payout } = await req.json();

  try {
    const existing = await prisma.node.findFirst({
      where: operatorEmail ? { operatorEmail } : { id: 'none' },
    });

    if (!existing) {
      return Response.json({ error: 'No node found for this account' }, { status: 404 });
    }

    const node = await prisma.node.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name } : {}),
        ...(ollamaUrl ? { ollamaUrl } : {}),
        ...(gpuModel !== undefined ? { gpuModel } : {}),
        ...(vramGb !== undefined ? { vramGb } : {}),
        ...(storageGb !== undefined ? { storageGb } : {}),
        ...(payout ? { walletAddress: payout } : {}),
      },
    });

    return Response.json({ node });
  } catch (err) {
    console.error('[/api/nodes/my PATCH]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
