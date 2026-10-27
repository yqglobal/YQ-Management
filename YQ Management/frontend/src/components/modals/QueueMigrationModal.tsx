import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { AlertCircle, Link as LinkIcon, Plus, Trash2, X, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from './ConfirmModal';

interface QueueMigrationModalProps {
  unlinkedQueues: any[];
  services: any[];
  onComplete: () => void;
  tenantId?: string;
  onCreateService?: () => void;
}

export function QueueMigrationModal({ unlinkedQueues, services, onComplete, tenantId, onCreateService }: QueueMigrationModalProps) {
  const queryClient = useQueryClient();
  const [selectedServiceMap, setSelectedServiceMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingQueueId, setDeletingQueueId] = useState<string | null>(null);
  const [isPurgingAll, setIsPurgingAll] = useState(false);
  const [queueToDelete, setQueueToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  const updateQueueMutation = useMutation({
    mutationFn: async ({ queueId, serviceId }: { queueId: string, serviceId: string }) => {
      return fetchApi(`/queue/${queueId}`, {
        method: 'PATCH',
        body: JSON.stringify({ serviceIds: [serviceId] })
      });
    }
  });

  const handleDeleteSingleQueue = (queueId: string, queueName: string) => {
    setQueueToDelete({ id: queueId, name: queueName });
  };

  const confirmDeleteSingleQueue = async () => {
    if (!queueToDelete) return;
    const { id: queueId, name: queueName } = queueToDelete;
    setDeletingQueueId(queueId);
    try {
      await fetchApi(`/queue/${queueId}`, { method: 'DELETE' });
      toast.success(`Queue "${queueName}" deleted`);
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      
      // If this was the last unlinked queue, finish
      if (unlinkedQueues.length <= 1) {
        onComplete();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete queue');
    } finally {
      setDeletingQueueId(null);
      setQueueToDelete(null);
    }
  };

  const handlePurgeAll = () => {
    setShowPurgeConfirm(true);
  };

  const confirmPurgeAll = async () => {
    setIsPurgingAll(true);
    try {
      const res = await fetchApi('/queue/unlinked/purge', { method: 'DELETE' });
      toast.success(`Successfully purged ${res.deletedCount || unlinkedQueues.length} orphaned queues.`);
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      setShowPurgeConfirm(false);
      onComplete();
    } catch (err: any) {
      toast.error(err.message || 'Failed to purge orphaned queues');
    } finally {
      setIsPurgingAll(false);
    }
  };

  const handleSave = async () => {
    // Check if all queues have a selected service
    const missing = unlinkedQueues.some(q => !selectedServiceMap[q.id]);
    if (missing) {
      toast.error('Please select a service for all queues, or delete the ones you do not need.');
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
      queryClient.invalidateQueries({ queryKey: ['queues'] });
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
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-border dark:border-white/10 relative">
            <button
              onClick={onComplete}
              className="absolute top-5 right-5 p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors"
              title="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-on-surface dark:text-white">Action Required: Link Queues</h2>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-2">
              We've upgraded our system to support multi-service routing! You have {unlinkedQueues.length} existing {unlinkedQueues.length === 1 ? 'queue' : 'queues'} that must either be assigned to a service or deleted.
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4 overflow-y-auto">
            {services.length === 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm rounded-xl border border-amber-500/20">
                  <p className="font-semibold mb-1">No Active Services Found</p>
                  <p className="text-xs leading-relaxed">
                    These {unlinkedQueues.length} queues are left over from deleted locations or services. Since there are currently no active services, you can purge them all now or create a new service to link them to.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Orphaned Queues:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {unlinkedQueues.map(q => (
                      <div key={q.id} className="p-3 bg-surface-container-low dark:bg-black/20 rounded-xl border border-border dark:border-white/5 flex items-center justify-between">
                        <span className="font-medium text-sm text-on-surface dark:text-white">{q.name}</span>
                        <button
                          onClick={() => handleDeleteSingleQueue(q.id, q.name)}
                          disabled={deletingQueueId === q.id}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete queue"
                        >
                          {deletingQueueId === q.id ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              unlinkedQueues.map(q => (
                <div key={q.id} className="p-4 bg-surface-container-low dark:bg-black/20 rounded-xl border border-border dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold tracking-wider uppercase">Queue</p>
                      <p className="font-semibold text-base text-on-surface dark:text-white">
                        {q.name}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteSingleQueue(q.id, q.name)}
                      disabled={deletingQueueId === q.id}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete this queue"
                    >
                      {deletingQueueId === q.id ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2 items-center pt-1">
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
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border dark:border-white/10 flex flex-wrap justify-between items-center gap-3 bg-surface-container-lowest dark:bg-black/20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePurgeAll}
                disabled={isPurgingAll}
                className="px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPurgingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Purge All Orphaned Queues
              </button>
              {onCreateService && (
                <button
                  type="button"
                  onClick={onCreateService}
                  className="px-3 py-2 text-primary font-medium text-xs hover:bg-primary/10 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Service
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onComplete}
                className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
              >
                {services.length === 0 ? 'Dismiss' : 'Later'}
              </button>
              {services.length > 0 && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSubmitting || unlinkedQueues.some(q => !selectedServiceMap[q.id])}
                  className="px-5 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-container disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save & Continue'
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <ConfirmModal
        isOpen={!!queueToDelete}
        onClose={() => setQueueToDelete(null)}
        onConfirm={confirmDeleteSingleQueue}
        title="Delete Queue"
        description={`Are you sure you want to permanently delete the queue "${queueToDelete?.name}"?`}
        confirmText="Delete Queue"
        variant="danger"
        isLoading={!!deletingQueueId}
      />

      <ConfirmModal
        isOpen={showPurgeConfirm}
        onClose={() => setShowPurgeConfirm(false)}
        onConfirm={confirmPurgeAll}
        title="Purge All Orphaned Queues"
        description={`Are you sure you want to delete all ${unlinkedQueues.length} orphaned queues? This action cannot be undone.`}
        confirmText="Purge All Queues"
        variant="danger"
        isLoading={isPurgingAll}
      />
    </AnimatePresence>
  );
}
