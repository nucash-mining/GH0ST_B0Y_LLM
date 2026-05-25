import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const BENCHMARK_PROMPT = 'Count from 1 to 20 as fast as possible.';
const BENCHMARK_MODEL  = 'llama3.2:3b'; // small and fast — standard for scoring

/**
 * POST /api/nodes/benchmark
 *
 * The agent calls this after running a timed inference locally.
 * Body: { tokensProduced: number, elapsedMs: number }
 * Returns: { benchmarkScore: number } where score = (tokens/sec) × 100
 *
 * The agent is responsible for running the inference itself — we just compute
 * and persist the score here.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!auth) return Response.json({ error: 'Missing token' }, { status: 401 });

  const node = await prisma.node.findUnique({ where: { id: auth } })
    ?? await prisma.node.findUnique({ where: { agentToken: auth } });

  if (!node) return Response.json({ error: 'Node not found' }, { status: 404 });

  const { tokensProduced, elapsedMs } = await req.json().catch(() => ({}));
  if (!tokensProduced || !elapsedMs || elapsedMs <= 0) {
    return Response.json({ error: 'tokensProduced and elapsedMs required' }, { status: 400 });
  }

  const tokensPerSec   = (tokensProduced / elapsedMs) * 1000;
  const benchmarkScore = Math.round(tokensPerSec * 100);

  await prisma.node.update({
    where: { id: node.id },
    data:  { benchmarkScore, lastHeartbeat: new Date() },
  });

  return Response.json({
    benchmarkScore,
    tokensPerSec: Math.round(tokensPerSec),
    grade: scoreGrade(tokensPerSec),
  });
}

/**
 * GET /api/nodes/benchmark
 *
 * Returns the standard benchmark prompt so agents know what to run.
 */
export async function GET() {
  return Response.json({
    prompt: BENCHMARK_PROMPT,
    model:  BENCHMARK_MODEL,
    targetTokens: 40,
  });
}

function scoreGrade(tps: number): string {
  if (tps >= 80)  return 'S';
  if (tps >= 40)  return 'A';
  if (tps >= 20)  return 'B';
  if (tps >= 10)  return 'C';
  return 'D';
}
