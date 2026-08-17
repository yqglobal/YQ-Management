import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '../../lib/api';
import { WelcomeModal } from '../../components/modals/WelcomeModal';
import { CreateVisitModal } from '../../components/modals/CreateVisitModal';
import { MonitorPlay } from 'lucide-react';

export default function ServiceDeskToday() {
  const queryClient = useQueryClient();
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [mobileTab, setMobileTab] = useState<'pool' | 'pipeline'>('pool');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenIntro = localStorage.getItem('hasSeenIntro');
      if (!hasSeenIntro) {
        setIsWelcomeModalOpen(true);
        localStorage.setItem('hasSeenIntro', 'true');
      }
    }
  }, []);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits', 'today'],
    queryFn: () => fetchApi('/visits?scope=today').catch(() => []),
    refetchInterval: 15000, // poll every 15s
  });

  const { data: tenant } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me').catch(() => null),
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue').catch(() => []),
  });

  const { data: pendingAppointments = [] } = useQuery({
    queryKey: ['appointments', 'pending'],
    queryFn: () => fetchApi('/appointments?status=PENDING_APPROVAL').catch(() => []),
    refetchInterval: 15000,
  });

  const filteredVisits = selectedLocationId === 'all' ? visits : visits.filter((v: any) => v.locationId === selectedLocationId);
  const filteredQueues = selectedLocationId === 'all' ? queues : queues.filter((q: any) => !q.locationId || q.locationId === selectedLocationId);

  const queueTokens = filteredQueues.flatMap((q: any) => 
    (q.tokens || []).map((t: any) => ({
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
    ...filteredVisits.filter((v: any) => v.currentState === 'WAITING' || v.currentState === 'CHECKED_IN'),
    ...queueTokens
  ];
  
  const waitingVisits = waitingVisitsUnsorted.sort((a, b) => 
    new Date(a.waitingStart || a.joinedAt).getTime() - new Date(b.waitingStart || b.joinedAt).getTime()
  );

  const inServiceVisitsUnsorted = [
    ...filteredVisits.filter((v: any) => v.currentState === 'IN_SERVICE'),
    ...filteredQueues.flatMap((q: any) => 
      (q.tokens || []).filter((t: any) => t.status === 'SERVING').map((t: any) => ({
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
      alert('Failed to start visit. Please check your connection.');
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
      alert('Failed to call next customer from queue. Ensure the queue has waiting customers.');
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
      alert('Failed to complete visit. Please try again.');
    }
  };

  const displayPool = waitingVisits.filter((v: any) => 
    v.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout pageTitle="Service Desk">
      <Head>
        <title>Service Desk | Qmova</title>
      </Head>

      <div className="flex-1 flex flex-col md:grid md:grid-cols-12 overflow-hidden h-[calc(100vh-64px)] w-full -m-4 md:-m-10">
        
        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex items-center p-3 bg-card dark:bg-dark-card border-b border-border dark:border-dark-border gap-2 shrink-0 z-20 shadow-sm">
          <button 
            onClick={() => setMobileTab('pool')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${mobileTab === 'pool' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant bg-surface-container hover:bg-surface-container-high dark:bg-dark-canvas dark:hover:bg-inverse-surface'}`}
          >
            Active Pool ({waitingVisits.length})
          </button>
          <button 
            onClick={() => setMobileTab('pipeline')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${mobileTab === 'pipeline' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant bg-surface-container hover:bg-surface-container-high dark:bg-dark-canvas dark:hover:bg-inverse-surface'}`}
          >
            Pipeline
          </button>
        </div>

        {/* Column 1: Monitored Pipeline */}
        <section className={`${mobileTab === 'pipeline' ? 'flex' : 'hidden'} md:flex flex-col md:col-span-3 bg-card dark:bg-dark-card border-r border-border dark:border-dark-border p-4 md:p-6 h-full overflow-y-auto`}>
          <div className="flex items-center justify-between mb-6">
            {tenant?.locations && tenant.locations.length > 1 && (
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="bg-surface-container-low dark:bg-inverse-surface border border-border dark:border-dark-border text-on-surface dark:text-white rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Locations</option>
                {tenant.locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            )}
          </div>
          
          {/* Pending Appointments Stack */}
          {pendingAppointments.length > 0 && (
            <div className="mb-6 relative z-10 space-y-3">
              <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Pending Approvals</h3>
              <div className="relative">
                {pendingAppointments.map((apt: any, index: number) => (
                  <div 
                    key={apt.id} 
                    className="p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-amber-200 dark:border-amber-900/50 flex flex-col gap-3 transition-all"
                    style={{
                      transform: `translateY(${index * 8}px) scale(${1 - index * 0.02})`,
                      zIndex: pendingAppointments.length - index,
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
            {filteredQueues.length > 0 ? filteredQueues.map((q: any) => {
              const loc = tenant?.locations?.find((l: any) => l.id === q.locationId);
              return (
              <div key={q.id} className="flex flex-col gap-2 p-3 border border-border dark:border-dark-border rounded-xl bg-surface-container-low dark:bg-inverse-surface shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-body-md text-on-surface dark:text-white flex items-center gap-2">
                      {q.name}
                      {selectedLocationId === 'all' && loc && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium border border-zinc-200 dark:border-zinc-700">
                          {loc.name}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-outline">{q._count?.tokens || 0} Waiting</span>
                  </div>
                  <button 
                    onClick={() => handleCallNextQueue(q.id)}
                    className="bg-primary hover:bg-primary-container text-on-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">campaign</span>
                    Call Next
                  </button>
                </div>
              </div>
            )}) : (
              <p className="text-body-sm text-outline italic">No active queues.</p>
            )}
          </div>

          <div className="mt-4 pt-6 border-t border-border dark:border-dark-border">
            <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-4">Active Allocations</h3>
            <div className="flex flex-col gap-3">
              {inServiceVisits.map((v: any) => (
                <div key={v.id} onClick={() => setSelectedVisit(v)} className="flex items-center gap-3 p-3 bg-surface-container dark:bg-inverse-surface rounded-lg border border-border dark:border-dark-border cursor-pointer hover:border-primary transition-colors">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-semibold text-on-surface dark:text-white truncate">{v.customer?.name || 'Walk-in'}</p>
                    <p className="text-[10px] text-outline font-data-mono">{v.ticketNumber || `#TKT-${v.id.substring(0,4)}`}</p>
                  </div>
                  <button 
                    onClick={(e) => handleComplete(v.id, e)}
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

        {/* Column 2: Priority Queue Pool */}
        <section className={`${mobileTab === 'pool' ? 'flex' : 'hidden'} md:flex md:col-span-1 ${selectedVisit ? 'md:col-span-6' : 'md:col-span-9'} bg-canvas dark:bg-dark-canvas p-4 md:p-6 flex-col h-full overflow-hidden transition-all duration-300`}>
          

          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="font-headline-sm text-headline-sm text-on-surface dark:text-white">Active Processing Pool</h2>
              <span className="bg-primary/10 text-primary dark:bg-primary-fixed-dim/20 dark:text-primary-fixed-dim px-2.5 py-0.5 rounded-full font-data-mono text-body-sm font-semibold">{waitingVisits.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pool..." 
                  className="pl-9 pr-4 py-1.5 bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-lg text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <button onClick={() => setIsVisitModalOpen(true)} className="bg-primary hover:bg-primary-container text-on-primary px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">add</span> Add
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
                    <span className="material-symbols-outlined text-5xl text-primary opacity-80">sentiment_satisfied</span>
                  </div>
                </div>
                <h3 className="font-headline-sm text-on-surface dark:text-white mb-2">Queue is crystal clear.</h3>
                <p className="text-body-md text-outline text-center max-w-sm mb-8 leading-relaxed">
                  {visits.length === 0 
                    ? "Your waiting room is empty. Share your booking page or have visitors scan your QR code to get started." 
                    : "Inbox zero! All customers have been successfully routed and served."}
                </p>
                {visits.length === 0 && tenant?.subdomain && (
                  <a
                    href={`http://${tenant.subdomain}.localhost:3001${selectedLocationId !== 'all' ? `?locationId=${selectedLocationId}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold text-body-sm hover:bg-primary-container transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                  >
                    <MonitorPlay className="w-5 h-5" />
                    Open Booking Page
                  </a>
                )}
              </div>
            )}
            
            <AnimatePresence mode="popLayout">
              {displayPool.map((v: any, index: number) => {
                const waitTimeMs = v.waitingStart ? Date.now() - new Date(v.waitingStart).getTime() : 0;
                const waitTimeMins = Math.floor(waitTimeMs / 60000);
                const isUrgent = waitTimeMins > 15;
                
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    key={v.id} 
                    onClick={() => setSelectedVisit(v)}
                    className={`bg-card dark:bg-dark-card border ${selectedVisit?.id === v.id ? 'border-primary' : 'border-border dark:border-dark-border'} rounded-xl p-4 flex items-center justify-between relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer ${v.source === 'APPOINTMENT' ? 'shadow-[0_0_15px_rgba(14,165,233,0.1)] border-sky-500/20' : 'shadow-[0_0_15px_rgba(16,185,129,0.1)] border-emerald-500/20'}`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isUrgent ? 'bg-alert shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}></div>
                    
                    <div className="flex flex-col gap-1 pl-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-data-mono text-data-mono ${isUrgent ? 'text-alert' : 'text-on-surface dark:text-white'}`}>{v.ticketNumber || `#TKT-${v.id.substring(0,4)}`}</span>
                        {isUrgent && <span className="font-label-caps text-[10px] bg-alert/10 text-alert px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Urgent</span>}
                      </div>
                      <h3 className="font-semibold text-body-lg text-on-surface dark:text-white">{v.customer?.name || 'Walk-in Customer'}</h3>
                      <div className="flex items-center gap-2 text-outline text-body-sm mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">{v.source === 'APPOINTMENT' ? 'calendar_today' : 'directions_walk'}</span>
                        <span>{v.service?.name || 'Consultation'}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                      <div className={`flex items-center gap-1.5 font-data-mono text-body-md font-semibold ${isUrgent ? 'text-alert' : 'text-amber-600 dark:text-amber-400'}`}>
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {waitTimeMins}m wait
                      </div>
                      <button 
                        onClick={(e) => handleStart(v.id, e, v.isToken)}
                        className={`${v.isToken ? 'bg-zinc-600 hover:bg-zinc-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-2 rounded-lg font-medium text-body-sm h-[36px] flex items-center gap-2 transition-colors shadow-sm`}
                      >
                        <span className="material-symbols-outlined text-[18px]">campaign</span>
                        {v.isToken ? 'Queued' : 'Call Next'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>

        {/* Column 3: Visitor Context */}
        {selectedVisit && (
          <section className="hidden md:flex flex-col col-span-3 bg-card dark:bg-dark-card border-l border-border dark:border-dark-border h-full relative animate-in slide-in-from-right-8">
            <div className="p-6 border-b border-border dark:border-dark-border shrink-0 relative">
              <button 
                onClick={() => setSelectedVisit(null)} 
                className="absolute top-4 right-4 p-1.5 text-outline hover:bg-surface-container rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold text-xl border-2 border-surface">
                   {selectedVisit.customer?.name ? selectedVisit.customer.name.substring(0,2).toUpperCase() : 'W'}
                </div>
                <div className="font-data-mono text-data-mono text-primary font-bold">
                  {selectedVisit.ticketNumber || `#TKT-${selectedVisit.id.substring(0,4)}`}
                </div>
              </div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface dark:text-white font-semibold">
                {selectedVisit.customer?.name || 'Walk-in Customer'}
              </h2>
              <div className="flex items-center gap-2 text-body-sm text-outline mt-1 font-data-mono">
                <span className="material-symbols-outlined text-[14px]">smartphone</span>
                {selectedVisit.customer?.phone || 'No phone provided'}
              </div>
              
              <div className="mt-6 border border-border dark:border-dark-border rounded-lg overflow-hidden bg-surface-container-low dark:bg-inverse-surface">
                <div className="w-full flex items-center justify-between p-3 text-body-sm font-medium text-on-surface dark:text-white border-b border-border/50">
                  <span>Intake Details</span>
                </div>
                <div className="p-3 text-body-sm text-outline space-y-2">
                  <div className="flex justify-between"><span className="font-medium text-on-surface dark:text-white">Service:</span> <span>{selectedVisit.service?.name || 'General'}</span></div>
                  <div className="flex justify-between"><span className="font-medium text-on-surface dark:text-white">Source:</span> <span className="capitalize">{selectedVisit.source?.toLowerCase()}</span></div>
                  <div className="flex justify-between"><span className="font-medium text-on-surface dark:text-white">Status:</span> <span className="font-medium text-primary">{selectedVisit.currentState}</span></div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-outline">
               <span className="material-symbols-outlined text-4xl mb-2 opacity-30">chat</span>
               <p className="text-sm">No messages yet.</p>
            </div>
            
            <div className="p-4 bg-surface dark:bg-dark-card border-t border-border dark:border-dark-border shrink-0">
              <div className="relative flex items-end gap-2">
                <textarea 
                  className="w-full bg-card dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl p-3 pr-10 text-body-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary custom-scrollbar h-[44px]" 
                  placeholder="Send SMS update..." 
                  rows={1}
                />
                <button className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 w-[44px] h-[44px] rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              </div>
            </div>
          </section>
        )}

      </div>
      
      <CreateVisitModal 
        isOpen={isVisitModalOpen} 
        onClose={() => setIsVisitModalOpen(false)} 
      />
      <WelcomeModal 
        isOpen={isWelcomeModalOpen} 
        onClose={() => setIsWelcomeModalOpen(false)} 
      />
    </AdminLayout>
  );
}
