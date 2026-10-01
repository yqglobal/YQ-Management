import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { Plus, MoreVertical, Copy, Edit2, Trash2, Workflow, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function JourneysIndex() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ['service-flows'],
    queryFn: () => fetchApi('/service-flows'),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      // Create the underlying Service first
      const service = await fetchApi('/service', {
        method: 'POST',
        body: JSON.stringify({ 
          name: data.name,
          description: data.description || '',
          allowAppointments: true
        }),
      });

      // Create the ServiceFlow linked to the new Service
      const flow = await fetchApi('/service-flows', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          serviceId: service.id
        }),
      });
      return flow;
    },
    onSuccess: (data) => {
      toast.success('Journey created successfully');
      router.push(`/dashboard/journeys/${data.id}`);
    },
    onError: () => toast.error('Failed to create journey'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/service-flows/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Journey deleted');
      queryClient.invalidateQueries({ queryKey: ['service-flows'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/service-flows/${id}/duplicate`, { method: 'POST' }),
    onSuccess: (data) => {
      toast.success('Journey duplicated');
      queryClient.invalidateQueries({ queryKey: ['service-flows'] });
      router.push(`/dashboard/journeys/${data.id}`);
    },
  });

  const handleCreateNew = () => {
    const name = prompt('Enter a name for the new journey (e.g. "Onboarding Process"):');
    if (!name) return;
    
    // Create unlinked to start
    createMutation.mutate({ name });
  };

  const getServiceForFlow = (serviceId: string) => {
    return services.find((s: any) => s.id === serviceId);
  };

  return (
    <AdminLayout pageTitle="Journey Builder" pageSubtitle="Design multi-step service execution flows">
      <Head>
        <title>Journey Builder | Qmova</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-white flex items-center gap-2">
              <Workflow className="w-6 h-6 text-emerald-500" />
              Service Journeys
            </h1>
            <p className="text-on-surface-variant dark:text-zinc-400 mt-1">
              Design and manage step-by-step processes for your customers.
            </p>
          </div>
          <button 
            onClick={handleCreateNew}
            disabled={createMutation.isPending}
            className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Journey
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : flows.length === 0 ? (
          <div className="text-center py-20 bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-3xl">
            <Workflow className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-on-surface dark:text-white mb-2">No Journeys Yet</h3>
            <p className="text-on-surface-variant dark:text-zinc-400 mb-6 max-w-sm mx-auto">
              A journey defines the stages a customer goes through, like intake, testing, and checkout.
            </p>
            <button 
              onClick={handleCreateNew}
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-6 py-2 rounded-lg font-semibold hover:bg-emerald-500/20 transition-colors"
            >
              Build Your First Journey
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flows.map((flow: any) => {
              const service = getServiceForFlow(flow.serviceId);
              const isDraft = !flow.serviceId;
              
              return (
                <div key={flow.id} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl p-5 group hover:border-emerald-500/40 transition-colors flex flex-col relative overflow-hidden">
                  
                  {isDraft && (
                    <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                      Draft / Unlinked
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-on-surface dark:text-white truncate pr-4 text-lg">
                      {flow.name}
                    </h3>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => router.push(`/dashboard/journeys/${flow.id}`)}
                        className="p-1.5 text-on-surface-variant hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Edit Journey"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Duplicate this journey?')) duplicateMutation.mutate(flow.id);
                        }}
                        className="p-1.5 text-on-surface-variant hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm('Delete this journey? This cannot be undone.')) deleteMutation.mutate(flow.id);
                        }}
                        className="p-1.5 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-on-surface-variant dark:text-zinc-400 line-clamp-2 mb-4 min-h-[40px]">
                    {flow.description || 'No description provided.'}
                  </p>

                  <div className="mt-auto pt-4 border-t border-border dark:border-dark-border/50">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="bg-surface-variant dark:bg-zinc-800 px-2.5 py-1 rounded-md text-on-surface dark:text-white">
                          {flow.steps?.length || 0} Stages
                        </span>
                        {!flow.isActive && (
                          <span className="text-zinc-500 dark:text-zinc-400">Inactive</span>
                        )}
                      </div>
                      
                      {service ? (
                        <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[120px] bg-emerald-500/10 px-2.5 py-1 rounded-md">
                          {service.name}
                        </span>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-500 flex items-center gap-1 bg-yellow-500/10 px-2.5 py-1 rounded-md">
                          <AlertTriangle className="w-3 h-3" /> Unlinked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
