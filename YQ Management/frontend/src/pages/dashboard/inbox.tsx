import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { MessageSquare, Send, Search, Phone, RefreshCw, CheckCircle, Trash2, Smile, Paperclip, X, Image as ImageIcon, FileText } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { toast } from 'sonner';
import { useSocket } from '../../components/SocketProvider';
import { useLocation } from '../../components/LocationContext';

export default function InboxPage() {
  const { activeLocationId } = useLocation();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
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
    const handler = (payload: AnyFixMe) => {
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setMedia(base64);
      setMediaType(file.type);
      if (file.type.startsWith('image/')) {
        setMediaPreview(base64);
      } else {
        setMediaPreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMedia(null);
    setMediaType(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (msgId: string) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    try {
      await fetchApi(`/messages/inbox/${msgId}`, { method: 'DELETE' });
      toast.success('Message deleted');
      // Query invalidate will handle UI update via websocket or refetch
    } catch (e: AnyFixMe) {
      toast.error(e?.message || 'Failed to delete message');
    }
  };

  const sendMutation = useMutation({
    mutationFn: (payload: {text: string, media?: string, mediaType?: string}) => fetchApi(`/messages/inbox/${selectedPhone}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    onSuccess: () => {
      setInput('');
      removeMedia();
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', selectedPhone] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    },
    onError: (err: AnyFixMe) => toast.error(err.message || 'Failed to send message')
  });

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !media) return;
    if (sendMutation.isPending) return;
    sendMutation.mutate({ text: input.trim(), media: media || undefined, mediaType: mediaType || undefined });
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInput(prev => prev + emojiData.emoji);
  };

  const filteredConversations = conversations.filter((c: AnyFixMe) => 
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
              filteredConversations.map((c: AnyFixMe) => (
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
                  messages.map((m: AnyFixMe) => {
                    const isOperator = m.sender === 'OPERATOR';
                    const isSystem = m.sender === 'SYSTEM';
                    const isOurSide = isOperator || isSystem;
                    
                    return (
                      <div key={m.id} className={`flex ${isOurSide ? 'justify-end' : 'justify-start'} group/msg`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 relative shadow-sm ${
                          isOurSide 
                            ? 'bg-primary text-white rounded-br-sm' 
                            : 'bg-surface-container-highest text-on-surface dark:bg-zinc-800 dark:text-white rounded-bl-sm border border-border dark:border-zinc-700'
                        }`}>
                          {isOurSide && (
                            <button 
                              onClick={() => handleDelete(m.id)}
                              className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-alert hover:bg-alert/10 rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity"
                              title="Delete message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Message Content */}
                          {m.body.startsWith('[Media Attachment]') ? (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 bg-black/10 dark:bg-white/10 rounded-lg p-2">
                                <ImageIcon className="w-4 h-4" />
                                <span className="text-sm font-medium">Attachment</span>
                              </div>
                              {m.body.length > 18 && (
                                <p className="text-sm whitespace-pre-wrap break-words">{m.body.substring(19)}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                          )}

                          <div className={`flex items-center justify-end gap-1 mt-1 ${isOurSide ? 'text-primary-100' : 'text-on-surface-variant'}`}>
                            {isSystem && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-black/10 dark:bg-white/10 px-1 rounded">Bot</span>
                            )}
                            <span className="text-[10px]">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border dark:border-dark-border bg-surface dark:bg-dark-card relative">
                
                {/* Media Preview Area */}
                {media && (
                  <div className="mb-3 flex items-center gap-3 bg-surface-container-low p-2 rounded-xl relative w-max pr-10 border border-border">
                    <button onClick={removeMedia} className="absolute right-2 top-2 bg-surface-variant p-1 rounded-full hover:bg-surface-container-highest transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                    {mediaPreview ? (
                      <img src={mediaPreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-surface-variant rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-on-surface-variant" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Attachment Ready</span>
                      <span className="text-xs text-on-surface-variant">{mediaType?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                    </div>
                  </div>
                )}

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-[80px] left-4 z-50 shadow-2xl" ref={emojiPickerRef}>
                    <EmojiPicker onEmojiClick={onEmojiClick} theme="auto" />
                  </div>
                )}

                <form onSubmit={handleSend} className="flex gap-2 items-center">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                      accept="image/*,application/pdf"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={media ? "Add a caption..." : "Type a message..."}
                    className="flex-1 bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={(!input.trim() && !media) || sendMutation.isPending}
                    className="bg-primary hover:bg-primary-container text-on-primary w-11 h-11 rounded-xl flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-md"
                  >
                    {sendMutation.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
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
