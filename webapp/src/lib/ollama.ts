const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function* streamChat(
  messages: OllamaMessage[],
  model: string = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2',
  baseUrl: string = DEFAULT_OLLAMA_URL
): AsyncGenerator<string> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.message?.content) yield data.message.content;
      } catch { /* skip malformed lines */ }
    }
  }
}

export async function listModels(baseUrl: string = DEFAULT_OLLAMA_URL): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models ?? []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}

export async function isOllamaRunning(baseUrl: string = DEFAULT_OLLAMA_URL): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
