import React, { useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';

export const ScheduleWidget = ({ widgetId }: { widgetId: string }) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedule = async () => {
    try {
      // In a real app we'd fetch only today's appointments for this staff member
      const data = await fetchApi('/appointments');
      
      // Filter for today's appointments and sort by time
      const today = new Date().toISOString().split('T')[0];
      const todayAppts = (data || [])
        .filter((a: any) => (a.scheduledDate as string).startsWith(today))
        .sort((a: any, b: any) => a.scheduledTime.localeCompare(b.scheduledTime));
        
      setAppointments(todayAppts);
    } catch (err) {
      console.error('Failed to fetch schedule', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
    const handleRefetch = () => fetchSchedule();
    window.addEventListener('my-desk-refetch', handleRefetch);
    return () => window.removeEventListener('my-desk-refetch', handleRefetch);
  }, []);

  if (loading) {
    return <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 animate-pulse h-full">Loading schedule...</div>;
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Today's Schedule</h3>
        <span className="text-sm text-zinc-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-2">
        {appointments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm text-center">
            No more appointments scheduled for today.
          </div>
        ) : (
          appointments.map(appt => {
            const isPast = new Date(`${appt.scheduledDate}T${appt.scheduledTime}`).getTime() < new Date().getTime();
            
            return (
              <div 
                key={appt.id} 
                className={`flex gap-4 p-3 rounded-lg border transition-colors ${
                  isPast 
                    ? 'bg-zinc-50 border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800 opacity-60' 
                    : 'bg-white border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 shadow-sm'
                }`}
              >
                <div className="flex flex-col items-center justify-center shrink-0 w-16 border-r border-zinc-200 dark:border-zinc-700 pr-4">
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {appt.scheduledTime.substring(0, 5)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {appt.customerName || 'Walk-in Customer'}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                    {appt.service?.name || 'Consultation'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
