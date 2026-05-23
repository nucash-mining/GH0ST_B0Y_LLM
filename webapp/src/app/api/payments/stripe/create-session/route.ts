import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe, PLANS, type PlanKey } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { plan } = await req.json() as { plan: PlanKey };
  const planConfig = PLANS[plan];
  if (!planConfig) {
    return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: planConfig.subscription ? 'subscription' : 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: planConfig.price * 100,
          product_data: {
            name: `GH0ST_B0Y ${planConfig.name}`,
            description: `${planConfig.tokens.toLocaleString()} tokens`,
          },
          ...(planConfig.subscription ? { recurring: { interval: 'month' } } : {}),
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.user.id,
      plan,
      tokens: planConfig.tokens.toString(),
    },
    success_url: `${baseUrl}/account?payment=success`,
    cancel_url: `${baseUrl}/pricing`,
  });

  return Response.json({ url: checkoutSession.url });
}
