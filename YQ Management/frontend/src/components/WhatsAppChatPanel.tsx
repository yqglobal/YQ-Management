import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, PhoneOff, MessageSquare, RefreshCw } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';

interface Message {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: string;
  status?: string;
}

interface WhatsAppChatPanelProps {
  tokenId: string;
  customerName?: string;
  customerPhone?: string;
  queueName?: string;
  onClose?: () => void;
}

function timeLabel(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function dateSeparator(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function WhatsAppChatPanel({ tokenId, customerName, customerPhone, queueName, onClose }: WhatsAppChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!tokenId) return;
    try {
      const data = await fetchApi(`/messages/token/${tokenId}`);
      if (Array.isArray(data)) {
        const mapped = data.map((m: any) => ({
          id: m.id,
          body: m.body,
          fromMe: m.sender === 'OPERATOR',
          timestamp: m.createdAt,
        }));
        setMessages(mapped);
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Unable to load messages. Ensure WhatsApp is connected.');
    }
  }, [tokenId]);

  useEffect(() => {
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    pollRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      body: text,
      fromMe: true,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px';
    }

    try {
      await fetchApi(`/messages/token/${tokenId}`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      await fetchMessages();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  };

  // Group messages with date separators
  const groupedMessages: { type: 'date'; label: string } | { type: 'msg'; msg: Message }[] = [];
  let lastDate = '';
  messages.forEach(msg => {
    const d = dateSeparator(msg.timestamp);
    if (d !== lastDate) {
      (groupedMessages as any[]).push({ type: 'date', label: d });
      lastDate = d;
    }
    (groupedMessages as any[]).push({ type: 'msg', msg });
  });

  return (
    <div className="flex flex-col h-full bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border dark:border-dark-border shrink-0 bg-surface dark:bg-dark-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {(customerName || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-on-surface dark:text-white text-sm leading-tight">{customerName || 'Customer'}</p>
            {customerPhone && (
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[12px]">smartphone</span>
                {customerPhone}
              </p>
            )}
            {queueName && (
              <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mt-0.5">{queueName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchMessages}
            title="Refresh"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors text-on-surface-variant"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#E5DDD5]/10 dark:bg-zinc-900/20">
        {loading && (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-5 h-5 animate-spin text-primary" strokeWidth={1.5} />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center">
              <PhoneOff className="w-5 h-5 text-on-surface-variant" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400 max-w-[200px]">{error}</p>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-on-surface-variant opacity-50" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400">No messages yet.<br />Send the first message below.</p>
          </div>
        )}

        {!loading && (groupedMessages as any[]).map((item: any, i: number) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${i}`} className="flex justify-center">
                <span className="bg-surface-container dark:bg-white/10 text-outline dark:text-zinc-400 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shadow-sm">
                  {item.label}
                </span>
              </div>
            );
          }
          const msg: Message = item.msg;
          return (
            <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} max-w-full`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-xl shadow-sm ${
                msg.fromMe
                  ? 'bg-sky-100 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-800 rounded-tr-none text-sky-900 dark:text-sky-100'
                  : 'bg-white dark:bg-dark-card border border-border dark:border-dark-border rounded-tl-none text-on-surface dark:text-white'
              }`}>
                <p className="text-sm leading-snug break-words">{msg.body}</p>
                <div className={`flex items-center gap-1 mt-1 justify-end`}>
                  <span className="text-[10px] opacity-60 font-mono">{timeLabel(msg.timestamp)}</span>
                  {msg.fromMe && (
                    <span className={`material-symbols-outlined text-[12px] ${msg.status === 'sending' ? 'opacity-30' : 'text-sky-500'}`}>
                      {msg.status === 'sending' ? 'schedule' : 'done_all'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-3 bg-surface dark:bg-dark-card border-t border-border dark:border-dark-border">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl px-3 py-2.5 text-sm text-on-surface dark:text-white placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none overflow-hidden transition-all"
            style={{ minHeight: '44px', maxHeight: '100px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-11 h-11 shrink-0 bg-primary hover:bg-primary-container text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 shadow-sm"
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              : <Send className="w-4 h-4" strokeWidth={1.5} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
