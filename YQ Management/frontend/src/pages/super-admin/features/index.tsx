import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Check, X, Loader2, ToggleLeft, ToggleRight, Hash, Infinity } from 'lucide-react';
import { toast } from 'sonner';

// Canonical feature definitions
const FEATURE_DEFINITIONS = [
  { key: 'whatsappNotifications', label: 'WhatsApp Notifications', description: 'Send queue status updates via WhatsApp', icon: 'chat_bubble', color: 'bg-emerald-500' },
  { key: 'whatsappChat', label: 'WhatsApp Chat', description: '2-way chat with customers via WhatsApp', icon: 'forum', color: 'bg-emerald-600' },
  { key: 'whatsappChatbot', label: 'WhatsApp Chatbot', description: 'AI-powered WhatsApp self-service', icon: 'smart_toy', color: 'bg-emerald-700' },
  { key: 'textToSpeech', label: 'Text-to-Speech Announcements', description: 'Audio announcements on TV display', icon: 'volume_up', color: 'bg-blue-500' },
  { key: 'customBranding', label: 'Custom Branding', description: 'Custom logo, colors, and domain', icon: 'palette', color: 'bg-purple-500' },
  { key: 'apiAccess', label: 'API Access', description: 'REST API and webhooks integration', icon: 'api', color: 'bg-amber-500' },
  { key: 'multiLocation', label: 'Multi-Location', description: 'Manage multiple branch locations', icon: 'location_on', color: 'bg-indigo-500' },
  { key: 'advancedAnalytics', label: 'Advanced Analytics', description: 'Detailed reports and data exports', icon: 'analytics', color: 'bg-cyan-500' },
  { key: 'appointmentsModule', label: 'Appointments Module', description: 'Booking calendar and scheduling', icon: 'event', color: 'bg-rose-500' },
];

// Limit keys that have numeric values
const LIMIT_DEFINITIONS = [
  { key: 'maxQueues', label: 'Max Queues', icon: 'queue' },
  { key: 'maxTokens', label: 'Max Tokens / Queue / Day', icon: 'confirmation_number' },
  { key: 'maxLocations', label: 'Max Locations', icon: 'location_on' },
  { key: 'maxStaff', label: 'Max Staff Members', icon: 'group' },
];

function Toggle({ enabled, onToggle, loading }: { enabled: boolean; onToggle: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-zinc-700'} ${loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin absolute left-1/2 -translate-x-1/2 text-white" />
      ) : (
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      )}
    </button>
  );
}

export default function SuperAdminFeatures() {
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['super-admin-plans'],
    queryFn: () => fetchApi('/super-admin/plans'),
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi(`/super-admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-plans'] });
      setSavingKey(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update plan');
      setSavingKey(null);
    },
  });

  const toggleFeature = (plan: any, featureKey: string) => {
    const currentFeatures = plan.features || {};
    const newVal = !currentFeatures[featureKey];
    setSavingKey(`${plan.id}-${featureKey}`);
    updatePlanMutation.mutate({
      id: plan.id,
      data: { ...plan, features: { ...currentFeatures, [featureKey]: newVal } },
    });
    toast.promise(
      Promise.resolve(),
      { success: `${featureKey} ${newVal ? 'enabled' : 'disabled'} for ${plan.name}` }
    );
  };

  const updateLimit = (plan: any, limitKey: string, value: number | null) => {
    const currentLimits = plan.limits || {};
    setSavingKey(`${plan.id}-${limitKey}`);
    updatePlanMutation.mutate({
      id: plan.id,
      data: { ...plan, limits: { ...currentLimits, [limitKey]: value } },
    });
  };

  const activePlans = (plans as any[]).filter((p: any) => p.active);

  return (
    <SuperAdminLayout pageTitle="Features" pageSubtitle="Control which features are available on each plan">
      <Head>
        <title>Features | Super Admin</title>
      </Head>

      <div className="max-w-7xl mx-auto space-y-10 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Layers className="w-6 h-6 text-indigo-500" />
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Features</h1>
            </div>
            <p className="text-gray-500 dark:text-zinc-400 mt-1">Toggle feature access per plan. Changes apply immediately to all tenants on that plan.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : activePlans.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No active plans found. Create plans first.</div>
        ) : (
          <>
            {/* ── Feature Toggles Matrix ── */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Feature Access</h2>
                <p className="text-sm text-gray-400 dark:text-zinc-500 mt-0.5">Toggle to enable or disable features per plan</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5">
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider w-72">Feature</th>
                      {activePlans.map((plan: any) => (
                        <th key={plan.id} className="px-6 py-4 text-center min-w-[120px]">
                          <div className="font-bold text-gray-900 dark:text-white text-sm">{plan.name}</div>
                          <div className="text-xs text-gray-400 dark:text-zinc-500">{plan.currency} {plan.price?.toFixed(0)}/{plan.billingInterval?.slice(0,1)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {FEATURE_DEFINITIONS.map((feat) => (
                      <tr key={feat.key} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${feat.color}/10 flex items-center justify-center shrink-0`}>
                              <span className={`material-symbols-outlined text-[16px] ${feat.color.replace('bg-', 'text-')}`}>{feat.icon}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-gray-900 dark:text-white">{feat.label}</p>
                              <p className="text-xs text-gray-400 dark:text-zinc-500">{feat.description}</p>
                            </div>
                          </div>
                        </td>
                        {activePlans.map((plan: any) => {
                          const enabled = !!(plan.features || {})[feat.key];
                          const loading = savingKey === `${plan.id}-${feat.key}` && updatePlanMutation.isPending;
                          return (
                            <td key={plan.id} className="px-6 py-4 text-center">
                              <div className="flex justify-center">
                                <Toggle enabled={enabled} onToggle={() => toggleFeature(plan, feat.key)} loading={loading} />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Usage Limits Matrix ── */}
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Usage Limits</h2>
                <p className="text-sm text-gray-400 dark:text-zinc-500 mt-0.5">Set numeric limits per plan. Use 0 for unlimited.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5">
                      <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider w-72">Limit</th>
                      {activePlans.map((plan: any) => (
                        <th key={plan.id} className="px-6 py-4 text-center min-w-[140px]">
                          <div className="font-bold text-gray-900 dark:text-white text-sm">{plan.name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                    {LIMIT_DEFINITIONS.map((lim) => (
                      <tr key={lim.key} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[18px] text-gray-400 dark:text-zinc-500">{lim.icon}</span>
                            <p className="font-semibold text-sm text-gray-900 dark:text-white">{lim.label}</p>
                          </div>
                        </td>
                        {activePlans.map((plan: any) => {
                          const val = (plan.limits || {})[lim.key];
                          const isUnlimited = val === 0 || val === null || val === undefined;
                          const loading = savingKey === `${plan.id}-${lim.key}` && updatePlanMutation.isPending;
                          return (
                            <td key={plan.id} className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <input
                                  type="number"
                                  defaultValue={isUnlimited ? '' : val}
                                  placeholder="0 = unlimited"
                                  min={0}
                                  className="w-28 text-center bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg py-1.5 px-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                  onBlur={(e) => {
                                    const newVal = parseInt(e.target.value) || 0;
                                    if (newVal !== (val || 0)) {
                                      updateLimit(plan, lim.key, newVal);
                                      toast.success(`${lim.label} updated for ${plan.name}`);
                                    }
                                  }}
                                />
                                {isUnlimited && (
                                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[12px]">all_inclusive</span> Unlimited
                                  </span>
                                )}
                                {loading && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}
