import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { formatTokens, shortenAddress } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AccountPage({
  searchParams,
}: {
  searchParams: { payment?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');

  const [balance, subscription, recentUsage, recentPayments] = await Promise.all([
    prisma.tokenBalance.findUnique({ where: { userId: session.user.id } }),
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.usageLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.payment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const totalUsed = await prisma.usageLog.aggregate({
    where: { userId: session.user.id },
    _sum: { tokensUsed: true },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {searchParams.payment === 'success' && (
        <div className="mb-6 p-4 bg-ghost-green/10 border border-ghost-green/30 rounded-xl font-mono text-sm text-ghost-green">
          ✦ Payment successful — tokens added to your account
        </div>
      )}

      <h1 className="text-2xl font-mono font-bold text-ghost-cyan mb-8">ACCOUNT</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Identity */}
        <GlowCard glow="cyan">
          <div className="text-ghost-muted text-xs font-mono mb-3">IDENTITY</div>
          {session.user.walletAddress ? (
            <div>
              <div className="font-mono text-ghost-cyan text-sm">
                {shortenAddress(session.user.walletAddress)}
              </div>
              <div className="text-ghost-muted text-xs mt-1">Wallet account</div>
            </div>
          ) : (
            <div>
              <div className="font-mono text-ghost-text text-sm">{session.user.email}</div>
              <div className="text-ghost-muted text-xs mt-1">Email account</div>
            </div>
          )}
        </GlowCard>

        {/* Balance */}
        <GlowCard glow="green">
          <div className="text-ghost-muted text-xs font-mono mb-3">TOKEN BALANCE</div>
          <div className="text-3xl font-mono font-bold text-ghost-green">
            {formatTokens(balance?.balance ?? 0)}
          </div>
          <div className="text-ghost-muted text-xs font-mono mt-1">
            {(totalUsed._sum.tokensUsed ?? 0).toLocaleString()} used total
          </div>
          {subscription && (
            <div className="mt-2 text-xs font-mono text-ghost-purple">
              {subscription.plan.toUpperCase()} plan · {formatTokens(subscription.tokensPerMonth)}/mo
            </div>
          )}
        </GlowCard>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-8">
        <Link href="/pricing">
          <Button variant="secondary">Buy More Tokens</Button>
        </Link>
        <Link href="/chat">
          <Button>Open Chat</Button>
        </Link>
      </div>

      {/* Usage history */}
      <GlowCard glow="cyan" className="mb-6">
        <div className="text-ghost-muted text-xs font-mono mb-4">RECENT USAGE</div>
        {recentUsage.length === 0 ? (
          <p className="text-ghost-muted font-mono text-sm">No usage yet — start chatting!</p>
        ) : (
          <div className="space-y-2">
            {recentUsage.map(log => (
              <div key={log.id} className="flex justify-between text-xs font-mono border-b border-ghost-border pb-2">
                <span className="text-ghost-muted">{new Date(log.createdAt).toLocaleString()}</span>
                <span className="text-ghost-text">{log.model}</span>
                <span className="text-ghost-cyan">{formatTokens(log.tokensUsed)} tkn</span>
              </div>
            ))}
          </div>
        )}
      </GlowCard>

      {/* Payment history */}
      <GlowCard glow="purple">
        <div className="text-ghost-muted text-xs font-mono mb-4">PAYMENT HISTORY</div>
        {recentPayments.length === 0 ? (
          <p className="text-ghost-muted font-mono text-sm">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {recentPayments.map(p => (
              <div key={p.id} className="flex justify-between text-xs font-mono border-b border-ghost-border pb-2">
                <span className="text-ghost-muted">{new Date(p.createdAt).toLocaleString()}</span>
                <span className="text-ghost-text capitalize">{p.method}</span>
                <span className="text-ghost-green">+{formatTokens(p.tokensAdded)} tkn</span>
              </div>
            ))}
          </div>
        )}
      </GlowCard>
    </div>
  );
}
