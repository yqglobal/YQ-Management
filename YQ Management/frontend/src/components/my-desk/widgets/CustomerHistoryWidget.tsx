import React, { useEffect, useState } from 'react';
import { useMyDesk } from '../MyDeskContext';
import { fetchApi } from '../../../lib/api';
import { History, Star, ShieldAlert, Award, Calendar, CheckCircle2, XCircle } from 'lucide-react';

export const CustomerHistoryWidget = ({ widgetId }: { widgetId: string }) => {
  const { activeVisit } = useMyDesk();
  const [history, setHistory] = useState<any[]>([]);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const customerId = activeVisit?.customerId;
    if (!customerId) {
      setHistory([]);
      setCustomerDetails(null);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        // Fetch customer profile which includes visits relation
        const customerData = await fetchApi(`/customer/${customerId}`).catch(() => null);
        if (customerData) {
          setCustomerDetails(customerData);
          const pastVisits = (customerData.visits || []).filter((v: any) => v.id !== activeVisit?.id);
          setHistory(pastVisits);
        } else {
          // Fallback to direct visits route
          const visitsData = await fetchApi(`/customer/${customerId}/visits`).catch(() => []);
          const pastVisits = (Array.isArray(visitsData) ? visitsData : []).filter((v: any) => v.id !== activeVisit?.id);
          setHistory(pastVisits);
        }
      } catch (err) {
        console.error('Failed to fetch customer history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [activeVisit?.customerId, activeVisit?.id]);

  if (!activeVisit) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center h-full text-center text-zinc-500">
        <History className="w-8 h-8 text-zinc-400 mb-2 opacity-50" />
        <p className="text-sm font-medium">Customer History</p>
        <p className="text-xs text-zinc-400 mt-0.5">Select a task or visitor to view visit history</p>
      </div>
    );
  }

  if (!activeVisit.customerId) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between h-full">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Customer Profile</h3>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-center">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {activeVisit.customerName || 'Anonymous Walk-in'}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Guest does not have a registered profile yet.
            </p>
          </div>
        </div>
        <p className="text-xs text-zinc-400 text-center">First recorded interaction</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Customer History</h3>
          {customerDetails?.isVip && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              <Award className="w-3 h-3" /> VIP
            </span>
          )}
          {customerDetails?.isBlocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
              <ShieldAlert className="w-3 h-3" /> Blocked
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-400 font-medium">
          {history.length} past {history.length === 1 ? 'visit' : 'visits'}
        </span>
      </div>

      {customerDetails?.notes && (
        <div className="mb-3 p-2.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs text-blue-900 dark:text-blue-300 shrink-0">
          <span className="font-semibold block mb-0.5">Staff Notice:</span>
          <p>{customerDetails.notes}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-zinc-100 dark:bg-zinc-800 rounded-lg"></div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 text-zinc-400">
            <Calendar className="w-6 h-6 mb-1 opacity-50" />
            <p className="text-xs font-medium">First-time visitor</p>
            <p className="text-[11px]">No prior records found</p>
          </div>
        ) : (
          history.map((visit) => {
            const isCompleted = visit.currentState === 'COMPLETED';
            const isNoShow = visit.currentState === 'NO_SHOW';

            return (
              <div
                key={visit.id}
                className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-lg border border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {new Date(visit.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : isNoShow
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {visit.currentState}
                    </span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 truncate">
                    {visit.service?.name || 'Consultation'}
                  </p>
                </div>

                {visit.rating && (
                  <div className="flex items-center gap-0.5 text-amber-500 shrink-0 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{visit.rating}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
