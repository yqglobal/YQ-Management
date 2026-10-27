import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, PhoneOff, MessageSquare, RefreshCw, Trash2, X } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { useSocket } from './SocketProvider';
import { ConfirmModal } from './modals/ConfirmModal';

interface Message {
  id: string;
  body: string;
  fromMe: boolean;
  timestamp: string;
  status?: string;
  isAutomated?: boolean;
  automatedType?: string;
}

interface WhatsAppChatPanelProps {
  tokenId: string;
  customerName?: string;
  customerPhone?: string;
  queueName?: string;
  onClose?: () => void;
  hideHeader?: boolean;
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

function getAutomatedBadge(type?: string, body?: string): { label: string; icon: string } {
  if (body?.includes('check-in code') || type === 'otp') {
    return { label: 'Check-in OTP', icon: 'key' };
  }
  if (body?.includes('appointment is scheduled') || body?.includes('checked in') || type === 'queue_joined') {
    return { label: 'Ticket Confirmation', icon: 'confirmation_number' };
  }
  if (body?.includes("You're late") || body?.includes('Reminder') || type === 'reminder') {
    return { label: 'Automated Reminder', icon: 'alarm' };
  }
  if (body?.includes('SLA BREACH') || type === 'sla_breach') {
    return { label: 'SLA Escalation', icon: 'warning' };
  }
  if (type === 'now_serving') {
    return { label: 'Calling Customer', icon: 'campaign' };
  }
  if (type === 'position_update') {
    return { label: 'Queue Position Update', icon: 'update' };
  }
  if (type === 'delay') {
    return { label: 'Delay Notice', icon: 'schedule' };
  }
  if (type === 'survey' || body?.includes('experience? Reply')) {
    return { label: 'CSAT Survey', icon: 'reviews' };
  }
  return { label: 'Automated WhatsApp', icon: 'smart_toy' };
}

function renderMessageBody(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 dark:text-sky-300 underline underline-offset-2 break-all hover:opacity-80 font-medium"
        >
          {part}
        </a>
      );
    }

    const boldRegex = /\*([^*]+)\*/g;
    const subParts = part.split(boldRegex);
    if (subParts.length > 1) {
      return (
        <span key={index}>
          {subParts.map((sub, sIdx) =>
            sIdx % 2 === 1 ? <strong key={sIdx} className="font-bold">{sub}</strong> : sub
          )}
        </span>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export function WhatsAppChatPanel({
  tokenId,
  customerName: _customerName,
  customerPhone,
  queueName: _queueName,
  onClose,
  hideHeader = false,
}: WhatsAppChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { socket } = useSocket();

  const fetchMessages = useCallback(async () => {
    if (!tokenId) return;
    try {
      const data = await fetchApi(`/messages/token/${tokenId}`);
      if (Array.isArray(data)) {
        const mapped: Message[] = data.map((m: AnyFixMe) => ({
          id: m.id,
          body: m.body,
          fromMe: m.sender === 'MANAGER' || m.sender === 'SYSTEM' || !!m.isAutomated,
          isAutomated: !!m.isAutomated || m.sender === 'SYSTEM',
          automatedType: m.automatedType,
          timestamp: m.createdAt,
          status: m.status || (m.sender === 'CUSTOMER' ? undefined : 'delivered'),
        }));
        setMessages(mapped);
      }
      setError(null);
    } catch (e: AnyFixMe) {
      setError(e?.message || 'Unable to load messages. Ensure WhatsApp is connected.');
    }
  }, [tokenId]);

  useEffect(() => {
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    pollRef.current = setInterval(fetchMessages, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handleDeleteMessage = (payload: AnyFixMe) => {
      if (payload.type === 'MESSAGE_DELETED') {
        setMessages(prev => prev.filter(m => m.id !== payload.messageId));
      }
    };
    const handleNewMessage = () => {
      fetchMessages();
    };

    socket.on('MESSAGE_DELETED', handleDeleteMessage);
    socket.on('NEW_MESSAGE', handleNewMessage);
    socket.on('NEW_INBOX_MESSAGE', handleNewMessage);
    return () => {
      socket.off('MESSAGE_DELETED', handleDeleteMessage);
      socket.off('NEW_MESSAGE', handleNewMessage);
      socket.off('NEW_INBOX_MESSAGE', handleNewMessage);
    };
  }, [socket, fetchMessages]);

  const handleDelete = (msgId: string) => {
    setMessageToDelete(msgId);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;
    const msgId = messageToDelete;
    const previous = [...messages];
    setMessages(prev => prev.filter(m => m.id !== msgId));
    setIsDeleting(true);

    try {
      await fetchApi(`/messages/inbox/${msgId}`, { method: 'DELETE' });
      setMessageToDelete(null);
    } catch (e: AnyFixMe) {
      toast.error(e?.message || 'Failed to delete message');
      setMessages(previous);
    } finally {
      setIsDeleting(false);
    }
  };

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
      textareaRef.current.style.height = '36px';
    }

    try {
      await fetchApi(`/messages/token/${tokenId}`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      await fetchMessages();
    } catch (e: AnyFixMe) {
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
    el.style.height = Math.min(el.scrollHeight, 80) + 'px';
  };

  // Group messages with date separators
  const groupedMessages: ({ type: 'date'; label: string } | { type: 'msg'; msg: Message })[] = [];
  let lastDate = '';
  messages.forEach(msg => {
    const d = dateSeparator(msg.timestamp);
    if (d !== lastDate) {
      groupedMessages.push({ type: 'date', label: d });
      lastDate = d;
    }
    groupedMessages.push({ type: 'msg', msg });
  });

  return (
    <div className="flex flex-col h-full bg-[#efeae2]/60 dark:bg-[#0b141a] border border-border dark:border-dark-border rounded-xl overflow-hidden shadow-xs">
      {/* Optional Standalone Header (hidden when embedded in drawer that already has Chat title) */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border dark:border-dark-border shrink-0 bg-surface dark:bg-dark-card select-none">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-xs text-on-surface dark:text-white">Chat</span>
            {customerPhone && (
              <span className="text-[10px] text-outline font-mono">{customerPhone}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchMessages}
              title="Refresh messages"
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container dark:hover:bg-white/10 text-outline hover:text-on-surface transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                title="Close chat"
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container dark:hover:bg-white/10 text-outline hover:text-on-surface transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages area - WhatsApp replica */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#efeae2]/50 dark:bg-[#0b141a]">
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" strokeWidth={1.5} />
          </div>
        )}

        {error && !loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
            <div className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center">
              <PhoneOff className="w-4 h-4 text-on-surface-variant" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400 max-w-[220px]">{error}</p>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <div className="w-9 h-9 rounded-full bg-surface-container dark:bg-white/5 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-emerald-600/70" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400">
              No WhatsApp messages yet.<br />Send a message below.
            </p>
          </div>
        )}

        {groupedMessages.map((item, i) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${i}`} className="flex justify-center my-1.5 select-none">
                <span className="bg-white/90 dark:bg-[#182229]/90 text-[#54656f] dark:text-[#8696a0] text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-md shadow-xs border border-black/5 dark:border-white/5">
                  {item.label}
                </span>
              </div>
            );
          }

          const msg = item.msg;
          const badge = msg.isAutomated ? getAutomatedBadge(msg.automatedType, msg.body) : null;

          return (
            <div
              key={msg.id}
              className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} max-w-full group/msg my-1`}
            >
              <div
                className={`max-w-[85%] px-3 py-1.5 rounded-lg text-xs leading-relaxed shadow-xs relative ${
                  msg.fromMe
                    ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] border border-[#c1e7b9]/40 dark:border-[#02735a]/40 rounded-tr-none'
                    : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] border border-black/5 dark:border-white/5 rounded-tl-none'
                }`}
              >
                {/* Delete button on hover for manual operator messages */}
                {msg.fromMe && !msg.isAutomated && msg.status !== 'sending' && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="absolute -left-7 top-1/2 -translate-y-1/2 p-1 text-rose-500 hover:bg-rose-500/10 rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Automated WhatsApp Pill */}
                {badge && (
                  <div className="flex items-center gap-1 mb-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-200/50 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded w-fit select-none">
                    <span className="material-symbols-outlined text-[12px]">{badge.icon}</span>
                    <span>{badge.label}</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap break-words">{renderMessageBody(msg.body)}</div>

                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#667781] dark:text-[#8696a0] select-none">
                  <span className="font-sans">{timeLabel(msg.timestamp)}</span>
                  {msg.fromMe && (
                    <span
                      className={`material-symbols-outlined text-[13px] ${
                        msg.status === 'sending' ? 'opacity-40' : 'text-[#53bdeb]'
                      }`}
                    >
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

      {/* Input - Compact WhatsApp Field */}
      <div className="shrink-0 p-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-border/80 dark:border-dark-border/60">
        <div className="flex items-end gap-1.5">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 bg-white dark:bg-[#2a3942] border border-border/60 dark:border-transparent rounded-2xl px-3 py-1.5 text-xs text-on-surface dark:text-[#e9edef] placeholder:text-outline/70 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none transition-all leading-normal"
            style={{ minHeight: '36px', maxHeight: '80px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-9 h-9 shrink-0 bg-[#00a884] hover:bg-[#06cf9c] text-white rounded-full flex items-center justify-center transition-all disabled:opacity-35 shadow-xs cursor-pointer"
            title="Send WhatsApp message"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
            ) : (
              <Send className="w-4 h-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Message"
        description="Are you sure you want to delete this message for everyone? This action cannot be undone."
        confirmText="Delete for Everyone"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
