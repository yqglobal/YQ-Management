import React, { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  RefreshCw,
  CheckCircle,
  Trash2,
  Smile,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  ArrowLeft,
  Plus,
  Clock,
  Bot,
  MapPin,
  CheckCheck,
  User,
  PanelRightClose,
  PanelRightOpen,
  PhoneCall,
  ExternalLink,
  Key,
  Ticket,
  Bell,
  AlertTriangle,
  Radio,
  Star,
  Sparkles,
  ShieldCheck,
  Check,
  ChevronDown,
} from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { toast } from 'sonner';
import { useSocket } from '../../components/SocketProvider';
import { useLocation } from '../../components/LocationContext';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { CustomerDrawer } from '../../components/CustomerDrawer';

// ── Canned Quick Responses ───────────────────────────────────────────────────
const QUICK_RESPONSES = [
  { label: '👋 Greeting', text: 'Hello! How can we assist you today?' },
  { label: '🎫 Ticket Called', text: 'Your ticket has been called! Please approach the service desk.' },
  { label: '⏳ Short Delay', text: 'Thank you for your patience. We are running slightly behind and will call your number shortly.' },
  { label: '📍 Directions', text: 'We are located at the main reception entrance. Please let us know if you need directions.' },
  { label: '✅ Thank You', text: 'Thank you for visiting us! Have a wonderful rest of your day.' },
];

