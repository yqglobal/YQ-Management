import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { MessageSquare, Send, Search, Phone, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '../../components/SocketProvider';
import { useLocation } from '../../components/LocationContext';

export default function InboxPage() {
  const { activeLocationId } = useLocation();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const locParam = activeLocationId && activeLocationId !== 'all' ? `?locationId=${activeLocationId}` : '';

  const { data: conversations = [], isLoading: isLoadingConvos } = useQuery({
    queryKey: ['inbox-conversations', activeLocationId],
    queryFn: () => fetchApi(`/messages/inbox${locParam}`),
    refetchInterval: 5000,
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['inbox-messages', selectedPhone],
    queryFn: () => fetchApi(`/messages/inbox/${selectedPhone}`),
    enabled: !!selectedPhone,
    refetchInterval: 3000,
  });

  const { socket } = useSocket();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload: any) => {
      if (payload.type === 'MESSAGE_DELETED') {
        queryClient.invalidateQueries({ queryKey: ['inbox-messages', selectedPhone] });
        queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
      }
    };
    socket.on('MESSAGE_DELETED', handler);
    return () => {
      socket.off('MESSAGE_DELETED', handler);
    };
  }, [socket, selectedPhone, queryClient]);

  const handleDelete = async (msgId: string) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await fetchApi(`/messages/inbox/${msgId}`, { method: 'DELETE' });
      toast.success('Message deleted');
      // Query invalidate will handle UI update via websocket or refetch
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete message');
    }
  };

  const sendMutation = useMutation({
    mutationFn: (text: string) => fetchApi(`/messages/inbox/${selectedPhone}`, {
      method: 'POST',
      body: JSON.stringify({ text })
    }),
    onSuccess: () => {
      setInput('');
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', selectedPhone] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to send message')
  });

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate(input.trim());
  };

  const filteredConversations = conversations.filter((c: any) => 
    c.customerPhone.includes(search)
  );

  return (
    <AdminLayout pageTitle="WhatsApp Inbox">
      <Head>
        <title>Inbox | Qmova</title>
      </Head>

      <div className="flex h-[calc(100vh-140px)] bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
        {/* Sidebar */}
        <div className="w-80 border-r border-border dark:border-dark-border flex flex-col bg-surface dark:bg-dark-card shrink-0">
          <div className="p-4 border-b border-border dark:border-dark-border">
            <h2 className="font-headline-sm font-semibold mb-3">Conversations</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input 
                type="text" 
                placeholder="Search phone..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingConvos ? (
              <div className="p-4 text-center text-sm text-on-surface-variant">Loading...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-on-surface-variant">No active conversations.</div>
            ) : (
              filteredConversations.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedPhone(c.customerPhone)}
                  className={`w-full text-left p-4 border-b border-border dark:border-dark-border hover:bg-surface-container transition-colors flex items-center justify-between ${selectedPhone === c.customerPhone ? 'bg-primary/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Phone className="w-4 h-4 text-on-surface-variant" />
                      <span className="font-semibold text-sm">{c.customerPhone}</span>
                    </div>
                    <span className="text-xs text-on-surface-variant">
                      {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-surface-container-lowest dark:bg-zinc-950/50">
          {selectedPhone ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border dark:border-dark-border bg-surface dark:bg-dark-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{selectedPhone}</h3>
                    <p className="text-xs text-on-surface-variant flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      Human support active
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="text-center text-sm text-on-surface-variant py-8">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-on-surface-variant py-8">No messages yet.</div>
                ) : (
                  messages.map((m: any) => {
                    const isOperator = m.sender === 'OPERATOR';
                    return (
                      <div key={m.id} className={`flex ${isOperator ? 'justify-end' : 'justify-start'} group/msg`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 relative ${
                          isOperator 
                            ? 'bg-primary text-white rounded-br-sm' 
                            : 'bg-surface-container text-on-surface dark:bg-zinc-800 dark:text-white rounded-bl-sm border border-border dark:border-zinc-700'
                        }`}>
                          {isOperator && (
                            <button 
                              onClick={() => handleDelete(m.id)}
                              className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-alert hover:bg-alert/10 rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity"
                              title="Delete message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                          <span className={`text-[10px] mt-1 block ${isOperator ? 'text-primary-100' : 'text-on-surface-variant'}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border dark:border-dark-border bg-surface dark:bg-dark-card">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sendMutation.isPending}
                    className="bg-primary hover:bg-primary-container text-on-primary w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {sendMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
