import React, { useEffect, useState } from 'react';
import { useMyDesk } from '../MyDeskContext';
import { fetchApi } from '../../../lib/api';

export const CustomerHistoryWidget = ({ widgetId }: { widgetId: string }) => {
  const { activeVisit } = useMyDesk();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeVisit?.customerId) {
      setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      try {
        // Fetch past visits for the customer
        const data = await fetchApi(`/customers/${activeVisit.customerId}/visits`);
        // Exclude current visit
        setHistory((data || []).filter((v: any) => v.id !== activeVisit.id));
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [activeVisit?.customerId, activeVisit?.id]);

  if (!activeVisit) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center h-full text-zinc-500">
        Waiting for active task...
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-full flex flex-col">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 shrink-0">Customer History</h3>
      
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
            <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">First time visit.</p>
        ) : (
          history.map(visit => (
            <div key={visit.id} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {new Date(visit.createdAt).toLocaleDateString()}
                </span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  visit.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                }`}>
                  {visit.status}
                </span>
              </div>
              <p className="text-sm text-zinc-800 dark:text-zinc-200">{visit.service?.name || 'Unknown Service'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
