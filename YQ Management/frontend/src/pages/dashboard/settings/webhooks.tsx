import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { Webhook, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';

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
    <SettingsLayout pageTitle="Webhooks" pageSubtitle="Manage real-time notifications for external systems">
      <Head>
        <title>Webhooks | Qmova</title>
      </Head>

      <div className="space-y-8 max-w-4xl">
        <section>


          <div className="bg-gray-50/50 dark:bg-zinc-800/20 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
            <p className="text-gray-600 dark:text-zinc-400 mb-6">
              Webhooks allow you to receive real-time HTTP POST notifications when events happen in your queues.
            </p>

            <form onSubmit={handleAddWebhook} className="mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Endpoint URL</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => {
                      setWebhookUrl(e.target.value);
                      setWebhookError(null);
                    }}
                    placeholder="https://your-api.com/webhook"
                    className={`w-full px-4 py-2 border rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:outline-none transition-shadow ${
                      webhookError 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : 'border-gray-300 dark:border-zinc-700 focus:ring-purple-500 focus:border-purple-500'
                    }`}
                  />
                  {webhookError && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> {webhookError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!webhookUrl || addWebhookMutation.isPending}
                  className="px-6 py-2 h-[42px] bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {addWebhookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Webhook
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Active Webhooks</h3>
              
              {isLoading ? (
                <div className="py-4 text-center text-gray-500">Loading webhooks...</div>
              ) : webhooks.length === 0 ? (
                <div className="py-8 text-center bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 border-dashed rounded-xl text-gray-500 dark:text-zinc-500">
                  No webhooks configured yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((webhook: any) => (
                    <div key={webhook.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
                      <div className="flex flex-col">
                        <span className="font-mono text-sm text-gray-900 dark:text-white font-medium">{webhook.url}</span>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                           <span className="text-xs text-gray-400">Added {new Date(webhook.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                        disabled={deleteWebhookMutation.isPending}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Webhook"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </SettingsLayout>
  );
}
