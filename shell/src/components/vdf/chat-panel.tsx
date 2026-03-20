'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  recipe?: string;
  data?: Record<string, unknown>;
}

interface ChatPanelData {
  messages: ChatMessage[];
  onSend: string;
  placeholder?: string;
  contextLabel?: string;
}

interface Props {
  data: ChatPanelData | ChatMessage[] | null | undefined;
  variant?: string;
  onSend?: string;
  placeholder?: string;
  contextLabel?: string;
}

export default function ChatPanel({ data, onSend: propOnSend, placeholder: propPlaceholder, contextLabel: propContextLabel }: Props) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Normalize: data can be ChatPanelData object or a plain messages array (from recipe JSONPath)
  const initialMessages = Array.isArray(data) ? data : (data?.messages ?? []);
  const onSend = propOnSend || (!Array.isArray(data) && data?.onSend) || '';
  const placeholder = propPlaceholder || (!Array.isArray(data) && data?.placeholder) || 'Type a message...';
  const contextLabel = propContextLabel || (!Array.isArray(data) && data?.contextLabel) || '';

  useEffect(() => {
    if (initialMessages.length > 0) setMessages(initialMessages);
  }, [initialMessages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setSending(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const endpoint = onSend
        ? (onSend.startsWith('/') ? `${apiUrl}${onSend}` : onSend)
        : `${apiUrl}/api/v1/chat`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const devTenantId = process.env.NEXT_PUBLIC_DEV_TENANT_ID || 'a0000000-0000-0000-0000-000000000001';
      headers['X-Dev-Tenant-Id'] = devTenantId;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: json.reply || json.error || 'No response',
        timestamp: new Date().toISOString(),
        recipe: json.recipe,
        data: json.data,
      };
      setMessages((m) => [...m, assistantMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Failed to reach VaNi. Please try again.', timestamp: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface flex flex-col h-96">
      {contextLabel && (
        <div className="px-4 py-2 border-b border-border text-xs text-muted">
          {contextLabel}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted text-sm py-8">
            {placeholder}
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-fg'
                  : 'bg-surface-hover text-foreground'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-surface-hover rounded-lg px-3 py-2 text-sm text-muted animate-pulse">
              VaNi is thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-4 py-2 rounded-md bg-primary text-primary-fg text-sm font-medium hover:bg-primary-hover disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
