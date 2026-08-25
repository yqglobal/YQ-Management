import { getTenantUrl } from "../../../../lib/utils";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';
import { Settings, ArrowLeft, Loader2, ListOrdered, Save, Calendar, CheckSquare, Settings2, ShieldAlert, MonitorPlay, Check, X as XIcon, User, Copy, Monitor, ExternalLink, Link2, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, getBackendUrl } from '../../../../lib/api';
import { useSocket } from '../../../../components/SocketProvider';
import { toast } from 'sonner';
import { WhatsAppChatPanel } from '../../../../components/WhatsAppChatPanel';
import { useAuth } from '../../../../components/AuthContext';
import { PremiumFeatureGate } from '../../../../components/PremiumFeatureGate';

export default function QueueDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'board' | 'general' | 'token' | 'appointments' | 'links'>('board');
  const [selectedToken, setSelectedToken] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<any>({});

  // FIX (1B): Use fetchApi (credentials: include) instead of raw fetch with localStorage token
  const { data: queue = null, isLoading } = useQuery({
    queryKey: ['queue', id],
    queryFn: () => {
      if (!id) return null;
      return fetchApi(`/queue/${id}`);
    },
    enabled: !!id,
  });

  const { data: tenant = null } = useQuery({
    queryKey: ['tenant', user?.tenantId],
    queryFn: () => {
      if (!user?.tenantId) return null;
      return fetchApi(`/tenant/me`);
    },
    enabled: !!user?.tenantId,
  });

  // FIX (1B): Removed refetchInterval: 5000 polling — replaced by WebSocket below
  const { data: tokens = [] } = useQuery({
    queryKey: ['queue', id, 'tokens'],
    queryFn: () => fetchApi(`/queue/${id}/tokens`),
    enabled: !!id && activeTab === 'board',
  });

  useEffect(() => {
    if (queue) {
      setFormData({
        name: queue.name,
        serviceIds: queue.services?.map((s: any) => s.id) || [],
        tokenDisplayConfig: queue.tokenDisplayConfig || { prefix: '', format: 'SEQUENTIAL' },
        formConfig: queue.formConfig || { requireEmail: false, requirePhone: false, customFields: [] },
      });
    }
  }, [queue]);

  // FIX (1B): Real-time WebSocket subscription replaces 5s polling
  // Subscribes to the queue room and tenant room to receive live updates
  const { socket } = useSocket();

  useEffect(() => {
    if (!id || !user?.tenantId || !socket) return;

    // Join the specific queue room
    socket.emit('joinQueueRoom', id);
    // Tenant room is already joined in SocketProvider

    const invalidateTokens = () => {
      queryClient.invalidateQueries({ queryKey: ['queue', id, 'tokens'] });
    };

    // Outbox event names (lowercase) from OutboxProcessorService
    socket.on('visit_created', invalidateTokens);
    socket.on('visit_called', invalidateTokens);
    socket.on('visit_completed', invalidateTokens);
    socket.on('visit_missed', invalidateTokens);
    socket.on('visit_checked_in', invalidateTokens);
    socket.on('queue_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['queue', id] });
    });

    return () => {
      socket.off('visit_created', invalidateTokens);
      socket.off('visit_called', invalidateTokens);
      socket.off('visit_completed', invalidateTokens);
      socket.off('visit_missed', invalidateTokens);
      socket.off('visit_checked_in', invalidateTokens);
      socket.off('queue_status_changed');
    };
  }, [id, user?.tenantId, queryClient, socket]);

  const updateQueueMutation = useMutation({
    mutationFn: (data: any) => fetchApi(`/queue/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', id] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      toast.success('Queue updated successfully');
    },
    onError: () => toast.error('Error updating queue'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => fetchApi(`/queue/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', id] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      toast.success('Queue status updated');
    },
    onError: () => toast.error('Error updating status'),
  });

  const handleSave = () => {
    updateQueueMutation.mutate(formData);
  };

  const handleToggleStatus = () => {
    if (!queue) return;
    const newStatus = queue.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    updateStatusMutation.mutate(newStatus);
  };

  const advanceTurnMutation = useMutation({
    mutationFn: () => fetchApi(`/queue/${id}/advance`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue', id, 'tokens'] }),
    onError: () => toast.error('Failed to call next patient')
  });

  const completeTokenMutation = useMutation({
    mutationFn: (tokenId: string) => fetchApi(`/queue/tokens/${tokenId}/complete`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue', id, 'tokens'] }),
    onError: () => toast.error('Failed to complete token')
  });

  const skipTokenMutation = useMutation({
    mutationFn: (tokenId: string) => fetchApi(`/queue/tokens/${tokenId}/skip`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue', id, 'tokens'] }),
    onError: () => toast.error('Failed to skip token')
  });

  const cancelTokenMutation = useMutation({
    mutationFn: (tokenId: string) => fetchApi(`/visits/${tokenId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Booking cancelled');
      queryClient.invalidateQueries({ queryKey: ['queue', id, 'tokens'] });
    },
    onError: () => toast.error('Failed to cancel booking')
  });

  const transferTokenMutation = useMutation({
    mutationFn: ({ tokenId, nextQueueId }: { tokenId: string, nextQueueId: string }) => 
      fetchApi(`/visits/${tokenId}/transfer`, { 
        method: 'POST',
        body: JSON.stringify({ nextQueueId })
      }),
    onSuccess: () => {
      toast.success('Patient transferred successfully');
      queryClient.invalidateQueries({ queryKey: ['queue', id, 'tokens'] });
      setTransferTokenId(null);
    },
    onError: () => toast.error('Failed to transfer token')
  });

  const { data: allQueues } = useQuery({
    queryKey: ['queues'], 
    queryFn: () => fetchApi('/queue')
  });
  const [transferTokenId, setTransferTokenId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <Loader2 strokeWidth={1.5} className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!queue) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-16 h-16 bg-alert/10 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert strokeWidth={1.5} className="w-8 h-8 text-alert dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-on-surface dark:text-white mb-2">Queue Not Found</h2>
          <p className="text-on-surface-variant dark:text-zinc-400 max-w-md mb-6">
            This queue doesn't exist or has been deleted. You can create a new queue and link it to your services from the Queues page.
          </p>
          <Link href="/dashboard/queues" className="px-6 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl font-semibold transition-colors">
            Go to Queues
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={queue.name} pageSubtitle="Configure your queue parameters">
      <Head>
        <title>{queue.name} Settings | Qmova</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 font-body-md text-on-surface dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/queues" className="p-2 hover:bg-surface-container-high dark:hover:bg-dark-card rounded-full transition-colors text-on-surface-variant dark:text-outline">
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </Link>
            <div>
              <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-1">Queue Configuration</p>
              <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white flex items-center gap-3 tracking-tight font-semibold">
                <span className="material-symbols-outlined text-[32px] text-primary dark:text-sky-500" style={{ fontVariationSettings: "'FILL' 1" }}>list_alt</span>
                {queue.name}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleToggleStatus}
              disabled={updateStatusMutation.isPending}
              className={`min-h-[44px] px-6 py-2 rounded-xl text-body-md font-semibold transition-colors border shadow-sm ${
                queue.status === 'ACTIVE' 
                  ? 'bg-tertiary-container/10 text-tertiary-container border-tertiary-container/20 hover:bg-tertiary-container/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 dark:hover:bg-amber-500/20'
                  : 'bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20'
              }`}
            >
              {updateStatusMutation.isPending ? 'Updating...' : (queue.status === 'ACTIVE' ? 'Pause Queue' : 'Activate Queue')}
            </button>
            <button 
              onClick={handleSave}
              disabled={updateQueueMutation.isPending}
              className="flex items-center justify-center gap-2 min-h-[44px] px-8 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl font-body-md font-semibold hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
            >
              {updateQueueMutation.isPending ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <span className="material-symbols-outlined text-[20px]">save</span>}
              Save Changes
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border dark:border-dark-border gap-6 mb-8">
          <TabButton 
            active={activeTab === 'board'} 
            onClick={() => setActiveTab('board')}
            icon="monitor_heart"
            label="Waitlist Board" 
          />
          <TabButton 
            active={activeTab === 'general'} 
            onClick={() => setActiveTab('general')}
            icon="settings"
            label="General" 
          />
          <TabButton 
            active={activeTab === 'token'} 
            onClick={() => setActiveTab('token')}
            icon="tag"
            label="Token Settings" 
          />
          <TabButton
            active={activeTab === 'links'}
            onClick={() => setActiveTab('links')}
            icon="link"
            label="Share Links"
          />
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
        {activeTab === 'board' && (
          <div className="flex gap-6 items-start">
            {/* Left: Queue cards */}
            <div className="flex-1 min-w-0 space-y-6">
              <div className="flex justify-between items-center bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-[24px] p-8 shadow-sm">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Active Waitlist</h2>
                  <p className="font-body-md text-on-surface-variant dark:text-outline mt-1">{tokens.length} people waiting in queue</p>
                </div>
                <button 
                  onClick={() => advanceTurnMutation.mutate()}
                  disabled={advanceTurnMutation.isPending || tokens.filter((t: any) => t.currentState === 'WAITING').length === 0}
                  className="min-h-[44px] px-8 bg-primary hover:bg-primary-container text-white rounded-xl font-body-md font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {advanceTurnMutation.isPending ? 'Calling...' : 'Call Next Patient'}
                </button>
              </div>

              <div className={`grid gap-6 ${selectedToken ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {tokens.map((token: any) => (
                  <div
                    key={token.id}
                    onClick={() => setSelectedToken(selectedToken?.id === token.id ? null : token)}
                    className={`bg-card dark:bg-dark-card border rounded-[24px] p-6 relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
                      selectedToken?.id === token.id
                        ? 'border-primary dark:border-primary ring-2 ring-primary/20'
                        : token.currentState === 'IN_SERVICE'
                          ? 'border-primary dark:border-sky-500 shadow-[0_0_15px_rgba(0,97,148,0.1)] dark:shadow-[0_0_15px_rgba(14,165,233,0.1)]'
                          : 'border-border dark:border-dark-border'
                    }`}
                  >
                    {token.currentState === 'IN_SERVICE' && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-primary dark:bg-sky-500 animate-pulse"></div>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-data-mono-lg text-data-mono-lg text-on-surface dark:text-white tracking-tight">{token.displayId}</span>
                      <span className={`px-2 py-0.5 rounded font-label-caps text-label-caps uppercase tracking-wider ${token.currentState === 'IN_SERVICE' ? 'bg-primary-fixed text-on-primary-fixed dark:bg-sky-900/40 dark:text-sky-300' : 'bg-tertiary-container/10 text-tertiary-container dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {token.currentState}
                      </span>
                    </div>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 font-body-md font-semibold text-on-surface dark:text-white">
                        <span className="material-symbols-outlined text-[18px] text-outline">person</span>
                        {token.metadata?.customerName || 'Walk-in Customer'}
                      </div>
                      <div className="font-data-mono text-[12px] text-on-surface-variant dark:text-outline flex items-center gap-2">
                         <span className="material-symbols-outlined text-[16px]">schedule</span>
                        Joined: {new Date(token.waitingStart || token.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {token.currentState === 'IN_SERVICE' && (
                      <div className="flex gap-3 pt-6 border-t border-border dark:border-dark-border">
                        <button 
                          onClick={() => completeTokenMutation.mutate(token.id)}
                          disabled={completeTokenMutation.isPending}
                          className="flex-1 flex justify-center items-center gap-2 h-[40px] bg-secondary/10 hover:bg-secondary/20 text-secondary dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 rounded-xl font-body-md font-semibold transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                          Complete
                        </button>
                        <button 
                          onClick={() => skipTokenMutation.mutate(token.id)}
                          disabled={skipTokenMutation.isPending}
                          className="flex-1 flex justify-center items-center gap-2 h-[40px] bg-alert/10 hover:bg-alert/20 text-alert dark:bg-alert/10 dark:hover:bg-alert/20 dark:text-red-400 rounded-xl font-body-md font-semibold transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">cancel</span>
                          Skip
                        </button>
                      </div>
                    )}
                    
                    {token.currentState === 'IN_SERVICE' && (
                      <div className="mt-3">
                        {transferTokenId === token.id ? (
                          <div className="flex gap-2">
                            <select 
                              className="flex-1 h-[40px] bg-canvas dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-3 font-body-sm text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                              onChange={(e) => {
                                if (e.target.value) {
                                  transferTokenMutation.mutate({ tokenId: token.id, nextQueueId: e.target.value });
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="" disabled>Select Queue</option>
                              {allQueues?.filter((q: any) => q.id !== queue.id).map((q: any) => (
                                <option key={q.id} value={q.id}>{q.name}</option>
                              ))}
                            </select>
                            <button 
                              onClick={() => setTransferTokenId(null)}
                              className="px-3 py-1 bg-surface-container-low hover:bg-surface-container dark:bg-white/5 dark:hover:bg-white/10 text-on-surface-variant dark:text-outline rounded-xl font-body-sm transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setTransferTokenId(token.id)}
                            className="w-full flex justify-center items-center gap-2 h-[40px] bg-surface-container hover:bg-surface-container-high dark:bg-white/5 dark:hover:bg-white/10 text-on-surface dark:text-white rounded-xl font-body-md font-medium transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                            Transfer Queue
                          </button>
                        )}
                      </div>
                    )}
                    {(token.currentState === 'CREATED' || token.currentState === 'SCHEDULED' || token.currentState === 'WAITING' || token.currentState === 'CHECKED_IN') && (
                      <div className="flex gap-3 pt-6 border-t border-border dark:border-dark-border mt-3">
                        {token.currentState !== 'WAITING' && token.currentState !== 'CHECKED_IN' && (
                          <button 
                            onClick={() => checkInTokenMutation.mutate(token.id)}
                            disabled={checkInTokenMutation.isPending}
                            className="flex-1 flex justify-center items-center gap-2 h-[40px] bg-primary text-white rounded-xl font-body-md font-semibold transition-colors hover:bg-primary/90"
                          >
                            <span className="material-symbols-outlined text-[18px]">login</span>
                            Check In
                          </button>
                        )}
                        {(token.currentState === 'WAITING' || token.currentState === 'CHECKED_IN') && (
                          <button 
                            onClick={() => startTokenMutation.mutate(token.id)}
                            disabled={startTokenMutation.isPending}
                            className="flex-1 flex justify-center items-center gap-2 h-[40px] bg-primary text-white rounded-xl font-body-md font-semibold transition-colors hover:bg-primary/90 shadow-md shadow-primary/20"
                          >
                            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                            Call Next
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this booking? The customer will be notified.')) {
                              cancelTokenMutation.mutate(token.id);
                            }
                          }}
                          disabled={cancelTokenMutation.isPending}
                          className="flex-[0.5] flex justify-center items-center gap-2 h-[40px] bg-alert/10 hover:bg-alert/20 text-alert dark:bg-alert/10 dark:hover:bg-alert/20 dark:text-red-400 rounded-xl font-body-md font-semibold transition-colors"
                          title="Cancel Booking"
                        >
                          <span className="material-symbols-outlined text-[18px]">cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                
                {tokens.length === 0 && (
                  <div className="col-span-full py-16 text-center text-outline-variant font-body-md bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border">
                    <span className="material-symbols-outlined text-[48px] mb-4 opacity-50">event_seat</span>
                    <p>No active tokens in queue.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Chat panel */}
            {selectedToken && (
              <div className="w-full md:w-[340px] lg:w-[360px] shrink-0 sticky top-4" style={{ height: 'calc(100vh - 220px)' }}>
                <PremiumFeatureGate
                  featureKey="whatsappNotifications"
                  featureName="WhatsApp Chat"
                  description="Communicate directly with patients in the queue via WhatsApp."
                >
                  <WhatsAppChatPanel
                    tokenId={selectedToken.id}
                    customerName={selectedToken.customerName}
                    customerPhone={selectedToken.customerPhone}
                    queueName={queue.name}
                    onClose={() => setSelectedToken(null)}
                  />
                </PremiumFeatureGate>
              </div>
            )}
          </div>
        )}

          {activeTab === 'general' && (
            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-[24px] p-8 relative overflow-hidden">
               <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary dark:bg-sky-500"></div>
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white border-b border-border dark:border-dark-border pb-4 mb-6 tracking-tight font-semibold">General Settings</h2>
              
              <div className="space-y-6 max-w-xl">
                <div>
                  <label className="block font-body-md font-medium text-on-surface dark:text-white mb-2">Queue Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full h-[44px] px-4 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow font-body-md text-on-surface dark:text-white" 
                  />
                </div>

                {(user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'ADMIN') && (
                  <div>
                    <label className="block font-body-md font-medium text-on-surface dark:text-white mb-2">Linked Service(s)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tenant?.services?.map((service: any) => (
                        <label key={service.id} className="flex items-center gap-3 p-3 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 hover:bg-surface-container-low dark:hover:bg-white/5 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.serviceIds?.includes(service.id) || false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const newIds = checked 
                                ? [...(formData.serviceIds || []), service.id]
                                : (formData.serviceIds || []).filter((id: string) => id !== service.id);
                              setFormData({ ...formData, serviceIds: newIds });
                            }}
                            className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                          />
                          <span className="font-body-sm text-on-surface dark:text-white">{service.name}</span>
                        </label>
                      ))}
                      {(!tenant?.services || tenant.services.length === 0) && (
                        <p className="text-sm text-alert col-span-2">No services exist in this workspace. Please create a Service first.</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 flex items-start gap-4 p-4 rounded-xl border border-border dark:border-dark-border bg-surface-bright dark:bg-zinc-900 cursor-pointer">
                  <div className="flex items-center h-5 mt-1">
                    <input 
                      type="checkbox" 
                      id="requireManual"
                      checked={formData.requireManualCheckIn || false}
                      onChange={(e) => setFormData({...formData, requireManualCheckIn: e.target.checked})}
                      className="w-5 h-5 text-primary border-border rounded focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="requireManual" className="font-body-md font-bold text-on-surface dark:text-white cursor-pointer">Require Manual Check-in</label>
                    <p className="font-body-sm text-on-surface-variant dark:text-outline mt-1">Customers joining online must physical scan a QR code at the location to be marked as checked-in.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'token' && (
            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-[24px] p-8 relative overflow-hidden">
               <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary dark:bg-sky-500"></div>
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white border-b border-border dark:border-dark-border pb-4 mb-6 tracking-tight font-semibold">Token Display Configuration</h2>
              
              <div className="space-y-6 max-w-xl">
                <div>
                  <label className="block font-body-md font-medium text-on-surface dark:text-white mb-2">Token Prefix</label>
                  <input 
                    type="text" 
                    value={formData.tokenDisplayConfig?.prefix || ''} 
                    onChange={(e) => setFormData({
                      ...formData, 
                      tokenDisplayConfig: { ...formData.tokenDisplayConfig, prefix: e.target.value }
                    })}
                    placeholder="e.g. A, VIP, EX"
                    className="w-full h-[44px] px-4 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow font-body-md text-on-surface dark:text-white uppercase" 
                  />
                  <p className="font-body-sm text-outline mt-2">Appended before the token number (e.g. VIP-001)</p>
                </div>

                <div>
                  <label className="block font-body-md font-medium text-on-surface dark:text-white mb-2">Number Format</label>
                  <select 
                    value={formData.tokenDisplayConfig?.format || 'SEQUENTIAL'} 
                    onChange={(e) => setFormData({
                      ...formData, 
                      tokenDisplayConfig: { ...formData.tokenDisplayConfig, format: e.target.value }
                    })}
                    className="w-full h-[44px] px-4 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow font-body-md text-on-surface dark:text-white cursor-pointer" 
                  >
                    <option value="SEQUENTIAL">Sequential (1, 2, 3...)</option>
                    <option value="RANDOM">Random 4-digit (e.g. 8492)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'links' && (() => {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const tenantUrl = tenant?.subdomain ? getTenantUrl(tenant.subdomain) : baseUrl;
              
            const tenantId = user?.tenantId || '';
            const links = [
              {
                icon: 'monitor',
                title: 'TV Lobby Display',
                description: 'Open this URL on a TV or screen share to show a live calling board for your lobby.',
                url: `${baseUrl}/tv/${tenantId}?serviceId=${queue?.serviceId || ''}&queueId=${queue?.id || ''}`,
              },
            ];
            return (
              <div className="space-y-4">
                <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-on-surface dark:text-white">
                  <span className="material-symbols-outlined text-primary text-[20px]">info</span>
                  <p>These are public URLs your customers and staff can access. Copy or open each link as needed.</p>
                </div>
                {links.map((link) => (
                  <div key={link.title} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-[20px]">{link.icon}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface dark:text-white text-sm mb-1">{link.title}</p>
                          <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-2">{link.description}</p>
                          <code className="text-xs font-mono bg-surface-container dark:bg-white/5 px-2 py-1 rounded text-on-surface-variant dark:text-zinc-300 break-all">
                            {link.url}
                          </code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(link.url);
                            toast.success('Link copied!');
                          }}
                          className="w-9 h-9 flex items-center justify-center bg-surface-container-low dark:bg-white/5 hover:bg-surface-container dark:hover:bg-white/10 border border-border dark:border-dark-border rounded-lg transition-colors text-on-surface-variant"
                          title="Copy link"
                        >
                          <Copy className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 flex items-center justify-center bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 border border-primary/20 rounded-lg transition-colors text-primary"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </AdminLayout>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-body-md font-semibold transition-colors ${
        active 
          ? 'border-primary text-primary dark:border-sky-500 dark:text-sky-500' 
          : 'border-transparent text-outline-variant hover:text-on-surface dark:hover:text-white'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
      {label}
    </button>
  );
}
