import React, { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { useMyDesk } from '../MyDeskContext';
import { Clock, CheckCircle, RefreshCw, Flame, Users, AlertCircle } from 'lucide-react';

export const QueueGridWidget = ({ widgetId }: { widgetId: string }) => {
  const { activeVisit, setActiveVisit, refetchVisits } = useMyDesk();
  const [activeVisits, setActiveVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bumpingId, setBumpingId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetchApi('/visits?status=ACTIVE');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setActiveVisits(list);
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 12000); // Poll every 12s

    const handleRefetch = () => fetchQueue();
    window.addEventListener('my-desk-refetch', handleRefetch);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('my-desk-refetch', handleRefetch);
    };
  }, [fetchQueue]);

  const handleBump = async (e: React.MouseEvent, visitId: string) => {
    e.stopPropagation();
    setBumpingId(visitId);
    try {
      await fetchApi(`/visits/${visitId}/complete`, { method: 'POST' });
      toast.success('Ticket marked completed');
      if (activeVisit?.id === visitId) {
        setActiveVisit(null);
      }
      refetchVisits();
      fetchQueue();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete visit');
    } finally {
      setBumpingId(null);
    }
  };

  const getWaitMinutes = (createdAt: string) => {
    return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  };

  const getWaitBadgeStyle = (mins: number) => {
    if (mins >= 20) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50';
    }
    if (mins >= 10) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
    }
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
  };

  if (loading && activeVisits.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 animate-pulse h-full">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Live Queue & KDS</h3>
          <span className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-semibold">
            {activeVisits.length} Active
          </span>
        </div>
        <button
          onClick={() => fetchQueue()}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Refresh Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {activeVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <CheckCircle className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">All queues clear</p>
            <p className="text-xs text-zinc-400 mt-0.5">No visitors currently waiting</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeVisits.map((visit) => {
              const waitMins = getWaitMinutes(visit.waitingStart || visit.createdAt);
              const isSelected = activeVisit?.id === visit.id;
              const isUrgent = waitMins >= 20 || (visit.priority && visit.priority > 0);

              return (
                <div
                  key={visit.id}
                  onClick={() => setActiveVisit(visit)}
                  className={`relative cursor-pointer rounded-xl p-4 border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {visit.tokenNumber || '#--'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getWaitBadgeStyle(
                          waitMins
                        )}`}
                      >
                        {isUrgent && <Flame className="w-3 h-3 text-rose-500" />}
                        {waitMins}m
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {visit.customerName || visit.customer?.name || 'Walk-in Guest'}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {visit.service?.name || 'Standard Service'}
                    </p>

                    {visit.accompanyingGuests > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 mt-1">
                        <Users className="w-3 h-3" /> +{visit.accompanyingGuests} guests
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                      {visit.currentState}
                    </span>
                    <button
                      onClick={(e) => handleBump(e, visit.id)}
                      disabled={bumpingId === visit.id}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-100 hover:bg-emerald-600 hover:text-white dark:bg-zinc-800 dark:hover:bg-emerald-600 transition-colors"
                    >
                      {bumpingId === visit.id ? '...' : 'Done'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
