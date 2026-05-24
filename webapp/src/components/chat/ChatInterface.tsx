'use client';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Send, Square, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../ui/Button';
import { formatTokens } from '@/lib/utils';
import type { ChatMessage } from '@/types';

const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 min

export function ChatInterface({ models, defaultModel }: { models: string[]; defaultModel: string }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [model, setModel] = useState(defaultModel || models[0] || 'llama3.2');
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch('/api/user/balance').then(r => r.json()).then(d => setBalance(d.balance));
  }, [session, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function updateAssistant(id: string, patch: Partial<ChatMessage>) {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }

  async function pollForResult(jobId: string, assistantId: string) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let dots = 0;

    pollRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        clearInterval(pollRef.current!);
        updateAssistant(assistantId, { content: 'Request timed out — no node picked it up in time. Try again when more nodes are online.' });
        setStreaming(false);
        return;
      }

      dots = (dots + 1) % 4;
      updateAssistant(assistantId, {
        content: `Waiting for a network node${''.padEnd(dots, '.')}`,
        queued: true,
      });

      try {
        const res = await fetch(`/api/chat/poll?jobId=${jobId}`);
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(pollRef.current!);
          updateAssistant(assistantId, {
            content: data.result ?? '',
            tokensUsed: data.tokensUsed ?? 0,
            queued: false,
          });
          setStreaming(false);
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!);
          updateAssistant(assistantId, { content: 'Node returned an error processing your request.', queued: false });
          setStreaming(false);
        }
      } catch { /* ignore poll errors, keep trying */ }
    }, POLL_MS);
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user',
      content: input.trim(), timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'assistant',
      content: '', timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMsg]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, model }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      // Queued job — no live node available, poll for completion
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.queued && data.jobId) {
          updateAssistant(assistantMsg.id, { content: 'Waiting for a network node...', queued: true });
          await pollForResult(data.jobId, assistantMsg.id);
          return;
        }
        throw new Error(data.error || 'Unexpected response');
      }

      // Streaming response from live node
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));
          if (data.token) updateAssistant(assistantMsg.id, {
            content: (messages.find(m => m.id === assistantMsg.id)?.content ?? '') + data.token,
          });
          if (data.done) updateAssistant(assistantMsg.id, { tokensUsed: data.tokensUsed });
          if (data.error) throw new Error(data.error);
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      updateAssistant(assistantMsg.id, { content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` });
    } finally {
      if (!pollRef.current) setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-ghost-border bg-ghost-darker">
        <select value={model} onChange={e => setModel(e.target.value)}
          className="bg-ghost-card border border-ghost-border text-ghost-text text-xs font-mono rounded px-2 py-1 focus:border-ghost-cyan outline-none">
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="flex items-center gap-3">
          {balance !== null && (
            <span className="text-xs font-mono text-ghost-muted">{formatTokens(balance)} tokens</span>
          )}
          <button onClick={() => setMessages([])} className="text-ghost-muted hover:text-ghost-red transition-colors" title="Clear chat">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-ghost-muted">
            <span className="text-5xl animate-float">👻</span>
            <p className="font-mono text-sm">Ask the Oracle anything...</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 font-mono text-sm ${
              msg.role === 'user'
                ? 'bg-ghost-cyan/10 border border-ghost-cyan/20 text-ghost-text'
                : 'bg-ghost-card border border-ghost-border text-ghost-text'
            }`}>
              {msg.role === 'assistant' ? (
                msg.queued ? (
                  <p className="text-ghost-muted animate-pulse">{msg.content}</p>
                ) : (
                  <ReactMarkdown className="prose prose-invert prose-sm max-w-none prose-pre:bg-ghost-darker">
                    {msg.content || '▋'}
                  </ReactMarkdown>
                )
              ) : (
                <p>{msg.content}</p>
              )}
              {msg.tokensUsed ? (
                <p className="text-xs text-ghost-muted mt-1">{formatTokens(msg.tokensUsed)} tokens used</p>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-ghost-border bg-ghost-darker">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Message the Oracle... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 bg-ghost-card border border-ghost-border rounded-lg px-4 py-2.5 text-sm font-mono text-ghost-text placeholder:text-ghost-muted focus:border-ghost-cyan outline-none resize-none"
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          {streaming ? (
            <Button variant="danger" size="sm" onClick={() => { abortRef.current?.abort(); if (pollRef.current) { clearInterval(pollRef.current); setStreaming(false); } }}>
              <Square size={14} />
            </Button>
          ) : (
            <Button size="sm" onClick={sendMessage} disabled={!input.trim()}><Send size={14} /></Button>
          )}
        </div>
      </div>
    </div>
  );
}
