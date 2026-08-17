import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { AlertCircle, Link as LinkIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface QueueMigrationModalProps {
  unlinkedQueues: any[];
  services: any[];
  onComplete: () => void;
  tenantId: string;
  onCreateService?: () => void;
}

export function QueueMigrationModal({ unlinkedQueues, services, onComplete, tenantId, onCreateService }: QueueMigrationModalProps) {
  const queryClient = useQueryClient();
  const [selectedServiceMap, setSelectedServiceMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateQueueMutation = useMutation({
    mutationFn: async ({ queueId, serviceId }: { queueId: string, serviceId: string }) => {
      return fetchApi(`/queue/${queueId}`, {
        method: 'PATCH',
        body: JSON.stringify({ serviceIds: [serviceId] })
      });
    }
  });

  const handleSave = async () => {
    // Check if all queues have a selected service
    const missing = unlinkedQueues.some(q => !selectedServiceMap[q.id]);
    if (missing) {
      toast.error('Please select a service for all queues.');
      return;
    }

    setIsSubmitting(true);
    try {
      const promises = unlinkedQueues.map(q => 
        updateQueueMutation.mutateAsync({ queueId: q.id, serviceId: selectedServiceMap[q.id] })
      );
      await Promise.all(promises);
      toast.success('Queues successfully linked!');
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update queues');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-border dark:border-white/10">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-on-surface dark:text-white">Action Required: Link Queues</h2>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-2">
              We've upgraded our system to support multi-service routing! You have {unlinkedQueues.length} existing {unlinkedQueues.length === 1 ? 'queue' : 'queues'} that must be assigned to a Service to continue working correctly.
            </p>
          </div>

          <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
            {unlinkedQueues.map(q => (
              <div key={q.id} className="p-4 bg-surface-container-low dark:bg-black/20 rounded-xl border border-border dark:border-white/5">
                <div className="mb-3">
                  <p className="text-[10px] text-on-surface-variant font-bold tracking-wider mb-1 uppercase">Queue</p>
                  <p className="font-semibold text-base text-on-surface dark:text-white">
                    {q.name}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <LinkIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                  <select
                    className="flex-1 bg-surface dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    value={selectedServiceMap[q.id] || ''}
                    onChange={(e) => setSelectedServiceMap({ ...selectedServiceMap, [q.id]: e.target.value })}
                  >
                    <option value="" disabled>Select a Service...</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            {services.length === 0 && (
              <div className="p-4 bg-red-500/10 text-red-500 text-sm rounded-xl border border-red-500/20">
                You don't have any Services created yet. Please close this modal, create a service first from the dashboard sidebar, and then link your queues.
              </div>
            )}
          </div>

          <div className="p-6 border-t border-border dark:border-white/10 flex flex-wrap justify-between items-center gap-3 bg-surface-container-lowest dark:bg-black/20">
            {onCreateService ? (
              <button
                onClick={onCreateService}
                className="px-4 py-2 text-primary font-medium text-sm hover:bg-primary/10 rounded-xl transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create New Service
              </button>
            ) : <div />}
            
            <div className="flex gap-3">
              {services.length === 0 ? (
                <button
                  onClick={onComplete}
                  className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-container"
                >
                  Close
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || unlinkedQueues.some(q => !selectedServiceMap[q.id])}
                  className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-container disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Saving...' : 'Save & Continue'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
