import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listModels, isOllamaRunning } from '@/lib/ollama';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // wallet-auth users have no email — derive a stable identifier from their address
  const operatorEmail = session.user.email
    ?? (session.user.walletAddress ? `${session.user.walletAddress}@wallet.ghost` : null);

  if (!operatorEmail) {
    return Response.json({ error: 'Unauthorized: no email or wallet found in session' }, { status: 401 });
  }

  const { ollamaUrl, name, gpuModel, vramGb, storageGb, walletAddress } = await req.json();

  if (!ollamaUrl || !name) {
    return Response.json({ error: 'ollamaUrl and name are required' }, { status: 400 });
  }

  const reachable = await isOllamaRunning(ollamaUrl);
  if (!reachable) {
    return Response.json({ error: 'Cannot reach Ollama at the provided URL' }, { status: 400 });
  }

  const modelsLoaded = await listModels(ollamaUrl);

  const node = await prisma.node.upsert({
    where: { operatorEmail },
    update: {
      ollamaUrl,
      name,
      gpuModel,
      vramGb,
      storageGb,
      walletAddress,
      modelsLoaded,
      lastHeartbeat: new Date(),
    },
    create: {
      operatorEmail,
      ollamaUrl,
      name,
      gpuModel,
      vramGb,
      storageGb,
      walletAddress,
      modelsLoaded,
      status: 'pending',
      approved: false,
      lastHeartbeat: new Date(),
    },
  });

  return Response.json({ node });
}
