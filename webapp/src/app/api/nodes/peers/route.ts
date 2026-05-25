import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPeerList } from '@/lib/compute-mesh';

/**
 * GET /api/nodes/peers
 *
 * Returns the list of online nodes that expose a peerUrl.
 * Used by agents to discover each other for potential RPC clustering.
 * Auth required — only registered agents should see peer addresses.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!auth) return Response.json({ error: 'Missing token' }, { status: 401 });

  const node = await prisma.node.findUnique({ where: { id: auth } })
    ?? await prisma.node.findUnique({ where: { agentToken: auth } });

  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  const peers = await getPeerList();

  // Don't include the calling node in its own peer list
  const filtered = peers.filter(p => p.id !== node.id);

  return Response.json({ peers: filtered, count: filtered.length });
}

/**
 * POST /api/nodes/peers/announce
 *
 * Agent announces its peerUrl (direct HTTP address for inter-node RPC).
 * Body: { peerUrl: string }
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!auth) return Response.json({ error: 'Missing token' }, { status: 401 });

  const node = await prisma.node.findUnique({ where: { id: auth } })
    ?? await prisma.node.findUnique({ where: { agentToken: auth } });

  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  const { peerUrl } = await req.json().catch(() => ({}));
  if (!peerUrl || typeof peerUrl !== 'string') {
    return Response.json({ error: 'peerUrl required' }, { status: 400 });
  }

  await prisma.node.update({
    where: { id: node.id },
    data:  { peerUrl, lastHeartbeat: new Date() },
  });

  return Response.json({ ok: true, nodeId: node.id });
}
