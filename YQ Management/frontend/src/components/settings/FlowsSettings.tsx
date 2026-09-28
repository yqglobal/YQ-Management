import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { Workflow, Settings, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function FlowsSettings() {
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');

  // Fetch all services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
  });

  // Fetch the flow for the selected service (if not 'all')
  const { data: flow, isLoading: flowLoading } = useQuery({
    queryKey: ['service-flow', selectedServiceId],
    queryFn: () => fetchApi(`/service-flows/by-service/${selectedServiceId}`),
    enabled: selectedServiceId !== 'all',
    retry: false
  });

  // Fetch available templates
  const { data: templates = [] } = useQuery({
    queryKey: ['service-flow-templates'],
    queryFn: () => fetchApi('/service-flows/templates/list'),
  });

  const applyTemplateMutation = useMutation({
    mutationFn: (templateKey: string) => fetchApi(`/service-flows/templates/${templateKey}/apply?serviceId=${selectedServiceId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-flow', selectedServiceId] });
      toast.success('Blueprint flow applied successfully!');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to apply blueprint flow')
  });

  const deleteFlowMutation = useMutation({
    mutationFn: (flowId: string) => fetchApi(`/service-flows/${flowId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-flow', selectedServiceId] });
      toast.success('Service flow deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete flow')
  });

  return (
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-500" />
      
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Workflow className="w-5 h-5 text-indigo-500" />
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-white">Service Flows</h2>
          </div>
          <p className="text-on-surface-variant dark:text-zinc-400 font-body-sm text-body-sm">
            Manage multi-stage workflows and operations routing for your services.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-on-surface dark:text-white mb-2">Select a Service to Manage its Flow</label>
        <select 
          value={selectedServiceId} 
          onChange={e => setSelectedServiceId(e.target.value)}
          className="w-full sm:max-w-md px-4 py-2 bg-surface dark:bg-black border border-border dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
        >
          <option value="all">-- Select a Service --</option>
          {services.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedServiceId !== 'all' && (
        <div className="mt-8 border-t border-border dark:border-dark-border pt-6">
          {flowLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : flow && flow.id ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-on-surface dark:text-white">{flow.name}</h3>
                  <p className="text-sm text-on-surface-variant dark:text-zinc-400">{flow.description}</p>
                </div>
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this flow and revert to a basic queue?')) {
                      deleteFlowMutation.mutate(flow.id);
                    }
                  }}
                  className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Reset Flow
                </button>
              </div>

              <div className="space-y-3">
                {flow.steps?.sort((a: any, b: any) => a.stepOrder - b.stepOrder).map((step: any, idx: number) => (
                  <div key={step.id} className="flex items-center gap-4 p-4 border border-border dark:border-dark-border rounded-xl bg-surface-container-low dark:bg-zinc-800/30">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-on-surface dark:text-white">{step.name}</h4>
                      {step.description && <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">{step.description}</p>}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                        {step.type}
                      </span>
                      {step.isOptional && <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">Optional</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Workflow className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-on-surface dark:text-white mb-1">No Flow Configured</h3>
              <p className="text-sm text-on-surface-variant dark:text-zinc-400 max-w-md mx-auto mb-6">
                This service currently operates as a standard single-stage queue. Apply a multi-stage blueprint to enable advanced routing.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                {templates.map((tpl: any) => (
                  <button 
                    key={tpl.key}
                    onClick={() => applyTemplateMutation.mutate(tpl.key)}
                    disabled={applyTemplateMutation.isPending}
                    className="p-4 rounded-xl border border-border dark:border-dark-border hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors group flex flex-col h-full"
                  >
                    <div className="font-semibold text-on-surface dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1">
                      {tpl.name}
                    </div>
                    <div className="text-xs text-on-surface-variant dark:text-zinc-400 line-clamp-2">
                      {tpl.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
