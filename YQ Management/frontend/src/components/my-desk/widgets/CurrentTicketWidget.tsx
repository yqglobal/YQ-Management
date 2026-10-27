import React, { useEffect, useState, useCallback } from 'react';
import { useMyDesk } from '../MyDeskContext';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { Phone, Clock, CheckCircle2, UserCheck, Play, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

export const CurrentTicketWidget = ({ widgetId }: { widgetId: string }) => {
  const { activeVisit, setActiveVisit, refetchVisits } = useMyDesk();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNext = useCallback(async (preserveCurrent = false) => {
    setLoading(true);
    try {
      const res = await fetchApi('/visits?status=ACTIVE');
      const list: any[] = Array.isArray(res) ? res : (res?.data || []);
      
      if (preserveCurrent && activeVisit) {
        const found = list.find((v) => v.id === activeVisit.id);
        if (found) {
          setActiveVisit(found);
          return;
        }
      }

      if (list.length > 0) {
        // Prioritize in-service or called, otherwise top waiting
        const activeItem = list.find((v) => v.currentState === 'IN_SERVICE') ||
                           list.find((v) => v.currentState === 'CALLED') ||
                           list[0];
        setActiveVisit(activeItem);
      } else {
        setActiveVisit(null);
      }
    } catch (err) {
      console.error('Failed to fetch active visits', err);
    } finally {
      setLoading(false);
    }
  }, [activeVisit, setActiveVisit]);

  useEffect(() => {
    if (!activeVisit) {
      fetchNext();
    }
    const handleRefetch = () => fetchNext(true);
    window.addEventListener('my-desk-refetch', handleRefetch);
    return () => window.removeEventListener('my-desk-refetch', handleRefetch);
  }, [activeVisit, fetchNext]);

  const handleStart = async () => {
    if (!activeVisit) return;
    setActionLoading(true);
    try {
      const updated = await fetchApi(`/visits/${activeVisit.id}/start`, { method: 'POST' });
      toast.success('Visit started');
      setActiveVisit(updated || { ...activeVisit, currentState: 'IN_SERVICE' });
      refetchVisits();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start visit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCall = async () => {
    if (!activeVisit) return;
    setActionLoading(true);
    try {
      await fetchApi(`/visits/${activeVisit.id}/announce`, { method: 'POST' });
      toast.success('Customer called to counter');
      setActiveVisit({ ...activeVisit, currentState: 'CALLED' });
      refetchVisits();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to announce call');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!activeVisit) return;
    setActionLoading(true);
    try {
      await fetchApi(`/visits/${activeVisit.id}/complete`, { method: 'POST' });
      toast.success('Ticket completed successfully!');
      setActiveVisit(null);
      refetchVisits();
      fetchNext();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShow = async () => {
    if (!activeVisit) return;
    if (!confirm('Mark customer as No-Show?')) return;
    setActionLoading(true);
    try {
      await fetchApi(`/visits/${activeVisit.id}/no-show`, { method: 'POST' });
      toast.info('Marked as No-Show');
      setActiveVisit(null);
      refetchVisits();
      fetchNext();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mark as no-show');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'IN_SERVICE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">In Service</span>;
      case 'CALLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">Called</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">Waiting</span>;
    }
  };

  const formatWaitDuration = (isoString?: string) => {
    if (!isoString) return '0m';
    const mins = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 60000));
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  if (loading && !activeVisit) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 animate-pulse h-full flex flex-col justify-between">
        <div className="space-y-4">
          <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3"></div>
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3"></div>
        </div>
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
      </div>
    );
  }

  if (!activeVisit) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center h-full text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
          <UserCheck className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Desk Ready</h4>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">No active visitors waiting in your assigned queues.</p>
        <button
          onClick={() => fetchNext()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Check Queue
        </button>
      </div>
    );
  }

  const isServing = activeVisit.currentState === 'IN_SERVICE';
  const isCalled = activeVisit.currentState === 'CALLED';

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Current Task</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                {activeVisit.tokenNumber || '#--'}
              </span>
              {getStatusBadge(activeVisit.currentState)}
            </div>
          </div>
          <button
            onClick={() => fetchNext(true)}
            title="Refresh ticket"
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 mb-4">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-400 font-medium">Customer</p>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {activeVisit.customerName || activeVisit.customer?.name || 'Walk-in Guest'}
            </p>
            {(activeVisit.phone || activeVisit.customer?.phone) && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1">
                <Phone className="w-3 h-3" />
                {activeVisit.phone || activeVisit.customer?.phone}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg">
              <span className="text-zinc-400 block mb-0.5">Service</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                {activeVisit.service?.name || 'Standard Service'}
              </span>
            </div>
            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg">
              <span className="text-zinc-400 block mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Wait Time
              </span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {formatWaitDuration(activeVisit.waitingStart || activeVisit.createdAt)}
              </span>
            </div>
          </div>

          {activeVisit.notes && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold block mb-0.5">Notes:</span>
              <p className="line-clamp-2">{activeVisit.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        {isServing ? (
          <button
            onClick={handleComplete}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Service
          </button>
        ) : isCalled ? (
          <button
            onClick={handleStart}
            disabled={actionLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Start Service Now
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCall}
              disabled={actionLoading}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              Call Visitor
            </button>
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              Start Service
            </button>
          </div>
        )}

        <div className="flex gap-2 text-xs">
          <button
            onClick={handleNoShow}
            disabled={actionLoading}
            className="flex-1 py-1.5 px-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors font-medium text-center"
          >
            No Show
          </button>
          <button
            onClick={() => setActiveVisit(null)}
            disabled={actionLoading}
            className="flex-1 py-1.5 px-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium text-center flex items-center justify-center gap-1"
          >
            Skip <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
