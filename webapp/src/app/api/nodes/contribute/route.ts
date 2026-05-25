import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const operatorEmail = session.user.email
    ?? (session.user.walletAddress ? `${session.user.walletAddress}@wallet.ghost` : null);

  if (!operatorEmail) {
    return Response.json({ error: 'Unauthorized: no email or wallet in session' }, { status: 401 });
  }

  const { name, walletAddress, resources, gpuModel, cpuModel, vramGb, ramGb, storageGb } =
    await req.json();

  if (!name || !resources?.length) {
    return Response.json({ error: 'name and resources are required' }, { status: 400 });
  }

  const agentToken = randomUUID();

  // PC nodes get auto-approved — they only serve when Ollama is reachable
  const node = await prisma.node.upsert({
    where: { operatorEmail },
    update: {
      name,
      walletAddress,
      resources,
      gpuModel,
      cpuModel,
      vramGb,
      ramGb,
      storageGb,
    },
    create: {
      operatorEmail,
      ollamaUrl: '', // filled in by agent on first heartbeat
      name,
      nodeType: 'pc',
      status: 'pending',
      approved: true, // PC nodes auto-approved; only active when agent is running
      walletAddress,
      resources,
      gpuModel,
      cpuModel,
      vramGb,
      ramGb,
      storageGb,
      modelsLoaded: [],
      agentToken,
    },
  });

  return Response.json({ node, agentToken: node.agentToken ?? agentToken });
}
