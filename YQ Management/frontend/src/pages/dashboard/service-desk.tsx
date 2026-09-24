import { getTenantUrl, slugify } from "../../lib/utils";
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '../../lib/api';
import { WelcomeModal } from '../../components/modals/WelcomeModal';
import { CreateVisitModal } from '../../components/modals/CreateVisitModal';
import { ScannerModal } from '../../components/modals/ScannerModal';
import { WhatsAppChatPanel } from '../../components/WhatsAppChatPanel';
import { MonitorPlay, ScanLine, StickyNote, Check, AlertTriangle } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import Link from 'next/link';
import { useLocation } from '../../components/LocationContext';
import { useIndustry } from '../../hooks/useIndustry';
import { DYNAMIC_CHIP_SENTINEL } from '../../lib/industryConfig';
import { toast } from 'sonner';

// ── Inline Notes Component ───────────────────────────────────────────────────
function InlineNotes({ visitId, initialNotes, placeholder }: { visitId: string; initialNotes: string | null; placeholder?: string }) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => { setNotes(initialNotes || ''); }, [initialNotes, visitId]);

  const handleBlur = async () => {
    if (notes === (initialNotes || '')) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetchApi(`/visits/${visitId}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      });
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['visits-today'] });
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 mt-3">
      <div className="flex items-center justify-between text-outline text-xs">
        <div className="flex items-center gap-1 font-medium text-on-surface dark:text-white">
          <StickyNote className="w-3.5 h-3.5" /> Notes
        </div>
        {saving && <span className="text-[10px] text-primary animate-pulse">Saving...</span>}
        {saved && <span className="text-[10px] text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder || 'Add private notes for staff...'}
        rows={2}
        className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded text-xs py-1.5 px-2 w-full outline-none resize-none focus:border-primary transition-colors"
      />
    </div>
  );
}

// ── Itinerary Progress Stepper ───────────────────────────────────────────────
function ItineraryProgress({ itinerary }: { itinerary: any[] }) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return null;
  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {itinerary.map((stop: any, idx: number) => {
        const isCompleted = stop.status === 'COMPLETED';
        const isActive = stop.status === 'ACTIVE';
        const isPending = stop.status === 'PENDING';
        return (
          <React.Fragment key={idx}>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all
              ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : ''}
              ${isActive ? 'bg-primary/10 border-primary/40 text-primary animate-pulse' : ''}
              ${isPending ? 'bg-surface-container border-border text-outline' : ''}
            `}>
              <span className="material-symbols-outlined text-[10px]">
                {isCompleted ? 'check_circle' : isActive ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
              {stop.label || `Stop ${idx + 1}`}
            </div>
            {idx < itinerary.length - 1 && (
              <span className="text-outline text-[10px]">→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
import { useAuth } from '../../components/AuthContext';
import { useSocket } from '../../components/SocketProvider';

export default function ServiceDeskToday() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeLocationId } = useLocation();
  const industry = useIndustry();
  const [selectedVisit, setSelectedVisit] = useState<AnyFixMe | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState<'pool' | 'pipeline'>('pool');
  const { socket } = useSocket();
  
  const plan = usePlan();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = setTimeout(() => {
        const hasSeenIntro = localStorage.getItem('hasSeenIntro');
        if (!hasSeenIntro) {
          setIsWelcomeModalOpen(true);
          localStorage.setItem('hasSeenIntro', 'true');
        }
      }, 5000);
      return () => clearTimeout(t);
    }
  }, []);

  const locParam = activeLocationId && activeLocationId !== 'all' ? `&locationId=${activeLocationId}` : '';
  const locParamPrefix = activeLocationId && activeLocationId !== 'all' ? `?locationId=${activeLocationId}` : '';

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits', 'today', activeLocationId, tz],
    queryFn: () => fetchApi(`/visits?scope=today${locParam}&tz=${encodeURIComponent(tz)}`).catch(() => []),
  });

  const { data: tenant } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me').catch(() => null),
  });

  useEffect(() => {
    if (!tenant || tenant.whatsappConnected) return;

    const initialTimer = setTimeout(() => {
      const toastEvent = new CustomEvent('admin-toast', { detail: { message: 'WhatsApp is not connected. Automated messages to customers are disabled.', type: 'error' } });
      window.dispatchEvent(toastEvent);
    }, 10000);

    const interval = setInterval(() => {
      const toastEvent = new CustomEvent('admin-toast', { detail: { message: 'Reminder: WhatsApp is disconnected. Reconnect in Settings > Integrations.', type: 'error' } });
      window.dispatchEvent(toastEvent);
    }, 180000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [tenant]);

  const { data: queues = [] } = useQuery({
    queryKey: ['queues', activeLocationId],
    queryFn: () => fetchApi(`/queue${locParamPrefix}`).catch(() => []),
  });

  const { data: pendingAppointments = [] } = useQuery({
    queryKey: ['appointments', 'pending', activeLocationId],
    queryFn: () => fetchApi(`/appointments?status=PENDING_APPROVAL${locParam}`).catch(() => []),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => fetchApi('/resource').catch(() => []),
  });

  // Connect to Socket.io for real-time updates
  useEffect(() => {
    if (!socket || !tenant?.id) return;

    socket.emit('joinTenantRoom', tenant.id);

    const handleVisitEvent = (payload: AnyFixMe) => {
      queryClient.invalidateQueries({ queryKey: ['visits', 'today', activeLocationId] });
      queryClient.invalidateQueries({ queryKey: ['queues', activeLocationId] });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'pending', activeLocationId] });
    };

    const events = [
      'VISIT_CREATED', 'VISIT_CALLED', 'VISIT_COMPLETED', 
      'VISIT_CHECKED_IN', 'VISIT_MISSED', 'VISIT_CANCELLED', 
      'APPOINTMENT_CREATED', 'queue_status_changed', 'QUEUE_EMERGENCY_PAUSED'
    ];
    
    events.forEach(ev => socket.on(ev, handleVisitEvent));

    return () => {
      events.forEach(ev => socket.off(ev, handleVisitEvent));
    };
  }, [socket, tenant?.id, queryClient, activeLocationId]);

  const updateVisitMutation = useMutation({
    mutationFn: (data: { id: string, resourceId: string }) => 
      fetchApi(`/visits/${data.id}`, { method: 'PATCH', body: JSON.stringify({ resourceId: data.resourceId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visits'] }),
  });

  const pauseEmergencyMutation = useMutation({
    mutationFn: (queueId: string) =>
      fetchApi(`/queue/${queueId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'PAUSED_FOR_EMERGENCY' }) }),
    onSuccess: () => {
      toast.warning('Queue paused for emergency. All waiting customers will be notified.');
      queryClient.invalidateQueries({ queryKey: ['queues'] });
    },
    onError: () => toast.error('Failed to pause queue'),
  });

  const filteredQueues = React.useMemo(() => {
    let q = queues || [];
    if (user && user.role === 'OPERATOR') {
      if (user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        q = q.filter((queue: AnyFixMe) => {
          if (queue.services && queue.services.length > 0) {
            return queue.services.some((svc: AnyFixMe) => user.allowedServiceIds!.includes(svc.id));
          }
          return false;
        });
      }
    }
    return q;
  }, [queues, user]);

  const filteredVisits = React.useMemo(() => {
    let v = visits || [];
    if (user && user.role === 'OPERATOR') {
      if (user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        v = v.filter((visit: AnyFixMe) => user.allowedServiceIds!.includes(visit.serviceId));
      }
    }
    return v;
  }, [visits, user]);

  const filteredAppointments = React.useMemo(() => {
    let a = pendingAppointments || [];
    if (user && user.role === 'OPERATOR') {
      if (user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        a = a.filter((appt: AnyFixMe) => user.allowedServiceIds!.includes(appt.serviceId));
      }
    }
    return a;
  }, [pendingAppointments, user]);

  useEffect(() => {
    if (selectedVisit && activeLocationId !== 'all' && selectedVisit.locationId !== activeLocationId) {
      setSelectedVisit(null);
    }
  }, [activeLocationId, selectedVisit]);

  const queueTokens = filteredQueues.flatMap((q: AnyFixMe) => 
    (q.tokens || []).map((t: AnyFixMe) => ({
      ...t,
      isToken: true,
      customer: { name: t.customerName, phone: t.phone },
      waitingStart: t.joinedAt,
      service: q.services?.[0] || { name: q.name },
      location: q.location || { name: 'Queue' },
      ticketNumber: `#TKT-${t.id.substring(0,4)}`,
    }))
  );

  const waitingVisitsUnsorted = [
    ...filteredVisits.filter((v: AnyFixMe) => v.currentState === 'WAITING' || v.currentState === 'CHECKED_IN'),
    ...queueTokens
  ];
  
  const waitingVisits = waitingVisitsUnsorted.sort((a, b) => 
    new Date(a.waitingStart || a.joinedAt).getTime() - new Date(b.waitingStart || b.joinedAt).getTime()
  );

  const inServiceVisitsUnsorted = [
    ...filteredVisits.filter((v: AnyFixMe) => v.currentState === 'IN_SERVICE'),
    ...filteredQueues.flatMap((q: AnyFixMe) => 
      (q.tokens || []).filter((t: AnyFixMe) => t.status === 'SERVING').map((t: AnyFixMe) => ({
        ...t,
        isToken: true,
        customer: { name: t.customerName, phone: t.phone },
        waitingStart: t.joinedAt,
        service: q.services?.[0] || { name: q.name },
        location: q.location || { name: 'Queue' },
        ticketNumber: `#TKT-${t.id.substring(0,4)}`,
        currentState: 'IN_SERVICE'
      }))
    )
  ];
  const inServiceVisits = inServiceVisitsUnsorted;

  const handleStart = async (id: string, e: React.MouseEvent, isToken?: boolean) => {
    e.stopPropagation();
    if (isToken) {
      alert('Tokens should be advanced from the queue on the left sidebar using Call Next.');
      return;
    }
    try {
      await fetchApi(`/visits/${id}/start`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
    } catch (err) {
      console.error('Failed to start visit', err);
      alert('Failed to start. Please check your connection.');
    }
  };

  const handleApproveAppointment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetchApi(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'SCHEDULED' }) });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err) {
      console.error('Failed to approve appointment', err);
    }
  };

  const handleRejectAppointment = async (id: string, e: React.MouseEvent, reason: string = 'Schedule conflict') => {
    e.stopPropagation();
    try {
      await fetchApi(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED', notes: reason }) });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err) {
      console.error('Failed to reject appointment', err);
    }
  };

  const handleCallNextQueue = async (queueId: string) => {
    try {
      await fetchApi(`/token/advance/${queueId}`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
    } catch (err) {
      console.error('Failed to advance queue', err);
      alert('Failed to call next. Ensure the queue has waiting customers.');
    }
  };

  const handleComplete = async (id: string, e: React.MouseEvent, isToken?: boolean) => {
    e.stopPropagation();
    try {
      if (isToken) {
        await fetchApi(`/queue/tokens/${id}/complete`, { method: 'POST' });
      } else {
        await fetchApi(`/visits/${id}/complete`, { method: 'POST' });
      }
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      if (selectedVisit?.id === id) setSelectedVisit(null);
    } catch (err) {
      console.error('Failed to complete visit/token', err);
      alert('Failed to complete. Please try again.');
    }
  };

  const displayPool = waitingVisits.filter((v: AnyFixMe) => 
    v.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout pageTitle={industry.serviceDesk.pageTitle} noPadding={true}>
      <Head>
        <title>{industry.serviceDesk.pageTitle} | Qmova</title>
      </Head>

      <div className="flex-1 min-h-0 w-full flex flex-col md:grid md:grid-cols-12 overflow-hidden bg-canvas dark:bg-dark-canvas">
        
        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex items-center p-3 bg-card dark:bg-dark-card border-b border-border dark:border-dark-border gap-2 shrink-0 z-20 shadow-sm">
          <button 
            onClick={() => setMobileTab('pool')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${mobileTab === 'pool' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant bg-surface-container hover:bg-surface-container-high dark:bg-dark-canvas dark:hover:bg-inverse-surface'}`}
          >
            {industry.serviceDesk.poolTitle} ({waitingVisits.length})
          </button>
          <button 
            onClick={() => setMobileTab('pipeline')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${mobileTab === 'pipeline' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant bg-surface-container hover:bg-surface-container-high dark:bg-dark-canvas dark:hover:bg-inverse-surface'}`}
          >
            Pipeline
          </button>
        </div>

        {/* Column 1: Pipeline */}
        <section className={`${mobileTab === 'pipeline' ? 'flex' : 'hidden'} md:flex flex-col md:col-span-3 bg-card dark:bg-dark-card border-r border-border dark:border-dark-border p-4 md:p-6 min-h-0 overflow-y-auto`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-outline">{industry.industryIcon}</span>
              <h2 className="text-xl font-bold">{industry.serviceDesk.pipelineTitle}</h2>
            </div>
          </div>
          
          {/* Pending Appointments Stack */}
          {filteredAppointments.length > 0 && (
            <div className="mb-6 relative z-10 space-y-3">
              <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider">{industry.serviceDesk.pendingApprovalsLabel}</h3>
              <div className="relative">
                {filteredAppointments.map((apt: AnyFixMe, index: number) => (
                  <div 
                    key={apt.id} 
                    className="p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-amber-200 dark:border-amber-900/50 flex flex-col gap-3 transition-all"
                    style={{
                      transform: `translateY(${index * 8}px) scale(${1 - index * 0.02})`,
                      zIndex: filteredAppointments.length - index,
                      position: index === 0 ? 'relative' : 'absolute',
                      top: 0, left: 0, right: 0,
                      opacity: index > 2 ? 0 : 1 - index * 0.1,
                      pointerEvents: index === 0 ? 'auto' : 'none'
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">New Request</span>
                        </div>
                        <h4 className="font-semibold text-on-surface dark:text-white">{apt.customer?.name}</h4>
                        <p className="text-sm text-outline">{apt.service?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-on-surface dark:text-white">{new Date(apt.scheduledStart).toLocaleDateString()}</p>
                        <p className="text-xs text-outline">{new Date(apt.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="flex gap-2 pt-2 border-t border-border dark:border-dark-border">
                        <button 
                          onClick={(e) => handleApproveAppointment(apt.id, e)}
                          className="flex-1 bg-primary text-on-primary py-2 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={(e) => handleRejectAppointment(apt.id, e)}
                          className="flex-1 bg-error/10 text-error py-2 rounded-lg text-sm font-semibold hover:bg-error/20 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 mb-8">
            {filteredQueues.length > 0 ? filteredQueues.map((q: AnyFixMe) => {
              const loc = tenant?.locations?.find((l: AnyFixMe) => l.id === q.locationId);
              const isEmergencyPaused = q.status === 'PAUSED_FOR_EMERGENCY';
              const isPaused = q.status === 'PAUSED' || isEmergencyPaused;
              return (
              <div key={q.id} className={`flex flex-col gap-2 p-3 border rounded-xl shadow-sm transition-all
                ${isEmergencyPaused ? 'border-red-500/50 bg-red-50 dark:bg-red-950/30' : 'border-border dark:border-dark-border bg-surface-container-low dark:bg-inverse-surface'}
              `}>
                <div className="flex flex-wrap items-start xl:items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="font-semibold text-body-md text-on-surface dark:text-white flex items-start sm:items-center gap-2 flex-wrap">
                      <span className="break-words">{q.name}</span>
                      {activeLocationId === 'all' && loc && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium border border-zinc-200 dark:border-zinc-700 shrink-0">
                          {loc.name}
                        </span>
                      )}
                      {isEmergencyPaused && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-900/50 text-red-600 font-bold border border-red-200 dark:border-red-800 shrink-0 animate-pulse">
                          EMERGENCY PAUSED
                        </span>
                      )}
                      {isPaused && !isEmergencyPaused && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 font-bold border border-amber-200 dark:border-amber-800 shrink-0">
                          PAUSED
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-outline mt-1">{q._count?.tokens || 0} Waiting</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full xl:w-auto mt-1 xl:mt-0 flex-wrap">
                    {/* Emergency Pause button */}
                    {industry.uiFlags.showEmergencyPause && !isPaused && (
                      <button
                        onClick={() => {
                          toast('Pause for emergency?', {
                            description: `All waiting customers in ${q.name} will be notified.`,
                            action: {
                              label: 'Pause',
                              onClick: () => pauseEmergencyMutation.mutate(q.id)
                            },
                            cancel: {
                              label: 'Cancel',
                              onClick: () => {}
                            },
                            duration: 10000,
                          });
                        }}
                        title="Emergency Pause"
                        className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-semibold shadow-sm"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Pause
                      </button>
                    )}
                    {!isPaused && (
                      <button 
                        onClick={() => handleCallNextQueue(q.id)}
                        className="bg-primary hover:bg-primary-container text-on-primary px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">campaign</span>
                        Call Next
                      </button>
                    )}
                    {isPaused && (
                      <button
                        onClick={() => fetchApi(`/queue/${q.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE' }) }).then(() => queryClient.invalidateQueries({ queryKey: ['queues'] }))}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        Resume
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}) : (
              <p className="text-body-sm text-outline italic">No active queues.</p>
            )}
          </div>

          <div className="mt-4 pt-6 border-t border-border dark:border-dark-border">
            <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-4">Active Allocations</h3>
            <div className="flex flex-col gap-3">
              {inServiceVisits.map((v: AnyFixMe) => (
                <div key={v.id} onClick={() => setSelectedVisit(v)} className="flex items-center gap-3 p-3 bg-surface-container dark:bg-inverse-surface rounded-lg border border-border dark:border-dark-border cursor-pointer hover:border-primary transition-colors">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-semibold text-on-surface dark:text-white truncate">{v.customer?.name || industry.terminology.walkIn}</p>
                    <p className="text-[10px] text-outline font-data-mono">{v.ticketNumber || `#TKT-${v.id.substring(0,4)}`}</p>
                  </div>
                  <button 
                    onClick={(e) => handleComplete(v.id, e)}
                    title={`Complete — ${industry.terminology.actionVerbPast}`}
                    className="p-1.5 text-on-surface-variant hover:text-emerald-600 dark:hover:text-emerald-400 bg-surface dark:bg-dark-card rounded shadow-sm border border-border dark:border-dark-border"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </button>
                </div>
              ))}
              {inServiceVisits.length === 0 && (
                 <p className="text-body-sm text-outline italic">No active services.</p>
              )}
            </div>
          </div>
        </section>

        {/* Column 2: Pool */}
        <section className={`${mobileTab === 'pool' ? 'flex' : 'hidden'} md:flex md:col-span-1 ${selectedVisit ? 'md:col-span-6' : 'md:col-span-9'} bg-canvas dark:bg-dark-canvas p-4 md:p-6 flex-col min-h-0 overflow-hidden transition-all duration-300`}>
          <div className="flex flex-wrap xl:flex-nowrap items-start xl:items-center justify-between gap-4 mb-6 shrink-0">
            <div className="flex items-center gap-3 w-full xl:w-auto">
              <h2 className="font-headline-sm text-headline-sm text-on-surface dark:text-white">{industry.serviceDesk.poolTitle}</h2>
              <span className="bg-primary/10 text-primary dark:bg-primary-fixed-dim/20 dark:text-primary-fixed-dim px-2.5 py-0.5 rounded-full font-data-mono text-body-sm font-semibold">{waitingVisits.length}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              <div className="relative flex-1 min-w-[150px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${industry.terminology.customers.toLowerCase()}...`} 
                  className="w-full pl-9 pr-4 py-1.5 bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-lg text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <button onClick={() => setIsScannerOpen(true)} className="bg-surface-container hover:bg-surface-container-high text-on-surface px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-colors flex items-center gap-1 border border-border">
                <ScanLine className="w-[18px] h-[18px]" /> Scan QR
              </button>
              <button onClick={() => setIsVisitModalOpen(true)} className="bg-primary hover:bg-primary-container text-on-primary px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">add</span> Add {industry.terminology.customer}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-8">
            {isLoading && (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-24 bg-surface-container/50 animate-pulse rounded-xl border border-border"></div>
                ))}
              </div>
            )}
            
            {displayPool.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-outline animate-in fade-in duration-500 py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full"></div>
                  <div className="w-24 h-24 bg-surface-container/50 dark:bg-inverse-surface border border-border dark:border-dark-border rounded-full flex items-center justify-center relative z-10 shadow-xl">
                    <span className="material-symbols-outlined text-5xl text-primary opacity-80">{industry.serviceDesk.emptyIcon}</span>
                  </div>
                </div>
                <h3 className="font-headline-sm text-on-surface dark:text-white mb-2">{industry.serviceDesk.emptyHeading}</h3>
                {queues.length === 0 ? (
                  <>
                    <p className="text-body-md text-outline text-center max-w-sm mb-8 leading-relaxed">
                      You haven't configured any queues yet. Set up a queue to start receiving {industry.terminology.customers.toLowerCase()}.
                    </p>
                    <Link
                      href="/dashboard/queues"
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold text-body-sm hover:bg-primary-container transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                    >
                      <span className="material-symbols-outlined text-[20px]">list_alt</span>
                      Configure Queues
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-body-md text-outline text-center max-w-sm mb-8 leading-relaxed">
                      {visits.length === 0 
                        ? industry.serviceDesk.emptyBody
                        : `All ${industry.terminology.customers.toLowerCase()} have been successfully routed and served.`}
                    </p>
                    {visits.length === 0 && tenant?.subdomain && (
                      <a
                        href={(() => {
                          if (!tenant?.subdomain) return '#';
                          let path = '/booking';
                          if (activeLocationId && activeLocationId !== 'all') {
                            const loc = tenant?.locations?.find((l: AnyFixMe) => l.id === activeLocationId);
                            if (loc) path = `/booking/${slugify(loc.name)}`;
                          }
                          return getTenantUrl(tenant.subdomain, path);
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold text-body-sm hover:bg-primary-container transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                      >
                        <MonitorPlay className="w-5 h-5" />
                        Open Booking Page
                      </a>
                    )}
                  </>
                )}
              </div>
            )}
            
            <AnimatePresence mode="popLayout">
              {displayPool.map((v: AnyFixMe) => {
                const waitTimeMs = v.waitingStart ? Date.now() - new Date(v.waitingStart).getTime() : 0;
                const waitTimeMins = Math.floor(waitTimeMs / 60000);
                const threshold = tenant?.reviewWaitThresholdMins || 15;
                const isUrgent = waitTimeMins > threshold;
                
                // Industry-specific chip from formResponses
                // For the 'general' (universal) mode, use the __dynamic__ sentinel
                // to pick the first non-empty formResponse field.
                const chipField = industry.visitCard.primaryChipField;
                let chipValue: string | null = null;
                let chipLabel: string | null = industry.visitCard.primaryChipLabel;
                if (chipField === DYNAMIC_CHIP_SENTINEL) {
                  // Universal mode: find the first populated formResponse entry
                  const entries = Object.entries(v.formResponses || {}).filter(([, val]) => val && String(val).trim() !== '');
                  if (entries.length > 0) {
                    const [firstKey, firstVal] = entries[0];
                    chipValue = String(firstVal);
                    // Humanise the key: camelCase → Title Case
                    chipLabel = firstKey.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
                  }
                } else if (chipField) {
                  chipValue = v.formResponses?.[chipField] ?? null;
                }

                // Itinerary (healthcare)
                const hasItinerary = industry.uiFlags.showItinerary && Array.isArray(v.itinerary) && v.itinerary.length > 0;

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    key={v.id} 
                    onClick={() => setSelectedVisit(v)}
                    className={`bg-card dark:bg-dark-card border ${selectedVisit?.id === v.id ? 'border-primary' : 'border-border dark:border-dark-border'} rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer ${v.source === 'APPOINTMENT' ? 'shadow-[0_0_15px_rgba(14,165,233,0.1)] border-sky-500/20' : 'shadow-[0_0_15px_rgba(16,185,129,0.1)] border-emerald-500/20'}`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isUrgent ? 'bg-alert shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}></div>
                    
                    <div className="flex items-center justify-between pl-2">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className={`font-data-mono text-data-mono ${isUrgent ? 'text-alert' : 'text-on-surface dark:text-white'}`}>{v.ticketNumber || `#TKT-${v.id.substring(0,4)}`}</span>
                          {isUrgent && <span className="font-label-caps text-[10px] bg-alert/10 text-alert px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">{industry.visitCard.urgencyLabel || 'Urgent'}</span>}
                          {v.priority > 0 && <span className="font-label-caps text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">VIP</span>}
                          {(() => {
                           if (v.source !== 'APPOINTMENT' || !industry.uiFlags.highlightArrivalStatus) return null;
                           const sched = v.scheduledFor || v.scheduledTime;
                           if (!sched || !v.waitingStart) return null;
                           const diffMins = (new Date(v.waitingStart).getTime() - new Date(sched).getTime()) / 60000;
                           if (diffMins < -15) return <span className="font-label-caps text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Early</span>;
                           if (diffMins > 15) return <span className="font-label-caps text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Late</span>;
                           return null;
                        })()}
                        {/* Healthcare privacy badge */}
                        {industry.uiFlags.showPrivacyBadge && <span className="font-label-caps text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider flex items-center gap-0.5"><span className="material-symbols-outlined text-[9px]">lock</span>PHI</span>}
                        {/* SLA Badges */}
                        {v.slaStatus === 'WARNING' && <span className="font-label-caps text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">SLA Warning</span>}
                        {v.slaStatus === 'BREACHED' && <span className="font-label-caps text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">SLA Breach</span>}
                        </div>
                        <h3 className="font-semibold text-body-lg text-on-surface dark:text-white">{v.customer?.name || industry.terminology.walkIn}</h3>
                        <div className="flex items-center gap-2 text-outline text-body-sm mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">{v.source === 'APPOINTMENT' ? 'calendar_today' : 'directions_walk'}</span>
                          <span>{v.service?.name || industry.terminology.service}</span>
                        </div>

                        {/* Industry-specific chip from form responses */}
                        {chipValue && (
                          <div className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold w-fit ${industry.accentBg} ${industry.accentText} border border-current/20`}>
                            <span className="material-symbols-outlined text-[12px]">{industry.visitCard.primaryChipIcon}</span>
                            <span className="truncate max-w-[150px]">{chipLabel ? `${chipLabel}: ` : ''}{chipValue}</span>
                          </div>
                        )}

                        {/* Healthcare: Accompanying guests chip */}
                        {industry.uiFlags.showGuestCount && v.accompanyingGuests > 0 && (
                          <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium w-fit bg-surface-container text-outline border border-border">
                            <span className="material-symbols-outlined text-[12px]">group</span>
                            <span>+{v.accompanyingGuests} accompanying</span>
                          </div>
                        )}

                        {/* Multi-step Itinerary Progress (Healthcare) */}
                        {hasItinerary && <ItineraryProgress itinerary={v.itinerary} />}
                      </div>
                      
                      <div className="flex flex-col items-end gap-3 ml-3 shrink-0">
                        <div className={`flex items-center gap-1.5 font-data-mono text-body-md font-semibold ${isUrgent ? 'text-alert' : 'text-amber-600 dark:text-amber-400'}`}>
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          {waitTimeMins}m
                        </div>
                        <button 
                          onClick={(e) => handleStart(v.id, e, v.isToken)}
                          className={`${v.isToken ? 'bg-zinc-600 hover:bg-zinc-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-2 rounded-lg font-medium text-body-sm h-[36px] flex items-center gap-2 transition-colors shadow-sm`}
                        >
                          <span className="material-symbols-outlined text-[18px]">campaign</span>
                          {v.isToken ? 'Queued' : industry.terminology.actionVerb}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        {/* Column 3: Visitor/Patient Context Panel */}
        {selectedVisit && (
          <section className="hidden md:flex flex-col col-span-3 bg-card dark:bg-dark-card border-l border-border dark:border-dark-border min-h-0 relative animate-in slide-in-from-right-8">
            <div className="p-3 border-b border-border dark:border-dark-border shrink-0 relative flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${industry.accentBg} ${industry.accentText}`}>
                    {industry.terminology.customer}
                  </span>
                  <h2 className="text-lg text-on-surface dark:text-white font-bold truncate max-w-[150px]">
                    {selectedVisit.customer?.name || industry.terminology.walkIn}
                  </h2>
                  <span className="font-data-mono text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">
                    {selectedVisit.ticketNumber || `#TKT-${selectedVisit.id.substring(0,4)}`}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedVisit(null)} 
                  className="p-1 text-outline hover:bg-surface-container rounded transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-outline font-medium">
                <div className="flex items-center gap-1 font-data-mono">
                  <span className="material-symbols-outlined text-[14px]">smartphone</span>
                  {selectedVisit.customer?.phone || 'No phone'}
                </div>
                <div className="flex items-center gap-1">
                  <span className="capitalize">{selectedVisit.source?.toLowerCase()}</span> • <span className="text-primary">{selectedVisit.currentState}</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border/50 text-xs">

                {/* Industry-specific: Show form responses fields prominently */}
                {(() => {
                  const cf = industry.visitCard.primaryChipField;
                  let panelVal: string | null = null;
                  let panelLabel: string | null = industry.visitCard.primaryChipLabel;
                  if (cf === DYNAMIC_CHIP_SENTINEL) {
                    const entries = Object.entries(selectedVisit.formResponses || {}).filter(([, val]) => val && String(val).trim() !== '');
                    if (entries.length > 0) {
                      const [firstKey, firstVal] = entries[0];
                      panelVal = String(firstVal);
                      panelLabel = firstKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase()).trim();
                    }
                  } else if (cf) {
                    panelVal = selectedVisit.formResponses?.[cf] ?? null;
                  }
                  if (!panelVal) return null;
                  return (
                    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${industry.accentBg} border border-current/20`}>
                      <span className={`material-symbols-outlined text-[14px] ${industry.accentText}`}>{industry.visitCard.primaryChipIcon}</span>
                      <div className="flex-1">
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${industry.accentText}`}>{panelLabel}</div>
                        <div className="text-on-surface dark:text-white font-medium">{panelVal}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Accompanying guests (hospital, salon, restaurant) */}
                {industry.uiFlags.showGuestCount && selectedVisit.accompanyingGuests > 0 && (
                  <div className="flex items-center gap-1 text-outline">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    <span className="font-medium text-on-surface dark:text-white">Accompanying:</span>
                    <span>{selectedVisit.accompanyingGuests} person{selectedVisit.accompanyingGuests > 1 ? 's' : ''}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-outline">
                  <span className="font-medium text-on-surface dark:text-white">Service:</span>
                  <span className="truncate max-w-full">{selectedVisit.service?.name || industry.terminology.service}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-on-surface dark:text-white">{industry.providerView.providerAssignLabel}:</span>
                  <select 
                    value={selectedVisit.resourceId || ''}
                    onChange={(e) => updateVisitMutation.mutate({ id: selectedVisit.id, resourceId: e.target.value })}
                    className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded text-xs py-1 px-2 flex-1 outline-none"
                  >
                    <option value="">{industry.providerView.unassignedLabel}</option>
                    {resources.map((r: AnyFixMe) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Healthcare Itinerary Stepper in right panel */}
                {industry.uiFlags.showItinerary && Array.isArray(selectedVisit.itinerary) && selectedVisit.itinerary.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5">Patient Journey</div>
                    <ItineraryProgress itinerary={selectedVisit.itinerary} />
                  </div>
                )}
                {industry.uiFlags.enableVitalsMock && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => alert('Vitals tracking module coming soon')}
                      className="flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high dark:bg-zinc-800 dark:hover:bg-zinc-700 text-on-surface dark:text-white text-xs font-bold py-2 px-3 rounded-lg border border-border dark:border-dark-border transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-rose-500">favorite</span>
                      Vitals
                    </button>
                    <button 
                      onClick={() => alert('Medical history module coming soon')}
                      className="flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high dark:bg-zinc-800 dark:hover:bg-zinc-700 text-on-surface dark:text-white text-xs font-bold py-2 px-3 rounded-lg border border-border dark:border-dark-border transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px] text-blue-500">history</span>
                      History
                    </button>
                  </div>
                )}
                
                <InlineNotes 
                  visitId={selectedVisit.id} 
                  initialNotes={selectedVisit.notes} 
                  placeholder={industry.terminology.notesPlaceholder}
                />
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-surface dark:bg-dark-card border-t border-border dark:border-dark-border shrink-0">
              {plan.isFeatureEnabled('whatsappChat') ? (
                tenant?.whatsappConnected ? (
                  <WhatsAppChatPanel 
                    tokenId={selectedVisit.id}
                    customerName={selectedVisit.customer?.name}
                    customerPhone={selectedVisit.customer?.phone}
                    queueName={selectedVisit.service?.name}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-[32px] text-amber-600 dark:text-amber-400">warning</span>
                    </div>
                    <h3 className="text-lg font-bold text-on-surface dark:text-white">WhatsApp Disconnected</h3>
                    <p className="text-body-sm text-outline">You need to connect WhatsApp to use the customer chat feature.</p>
                    <Link href="/dashboard/settings/integrations" className="bg-primary hover:bg-primary-container text-white px-6 py-2 rounded-xl font-bold transition-colors">
                      Connect WhatsApp
                    </Link>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 dark:to-primary/10 pointer-events-none"></div>
                  <div className="w-16 h-16 bg-surface-container dark:bg-zinc-800 rounded-full flex items-center justify-center relative z-10">
                    <span className="material-symbols-outlined text-[32px] text-outline">lock</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface dark:text-white relative z-10">Chat Locked</h3>
                  <p className="text-body-sm text-outline relative z-10 max-w-[250px]">Upgrade your plan to unlock direct WhatsApp chat with {industry.terminology.customers.toLowerCase()}.</p>
                  <Link href="/dashboard/settings/billing" className="bg-surface-container-high hover:bg-inverse-surface dark:hover:bg-white text-on-surface dark:hover:text-black px-6 py-2 rounded-xl font-bold transition-colors relative z-10 border border-border">
                    Upgrade Plan
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

      </div>
      
      <CreateVisitModal 
        isOpen={isVisitModalOpen} 
        onClose={() => setIsVisitModalOpen(false)} 
      />
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(data) => {
          setIsScannerOpen(false);
          const found = visits.find((v: AnyFixMe) => v.id === data.tokenId) || queueTokens.find((t: AnyFixMe) => t.id === data.tokenId);
          if (found) {
            setSelectedVisit(found);
          } else {
            setSelectedVisit({
              id: data.tokenId || 'UNKNOWN',
              customer: { name: data.customerName, phone: data.phone },
              service: { name: data.queueName || data.serviceBooked },
              source: data.isAppointment ? 'APPOINTMENT' : 'WALK_IN',
              currentState: data.status,
              ticketNumber: data.tokenId ? `#TKT-${data.tokenId.substring(0,4)}` : ''
            });
          }
        }}
      />
      <WelcomeModal 
        isOpen={isWelcomeModalOpen} 
        onClose={() => setIsWelcomeModalOpen(false)} 
      />
    </AdminLayout>
  );
}
