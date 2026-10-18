import React, { useEffect, useState } from 'react';
import { useMyDesk } from '../MyDeskContext';
import { useAuth } from '../../AuthContext';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';

export const CurrentTicketWidget = ({ widgetId }: { widgetId: string }) => {
  const { activeVisit, setActiveVisit } = useMyDesk();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // For demonstration, we just fetch a random active visit assigned to this staff or queue
  useEffect(() => {
    const fetchNext = async () => {
      setLoading(true);
      try {
        const visits = await fetchApi('/visits?status=ACTIVE');
        if (visits && visits.length > 0) {
          setActiveVisit(visits[0]);
        }
      } catch (err) {
        console.error('Failed to fetch visits', err);
      } finally {
        setLoading(false);
      }
    };

    if (!activeVisit) {
      fetchNext();
    }
  }, [activeVisit, setActiveVisit]);

  const handleComplete = async () => {
    if (!activeVisit) return;
    try {
      await fetchApi(`/visits/${activeVisit.id}/complete`, { method: 'POST' });
      toast.success('Ticket completed!');
      setActiveVisit(null); // Fetch next
    } catch (err) {
      toast.error('Failed to complete ticket');
    }
  };

  if (loading) {
    return <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 animate-pulse h-full">Loading current ticket...</div>;
  }

  if (!activeVisit) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center h-full text-zinc-500">
        No active tasks assigned to you.
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Current Task</h3>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded-full text-xs font-semibold">
          {activeVisit.tokenNumber || 'Walk-in'}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="mb-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Customer Name</p>
          <p className="text-xl font-medium text-zinc-900 dark:text-zinc-100">{activeVisit.customerName || 'Unknown Customer'}</p>
        </div>

        {activeVisit.service?.name && (
          <div className="mb-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Service</p>
            <p className="text-md text-zinc-900 dark:text-zinc-100">{activeVisit.service.name}</p>
          </div>
        )}
      </div>

      <div className="mt-4 shrink-0 flex gap-2">
        <button 
          onClick={handleComplete}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Complete
        </button>
        <button 
          onClick={() => setActiveVisit(null)}
          className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
};
