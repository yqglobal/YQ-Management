import React, { useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';

export const QueueGridWidget = ({ widgetId }: { widgetId: string }) => {
  const [activeVisits, setActiveVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const visits = await fetchApi('/visits?status=ACTIVE');
      setActiveVisits(visits || []);
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // In a real app, this would be updated via WebSocket
    const interval = setInterval(() => {
      fetchQueue();
    }, 15000); // Poll every 15s for demo

    const handleRefetch = () => fetchQueue();
    window.addEventListener('my-desk-refetch', handleRefetch);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('my-desk-refetch', handleRefetch);
    };
  }, []);

  const handleBump = async (visitId: string) => {
    try {
      await fetchApi(`/visits/${visitId}/complete`, { method: 'POST' });
      toast.success('Order bumped!');
      fetchQueue();
    } catch (err) {
      toast.error('Failed to bump order');
    }
  };

  const getWaitTimeColor = (createdAt: string) => {
    const mins = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    if (mins >= 15) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800/50';
    if (mins >= 5) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/50';
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800/50';
  };

  if (loading) {
    return <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 animate-pulse h-full">Loading queue...</div>;
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Kitchen Display / Queue</h3>
        <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-full text-xs font-semibold">
          {activeVisits.length} Active Orders
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeVisits.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500">
              No active orders in the queue.
            </div>
          ) : (
            activeVisits.map(visit => (
              <div 
                key={visit.id} 
                className={`flex flex-col p-4 rounded-xl border ${getWaitTimeColor(visit.createdAt)} shadow-sm`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-2xl font-black">{visit.tokenNumber || '#--'}</span>
                  <span className="text-sm font-semibold opacity-70">
                    {Math.floor((new Date().getTime() - new Date(visit.createdAt).getTime()) / 60000)}m
                  </span>
                </div>
                <div className="flex-1 mb-4">
                  <p className="font-semibold text-lg">{visit.service?.name || 'Walk-in Order'}</p>
                  <p className="text-sm opacity-80">{visit.customerName}</p>
                  {/* Optional notes space */}
                </div>
                <button 
                  onClick={() => handleBump(visit.id)}
                  className="w-full py-3 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 transition-colors rounded-lg font-bold uppercase tracking-wider"
                >
                  Bump (Done)
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
