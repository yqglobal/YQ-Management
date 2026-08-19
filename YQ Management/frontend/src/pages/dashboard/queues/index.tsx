import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import { Plus, X, Loader2, ListOrdered, Settings2, PlayCircle, PauseCircle, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlan } from '../../../hooks/usePlan';
import { QuotaExhaustedModal } from '../../../components/QuotaExhaustedModal';
import Link from 'next/link';
import { ServiceModal } from '../../../components/modals/ServiceModal';
import { LinkServicesModal } from '../../../components/modals/LinkServicesModal';

export default function QueuesList() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [linkModalQueue, setLinkModalQueue] = useState<any>(null);
  const [newQueueName, setNewQueueName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const queryClient = useQueryClient();
  const plan = usePlan();

  const { data: queues = [], isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue'),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
  });

  const createQueueMutation = useMutation({
    mutationFn: (data: { name: string; locationId?: string; serviceIds?: string[] }) =>
      fetchApi('/queue', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      setIsModalOpen(false);
      setNewQueueName('');
      setSelectedLocationId('');
      setSelectedServiceIds([]);
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      toast.success('Queue created successfully');
    },
    onError: () => toast.error('Error creating queue'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueueName.trim() || selectedServiceIds.length === 0) {
      toast.error('Please select at least one service');
      return;
    }
    createQueueMutation.mutate({
      name: newQueueName,
      locationId: selectedLocationId || undefined,
      serviceIds: selectedServiceIds,
    });
  };

  const handleServiceToggle = (id: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20">
            <PlayCircle strokeWidth={1.5} className="w-3 h-3" /> Active
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-500/20">
            <PauseCircle strokeWidth={1.5} className="w-3 h-3" /> Paused
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-zinc-300 text-xs font-bold uppercase tracking-wider border border-border dark:border-white/10">
            <CheckCircle2 strokeWidth={1.5} className="w-3 h-3" /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container dark:bg-white/10 text-on-surface-variant text-xs font-bold uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  return (
    <AdminLayout pageTitle="Queues">
      <Head>
        <title>Queues | Qmova</title>
      </Head>

      <div className="max-w-5xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-white tracking-tight">Queues</h1>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-0.5">Manage your virtual and physical queues</p>
          </div>
          <button
            onClick={() => plan.isAtQueueLimit ? setShowQuotaModal(true) : setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl font-semibold transition-all shadow-sm border border-primary/20 hover:-translate-y-0.5 w-fit"
          >
            <Plus strokeWidth={1.5} className="w-5 h-5" />
            Create Queue
          </button>
        </div>

        {/* List */}
        <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
          {isLoading && (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-surface-container-low dark:bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && queues.length === 0 && (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface-container-low dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <ListOrdered strokeWidth={1.5} className="w-8 h-8 text-on-surface-variant opacity-50" />
              </div>
              <p className="text-lg font-semibold text-on-surface dark:text-white mb-1">No queues yet</p>
              <p className="text-sm text-on-surface-variant dark:text-zinc-400 max-w-sm">
                Create your first queue to start managing visitor flow.
              </p>
              <button
                onClick={() => plan.isAtQueueLimit ? setShowQuotaModal(true) : setIsModalOpen(true)}
                className="mt-6 flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-container transition-colors"
              >
                <Plus strokeWidth={1.5} className="w-4 h-4" /> Create Queue
              </button>
            </div>
          )}

          {!isLoading && queues.length > 0 && (
            <div className="divide-y divide-border dark:divide-dark-border">
              {queues.map((queue: any, i: number) => (
                <div
                  key={queue.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                      <ListOrdered strokeWidth={1.5} className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-on-surface dark:text-white">{queue.name}</h3>
                        {getStatusBadge(queue.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-on-surface-variant dark:text-zinc-400">
                        <span>{queue.services?.length || 0} linked service{(queue.services?.length || 0) !== 1 ? 's' : ''}</span>
                        {queue.location?.name && <span>· {queue.location.name}</span>}
                        {queue._count && typeof queue._count.tokens === 'number' && (
                          <span className="font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                            {queue._count.tokens} active tokens
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {queue.services?.length === 0 && (
                      <button
                        onClick={() => setLinkModalQueue(queue)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Plus strokeWidth={1.5} className="w-4 h-4" />
                        Link Services
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/dashboard/queues/${queue.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-surface-container-low dark:bg-white/5 border border-border dark:border-dark-border hover:bg-surface-container dark:hover:bg-white/10 text-on-surface dark:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Settings2 strokeWidth={1.5} className="w-4 h-4" />
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Queue Modal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border">
              <h2 className="text-xl font-bold text-on-surface dark:text-white">Create New Queue</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-surface-container-low dark:hover:bg-white/10 rounded-full transition-colors text-on-surface-variant"
              >
                <X strokeWidth={1.5} className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-on-surface dark:text-white mb-2">Queue Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newQueueName}
                  onChange={(e) => setNewQueueName(e.target.value)}
                  className="w-full bg-canvas dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-3 text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-on-surface-variant"
                  placeholder="e.g. Walk-ins, VIP Queue, General Consult"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface dark:text-white mb-2">Primary Location <span className="text-on-surface-variant font-normal">(optional)</span></label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-canvas dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-3 text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                  <option value="">No specific location</option>
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface dark:text-white mb-2">Supported Services <span className="text-red-500">*</span></label>
                <div className="bg-surface-container-low dark:bg-black/30 border border-border dark:border-dark-border rounded-xl p-3 max-h-44 overflow-y-auto space-y-1">
                  {services.length === 0 ? (
                    <div className="p-4 text-center flex flex-col items-center">
                       <p className="text-sm text-on-surface-variant mb-3">You need to create a service before creating a queue.</p>
                       <button
                         type="button"
                         onClick={() => { setIsModalOpen(false); setIsServiceModalOpen(true); }}
                         className="text-primary font-medium hover:underline focus:outline-none"
                       >
                         Create a Service
                       </button>
                    </div>
                  ) : (
                    services.map((service: any) => (
                      <label key={service.id} className="flex items-center gap-3 p-2 hover:bg-surface-container dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedServiceIds.includes(service.id)}
                          onChange={() => handleServiceToggle(service.id)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary dark:border-dark-border dark:bg-dark-canvas"
                        />
                        <span className="text-sm font-medium text-on-surface dark:text-white">{service.name}</span>
                        <span className="text-xs text-on-surface-variant ml-auto">{service.expectedDuration || 30} mins</span>
                      </label>
                    ))
                  )}
                </div>
              </div>



              <div className="pt-4 flex justify-end gap-3 border-t border-border dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-white/5 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createQueueMutation.isPending || !newQueueName.trim() || selectedServiceIds.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {createQueueMutation.isPending && <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" />}
                  {createQueueMutation.isPending ? 'Creating...' : 'Create Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showQuotaModal && (
        <QuotaExhaustedModal
          type="queues"
          isOpen={showQuotaModal}
          onClose={() => setShowQuotaModal(false)}
          usage={plan.usage.queues}
          limit={plan.limits.maxQueues}
          planName={plan.planName}
        />
      )}

      <LinkServicesModal
        isOpen={!!linkModalQueue}
        onClose={() => setLinkModalQueue(null)}
        queue={linkModalQueue}
      />

      <ServiceModal 
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
      />
    </AdminLayout>
  );
}
