import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { Clock, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { PremiumFeatureGate } from '../PremiumFeatureGate';

export function QueueBlockOffs({ queueId, locationId }: { queueId: string, locationId: string }) {
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');

  const { data: blockOffs = [], isLoading } = useQuery({
    queryKey: ['block-offs', queueId],
    queryFn: () => fetchApi(`/block-offs?queueId=${queueId}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/block-offs', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-offs', queueId] });
      toast.success('Block-off created successfully');
      setStartTime('');
      setEndTime('');
      setReason('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create block-off')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/block-offs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-offs', queueId] });
      toast.success('Block-off removed');
    },
    onError: (err: any) => toast.error('Failed to remove block-off')
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) return;
    createMutation.mutate({
      queueId,
      locationId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      reason
    });
  };

  return (
    <PremiumFeatureGate
      featureKey="customBranding" // Reusing a gate for demo purposes
      featureName="Queue Block-Offs"
      description="Block off specific times (like lunch breaks or emergencies) to prevent new customers from joining the queue."
    >
      <div className="bg-card dark:bg-dark-card rounded-2xl border border-border dark:border-dark-border p-6 shadow-sm mt-8">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-5 h-5 text-[#f59e0b]" />
          <h3 className="font-headline-sm font-semibold text-on-surface dark:text-white">Queue Block-Offs & Breaks</h3>
        </div>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-surface-container-low dark:bg-zinc-900/50 p-4 rounded-xl border border-border dark:border-dark-border">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Start Time</label>
            <input type="datetime-local" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">End Time</label>
            <input type="datetime-local" required value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Reason (e.g. Lunch Break)</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Lunch Break" className="w-full bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={createMutation.isPending} className="w-full h-[38px] bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-colors disabled:opacity-50">
              <Plus className="w-4 h-4" /> Add Break
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-on-surface-variant uppercase tracking-wider mb-2">Active & Upcoming Blocks</h4>
          {isLoading ? (
            <p className="text-sm text-outline">Loading...</p>
          ) : blockOffs.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border dark:border-dark-border rounded-xl">
              <p className="text-sm text-outline">No blocked times scheduled.</p>
            </div>
          ) : (
            blockOffs.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between p-4 bg-white dark:bg-black/40 border border-border dark:border-dark-border rounded-xl">
                <div>
                  <p className="font-medium text-sm text-on-surface dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-alert" />
                    {b.reason || 'Blocked Time'}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {new Date(b.startTime).toLocaleString()} - {new Date(b.endTime).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => deleteMutation.mutate(b.id)} disabled={deleteMutation.isPending} className="p-2 text-outline hover:text-alert hover:bg-alert-container rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </PremiumFeatureGate>
  );
}
