import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import { Plus, X, Loader2, MapPin, Store } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';

export default function LocationsList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationAddress, setNewLocationAddress] = useState('');

  const queryClient = useQueryClient();

  const { data: locations = [], isLoading, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
  });

  const createLocationMutation = useMutation({
    mutationFn: (data: { name: string; address?: string }) =>
      fetchApi('/location', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      setIsModalOpen(false);
      setNewLocationName('');
      setNewLocationAddress('');
      refetch();
      toast.success('Location created successfully');
    },
    onError: () => toast.error('Error creating location'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;

    createLocationMutation.mutate({ 
      name: newLocationName, 
      address: newLocationAddress 
    });
  };

  return (
    <AdminLayout pageTitle="Locations & Services" pageSubtitle="Manage your business locations">
      <Head>
        <title>Manage Locations | Qmova</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium tracking-wider uppercase mb-1">Manage Locations</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Locations & Services</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] border border-indigo-500/50"
            >
              <Plus className="w-5 h-5" />
              Add Location
            </button>
          </div>
        </div>

        {/* Locations List */}
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
          
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {isLoading && <div className="p-8 text-center text-gray-500 dark:text-zinc-500">Loading locations...</div>}
            
            {locations.map((loc: any) => (
              <div key={loc.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <Store className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{loc.name}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    {loc.address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {loc.address}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {loc.services?.length || 0}
                      </span>
                      Services Available
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors border border-white/5">
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Location Modal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Location</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Location Name</label>
                <input 
                  type="text" 
                  autoFocus
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="e.g. Main Branch, Downtown Office"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Address (Optional)</label>
                <input 
                  type="text"
                  value={newLocationAddress}
                  onChange={(e) => setNewLocationAddress(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="123 Commerce St"
                />
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
                  disabled={createLocationMutation.isPending || !newLocationName.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50"
                >
                  {createLocationMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createLocationMutation.isPending ? 'Adding...' : 'Add Location'}
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
