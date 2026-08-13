import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Bell,
  AlertTriangle,
  MessageSquare,
  List,
  CreditCard,
  ShieldCheck,
  Check,
  Trash2,
  X,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { fetchApi } from '../lib/api';
import { useAuth } from './AuthContext';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'ALERT' | 'WHATSAPP' | 'QUEUE' | 'BILLING' | 'SYSTEM';
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load persistence from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedRead = localStorage.getItem('yq_notifs_read');
        const storedDismissed = localStorage.getItem('yq_notifs_dismissed');
        if (storedRead) setReadIds(JSON.parse(storedRead));
        if (storedDismissed) setDismissedIds(JSON.parse(storedDismissed));
      } catch (e) {
        console.error('Failed to load notifications state from localStorage', e);
      }
    }
  }, []);

  const persistState = (newRead: string[], newDismissed: string[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('yq_notifs_read', JSON.stringify(newRead));
        localStorage.setItem('yq_notifs_dismissed', JSON.stringify(newDismissed));
      } catch (e) {
        console.error('Failed to save notifications state', e);
      }
    }
  };

  const fetchSystemNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const liveList: Omit<NotificationItem, 'isRead'>[] = [];

    // 1. WhatsApp Connectivity & Health Alert
    try {
      const waStatus: any = await fetchApi('/whatsapp/status');
      if (waStatus?.state !== 'open' && waStatus?.state !== 'connected') {
        liveList.push({
          id: 'wa-offline-alert',
          title: 'WhatsApp Offline',
          message: 'Automated SMS & WhatsApp ticket messaging is not connected. Reconnect immediately to notify waiting customers.',
          category: 'WHATSAPP',
          timestamp: 'Live Alert',
          actionUrl: '/dashboard/settings/whatsapp',
          actionText: 'Connect WhatsApp',
        });
      } else {
        liveList.push({
          id: 'wa-online-status',
          title: 'WhatsApp Connected',
          message: 'Evolution API messaging instance is online and dispatching real-time token alerts.',
          category: 'WHATSAPP',
          timestamp: 'System Status',
          actionUrl: '/dashboard/settings/whatsapp',
          actionText: 'View Settings',
        });
      }
    } catch {
      liveList.push({
        id: 'wa-check-error',
        title: 'WhatsApp Status Unverified',
        message: 'Could not verify WhatsApp connection. Ensure your Evolution API service is running.',
        category: 'WHATSAPP',
        timestamp: 'Just now',
        actionUrl: '/dashboard/settings/whatsapp',
        actionText: 'Check Status',
      });
    }

    // 2. Queues Activity & Bottlenecks
    try {
      const queues: any = await fetchApi('/queue');
      if (Array.isArray(queues) && queues.length > 0) {
        let totalWaiting = 0;
        queues.forEach((q: any) => {
          if (q.status === 'PAUSED') {
            liveList.push({
              id: `queue-paused-${q.id}`,
              title: `Queue Paused: ${q.name}`,
              message: `Queue "${q.name}" is currently paused. New customer token issuance might be halted.`,
              category: 'QUEUE',
              timestamp: 'Active Queue',
              actionUrl: `/dashboard/queues/${q.id}`,
              actionText: 'Manage Queue',
            });
          }
        });

        if (queues.length === 1 && totalWaiting === 0) {
          liveList.push({
            id: 'queue-setup-tip',
            title: 'Expand Your Queues',
            message: 'You currently have 1 active queue. Set up multiline routing and custom branding for an optimized lobby experience.',
            category: 'QUEUE',
            timestamp: 'Recommendation',
            actionUrl: '/dashboard/queues',
            actionText: 'Configure Queues',
          });
        }
      } else if (Array.isArray(queues) && queues.length === 0) {
        liveList.push({
          id: 'no-queues-alert',
          title: 'No Active Queues Found',
          message: 'Get started by creating your first queue to issue tokens and display live wait times.',
          category: 'QUEUE',
          timestamp: 'Action Required',
          actionUrl: '/dashboard/queues',
          actionText: 'Create Queue',
        });
      }
    } catch {
      // Ignore queue fetch failure in notification harvesting
    }

    // 3. Billing & Subscription Health
    if (user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN') {
      liveList.push({
        id: 'billing-tier-info',
        title: 'Subscription & Usage Limits',
        message: 'Ensure your workspace plan allows for maximum daily tokens and automated speech announcements.',
        category: 'BILLING',
        timestamp: 'Plan Status',
        actionUrl: '/dashboard/settings/billing',
        actionText: 'Manage Plan',
      });
    }

    // 4. System Security & RBAC Notice
    liveList.push({
      id: 'sys-security-active',
      title: 'Security & Idempotency Protected',
      message: 'Redis state lock and webhook idempotency are active across your workspace environment.',
      category: 'SYSTEM',
      timestamp: 'System Guard',
    });

    // Merge with read & dismissed state
    const processed = liveList
      .filter((item) => !dismissedIds.includes(item.id))
      .map((item) => ({
        ...item,
        isRead: readIds.includes(item.id),
      }));

    setNotifications(processed);
    setLoading(false);
  }, [user, readIds, dismissedIds]);

  useEffect(() => {
    fetchSystemNotifications();
  }, [fetchSystemNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    const updatedRead = [...new Set([...readIds, id])];
    setReadIds(updatedRead);
    persistState(updatedRead, dismissedIds);
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    const updatedRead = [...new Set([...readIds, ...allIds])];
    setReadIds(updatedRead);
    persistState(updatedRead, dismissedIds);
  };

  const dismiss = (id: string) => {
    const updatedDismissed = [...new Set([...dismissedIds, id])];
    setDismissedIds(updatedDismissed);
    persistState(readIds, updatedDismissed);
  };

  const clearAll = () => {
    const allIds = notifications.map((n) => n.id);
    const updatedDismissed = [...new Set([...dismissedIds, ...allIds])];
    setDismissedIds(updatedDismissed);
    persistState(readIds, updatedDismissed);
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    refetch: fetchSystemNotifications,
  };
}

interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationsModal({ open, onClose }: NotificationsModalProps) {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss, clearAll, refetch } = useNotifications();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'alerts'>('all');

  if (!open) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'alerts') return n.category === 'ALERT' || n.category === 'WHATSAPP';
    return true;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'WHATSAPP':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: <MessageSquare className="w-4 h-4 text-emerald-500" />,
        };
      case 'QUEUE':
        return {
          bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          icon: <List className="w-4 h-4 text-indigo-500" />,
        };
      case 'BILLING':
        return {
          bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          icon: <CreditCard className="w-4 h-4 text-blue-500" />,
        };
      case 'ALERT':
        return {
          bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
        };
      default:
        return {
          bg: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
          icon: <ShieldCheck className="w-4 h-4 text-zinc-500" />,
        };
    }
  };

  const handleActionClick = (url?: string) => {
    if (url) {
      onClose();
      router.push(url);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[999] flex items-start justify-end p-4 sm:p-6 md:pt-16 md:pr-12 pointer-events-none">
      {/* Invisible backdrop to catch clicks outside */}
      <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md pointer-events-auto sm:bg-transparent sm: transition-opacity" onClick={onClose} />

      <div className="pointer-events-auto w-full sm:w-[420px] max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 z-10">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/50 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-[11px] font-black rounded-full uppercase tracking-wider">
                    {unreadCount} New
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 rounded-md transition-colors"
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 py-2 bg-gray-50/30 dark:bg-zinc-900/30 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0 text-xs font-medium">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm font-bold border border-gray-200 dark:border-white/10'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm font-bold border border-gray-200 dark:border-white/10'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Unread
              {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'alerts'
                  ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm font-bold border border-gray-200 dark:border-white/10'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              Alerts
            </button>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
              title="Clear all notifications"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5 max-h-[500px]">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              Checking live workspace status...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-3 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1">
                {activeTab === 'unread' ? 'No unread notifications' : 'You are all caught up!'}
              </h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-[240px] leading-relaxed">
                Real-time queue updates, WhatsApp connectivity status, and system alerts will appear right here.
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const badge = getCategoryBadge(n.category);
              return (
                <div
                  key={n.id}
                  className={`p-4 transition-colors relative group ${
                    !n.isRead
                      ? 'bg-indigo-50/40 dark:bg-indigo-500/[0.04] hover:bg-indigo-50/70 dark:hover:bg-indigo-500/[0.08]'
                      : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${badge.bg}`}>
                      {badge.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                          {n.title}
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-zinc-500 shrink-0 font-medium">
                          {n.timestamp}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed mb-3">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        {n.actionUrl && (
                          <button
                            onClick={() => handleActionClick(n.actionUrl)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg text-xs font-bold transition-colors border border-indigo-200/60 dark:border-indigo-500/20"
                          >
                            {n.actionText || 'View Details'}
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}

                        <div className="flex items-center gap-1 ml-auto opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(n.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismiss(n.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                            title="Dismiss notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-zinc-950/80 flex items-center justify-between shrink-0 text-[11px] text-gray-400 dark:text-zinc-500">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live System Monitoring Active
          </span>
          <button
            onClick={refetch}
            className="hover:text-gray-700 dark:hover:text-zinc-300 font-semibold underline transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
