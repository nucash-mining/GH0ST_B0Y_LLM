import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { listModels } from '@/lib/ollama';
import { ChatInterface } from '@/components/chat/ChatInterface';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin?callbackUrl=/chat');

  const models = await listModels();
  const defaultModel = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2';

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b border-ghost-border px-6 py-3 bg-ghost-darker flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-ghost-green animate-pulse" />
        <span className="font-mono text-xs text-ghost-muted">
          ORACLE CHAT — {session.user.walletAddress
            ? `${session.user.walletAddress.slice(0, 6)}…${session.user.walletAddress.slice(-4)}`
            : session.user.email}
        </span>
      </div>
      <ChatInterface
        models={models.length > 0 ? models : [defaultModel]}
        defaultModel={defaultModel}
      />
    </div>
  );
}
