import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Check, X, Shield, Loader2, BarChart } from 'lucide-react';

interface PlanFeature {
  whatsappNotifications?: boolean;
  whatsappChat?: boolean;
  whatsappChatbot?: boolean;
  customBranding?: boolean;
  multiLocation?: boolean;
  advancedAnalytics?: boolean;
  appointmentsModule?: boolean;
  apiAccess?: boolean;
  textToSpeech?: boolean;
  [key: string]: boolean | undefined;
}

const ALL_FEATURES = [
  { id: 'whatsappNotifications', label: 'WhatsApp Notifications' },
  { id: 'whatsappChat', label: 'WhatsApp Live Chat' },
  { id: 'whatsappChatbot', label: 'AI WhatsApp Chatbot' },
  { id: 'customBranding', label: 'Custom Branding' },
  { id: 'multiLocation', label: 'Multi-Location' },
  { id: 'advancedAnalytics', label: 'Advanced Analytics' },
  { id: 'appointmentsModule', label: 'Appointments Module' },
  { id: 'apiAccess', label: 'API & Webhooks' },
  { id: 'textToSpeech', label: 'TV Text-to-Speech' },
];

interface PlanLimit {
  maxTokens: number;
  maxServices: number;
  maxLocations: number;
  maxStaff: number;
}

export interface PlanData {
  id?: string;
  name: string;
  description: string;
  price: number;
  annualPrice: number;
  currency: string;
  billingInterval: string;
  trialDays: number;
  features: PlanFeature;
  limits: PlanLimit;
  active?: boolean;
  type?: string;
  sortOrder?: number;
}

