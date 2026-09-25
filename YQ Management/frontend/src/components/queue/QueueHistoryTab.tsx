import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { VisitDrawer } from '../VisitDrawer';

export function QueueHistoryTab({ queueId }: { queueId: string }) {
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits', 'history', queueId],
    queryFn: () => fetchApi(`/visits?scope=history&queueId=${queueId}`),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-on-surface-variant">Loading history...</div>;
  }

  const completed = visits.filter((v: any) => v.currentState === 'COMPLETED' || v.currentState === 'MISSED' || v.currentState === 'CANCELLED');

  return (
    <>
      <div className="bg-surface dark:bg-dark-card rounded-2xl border border-border dark:border-dark-border p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-sm font-semibold">Queue History</h2>
        </div>
        
        {completed.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            No historical visits found for this queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border dark:border-dark-border">
                  <th className="py-3 px-4 font-semibold text-sm">Token</th>
                  <th className="py-3 px-4 font-semibold text-sm">Customer</th>
                  <th className="py-3 px-4 font-semibold text-sm">Service</th>
                  <th className="py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="py-3 px-4 font-semibold text-sm">Time</th>
                </tr>
              </thead>
              <tbody>
                {completed.map((visit: any) => (
                  <tr 
                    key={visit.id} 
                    onClick={() => setSelectedVisit(visit)}
                    className="border-b border-border dark:border-dark-border hover:bg-surface-container-lowest transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-medium">{visit.displayId || visit.id.substring(0,8)}</td>
                    <td className="py-3 px-4">{visit.customer?.name || visit.customerName || 'Unknown'}</td>
                    <td className="py-3 px-4">{visit.service?.name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        visit.currentState === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600' :
                        visit.currentState === 'MISSED' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-red-500/10 text-red-600'
                      }`}>
                        {visit.currentState}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-on-surface-variant">
                      {new Date(visit.createdAt).toLocaleDateString()} {new Date(visit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <VisitDrawer 
        isOpen={!!selectedVisit} 
        onClose={() => setSelectedVisit(null)} 
        visit={selectedVisit} 
      />
    </>
  );
}
