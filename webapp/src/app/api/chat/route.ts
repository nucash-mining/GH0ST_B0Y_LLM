import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { streamChat, estimateTokens } from '@/lib/ollama';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { messages, model } = await req.json();
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400 });
  }

  const balance = await prisma.tokenBalance.findUnique({
    where: { userId: session.user.id },
  });

  const estimatedCost = messages.reduce(
    (acc: number, m: { content: string }) => acc + estimateTokens(m.content),
    0
  );

  if (!balance || balance.balance < estimatedCost) {
    return new Response(JSON.stringify({ error: 'Insufficient token balance' }), { status: 402 });
  }

  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of streamChat(messages, model)) {
          fullResponse += token;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        }

        const tokensUsed = estimateTokens(messages.map((m: { content: string }) => m.content).join(' ')) +
          estimateTokens(fullResponse);

        await prisma.$transaction([
          prisma.tokenBalance.update({
            where: { userId: session.user.id },
            data: { balance: { decrement: tokensUsed } },
          }),
          prisma.usageLog.create({
            data: {
              userId: session.user.id,
              tokensUsed,
              model: model || 'llama3.2',
            },
          }),
        ]);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, tokensUsed })}\n\n`)
        );
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