export default function PricingHub() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanData | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => fetchApi('/billing/plans')
  });

  const savePlanMutation = useMutation({
    mutationFn: (plan: PlanData) => {
      const url = plan.id ? `/billing/plans/${plan.id}` : '/billing/plans';
      const method = plan.id ? 'PUT' : 'POST';
      
      const payload = {
        name: plan.name,
        description: plan.description,
        type: plan.type,
        billingInterval: plan.billingInterval?.toUpperCase() || 'MONTHLY',
        price: plan.price,
        annualPrice: plan.annualPrice,
        currency: plan.currency,
        trialDays: plan.trialDays,
        features: plan.features,
        limits: plan.limits,
        sortOrder: plan.sortOrder,
      };

      return fetchApi(url, { method, body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setIsEditing(false);
      setEditingPlan(null);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (plan: PlanData) => fetchApi(`/billing/plans/${plan.id}/status`, { 
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

  const handleEdit = (plan: PlanData) => {
    const defaultLimits = { maxTokens: 500, maxServices: 1, maxLocations: 1, maxStaff: 1 };
    setEditingPlan({
      ...plan,
      features: plan.features || {},
      limits: { ...defaultLimits, ...(plan.limits || {}) }
    });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setEditingPlan({
      name: '',
      description: '',
      price: 0,
      annualPrice: 0,
      currency: 'ZAR',
      billingInterval: 'MONTHLY',
      trialDays: 14,
      features: {},
      limits: { maxTokens: 500, maxServices: 1, maxLocations: 1, maxStaff: 1 }
    });
    setIsEditing(true);
  };

  return (
    <SuperAdminLayout pageTitle="Pricing & Quotas" pageSubtitle="Manage SaaS plans, feature flags, and token limits.">
      <Head>
        <title>Pricing Hub | Super Admin</title>
      </Head>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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
            {(plans || []).map((plan: PlanData) => (
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
                  <div className="mt-4 flex flex-col gap-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900 dark:text-white">{plan.currency === 'ZAR' ? 'R' : '$'}{(plan.price / 100).toFixed(2)}</span>
                      <span className="text-sm text-gray-500 dark:text-zinc-400">/mo</span>
                    </div>
                    {plan.annualPrice > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">
                          {plan.currency === 'ZAR' ? 'R' : '$'}{(plan.annualPrice / 100).toFixed(2)} /yr
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full font-bold">
                          {Math.round(((plan.price * 12 - plan.annualPrice) / (plan.price * 12)) * 100)}% OFF
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-6 flex-1 bg-gray-50 dark:bg-zinc-950/50">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Quotas & Limits</h4>
                  <ul className="space-y-2 mb-6">
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">Max Services</span>
                      <span className="font-bold text-gray-900 dark:text-white">{plan.limits?.maxServices || 1}</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">Max Locations</span>
                      <span className="font-bold text-gray-900 dark:text-white">{plan.limits?.maxLocations || 1}</span>
                    </li>
                    <li className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-zinc-400">Daily AI Tokens</span>
                      <span className="font-bold text-gray-900 dark:text-white">{plan.limits?.maxTokens || 500}</span>
                    </li>
                  </ul>

                  <h4 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Feature Flags</h4>
                  <ul className="space-y-3">
                    {ALL_FEATURES.map(feat => (
                      <li key={feat.id} className="flex items-center gap-3 text-sm">
                        {plan.features?.[feat.id] ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-gray-400" />}
                        <span className={plan.features?.[feat.id] ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-600'}>{feat.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-2">
                  <button onClick={() => handleEdit(plan)} className="flex-1 flex justify-center items-center gap-2 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => handleDelete(plan.id!)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingPlan?.id ? 'Edit Plan' : 'Create Plan'}</h2>
                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Plan Name</label>
                    <input type="text" value={editingPlan?.name} onChange={e => setEditingPlan({...editingPlan as PlanData, name: e.target.value})} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Monthly Price</label>
                    <input type="number" value={editingPlan?.price ? editingPlan.price / 100 : 0} onChange={e => setEditingPlan({...editingPlan as PlanData, price: Math.round(Number(e.target.value) * 100)})} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Yearly Price</label>
                    <input type="number" value={editingPlan?.annualPrice ? editingPlan.annualPrice / 100 : 0} onChange={e => setEditingPlan({...editingPlan as PlanData, annualPrice: Math.round(Number(e.target.value) * 100)})} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-zinc-300">Description</label>
                  <textarea value={editingPlan?.description || ''} onChange={e => setEditingPlan({...editingPlan as PlanData, description: e.target.value})} className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white h-24 resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-8 border-t border-gray-100 dark:border-white/10 pt-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><BarChart className="w-4 h-4 text-indigo-500" /> Quotas & Limits</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600 dark:text-zinc-400">Max Services</label>
                        <input type="number" value={editingPlan?.limits.maxServices || 1} onChange={e => setEditingPlan({...editingPlan as PlanData, limits: {...editingPlan?.limits as any, maxServices: Number(e.target.value)}})} className="w-24 px-3 py-1 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 text-right text-gray-900 dark:text-white outline-none" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600 dark:text-zinc-400">Max Locations</label>
                        <input type="number" value={editingPlan?.limits.maxLocations || 1} onChange={e => setEditingPlan({...editingPlan as PlanData, limits: {...editingPlan?.limits as any, maxLocations: Number(e.target.value)}})} className="w-24 px-3 py-1 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 text-right text-gray-900 dark:text-white outline-none" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600 dark:text-zinc-400">Max Staff</label>
                        <input type="number" value={editingPlan?.limits.maxStaff || 1} onChange={e => setEditingPlan({...editingPlan as PlanData, limits: {...editingPlan?.limits as any, maxStaff: Number(e.target.value)}})} className="w-24 px-3 py-1 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 text-right text-gray-900 dark:text-white outline-none" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600 dark:text-zinc-400">Daily Tokens</label>
                        <input type="number" value={editingPlan?.limits.maxTokens} onChange={e => setEditingPlan({...editingPlan as PlanData, limits: {...editingPlan?.limits as any, maxTokens: Number(e.target.value)}})} className="w-24 px-3 py-1 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 text-right text-gray-900 dark:text-white outline-none" />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-gray-600 dark:text-zinc-400">Trial Days</label>
                        <input type="number" value={editingPlan?.trialDays} onChange={e => setEditingPlan({...editingPlan as PlanData, trialDays: Number(e.target.value)})} className="w-24 px-3 py-1 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 text-right text-gray-900 dark:text-white outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" /> Feature Flags</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ALL_FEATURES.map(feat => (
                        <label key={feat.id} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                          <input 
                            type="checkbox" 
                            checked={!!editingPlan?.features?.[feat.id]} 
                            onChange={e => setEditingPlan({...editingPlan as PlanData, features: {...(editingPlan?.features || {}), [feat.id]: e.target.checked}})} 
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" 
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{feat.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-end gap-3">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-xl font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-white/5 transition-colors">Cancel</button>
                <button 
                  onClick={() => savePlanMutation.mutate(editingPlan as PlanData)} 
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
