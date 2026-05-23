import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyEthPayment, ethToTokens } from '@/lib/web3';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { txHash } = await req.json();
  if (!txHash) {
    return new Response(JSON.stringify({ error: 'txHash required' }), { status: 400 });
  }

  const existing = await prisma.payment.findFirst({ where: { txHash } });
  if (existing) {
    return new Response(JSON.stringify({ error: 'Transaction already used' }), { status: 409 });
  }

  let verification;
  try {
    verification = await verifyEthPayment(txHash);
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to verify transaction' }), { status: 400 });
  }

  if (!verification.valid) {
    return new Response(JSON.stringify({ error: 'Invalid transaction' }), { status: 400 });
  }

  const tokensAdded = ethToTokens(verification.valueEth);
  const ethUsdValue = parseFloat(verification.valueEth) * Number(process.env.ETH_PRICE_USD ?? 3000);

  await prisma.$transaction([
    prisma.tokenBalance.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, balance: tokensAdded },
      update: { balance: { increment: tokensAdded } },
    }),
    prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: ethUsdValue,
        currency: 'eth',
        method: 'crypto',
        tokensAdded,
        status: 'completed',
        txHash,
      },
    }),
  ]);

  return Response.json({ tokensAdded, valueEth: verification.valueEth });
}
