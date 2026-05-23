import { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('No signature', { status: 400 });

  let event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { metadata: Record<string, string>; id: string };
    const { userId, tokens, plan } = session.metadata;
    const tokenCount = Number(tokens);

    await prisma.$transaction([
      prisma.tokenBalance.upsert({
        where: { userId },
        create: { userId, balance: tokenCount },
        update: { balance: { increment: tokenCount } },
      }),
      prisma.payment.create({
        data: {
          userId,
          amount: 0,
          currency: 'usd',
          method: 'stripe',
          tokensAdded: tokenCount,
          status: 'completed',
          externalId: session.id,
        },
      }),
    ]);

    if (['pro', 'oracle'].includes(plan)) {
      const planTokens = plan === 'oracle' ? 10_000_000 : 2_000_000;
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          plan,
          status: 'active',
          tokensPerMonth: planTokens,
          stripeSubscriptionId: session.id,
        },
        update: {
          plan,
          status: 'active',
          tokensPerMonth: planTokens,
        },
      });
    }
  }

  return new Response('OK', { status: 200 });
}