// ── Time & Date Helpers ─────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (isNaN(d.getTime())) return '';
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getAutomatedBadge(type?: string, body?: string): { label: string; icon: React.ElementType } | null {
  if (body?.includes('check-in code') || type === 'otp') {
    return { label: 'Check-in OTP', icon: Key };
  }
  if (body?.includes('appointment is scheduled') || body?.includes('checked in') || type === 'queue_joined') {
    return { label: 'Ticket Confirmation', icon: Ticket };
  }
  if (body?.includes("You're late") || body?.includes('Reminder') || type === 'reminder') {
    return { label: 'Reminder Notice', icon: Bell };
  }
  if (body?.includes('SLA BREACH') || type === 'sla_breach') {
    return { label: 'SLA Escalation', icon: AlertTriangle };
  }
  if (type === 'now_serving') {
    return { label: 'Now Serving Call', icon: Radio };
  }
  if (type === 'position_update') {
    return { label: 'Queue Position', icon: RefreshCw };
  }
  if (type === 'survey' || body?.includes('experience? Reply')) {
    return { label: 'CSAT Survey', icon: Star };
  }
  return null;
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
          className="text-sky-300 dark:text-sky-400 underline underline-offset-2 break-all hover:opacity-80 font-medium"
          onClick={(e) => e.stopPropagation()}
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

function getAvatarColor(nameOrPhone: string): string {
  const colors = [
    'bg-emerald-600',
    'bg-teal-600',
    'bg-cyan-600',
    'bg-blue-600',
    'bg-indigo-600',
    'bg-violet-600',
    'bg-amber-600',
  ];
  let sum = 0;
  for (let i = 0; i < nameOrPhone.length; i++) {
    sum += nameOrPhone.charCodeAt(i);
  }
  return colors[sum % colors.length];
}

function getInitials(nameOrPhone: string): string {
  const clean = nameOrPhone.trim();
  if (!clean) return '?';
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export default function InboxPage() {
  const router = useRouter();
  const { allowedLocations: locations, activeLocationId } = useLocation();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // ── Conversation & Chat State ──────────────────────────────────────────────
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  // Auto-select conversation or initiate chat when navigated from service-desk with ?phone=...
  useEffect(() => {
    const qPhone = router.query.phone;
    if (typeof qPhone === 'string' && qPhone.trim()) {
      setSelectedPhone(qPhone.trim());
    }
  }, [router.query.phone]);
  const [input, setInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // ── Filter & Search Toolbar State (WhatsApp Web Style) ───────────────────────
  const [tabFilter, setTabFilter] = useState<'all' | 'unread' | 'automated'>('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [search, setSearch] = useState('');

  // ── UI Modals & Drawers ────────────────────────────────────────────────────
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [selectedCustomerIdForDrawer, setSelectedCustomerIdForDrawer] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // ── Location Dropdown State & Click-Outside Handler ────────────────────────
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsLocationDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync location selection with query params
  const effectiveLocationId = selectedLocationId !== 'all' ? selectedLocationId : (activeLocationId && activeLocationId !== 'all' ? activeLocationId : undefined);
  const locParam = effectiveLocationId ? `?locationId=${effectiveLocationId}` : '';

  // ── Query Conversations ────────────────────────────────────────────────────
  const {
    data: conversations = [],
    isLoading: isLoadingConvos,
    isRefetching: isRefetchingConvos,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ['inbox-conversations', effectiveLocationId],
    queryFn: () => fetchApi<any[]>(`/messages/inbox${locParam}`),
    refetchInterval: 5000,
  });

  // ── Query Messages for Selected Phone ──────────────────────────────────────
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['inbox-messages', selectedPhone],
    queryFn: () => fetchApi<any[]>(`/messages/inbox/${selectedPhone}`),
    enabled: !!selectedPhone,
    refetchInterval: 3000,
  });

  // ── Query Active Visits for Context ────────────────────────────────────────
  const { data: todayVisits = [] } = useQuery({
    queryKey: ['visits', 'today-inbox'],
    queryFn: () => fetchApi<any>('/visits?scope=today').then((res) => res?.data || res || []).catch(() => []),
    staleTime: 30000,
  });

  // Ensure non-null arrays for conversations and messages
  const safeConversations: any[] = useMemo(() => (Array.isArray(conversations) ? conversations : []), [conversations]);
  const safeMessages: any[] = useMemo(() => (Array.isArray(messages) ? messages : []), [messages]);

  // Find active visit for currently selected conversation
  const activeVisitForCustomer = useMemo(() => {
    if (!selectedPhone || !todayVisits.length) return null;
    const cleanSelected = selectedPhone.replace(/\D/g, '').slice(-9);
    return todayVisits.find((v: any) => {
      const custPhone = (v.customer?.phone || '').replace(/\D/g, '').slice(-9);
      return custPhone && cleanSelected && custPhone === cleanSelected;
    });
  }, [selectedPhone, todayVisits]);

  // Selected conversation meta
  const currentConversation = useMemo(() => {
    return safeConversations.find((c: any) => c.customerPhone === selectedPhone);
  }, [safeConversations, selectedPhone]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeMessages]);

  // Socket: Message Deleted Handler
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

  // Click outside emoji picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Total Unread and Automated counters for filter badges
  const totalUnreadCount = useMemo(() => {
    return safeConversations.reduce((acc: number, c: any) => acc + (c.unreadCount || 0), 0);
  }, [safeConversations]);

  const automatedCount = useMemo(() => {
    return safeConversations.filter((c: any) => c.lastMessage?.sender === 'SYSTEM' || c.lastMessage?.isAutomated).length;
  }, [safeConversations]);

  // ── Filtered Conversations (WhatsApp Web Style) ─────────────────────────────
  const filteredConversations = useMemo(() => {
    let list = [...safeConversations];

    // Filter by Tab (All, Unread, Automated)
    if (tabFilter === 'unread') {
      list = list.filter((c: any) => (c.unreadCount || 0) > 0);
    } else if (tabFilter === 'automated') {
      list = list.filter((c: any) => c.lastMessage?.sender === 'SYSTEM' || c.lastMessage?.isAutomated);
    }

    // Filter by Search Query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((c: any) => {
        const phone = (c.customerPhone || '').toLowerCase();
        const name = (c.customerName || '').toLowerCase();
        const msg = (c.lastMessage?.body || '').toLowerCase();
        return phone.includes(q) || name.includes(q) || msg.includes(q);
      });
    }

    // Always sort by latest message activity (just like WhatsApp Web)
    list.sort((a: any, b: any) => {
      if (tabFilter === 'unread') {
        const diff = (b.unreadCount || 0) - (a.unreadCount || 0);
        if (diff !== 0) return diff;
      }
      return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
    });

    return list;
  }, [safeConversations, tabFilter, search]);

  // ── Send Message Mutation ──────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: (payload: { text: string; media?: string; mediaType?: string }) =>
      fetchApi(`/messages/inbox/${selectedPhone}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setInput('');
      removeMedia();
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', selectedPhone] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to send message'),
  });

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !media) return;
    if (sendMutation.isPending || !selectedPhone) return;
    sendMutation.mutate({
      text: input.trim(),
      media: media || undefined,
      mediaType: mediaType || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5MB limit');
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

  const confirmDelete = async () => {
    if (!messageToDelete) return;
    setIsDeleting(true);
    try {
      await fetchApi(`/messages/inbox/${messageToDelete}`, { method: 'DELETE' });
      toast.success('Message deleted for everyone');
      setMessageToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['inbox-messages', selectedPhone] });
      queryClient.invalidateQueries({ queryKey: ['inbox-conversations'] });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInput((prev) => prev + emojiData.emoji);
  };

  const handleRefresh = () => {
    refetchConversations();
    if (selectedPhone) refetchMessages();
    toast.success('Inbox refreshed');
  };

  return (
    <AdminLayout pageTitle="WhatsApp Inbox" noPadding={true}>
      <Head>
        <title>WhatsApp Inbox | Qmova</title>
      </Head>

      <div className="w-full h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] p-1.5 sm:p-2 md:p-2.5 flex flex-col">
        {/* ── Main WhatsApp Web App Container ─────────────────────────────────── */}
        <div className="flex relative flex-1 h-full min-h-0 bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl md:rounded-2xl overflow-hidden shadow-sm">
          
          {/* ── Left Column: WhatsApp Web Sidebar ─────────────────────────────── */}
          <div
            className={`w-full md:w-80 lg:w-96 border-r border-border dark:border-dark-border flex flex-col bg-surface dark:bg-zinc-900/60 shrink-0 transition-transform duration-300 ${
              selectedPhone ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* 1. Sidebar Header: Title, Location Dropdown, Actions */}
            <div className="px-3.5 py-2.5 border-b border-border dark:border-dark-border bg-surface-container-low/60 dark:bg-zinc-900 flex items-center justify-between gap-2 relative z-20">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="font-bold text-base text-on-surface dark:text-white">Chats</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container font-mono text-on-surface-variant shrink-0">
                  {safeConversations.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Location Filter Dropdown */}
                <div className="relative" ref={locationDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsLocationDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 bg-surface-container-low dark:bg-zinc-800/90 hover:bg-surface-container dark:hover:bg-zinc-700/80 border border-border dark:border-zinc-700/80 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-on-surface dark:text-zinc-200 transition-colors shadow-xs max-w-[130px] sm:max-w-[155px]"
                    title="Filter chats by location"
                  >
                    <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">
                      {selectedLocationId === 'all'
                        ? 'All Locations'
                        : (locations || []).find((l: any) => l.id === selectedLocationId)?.name || 'Location'}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-on-surface-variant dark:text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isLocationDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isLocationDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-48 sm:w-52 max-h-60 overflow-y-auto bg-surface dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLocationId('all');
                          setIsLocationDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                          selectedLocationId === 'all'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'text-on-surface dark:text-zinc-200 hover:bg-surface-container-low dark:hover:bg-zinc-800/70'
                        }`}
                      >
                        <span className="truncate">All Locations</span>
                        {selectedLocationId === 'all' && (
                          <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </button>

                      {(locations || []).map((loc: any) => {
                        const isSelected = selectedLocationId === loc.id;
                        return (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => {
                              setSelectedLocationId(loc.id);
                              setIsLocationDropdownOpen(false);
                            }}
                            title={loc.name}
                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                              isSelected
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'text-on-surface dark:text-zinc-200 hover:bg-surface-container-low dark:hover:bg-zinc-800/70'
                            }`}
                          >
                            <span className="truncate">{loc.name}</span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  title="Refresh chats"
                  className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefetchingConvos ? 'animate-spin text-primary' : ''}`} />
                </button>

                {/* New Chat Button */}
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  title="Start new conversation"
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Search Bar Row (WhatsApp Web Style) */}
            <div className="p-2.5 border-b border-border/70 dark:border-dark-border/70 bg-surface dark:bg-zinc-900/40">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Search or start new chat"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface-container-low dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-xl pl-9 pr-8 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-on-surface dark:text-white placeholder:text-on-surface-variant font-medium shadow-inner"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 3. Filter Chips Row (All, Unread, Automated) */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 dark:border-dark-border/60 bg-surface dark:bg-zinc-900/60 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setTabFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  tabFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface-container dark:bg-zinc-800 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                All
              </button>

              <button
                onClick={() => setTabFilter('unread')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  tabFilter === 'unread'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface-container dark:bg-zinc-800 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span>Unread</span>
                {totalUnreadCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      tabFilter === 'unread' ? 'bg-white/20 text-white' : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {totalUnreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setTabFilter('automated')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  tabFilter === 'automated'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface-container dark:bg-zinc-800 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <Bot className="w-3 h-3" />
                <span>Automated</span>
                {automatedCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      tabFilter === 'automated'
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-container-high dark:bg-zinc-700 text-on-surface-variant'
                    }`}
                  >
                    {automatedCount}
                  </span>
                )}
              </button>
            </div>

            {/* 4. Conversation Feed */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60 dark:divide-zinc-800/60">
              {isLoadingConvos ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs text-on-surface-variant">Loading chats...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant">
                    <MessageSquare className="w-5 h-5 opacity-40" />
                  </div>
                  <p className="text-xs font-semibold text-on-surface dark:text-white">
                    No conversations found
                  </p>
                  <p className="text-[11px] text-on-surface-variant">
                    {search || tabFilter !== 'all' || selectedLocationId !== 'all'
                      ? 'Try clearing search or filters to see more results.'
                      : 'Incoming WhatsApp messages will appear here.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((c: any) => {
                  const isSelected = selectedPhone === c.customerPhone;
                  const isUnread = (c.unreadCount || 0) > 0;
                  const lastMsg = c.lastMessage;
                  const isCustomerSender = lastMsg?.sender === 'CUSTOMER';
                  const isBotSender = lastMsg?.sender === 'SYSTEM' || lastMsg?.isAutomated;

                  return (
                    <button
                      key={c.id || c.customerPhone}
                      onClick={() => setSelectedPhone(c.customerPhone)}
                      className={`w-full text-left p-3 transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/10 border-l-4 border-l-emerald-600 dark:bg-emerald-500/15'
                          : 'border-l-4 border-l-transparent hover:bg-surface-container-low dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${getAvatarColor(
                            c.customerName || c.customerPhone
                          )}`}
                        >
                          {getInitials(c.customerName || c.customerPhone)}
                        </div>
                        {isUnread && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full"></span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface dark:text-white'
                            }`}
                          >
                            {c.customerName || c.customerPhone}
                          </span>
                          <span className="text-[10px] text-on-surface-variant shrink-0">
                            {formatRelativeTime(c.lastMessageAt || c.updatedAt)}
                          </span>
                        </div>

                        {c.customerName && (
                          <p className="text-[11px] text-on-surface-variant font-mono truncate mb-1">
                            {c.customerPhone}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs truncate ${
                              isUnread ? 'font-semibold text-on-surface dark:text-zinc-200' : 'text-on-surface-variant'
                            }`}
                          >
                            {lastMsg ? (
                              <>
                                <span className="opacity-70 mr-1">
                                  {isCustomerSender ? '' : isBotSender ? 'Bot: ' : 'You: '}
                                </span>
                                {lastMsg.body}
                              </>
                            ) : (
                              <span className="italic opacity-60">No messages yet</span>
                            )}
                          </p>

                          {isUnread && (
                            <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 shadow-xs">
                              {c.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Middle Column: WhatsApp Web Chat Window ───────────────────────── */}
          <div className="flex-1 flex flex-col bg-surface-container-lowest dark:bg-zinc-950/60 min-w-0">
            {selectedPhone ? (
              <>
                {/* Chat Top Header */}
                <div className="p-3 border-b border-border dark:border-dark-border bg-surface dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setSelectedPhone(null)}
                      className="md:hidden p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm ${getAvatarColor(
                        currentConversation?.customerName || selectedPhone
                      )}`}
                    >
                      {getInitials(currentConversation?.customerName || selectedPhone)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-on-surface dark:text-white truncate">
                          {currentConversation?.customerName || selectedPhone}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          WhatsApp
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant font-mono truncate">
                        {selectedPhone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${selectedPhone}`}
                      className="p-2 text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-500/10 rounded-xl transition-colors cursor-pointer"
                      title="Call customer"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </a>

                    {currentConversation?.customerId && (
                      <button
                        onClick={() => setSelectedCustomerIdForDrawer(currentConversation.customerId)}
                        className="p-2 text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-500/10 rounded-xl transition-colors cursor-pointer"
                        title="View customer profile"
                      >
                        <User className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer hidden lg:flex ${
                        isInspectorOpen
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                      }`}
                      title={isInspectorOpen ? 'Hide customer info' : 'Show customer info'}
                    >
                      {isInspectorOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-16">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                    </div>
                  ) : safeMessages.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-surface-container dark:bg-zinc-900 mx-auto flex items-center justify-center text-on-surface-variant">
                        <MessageSquare className="w-6 h-6 opacity-40" />
                      </div>
                      <p className="text-sm font-semibold text-on-surface dark:text-white">
                        No messages in this conversation yet
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        Send a message below to connect with this customer via WhatsApp.
                      </p>
                    </div>
                  ) : (
                    safeMessages.map((m: any, index: number) => {
                      const isOperator = m.sender === 'MANAGER';
                      const isSystem = m.sender === 'SYSTEM';
                      const isOurSide = isOperator || isSystem;
                      const autoBadge = getAutomatedBadge(m.automatedType, m.body);

                      // Date separator check
                      const prevMsg = index > 0 ? safeMessages[index - 1] : null;
                      const showDateSep =
                        !prevMsg ||
                        getDateSeparator(m.createdAt) !== getDateSeparator(prevMsg.createdAt);

                      return (
                        <React.Fragment key={m.id || index}>
                          {showDateSep && (
                            <div className="flex items-center justify-center my-2.5">
                              <span className="px-3 py-0.5 rounded-full text-[10px] font-semibold bg-surface-container-high dark:bg-zinc-800/80 text-on-surface-variant border border-border/60 dark:border-zinc-700/60 shadow-xs">
                                {getDateSeparator(m.createdAt)}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${isOurSide ? 'justify-end' : 'justify-start'} group/msg relative`}>
                            <div
                              className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2 relative shadow-sm transition-all ${
                                isOurSide
                                  ? 'bg-emerald-600 text-white rounded-br-sm'
                                  : 'bg-white dark:bg-zinc-800 text-on-surface dark:text-white rounded-bl-sm border border-border dark:border-zinc-700'
                              }`}
                            >
                              {/* Hover Delete Action */}
                              {isOurSide && (
                                <button
                                  onClick={() => setMessageToDelete(m.id)}
                                  className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity cursor-pointer"
                                  title="Delete message for everyone"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Automated System Badge Header */}
                              {autoBadge && (
                                <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-white/20 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                                  <autoBadge.icon className="w-3 h-3" />
                                  <span>{autoBadge.label}</span>
                                </div>
                              )}

                              {/* Message Content */}
                              {m.body?.startsWith('[Media Attachment]') ? (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 bg-black/10 dark:bg-white/10 rounded-lg p-2">
                                    <ImageIcon className="w-4 h-4" />
                                    <span className="text-xs font-semibold">Media File Attached</span>
                                  </div>
                                  {m.body.length > 18 && (
                                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">
                                      {renderMessageBody(m.body.substring(19))}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                                  {renderMessageBody(m.body || '')}
                                </p>
                              )}

                              {/* Footer Meta */}
                              <div
                                className={`flex items-center justify-end gap-1.5 mt-1 ${
                                  isOurSide ? 'text-emerald-100' : 'text-on-surface-variant'
                                }`}
                              >
                                {isSystem && !autoBadge && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-black/10 dark:bg-white/10 px-1 rounded">
                                    Bot
                                  </span>
                                )}
                                <span className="text-[10px]">
                                  {new Date(m.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {isOurSide && (
                                  <CheckCheck className="w-3.5 h-3.5 text-white/90" />
                                )}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* ── Canned Responses Quick Bar ────────────────────────────── */}
                <div className="px-3.5 py-1.5 bg-surface-container-low/60 dark:bg-zinc-900/80 border-t border-border dark:border-dark-border flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Quick:
                  </span>
                  {QUICK_RESPONSES.map((qr) => (
                    <button
                      key={qr.label}
                      type="button"
                      onClick={() => setInput(qr.text)}
                      className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-surface-container dark:bg-zinc-800 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 border border-border dark:border-zinc-700/80 text-on-surface-variant whitespace-nowrap transition-colors cursor-pointer"
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>

                {/* ── Input Composer Area ───────────────────────────────────── */}
                <div className="p-3 border-t border-border dark:border-dark-border bg-surface dark:bg-zinc-900 relative">
                  {/* Media Preview Box */}
                  {media && (
                    <div className="mb-2.5 flex items-center gap-3 bg-surface-container-low p-2 rounded-xl relative w-max pr-10 border border-border dark:border-zinc-700">
                      <button
                        onClick={removeMedia}
                        className="absolute right-2 top-2 bg-surface-variant p-1 rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer"
                      >
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
                        <span className="text-xs font-semibold text-on-surface dark:text-white">Attachment Ready</span>
                        <span className="text-[10px] text-on-surface-variant font-mono">
                          {mediaType?.split('/')[1]?.toUpperCase() || 'FILE'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Emoji Picker Popup */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-[80px] left-3 z-50 shadow-2xl" ref={emojiPickerRef}>
                      <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
                    </div>
                  )}

                  <form onSubmit={handleSend} className="flex gap-2 items-end">
                    <div className="flex items-center gap-0.5 pb-0.5">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2 text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Add emoji"
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
                        className="p-2 text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Attach image or file"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={media ? 'Add an optional caption...' : 'Type a WhatsApp message... (Enter to send)'}
                        className="w-full bg-surface-container-low dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-xl px-4 py-2 text-xs sm:text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all resize-none max-h-32 shadow-inner"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={(!input.trim() && !media) || sendMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-md cursor-pointer shrink-0 mb-0.5"
                      title="Send message"
                    >
                      {sendMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              /* WhatsApp Web Iconic Empty Chat State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <MessageSquare className="w-8 h-8 opacity-80" />
                </div>
                <div className="max-w-sm space-y-1.5">
                  <h3 className="font-bold text-base text-on-surface dark:text-white">
                    WhatsApp Web for Support
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Select a chat from the left or click <span className="font-semibold text-emerald-600 dark:text-emerald-400">"+"</span> to start a new conversation.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-[11px] text-outline font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>End-to-end encrypted with WhatsApp Cloud API</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Customer Inspector Panel ────────────────────────── */}
          {selectedPhone && isInspectorOpen && (
            <div className="w-72 border-l border-border dark:border-dark-border bg-surface dark:bg-zinc-900/60 p-4 flex flex-col gap-4 overflow-y-auto hidden lg:flex shrink-0">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Contact Details
                  </h4>
                  <button
                    onClick={() => setIsInspectorOpen(false)}
                    className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                    title="Collapse panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-center p-3.5 rounded-2xl bg-surface-container-low dark:bg-zinc-800/40 border border-border dark:border-zinc-700/60">
                  <div
                    className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white font-bold text-sm shadow-sm mb-2 ${getAvatarColor(
                      currentConversation?.customerName || selectedPhone
                    )}`}
                  >
                    {getInitials(currentConversation?.customerName || selectedPhone)}
                  </div>
                  <h5 className="font-bold text-sm text-on-surface dark:text-white truncate">
                    {currentConversation?.customerName || 'Anonymous Visitor'}
                  </h5>
                  <p className="text-xs font-mono text-on-surface-variant mt-0.5">
                    {selectedPhone}
                  </p>
                  {currentConversation?.customerEmail && (
                    <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                      {currentConversation.customerEmail}
                    </p>
                  )}
                </div>
              </div>

              {/* Active Ticket Status Card */}
              {activeVisitForCustomer ? (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Active Queue Ticket
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                      {activeVisitForCustomer.currentState}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black font-mono text-on-surface dark:text-white">
                      #{activeVisitForCustomer.ticketNumber || activeVisitForCustomer.id.slice(0, 6)}
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium">
                      {activeVisitForCustomer.service?.name || 'General Service'}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant truncate">
                    Queue: <span className="font-semibold text-on-surface dark:text-white">{activeVisitForCustomer.queue?.name}</span>
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-surface-container-low dark:bg-zinc-800/30 border border-border dark:border-zinc-800 text-center">
                  <Ticket className="w-4 h-4 mx-auto text-on-surface-variant mb-1 opacity-40" />
                  <p className="text-xs font-semibold text-on-surface-variant">No Active Ticket Today</p>
                  <p className="text-[10px] text-outline mt-0.5">Customer is not currently queued.</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2 pt-2 border-t border-border dark:border-dark-border">
                {currentConversation?.customerId && (
                  <button
                    onClick={() => setSelectedCustomerIdForDrawer(currentConversation.customerId)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-container hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all border border-border dark:border-zinc-800 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Customer Records
                  </button>
                )}

                <a
                  href={`tel:${selectedPhone}`}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-container hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all border border-border dark:border-zinc-800 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Customer
                </a>
              </div>

              {/* Channel Meta */}
              <div className="text-[11px] text-outline space-y-1 pt-2 border-t border-border dark:border-dark-border">
                <div className="flex justify-between">
                  <span>Channel</span>
                  <span className="font-semibold text-on-surface-variant">WhatsApp Cloud</span>
                </div>
                <div className="flex justify-between">
                  <span>First Contact</span>
                  <span className="font-mono text-on-surface-variant">
                    {new Date(currentConversation?.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Message</span>
                  <span className="font-mono text-on-surface-variant">
                    {formatRelativeTime(currentConversation?.lastMessageAt || Date.now())}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Start New Chat Modal ──────────────────────────────────────────────── */}
      {isNewChatModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNewChatModalOpen(false);
          }}
        >
          <div className="bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface dark:text-white">
                    Start New Conversation
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Send a direct WhatsApp message to any customer.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const phoneInput = form.elements.namedItem('phone') as HTMLInputElement;
                const messageInput = form.elements.namedItem('initialMessage') as HTMLTextAreaElement;

                const phone = phoneInput?.value?.trim();
                const initialMsg = messageInput?.value?.trim();

                if (!phone) {
                  toast.error('Please enter a valid phone number');
                  return;
                }

                setIsNewChatModalOpen(false);
                setSelectedPhone(phone);

                if (initialMsg) {
                  sendMutation.mutate({ text: initialMsg });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-on-surface dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                  Customer Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    name="phone"
                    type="tel"
                    placeholder="e.g. +1 555-0199 or 0821234567"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono"
                  />
                </div>
                <p className="text-[11px] text-outline mt-1">
                  Include country code (e.g. +27, +1, +44) for international delivery.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface dark:text-zinc-300 mb-1.5 uppercase tracking-wide">
                  Initial Message (Optional)
                </label>
                <textarea
                  name="initialMessage"
                  rows={3}
                  placeholder="Type an opening message to send immediately..."
                  className="w-full p-3 bg-surface-container-low dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border dark:border-zinc-800 text-xs font-semibold hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Open Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Image Lightbox Modal ──────────────────────────────────────────────── */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImageModal}
              alt="Attachment Preview"
              className="rounded-2xl max-w-full max-h-[85vh] object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* ── Delete Message Confirmation Modal ─────────────────────────────────── */}
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

      {/* ── Customer Details Drawer ───────────────────────────────────────────── */}
      <CustomerDrawer
        isOpen={!!selectedCustomerIdForDrawer}
        onClose={() => setSelectedCustomerIdForDrawer(null)}
        customerId={selectedCustomerIdForDrawer}
      />
    </AdminLayout>
  );
}
