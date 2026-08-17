import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Copy, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SuperAdminPlans() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'standard' as string,
    price: 0,
    currency: 'ZAR',
    billingInterval: 'monthly' as string,
    trialDays: 0,
    active: true,
    sortOrder: 0,
    features: {
      textToSpeech: false,
      whatsappNotifications: false,
      customBranding: false,
      apiAccess: false,
      multiLocation: false,
      advancedAnalytics: false,
      appointmentsModule: false,
    },
    limits: {
      maxQueues: 5,
      maxTokens: 2000,
      maxLocations: 1,
      maxStaff: 5,
    },
    originalPrice: 0,
    discountPercent: 0,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['super-admin-plans'],
    queryFn: () => fetchApi('/super-admin/plans'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/super-admin/plans', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-plans'] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchApi(`/super-admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-plans'] });
      setEditingPlan(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/super-admin/plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-plans'] });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetchApi(`/super-admin/plans/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-plans'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      fetchApi(`/super-admin/plans/${id}/duplicate`, { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-plans'] });
    },
  });

  const resetForm = () => {
    setFormData({ 
      name: '', description: '', type: 'standard', price: 0, currency: 'ZAR', 
      billingInterval: 'monthly', trialDays: 0, active: true, sortOrder: 0,
      features: { textToSpeech: false, whatsappNotifications: false, customBranding: false, apiAccess: false, multiLocation: false, advancedAnalytics: false, appointmentsModule: false },
      limits: { maxQueues: 5, maxTokens: 2000, maxLocations: 1, maxStaff: 5 },
      originalPrice: 0,
      discountPercent: 0,
    });
  };

  const handleSubmit = () => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      type: plan.type || 'standard',
      price: plan.price || 0,
      currency: plan.currency || 'ZAR',
      billingInterval: plan.billingInterval || 'monthly',
      trialDays: plan.trialDays || 0,
      active: plan.active,
      sortOrder: plan.sortOrder || 0,
      features: plan.features || { textToSpeech: false, whatsappNotifications: false, customBranding: false, apiAccess: false, multiLocation: false, advancedAnalytics: false, appointmentsModule: false },
      limits: plan.limits || { maxQueues: 5, maxTokens: 2000, maxLocations: 1, maxStaff: 5 },
      originalPrice: plan.originalPrice || 0,
      discountPercent: plan.discountPercent || 0,
    });
    setShowCreateModal(true);
  };

  return (
    <SuperAdminLayout pageTitle="Plans" pageSubtitle="Manage pricing plans and features">
      <Head>
        <title>Plans | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Plans</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-2">Create and manage pricing plans for tenants</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditingPlan(null); resetForm(); setShowCreateModal(true); }}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans?.map((plan: any) => (
              <div key={plan.id} className={`bg-white dark:bg-zinc-950 rounded-2xl border p-6 transition-colors ${
                plan.active
                  ? 'border-gray-200 dark:border-white/10'
                  : 'border-gray-100 dark:border-white/5 opacity-60'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{plan.name}</h3>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{plan.description || 'No description'}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    plan.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-400'
                  }`}>
                    {plan.active ? 'Active' : 'Archived'}
                  </span>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">
                    {plan.currency} {plan.price.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-400 dark:text-zinc-500 ml-1">/ {plan.billingInterval}</span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    Trial: {plan.trialDays || 0} days
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    Type: {plan.type || 'standard'}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-white/5">
                  <button type="button" onClick={() => openEdit(plan)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 dark:text-zinc-500 transition-colors" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => duplicateMutation.mutate({ id: plan.id, name: `${plan.name} (Copy)` })} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 dark:text-zinc-500 transition-colors" title="Duplicate">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => toggleStatusMutation.mutate({ id: plan.id, status: plan.active ? 'INACTIVE' : 'ACTIVE' })} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 dark:text-zinc-500 transition-colors" title="Toggle Status">
                    {plan.active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button type="button" onClick={() => deleteMutation.mutate(plan.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div key={editingPlan?.id ?? 'new'} className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => { setShowCreateModal(false); setEditingPlan(null); resetForm(); }}>
            <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Plan Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="e.g. Pro Plan" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="Optional description" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Price (ZAR)</label>
                    <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Billing Interval</label>
                    <select value={formData.billingInterval} onChange={(e) => setFormData({ ...formData, billingInterval: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Trial Days</label>
                    <input type="number" value={formData.trialDays} onChange={(e) => setFormData({ ...formData, trialDays: Number(e.target.value) })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Type</label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Max Queues</label>
                    <input type="number" value={formData.limits.maxQueues} onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, maxQueues: Number(e.target.value) } })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Max Tokens (Per Queue)</label>
                    <input type="number" value={formData.limits.maxTokens} onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, maxTokens: Number(e.target.value) } })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Max Locations</label>
                    <input type="number" value={(formData.limits as any).maxLocations ?? 1} onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, maxLocations: Number(e.target.value) } })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Max Staff</label>
                    <input type="number" value={(formData.limits as any).maxStaff ?? 5} onChange={(e) => setFormData({ ...formData, limits: { ...formData.limits, maxStaff: Number(e.target.value) } })} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Original Price (before discount)</label>
                    <input type="number" value={(formData as any).originalPrice ?? 0} onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) } as any)} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">Discount %</label>
                    <input type="number" min="0" max="100" value={(formData as any).discountPercent ?? 0} onChange={(e) => setFormData({ ...formData, discountPercent: Number(e.target.value) } as any)} className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Features</h3>
                  
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700 dark:text-zinc-300 font-medium">Text-to-Speech Announcements</span>
                    <button 
                      type="button" 
                      role="switch" 
                      aria-checked={formData.features?.textToSpeech || false}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData({ ...formData, features: { ...formData.features, textToSpeech: !formData.features?.textToSpeech } }); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 ${formData.features?.textToSpeech ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-zinc-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.features?.textToSpeech ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700 dark:text-zinc-300 font-medium">WhatsApp Notifications</span>
                    <button 
                      type="button" 
                      role="switch" 
                      aria-checked={formData.features?.whatsappNotifications || false}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData({ ...formData, features: { ...formData.features, whatsappNotifications: !formData.features?.whatsappNotifications } }); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 ${formData.features?.whatsappNotifications ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-zinc-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.features?.whatsappNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-700 dark:text-zinc-300 font-medium">Custom Branding</span>
                    <button 
                      type="button" 
                      role="switch" 
                      aria-checked={formData.features?.customBranding || false}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData({ ...formData, features: { ...formData.features, customBranding: !formData.features?.customBranding } }); }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 ${formData.features?.customBranding ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-zinc-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.features?.customBranding ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {([
                    { key: 'apiAccess', label: 'API Access' },
                    { key: 'multiLocation', label: 'Multi-Location Support' },
                    { key: 'advancedAnalytics', label: 'Advanced Analytics' },
                    { key: 'appointmentsModule', label: 'Appointments Module' },
                  ] as Array<{ key: string; label: string }>).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-700 dark:text-zinc-300 font-medium">{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!(formData.features as any)?.[key]}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFormData({ ...formData, features: { ...formData.features, [key]: !(formData.features as any)?.[key] } }); }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 ${(formData.features as any)?.[key] ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-zinc-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(formData.features as any)?.[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button type="button" onClick={(e) => { e.stopPropagation(); setShowCreateModal(false); setEditingPlan(null); resetForm(); }} className="px-4 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleSubmit(); }} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">{editingPlan ? 'Update Plan' : 'Create Plan'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}