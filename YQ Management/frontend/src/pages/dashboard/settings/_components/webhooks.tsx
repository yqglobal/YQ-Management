import React, { useState } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';
import { Webhook, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { PremiumFeatureGate } from '../../../../components/PremiumFeatureGate';

export default function WebhooksSettingsPage() {
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookError, setWebhookError] = useState<string | null>(null);
  
  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => fetchApi('/webhooks'),
  });

  const addWebhookMutation = useMutation({
    mutationFn: (url: string) => fetchApi('/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url })
    }),
    onSuccess: () => {
      setWebhookUrl('');
      setWebhookError(null);
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook added successfully');
    },
    onError: (err: any) => {
      setWebhookError(err.message || 'Failed to add webhook');
      toast.error('Failed to add webhook');
    }
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/webhooks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook deleted successfully');
    },
    onError: () => toast.error('Failed to delete webhook')
  });

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookError(null);
    if (!webhookUrl) return;
    
    try {
      new URL(webhookUrl);
    } catch {
      setWebhookError('Please enter a valid URL (e.g., https://example.com/webhook)');
      return;
    }
    
    addWebhookMutation.mutate(webhookUrl);
  };

  return (
    <PremiumFeatureGate
      featureKey="apiAccess"
      featureName="Webhook Integrations"
      description="Connect external systems and automate workflows using secure webhook events."
    >
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300 group">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#d946ef]"></div>

      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-[#d946ef]" style={{ fontVariationSettings: "'FILL' 1" }}>webhook</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Developer Webhooks</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Receive real-time HTTP POST notifications for queue events.</p>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <div className="bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border rounded-2xl p-6 shadow-sm">
            <form onSubmit={handleAddWebhook} className="mb-8">
              <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider mb-2">Endpoint URL</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => {
                      setWebhookUrl(e.target.value);
                      setWebhookError(null);
                    }}
                    placeholder="https://your-api.com/webhook"
                    className={`w-full h-[44px] px-4 border rounded-lg bg-white dark:bg-black/50 text-on-surface dark:text-white font-data-mono text-[13px] outline-none shadow-sm transition-shadow ${
                      webhookError 
                        ? 'border-error focus:ring-1 focus:ring-error focus:border-error' 
                        : 'border-border dark:border-dark-border focus:ring-1 focus:ring-[#d946ef] focus:border-[#d946ef]'
                    }`}
                  />
                  {webhookError && (
                    <p className="mt-2 font-body-sm text-error flex items-center gap-1">
                      <AlertCircle strokeWidth={1.5} className="w-4 h-4" /> {webhookError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!webhookUrl || addWebhookMutation.isPending}
                  className="h-[44px] px-6 bg-[#d946ef] hover:bg-[#c026d3] text-white font-body-md font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 shadow-sm"
                >
                  {addWebhookMutation.isPending ? <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" /> : <Plus strokeWidth={1.5} className="w-4 h-4" />}
                  Add Webhook
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <h3 className="font-label-caps text-label-caps font-bold text-on-surface dark:text-white uppercase tracking-wider border-b border-border dark:border-dark-border pb-2">Active Webhooks</h3>
              
              {isLoading ? (
                <div className="py-8 flex justify-center text-outline">
                  <Loader2 strokeWidth={1.5} className="w-6 h-6 animate-spin" />
                </div>
              ) : webhooks.length === 0 ? (
                <div className="py-8 text-center bg-surface-container-lowest dark:bg-black/20 border border-border dark:border-dark-border border-dashed rounded-xl font-body-sm text-outline">
                  No webhooks configured yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((webhook: any) => (
                    <div key={webhook.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-xl gap-4 hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-data-mono text-[13px] text-on-surface dark:text-white font-semibold">{webhook.url}</span>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">Active</span>
                           <span className="text-[12px] text-outline">Added {new Date(webhook.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                        disabled={deleteWebhookMutation.isPending}
                        className="p-2 text-outline hover:text-error hover:bg-error-container rounded-lg transition-colors shrink-0"
                        title="Delete Webhook"
                      >
                        <Trash2 strokeWidth={1.5} className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      </div>
    </PremiumFeatureGate>
  );
}
