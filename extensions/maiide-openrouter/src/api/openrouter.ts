// Using global fetch (Node 18+)—no external dependency required.

export type OpenRouterModel = {
  id: string;
  name?: string;
  context_length?: number;
};

export type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string };

export class OpenRouterClient {
  constructor(private apiKey: string) {}

  private baseUrl = 'https://openrouter.ai/api/v1';

  async listModels(): Promise<OpenRouterModel[]> {
    const res = await fetch(`${this.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`OpenRouter listModels failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.data || data.models || [];
  }

  async chat(model: string, messages: ChatMessage[], stream = false): Promise<any> {
    const body = {
      model,
      messages,
      stream
    } as any;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`OpenRouter chat failed: ${res.status} ${res.statusText}`);
    const json = await res.json();
    return json;
  }

  async *chatStream(model: string, messages: ChatMessage[]): AsyncGenerator<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model, messages, stream: true })
    });
    if (!res.ok || !res.body) throw new Error(`OpenRouter chat (stream) failed: ${res.status} ${res.statusText}`);

    const reader = (res.body as any).getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        if (!chunk) continue;
        for (const line of chunk.split('\n')) {
          const m = line.match(/^data:\s*(.*)$/);
          if (!m) continue;
          const payload = m[1];
          if (payload === '[DONE]') return;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
            if (delta) yield delta;
          } catch (_) {}
        }
      }
    }
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer.replace(/^data:\s*/,'').trim());
        const delta = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
        if (delta) yield delta;
      } catch {}
    }
  }
}
