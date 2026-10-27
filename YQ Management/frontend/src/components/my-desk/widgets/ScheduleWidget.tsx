import React, { useEffect, useState, useCallback } from 'react';
import { fetchApi } from '../../../lib/api';
import { Calendar, Clock, RefreshCw, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const ScheduleWidget = ({ widgetId }: { widgetId: string }) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = useCallback(async () => {
    try {
      const data = await fetchApi('/appointments');
      const list: any[] = Array.isArray(data) ? data : (data?.data || []);
      
      const todayDateStr = new Date().toDateString();

      // Filter for today's appointments and sort by scheduled start
      const todayAppts = list
        .filter((a: any) => {
          if (!a.scheduledStart) return false;
          const start = new Date(a.scheduledStart);
          return start.toDateString() === todayDateStr;
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
        );
        
      setAppointments(todayAppts);
    } catch (err) {
      console.error('Failed to fetch schedule', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
    const handleRefetch = () => fetchSchedule();
    window.addEventListener('my-desk-refetch', handleRefetch);
    return () => window.removeEventListener('my-desk-refetch', handleRefetch);
  }, [fetchSchedule]);

  const formatTimeRange = (startIso: string, endIso?: string) => {
    const start = new Date(startIso);
    const startStr = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (!endIso) return startStr;
    const end = new Date(endIso);
    const endStr = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${startStr} - ${endStr}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Done</span>;
      case 'CANCELLED':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Cancelled</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">Booked</span>;
    }
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 animate-pulse h-full">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Today's Schedule</h3>
          <p className="text-xs text-zinc-400">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => fetchSchedule()}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Refresh Schedule"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
        {appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 text-zinc-400">
            <Calendar className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No bookings today</p>
            <p className="text-xs text-zinc-500">Upcoming calendar reservations will appear here.</p>
          </div>
        ) : (
          appointments.map((appt) => {
            const startMs = new Date(appt.scheduledStart).getTime();
            const endMs = appt.scheduledEnd ? new Date(appt.scheduledEnd).getTime() : startMs + 1800000;
            const isPast = endMs < now;
            const isCurrent = startMs <= now && endMs >= now;

            return (
              <div
                key={appt.id}
                className={`p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 ring-1 ring-indigo-500/30'
                    : isPast
                    ? 'border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 opacity-60'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTimeRange(appt.scheduledStart, appt.scheduledEnd)}</span>
                  </div>
                  {getStatusBadge(appt.status)}
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {appt.customer?.name || appt.customerName || 'Registered Client'}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {appt.service?.name || 'General Consultation'}
                    </p>
                  </div>
                  {appt.location?.name && (
                    <span className="text-[11px] text-zinc-400 shrink-0">
                      {appt.location.name}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
