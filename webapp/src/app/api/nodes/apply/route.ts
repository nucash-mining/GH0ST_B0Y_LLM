import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { email, walletAddress, motivation } = await req.json();

  if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

  if (!email.endsWith('@wattxchain.org')) {
    return Response.json(
      { error: 'A @wattxchain.org email address is required to apply' },
      { status: 400 }
    );
  }

  const existing = await prisma.nodeApplication.findUnique({ where: { email } });
  if (existing) {
    return Response.json(
      { error: 'An application for this email already exists', status: existing.status },
      { status: 409 }
    );
  }

  const application = await prisma.nodeApplication.create({
    data: { email, walletAddress, motivation },
  });

  return Response.json({ application });
}
