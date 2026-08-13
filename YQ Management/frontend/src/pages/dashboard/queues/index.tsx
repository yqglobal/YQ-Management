import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import { Plus, X, Loader2, ListOrdered, Settings2, PlayCircle, PauseCircle, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';

import { useRouter } from 'next/router';

export default function QueuesList() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  const { data: queues = [], isLoading, refetch } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue'),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/locations'),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/services'),
  });

  const createQueueMutation = useMutation({
    mutationFn: (data: { name: string, locationId?: string, serviceIds?: string[] }) =>
      fetchApi('/queue', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      setIsModalOpen(false);
      setNewQueueName('');
      setSelectedLocationId('');
      setSelectedServiceIds([]);
      refetch();
      toast.success('Queue created successfully');
    },
    onError: () => toast.error('Error creating queue'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueueName.trim()) return;

    createQueueMutation.mutate({ 
      name: newQueueName,
      locationId: selectedLocationId || undefined,
      serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined
    });
  };

  const handleServiceToggle = (id: string) => {
    setSelectedServiceIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20"><PlayCircle className="w-3 h-3" /> Active</span>;
      case 'PAUSED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-500/20"><PauseCircle className="w-3 h-3" /> Paused</span>;
      case 'CLOSED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider border border-gray-200 dark:border-white/10"><CheckCircle2 className="w-3 h-3" /> Closed</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider">{status}</span>;
    }
  }

  return (
    <AdminLayout pageTitle="Queues" pageSubtitle="Manage your virtual and physical queues">
      <Head>
        <title>Manage Queues | Qmova</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium tracking-wider uppercase mb-1">Manage Queues</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Queues</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-500/50"
            >
              <Plus className="w-5 h-5" />
              Create Queue
            </button>
          </div>
        </div>

        {/* Queues List */}
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
          
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {isLoading && <div className="p-8 text-center text-gray-500 dark:text-zinc-500">Loading queues...</div>}
            
            {!isLoading && queues.length === 0 && (
              <div className="p-12 text-center text-gray-500 dark:text-zinc-400">
                <ListOrdered className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No queues found</p>
                <p className="text-sm">Create your first queue to start managing customers.</p>
              </div>
            )}

            {queues.map((queue: any) => (
              <div key={queue.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <ListOrdered className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{queue.name}</h3>
                    {getStatusBadge(queue.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {queue.services?.length || 0}
                      </span>
                      Linked Services
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => router.push(`/dashboard/queues/${queue.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors border border-white/5"
                  >
                    <Settings2 className="w-4 h-4" />
                    Settings
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Queue Modal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Queue</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Queue Name</label>
                <input 
                  type="text" 
                  autoFocus
                  value={newQueueName}
                  onChange={(e) => setNewQueueName(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Walk-ins, VIP Queue, General Consult"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Primary Location (Optional)</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                >
                  <option value="">No specific location</option>
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Supported Services</label>
                <div className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                  {services.length === 0 ? (
                    <p className="text-sm text-gray-500 p-2">No services found. Create some in Settings first.</p>
                  ) : (
                    services.map((service: any) => (
                      <label key={service.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedServiceIds.includes(service.id)}
                          onChange={() => handleServiceToggle(service.id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{service.name}</span>
                        <span className="text-xs text-gray-500 ml-auto">{service.estimatedDuration} mins</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-white/10">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createQueueMutation.isPending || !newQueueName.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50"
                >
                  {createQueueMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createQueueMutation.isPending ? 'Creating...' : 'Create Queue'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </AdminLayout>
  );
}
