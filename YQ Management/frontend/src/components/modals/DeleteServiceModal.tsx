import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, ArrowRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface DeleteServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: any;
  services: any[];
}

export function DeleteServiceModal({ isOpen, onClose, service, services }: DeleteServiceModalProps) {
  const queryClient = useQueryClient();
  const [strategy, setStrategy] = useState<'reassign' | 'delete_all'>('reassign');
  const [reassignToId, setReassignToId] = useState<string>('');
  const [keepHistory, setKeepHistory] = useState<boolean>(true);

  const availableServices = services.filter(s => s.id !== service?.id);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      let url = `/service/${service.id}?strategy=${strategy}`;
      if (strategy === 'reassign' && reassignToId) {
        url += `&reassignToId=${reassignToId}`;
      } else if (strategy === 'delete_all') {
        url += `&keepHistory=${keepHistory}`;
      }
      return fetchApi(url, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      toast.success('Service deleted successfully');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete service');
    }
  });

  if (!isOpen || !service) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-border dark:border-white/10">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-on-surface dark:text-white">Delete Service: {service.name}</h2>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-2">
              This service may have queues and workflows linked to it. Please select how you want to handle them.
            </p>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${strategy === 'reassign' ? 'border-primary bg-primary/5' : 'border-border dark:border-zinc-800'}`}>
                <input 
                  type="radio" 
                  name="strategy" 
                  value="reassign"
                  checked={strategy === 'reassign'} 
                  onChange={() => setStrategy('reassign')}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-sm text-on-surface dark:text-white">Reassign Queues & Workflows</p>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">Keep the linked queues and workflows, but move them to a different service.</p>
                </div>
              </label>

              {strategy === 'reassign' && (
                <div className="pl-8">
                  <select
                    value={reassignToId}
                    onChange={(e) => setReassignToId(e.target.value)}
                    className="w-full bg-surface-container-low dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="" disabled>Select target service...</option>
                    {availableServices.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${strategy === 'delete_all' ? 'border-red-500 bg-red-500/5' : 'border-border dark:border-zinc-800'}`}>
                <input 
                  type="radio" 
                  name="strategy" 
                  value="delete_all"
                  checked={strategy === 'delete_all'} 
                  onChange={() => setStrategy('delete_all')}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-sm text-red-500">Delete Everything</p>
                  <p className="text-xs text-red-500/80 mt-1">Permanently delete this service and all its linked queues and workflows.</p>
                </div>
              </label>

              {strategy === 'delete_all' && (
                <div className="pl-8 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={keepHistory} 
                      onChange={(e) => setKeepHistory(e.target.checked)} 
                    />
                    <span className="text-sm text-on-surface dark:text-zinc-300">Keep historical analytics data (Visits, Appointments)</span>
                  </label>
                  {!keepHistory && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Warning: Historical analytics data will be permanently lost!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-border dark:border-white/10 flex justify-end gap-3 bg-surface-container-lowest dark:bg-black/20">
            <button
              onClick={onClose}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending || (strategy === 'reassign' && !reassignToId)}
              className={`px-5 py-2 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 ${strategy === 'delete_all' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-container'}`}
            >
              {deleteMutation.isPending ? 'Processing...' : (strategy === 'delete_all' ? 'Delete All' : 'Reassign & Delete')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
