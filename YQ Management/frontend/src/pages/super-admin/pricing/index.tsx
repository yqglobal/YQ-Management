import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Check, X, Shield, Loader2, BarChart } from 'lucide-react';

export default function PricingHub() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Record<string, unknown> | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchApi('/billing/plans')
  });

  const savePlanMutation = useMutation({
    mutationFn: (plan: Record<string, unknown>) => {
      const url = plan.id ? `/billing/plans/${plan.id}` : '/billing/plans';
      const method = plan.id ? 'PUT' : 'POST';
      return fetchApi(url, { method, body: JSON.stringify(plan) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsEditing(false);
      setEditingPlan(null);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (plan: Record<string, unknown>) => fetchApi(`/billing/plans/${plan.id}/status`, { 
      method: 'PATCH', 
      body: JSON.stringify({ status: plan.active ? 'inactive' : 'active' }) 
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plans'] })
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this plan?')) {
      await fetchApi(`/billing/plans/${id}`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    }
  };

  const handleEdit = (plan: Record<string, unknown>) => {
    setEditingPlan({
      ...plan,
      features: plan.features || { whatsappNotifications: false, whiteLabel: false, advancedAnalytics: false },
      limits: plan.limits || { maxTokens: 500, maxQueues: 1 }
    });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setEditingPlan({
      name: '',
      description: '',
      price: 0,
      currency: 'ZAR',
      billingInterval: 'monthly',
      trialDays: 14,
      features: { whatsappNotifications: false, whiteLabel: false, advancedAnalytics: false },
      limits: { maxTokens: 500, maxQueues: 1 }
    });
    setIsEditing(true);
  };

  return (
    <SuperAdminLayout pageTitle="Pricing & Quotas" pageSubtitle="Manage SaaS plans, feature flags, and token limits.">
      <Head>
        <title>Pricing Hub | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Plans</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Configure what features tenants get and how much they pay.</p>
          </div>
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Create Plan
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(plans || []).map((plan: Record<string, unknown>) => (
              <div key={plan.id as string} className={`rounded-2xl border bg-white dark:bg-zinc-900 overflow-hidden flex flex-col ${!plan.active && 'opacity-60'}`}>
                <div className="p-6 border-b border-gray-100 dark:border-white/5 relative">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => toggleStatusMutation.mutate(plan)} className={`text-xs px-2 py-1 rounded font-bold ${plan.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                        {plan.active ? 'ACTIVE' : 'DRAFT'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 min-h-[40px]">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{plan.currency === 'ZAR' ? 'R' : '$'}{plan.price}</span>
                    <span className="text-sm text-gray-500 dark:text-zinc-400">/{plan.billingInterval}</span>
                  </div>
                </div>
                
                <div className="p-6 flex-1 bg-gray-50 dark:bg-zinc-950/50">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Quotas & Limits</h4>
                  <ul className="space-y-2 mb-6">
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">Max Queues</span>
                      <span className="font-bold text-gray-900 dark:text-white">{plan.limits?.maxQueues || 1}</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">Daily AI Tokens</span>
                      <span className="font-bold text-gray-900 dark:text-white">{plan.limits?.maxTokens || 500}</span>
                    </li>
                  </ul>

                  <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Feature Flags</h4>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm">
                      {plan.features?.whatsappNotifications ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-gray-400" />}
                      <span className={plan.features?.whatsappNotifications ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-600'}>WhatsApp Integration</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      {plan.features?.whiteLabel ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-gray-400" />}
                      <span className={plan.features?.whiteLabel ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-600'}>Remove Branding</span>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      {plan.features?.advancedAnalytics ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-gray-400" />}
                      <span className={plan.features?.advancedAnalytics ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-600'}>Advanced Analytics</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-2">
                  <button onClick={() => handleEdit(plan)} className="flex-1 flex justify-center items-center gap-2 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => handleDelete(plan.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isEditing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingPlan.id ? 'Edit Plan' : 'Create Plan'}</h2>
                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Plan Name</label>
                    <input type="text" value={editingPlan.name} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Price (Monthly)</label>
                    <input type="number" value={editingPlan.price} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Description</label>
                  <textarea value={editingPlan.description || ''} onChange={e => setEditingPlan({...editingPlan, description: e.target.value})} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white h-24 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-8 border-t border-gray-100 dark:border-white/10 pt-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><BarChart className="w-4 h-4 text-indigo-500" /> Quotas & Limits</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600 dark:text-zinc-400">Max Queues</label>
                        <input type="number" value={editingPlan.limits.maxQueues} onChange={e => setEditingPlan({...editingPlan, limits: {...editingPlan.limits, maxQueues: Number(e.target.value)}})} className="w-24 px-3 py-1 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 text-right text-gray-900 dark:text-white outline-none" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600 dark:text-zinc-400">Daily Tokens</label>
                        <input type="number" value={editingPlan.limits.maxTokens} onChange={e => setEditingPlan({...editingPlan, limits: {...editingPlan.limits, maxTokens: Number(e.target.value)}})} className="w-24 px-3 py-1 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 text-right text-gray-900 dark:text-white outline-none" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600 dark:text-zinc-400">Trial Days</label>
                        <input type="number" value={editingPlan.trialDays} onChange={e => setEditingPlan({...editingPlan, trialDays: Number(e.target.value)})} className="w-24 px-3 py-1 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 text-right text-gray-900 dark:text-white outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" /> Feature Flags</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={editingPlan.features.whatsappNotifications} onChange={e => setEditingPlan({...editingPlan, features: {...editingPlan.features, whatsappNotifications: e.target.checked}})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">WhatsApp Integration</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={editingPlan.features.whiteLabel} onChange={e => setEditingPlan({...editingPlan, features: {...editingPlan.features, whiteLabel: e.target.checked}})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">White Label (Remove Branding)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={editingPlan.features.advancedAnalytics} onChange={e => setEditingPlan({...editingPlan, features: {...editingPlan.features, advancedAnalytics: e.target.checked}})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                        <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Advanced Analytics</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-end gap-3">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-xl font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/5 transition-colors">Cancel</button>
                <button 
                  onClick={() => savePlanMutation.mutate(editingPlan)} 
                  disabled={savePlanMutation.isPending}
                  className="px-8 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {savePlanMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
