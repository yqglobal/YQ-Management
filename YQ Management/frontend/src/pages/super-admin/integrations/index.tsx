import React from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { Settings, Server, Globe, Key } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';

export default function SuperAdminIntegrations() {
  const { data: globalIntegrations, isLoading } = useQuery({
    queryKey: ['super-admin-global-integrations'],
    queryFn: () => fetchApi('/super-admin/integrations'),
    retry: false // It might not exist on backend yet
  });

  return (
    <SuperAdminLayout pageTitle="Integrations Hub" pageSubtitle="Global configurations for third-party services">
      <Head>
        <title>Integrations Hub | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Integrations Hub</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">Manage global configurations for WhatsApp, Twilio, Stripe, and other third-party services.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg">
                <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">WhatsApp Global API</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Manage the global Baileys instance settings and server connectivity for WhatsApp.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Server URL</label>
                <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white" value="http://localhost:3000" disabled />
              </div>
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">Test Connection</button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 rounded-2xl p-6 border border-zinc-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Stripe Webhooks</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Global webhook configurations for Stripe billing and subscriptions.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Webhook Secret</label>
                <input type="password" className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white" value="********" disabled />
              </div>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Rotate Secret</button>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
