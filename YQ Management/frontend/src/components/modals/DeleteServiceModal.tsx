import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Download, Loader2, CheckCircle2, ShieldAlert, Layers } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, getBackendUrl, AuthStorage } from '../../lib/api';
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
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [hasExported, setHasExported] = useState<boolean>(false);

  const availableServices = services.filter(s => s.id !== service?.id);

  // Fetch real-time deletion impact
  const { data: impact, isLoading: isImpactLoading } = useQuery({
    queryKey: ['service-deletion-impact', service?.id],
    queryFn: async () => {
      if (!service?.id) return null;
      return fetchApi(`/service/${service.id}/deletion-impact`);
    },
    enabled: isOpen && !!service?.id
  });

  const handleDownloadBackup = async () => {
    if (!service?.id) return;
    setIsExporting(true);
    try {
      const response = await fetchApi(`/service/${service.id}/export`, {
        headers: { Accept: 'application/zip' }
      });
      // fetchApi handles JSON, but if response is raw or blob, let's use standard fetch if needed
      // Actually fetchApi parses json if content-type is json. Let's do a direct authenticated fetch for binary:
      const token = AuthStorage.get();
      const directRes = await fetch(`${getBackendUrl()}/service/${service.id}/export`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!directRes.ok) {
        throw new Error('Failed to generate export archive');
      }

      const blob = await directRes.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `service-backup-${service.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setHasExported(true);
      toast.success('Service backup archive (.ZIP) downloaded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download service backup');
    } finally {
      setIsExporting(false);
    }
  };

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

  const isDeleteConfirmed = strategy === 'reassign' 
    ? Boolean(reassignToId)
    : confirmInput.trim().toUpperCase() === 'DELETE';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-xl bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-border dark:border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-on-surface dark:text-white">Delete Service: {service.name}</h2>
                <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
                  Review dependencies, backup data, and choose how to handle queues and workflows.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Impact Details */}
            {isImpactLoading ? (
              <div className="p-4 rounded-xl bg-surface-container-low dark:bg-zinc-800/40 border border-border dark:border-zinc-800 flex items-center justify-center gap-2 text-sm text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Calculating dependency impact...
              </div>
            ) : impact ? (
              <div className="p-4 rounded-xl bg-surface-container-low dark:bg-zinc-800/40 border border-border dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  <span>Dependency Impact</span>
                  <span className="text-[11px] text-zinc-500">{service.location?.name || 'Assigned Location'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-surface dark:bg-zinc-900 rounded-lg border border-border dark:border-zinc-800">
                    <p className="text-lg font-bold text-on-surface dark:text-white">{impact.exclusiveQueuesCount}</p>
                    <p className="text-[11px] text-on-surface-variant">Dedicated Queues</p>
                  </div>
                  <div className="p-2.5 bg-surface dark:bg-zinc-900 rounded-lg border border-border dark:border-zinc-800">
                    <p className="text-lg font-bold text-on-surface dark:text-white">{impact.sharedQueuesCount}</p>
                    <p className="text-[11px] text-on-surface-variant">Shared Queues</p>
                  </div>
                  <div className="p-2.5 bg-surface dark:bg-zinc-900 rounded-lg border border-border dark:border-zinc-800">
                    <p className="text-lg font-bold text-amber-500">{impact.activeVisitsCount}</p>
                    <p className="text-[11px] text-on-surface-variant">Active Visits</p>
                  </div>
                  <div className="p-2.5 bg-surface dark:bg-zinc-900 rounded-lg border border-border dark:border-zinc-800">
                    <p className="text-lg font-bold text-on-surface dark:text-white">{impact.appointmentsCount}</p>
                    <p className="text-[11px] text-on-surface-variant">Appointments</p>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400">
                  {impact.exclusiveQueuesCount > 0
                    ? `⚠️ ${impact.exclusiveQueuesCount} queue(s) only belong to this service. They will be deleted with it.`
                    : 'No exclusive queues will be lost.'}
                  {impact.sharedQueuesCount > 0 && ` ${impact.sharedQueuesCount} shared queue(s) will be unlinked safely.`}
                </p>
              </div>
            ) : null}

            {/* Backup / Export Section */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-on-surface dark:text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" />
                  Save Data: Export Complete Service Backup
                </p>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                  Downloads a .ZIP containing all service settings, queues, visits, and appointments in both CSV and JSON formats.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isExporting}
                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shrink-0 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating ZIP...
                  </>
                ) : hasExported ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Downloaded ZIP
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    Download Backup (.ZIP)
                  </>
                )}
              </button>
            </div>

            {/* Deletion Strategy Radios */}
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
                <div className="flex-1">
                  <p className="font-semibold text-sm text-on-surface dark:text-white">Reassign Queues & Workflows</p>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">Keep linked queues and workflows, but move them to a different service.</p>
                  {strategy === 'reassign' && (
                    <div className="mt-3">
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
                </div>
              </label>

              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${strategy === 'delete_all' ? 'border-red-500 bg-red-500/5' : 'border-border dark:border-zinc-800'}`}>
                <input 
                  type="radio" 
                  name="strategy" 
                  value="delete_all" 
                  checked={strategy === 'delete_all'} 
                  onChange={() => setStrategy('delete_all')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-red-500">Delete Everything</p>
                  <p className="text-xs text-red-500/80 mt-1">
                    Permanently delete this service and its dedicated queues. Shared queues will be unlinked safely.
                  </p>

                  {strategy === 'delete_all' && (
                    <div className="mt-3 space-y-3 pt-2 border-t border-red-500/10">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={keepHistory} 
                          onChange={(e) => setKeepHistory(e.target.checked)} 
                        />
                        <span className="text-xs text-on-surface dark:text-zinc-300">Keep historical analytics data (Visits, Appointments)</span>
                      </label>
                      {!keepHistory && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Warning: Historical analytics data will be permanently deleted!
                        </p>
                      )}

                      {/* Confirm Typing Area */}
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-red-600 dark:text-red-400 mb-1.5">
                          Type <span className="font-bold underline">DELETE</span> below to confirm permanent deletion:
                        </label>
                        <input
                          type="text"
                          value={confirmInput}
                          onChange={(e) => setConfirmInput(e.target.value)}
                          placeholder="DELETE"
                          className="w-full bg-surface dark:bg-zinc-800 border border-red-300 dark:border-red-800/60 rounded-lg px-3 py-2 text-sm text-on-surface dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
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
              disabled={deleteMutation.isPending || !isDeleteConfirmed}
              className={`px-5 py-2 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 ${strategy === 'delete_all' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-container'}`}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : strategy === 'delete_all' ? (
                'Delete Service & Dedicated Queues'
              ) : (
                'Reassign & Delete'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
