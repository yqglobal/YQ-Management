import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Download, CheckCircle2, Trash2, Loader2, Layers, MapPin, Users, Calendar, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, getBackendUrl, AuthStorage } from '../../lib/api';
import { toast } from 'sonner';

interface DeleteLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: any;
}

export function DeleteLocationModal({ isOpen, onClose, location }: DeleteLocationModalProps) {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');
  const [deleteQueues, setDeleteQueues] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [hasDownloadedBackup, setHasDownloadedBackup] = useState(false);

  // Fetch real-time deletion impact
  const { data: impact, isLoading: isImpactLoading } = useQuery({
    queryKey: ['location-deletion-impact', location?.id],
    queryFn: () => fetchApi(`/location/${location.id}/deletion-impact`),
    enabled: isOpen && !!location?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return fetchApi(`/location/${location.id}?deleteQueues=${deleteQueues}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      toast.success(`Location "${location.name}" and associated records deleted`);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete location');
    },
  });

  const handleDownloadBackup = async () => {
    if (!location?.id) return;
    setIsExporting(true);
    try {
      const token = AuthStorage.get();
      const res = await fetch(`${getBackendUrl()}/location/${location.id}/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to generate export archive');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = location.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `location_${safeName}_backup_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setHasDownloadedBackup(true);
      toast.success('Complete data backup downloaded (.ZIP)');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download backup');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !location) return null;

  const isConfirmed = confirmText.trim().toUpperCase() === 'DELETE';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-xl bg-card dark:bg-zinc-900 border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-border dark:border-white/10 bg-red-500/5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 border border-red-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded-full">
                  Destructive Action
                </span>
              </div>
              <h2 className="text-xl font-bold text-on-surface dark:text-white mt-1 truncate">
                Delete Location: {location.name}
              </h2>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                Deleting this location permanently removes its physical configuration. Review the impact analysis and save a backup below before continuing.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto min-h-0 flex-1">
            {/* Impact Analysis Grid */}
            <div>
              <h3 className="text-xs font-bold text-outline uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Deletion Impact Breakdown
              </h3>

              {isImpactLoading ? (
                <div className="p-6 rounded-xl bg-surface-container-low dark:bg-zinc-800/50 border border-border flex items-center justify-center gap-2 text-sm text-outline">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Calculating affected resources...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-surface-container-low dark:bg-zinc-800/60 rounded-xl border border-border/80 flex flex-col">
                    <span className="text-[11px] text-outline font-medium">Services</span>
                    <span className="text-lg font-bold font-mono text-on-surface dark:text-white mt-0.5">
                      {impact?.counts?.services || 0}
                    </span>
                    <span className="text-[10px] text-outline mt-auto pt-1">Will be deleted</span>
                  </div>

                  <div className="p-3 bg-surface-container-low dark:bg-zinc-800/60 rounded-xl border border-border/80 flex flex-col">
                    <span className="text-[11px] text-outline font-medium">Queues</span>
                    <span className="text-lg font-bold font-mono text-on-surface dark:text-white mt-0.5">
                      {impact?.counts?.queues || 0}
                    </span>
                    <span className="text-[10px] text-outline mt-auto pt-1">
                      {impact?.counts?.exclusiveQueues || 0} dedicated
                    </span>
                  </div>

                  <div className="p-3 bg-surface-container-low dark:bg-zinc-800/60 rounded-xl border border-border/80 flex flex-col">
                    <span className="text-[11px] text-outline font-medium">Active Visits</span>
                    <span className={`text-lg font-bold font-mono mt-0.5 ${(impact?.counts?.activeVisits || 0) > 0 ? 'text-amber-500' : 'text-on-surface dark:text-white'}`}>
                      {impact?.counts?.activeVisits || 0}
                    </span>
                    <span className="text-[10px] text-outline mt-auto pt-1">In progress</span>
                  </div>

                  <div className="p-3 bg-surface-container-low dark:bg-zinc-800/60 rounded-xl border border-border/80 flex flex-col">
                    <span className="text-[11px] text-outline font-medium">Total Records</span>
                    <span className="text-lg font-bold font-mono text-on-surface dark:text-white mt-0.5">
                      {(impact?.counts?.totalVisits || 0) + (impact?.counts?.totalAppointments || 0)}
                    </span>
                    <span className="text-[10px] text-outline mt-auto pt-1">Visits & bookings</span>
                  </div>
                </div>
              )}

              {/* Warnings if active visits/services exist */}
              {((impact?.counts?.services || 0) > 0 || (impact?.counts?.queues || 0) > 0) && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">
                      This location has {impact?.counts?.services} services and {impact?.counts?.queues} linked queues.
                    </p>
                    {impact?.services && impact.services.length > 0 && (
                      <p className="text-[11px] opacity-90">
                        Services: {impact.services.map((s: any) => s.name).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Data Backup Section */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.06] flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface dark:text-white">
                      Export Complete Data Backup (.ZIP)
                    </h4>
                    <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Preserve full records, customer visits, appointments, settings, and queue metrics as JSON & CSV files before deleting.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Archiving...
                    </>
                  ) : hasDownloadedBackup ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      Downloaded
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Download Backup
                    </>
                  )}
                </button>
              </div>

              {hasDownloadedBackup && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Backup downloaded to your computer. Records safely archived.</span>
                </div>
              )}
            </div>

            {/* Queue Cleanup Option */}
            <div className="p-3.5 bg-surface-container-low dark:bg-zinc-800/40 rounded-xl border border-border">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteQueues}
                  onChange={(e) => setDeleteQueues(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-700 text-primary focus:ring-primary w-4 h-4"
                />
                <div className="flex flex-col text-xs">
                  <span className="font-bold text-on-surface dark:text-white">
                    Cleanly delete queues dedicated to this location
                  </span>
                  <span className="text-outline text-[11px] mt-0.5">
                    Recommended. Automatically cleans up dedicated desks so orphaned unlinked queues don&apos;t trigger the Link Queues modal.
                  </span>
                </div>
              </label>
            </div>

            {/* Confirmation typing area */}
            <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl flex flex-col gap-2">
              <div className="text-xs text-red-800 dark:text-red-300 font-semibold flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-red-500 shrink-0" />
                <span>Type <strong>DELETE</strong> below to confirm permanent deletion:</span>
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full bg-card dark:bg-zinc-900 border border-red-500/40 rounded-lg p-2 text-xs font-mono font-bold text-red-600 dark:text-red-300 outline-none uppercase focus:ring-2 focus:ring-red-500/50"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-border dark:border-white/10 flex items-center justify-end gap-3 bg-surface-container-lowest dark:bg-black/20">
            <button
              type="button"
              onClick={onClose}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending || !isConfirmed}
              onClick={() => deleteMutation.mutate()}
              className="px-5 py-2 text-white text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Deleting Location...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Location Permanently
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
