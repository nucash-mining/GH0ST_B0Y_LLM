import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const [balance, subscription] = await Promise.all([
    prisma.tokenBalance.findUnique({ where: { userId: session.user.id } }),
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
  ]);

  return Response.json({
    balance: balance?.balance ?? 0,
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          tokensPerMonth: subscription.tokensPerMonth,
          endDate: subscription.endDate?.toISOString() ?? null,
        }
      : null,
  });
}
