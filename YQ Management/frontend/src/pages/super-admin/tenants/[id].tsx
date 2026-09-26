import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, CreditCard, Users, Trash2, Activity, Globe, AlertCircle, Clock, 
  CheckCircle2, XCircle, Settings, Store, Building2, MapPin, Check, X, ShieldAlert 
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

export default function SuperAdminTenantDetail() {
  const router = useRouter();
  const { id } = router.query;

  const queryClient = useQueryClient();
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['super-admin-tenant', id],
    queryFn: () => fetchApi(`/super-admin/tenants/${id}`),
    enabled: !!id,
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscription' | 'settings'>((router.query.tab as any) || 'overview');
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingInterval, setBillingInterval] = useState('MONTHLY');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isFree, setIsFree] = useState(false);
  
  // Settings edit state
  const [editForm, setEditForm] = useState({
    name: '',
    subdomain: '',
    supportEmail: '',
    supportPhone: '',
    whatsappConnected: false,
    chatbotEnabled: false,
    enableSmartReviews: false,
    autonomousEnabled: false,
  });

  React.useEffect(() => {
    if (tenant) {
      setEditForm({
        name: tenant.name || '',
        subdomain: tenant.subdomain || '',
        supportEmail: tenant.supportEmail || '',
        supportPhone: tenant.supportPhone || '',
        whatsappConnected: !!tenant.whatsappConnected,
        chatbotEnabled: !!tenant.chatbotEnabled,
        enableSmartReviews: !!tenant.enableSmartReviews,
        autonomousEnabled: !!tenant.autonomousEnabled,
      });
    }
  }, [tenant]);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['super-admin-plans', 'ACTIVE'],
    queryFn: () => fetchApi('/super-admin/plans?status=ACTIVE'),
  });

  const assignPlanMutation = useMutation({
    mutationFn: (data: { planId: string; billingInterval: string; customEndDate: string; isFree: boolean }) => 
      fetchApi(`/super-admin/tenants/${id}/assign-plan`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success('Plan assigned successfully');
      setShowAssignPlanModal(false);
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant', id] });
    },
    onError: () => toast.error('Failed to assign plan'),
  });

  const cancelPlanMutation = useMutation({
    mutationFn: () => fetchApi(`/super-admin/tenants/${id}/cancel-plan`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Plan cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant', id] });
    },
    onError: () => toast.error('Failed to cancel plan'),
  });

  const deleteTenantMutation = useMutation({
    mutationFn: (tenantId: string) => fetchApi(`/super-admin/tenants/${tenantId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Business removed');
      router.push('/super-admin/tenants');
    },
    onError: () => toast.error('Failed to remove business'),
  });

  const updateTenantMutation = useMutation({
    mutationFn: (data: any) => fetchApi(`/super-admin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant', id] });
    },
    onError: () => toast.error('Failed to update settings'),
  });

  const handleCancelPlan = () => {
    if (confirm("Are you sure you want to cancel this tenant's active plan?")) {
      cancelPlanMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this tenant? ALL their data will be deleted immediately. This action CANNOT be undone.')) {
      deleteTenantMutation.mutate(id as string);
    }
  };

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenantMutation.mutate(editForm);
  };

  const handleImpersonate = async () => {
    if (!tenant.users || tenant.users.length === 0) {
      toast.error('No users found for this tenant to impersonate.');
      return;
    }
    // Simple impersonation for demo (in reality, backend should return an auth token for this user)
    // We would POST to /super-admin/impersonate
    toast.info('Impersonation API not yet wired up. This requires a token exchange.');
  };

  if (isLoading) {
    return (
      <SuperAdminLayout pageTitle="Business Details" pageSubtitle="Loading...">
        <Head><title>Business Details | Super Admin</title></Head>
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          <div className="h-10 w-48 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 animate-pulse" />
            ))}
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (!tenant) {
    return (
      <SuperAdminLayout pageTitle="Business Not Found" pageSubtitle="The requested business does not exist">
        <Head><title>Business Not Found | Super Admin</title></Head>
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 dark:text-zinc-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Business Not Found</h2>
            <Link href="/super-admin/tenants" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Businesses
            </Link>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout pageTitle={tenant.name} pageSubtitle="Advanced business management and telemetry">
      <Head>
        <title>{tenant.name} | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/super-admin/tenants" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 dark:text-zinc-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">{tenant.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  tenant.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                  tenant.subscriptionStatus === 'TRIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' :
                  'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400'
                }`}>
                  {tenant.subscriptionStatus}
                </span>
              </div>
              <p className="text-gray-500 dark:text-zinc-400 mt-1 font-mono text-xs flex items-center gap-2">
                ID: {tenant.id} <span className="text-gray-300 dark:text-zinc-700">•</span> Subdomain: {tenant.subdomain}.qmova.com
              </p>
            </div>
          </div>
          <button 
            onClick={handleImpersonate}
            className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-medium transition-transform active:scale-95 shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" /> Login as Business
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200 dark:border-white/10 mt-8 mb-6 overflow-x-auto no-scrollbar">
          {(['overview', 'users', 'subscription', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold capitalize transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              {tab === 'settings' && <Settings className="w-4 h-4" />}
              {tab === 'users' && <Users className="w-4 h-4" />}
              {tab === 'subscription' && <CreditCard className="w-4 h-4" />}
              {tab === 'overview' && <Activity className="w-4 h-4" />}
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Customers', val: tenant._count?.customers || 0, color: 'text-blue-500' },
                { label: 'Total Visits', val: tenant._count?.visits || 0, color: 'text-emerald-500' },
                { label: 'Active Queues', val: tenant._count?.queues || 0, color: 'text-indigo-500' },
                { label: 'Services', val: tenant._count?.services || 0, color: 'text-purple-500' },
                { label: 'Staff Members', val: tenant._count?.staffMembers || 0, color: 'text-amber-500' },
                { label: 'Appointments', val: tenant._count?.appointments || 0, color: 'text-rose-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{stat.label}</div>
                  <div className={`text-3xl font-black ${stat.color}`}>{stat.val.toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-500" /> Physical Locations
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
                  <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="px-6 py-4">Location Name</th>
                      <th className="px-6 py-4">Address</th>
                      <th className="px-6 py-4">Timezone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {tenant.locations?.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-400 dark:text-zinc-500">No locations configured.</td>
                      </tr>
                    ) : (
                      tenant.locations?.map((loc: any) => (
                        <tr key={loc.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            <Store className="w-4 h-4 text-gray-400" /> {loc.name}
                          </td>
                          <td className="px-6 py-4 text-gray-500">{loc.address || 'No address provided'}</td>
                          <td className="px-6 py-4 font-mono text-xs">{loc.timezone}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-6 bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/10 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-rose-900 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Danger Zone
                </h3>
                <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">Permanently remove this business and all associated data.</p>
              </div>
              <button className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-transform active:scale-95 shadow-sm" onClick={handleDelete}>
                Delete Tenant
              </button>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" /> System Users
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
                  <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="px-6 py-4">User ID</th>
                      <th className="px-6 py-4">Email Address</th>
                      <th className="px-6 py-4">Access Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {tenant.users?.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-400 dark:text-zinc-500">No users found.</td>
                      </tr>
                    ) : (
                      tenant.users?.map((user: any) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-gray-500">{user.id}</td>
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400' :
                              user.role === 'OWNER' ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400' :
                              user.role === 'TENANT_ADMIN' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400' :
                              user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-400'
                            }`}>{user.role.replace('_', ' ')}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-500" /> Subscription & Invoicing
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAssignPlanModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    Force Assign Plan
                  </button>
                  {(tenant.subscriptionStatus === 'ACTIVE' || tenant.subscriptionStatus === 'TRIAL') && (
                    <button 
                      onClick={handleCancelPlan}
                      disabled={cancelPlanMutation.isPending}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                    >
                      Revoke Access
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
                  <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="px-6 py-4">Transaction ID</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date processed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {tenant.transactions?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 dark:text-zinc-500">No payment history found.</td>
                      </tr>
                    ) : (
                      tenant.transactions?.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-gray-500">{tx.id}</td>
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                            {tx.currency} {tx.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tx.status === 'COMPLETE' || tx.status === 'SUCCEEDED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                              tx.status === 'PENDING' || tx.status === 'PROCESSING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' :
                              'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400'
                            }`}>
                              {(tx.status === 'COMPLETE' || tx.status === 'SUCCEEDED') && <CheckCircle2 className="w-3 h-3" />}
                              {(tx.status === 'PENDING' || tx.status === 'PROCESSING') && <Clock className="w-3 h-3" />}
                              {(tx.status === 'CANCELLED' || tx.status === 'FAILED' || tx.status === 'ERROR') && <XCircle className="w-3 h-3" />}
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 text-sm">{tx.createdAt ? format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a') : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <form onSubmit={handleUpdateSettings} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-indigo-500" /> Platform Overrides & Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Business Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Subdomain Route</label>
                  <div className="flex">
                    <input
                      type="text"
                      required
                      value={editForm.subdomain}
                      onChange={(e) => setEditForm(prev => ({ ...prev, subdomain: e.target.value }))}
                      className="w-full h-11 px-4 rounded-l-xl border border-r-0 border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <div className="h-11 px-4 flex items-center bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-r-xl text-gray-500 dark:text-zinc-400 font-mono text-sm">
                      .qmova.com
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Support Email (Public)</label>
                  <input
                    type="email"
                    value={editForm.supportEmail}
                    onChange={(e) => setEditForm(prev => ({ ...prev, supportEmail: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={editForm.supportPhone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, supportPhone: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <h3 className="text-md font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-2 mb-4">Feature Toggles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {[
                  { id: 'whatsappConnected', label: 'WhatsApp Core Connected', desc: 'Is the Evolution API session paired?' },
                  { id: 'chatbotEnabled', label: 'AI Chatbot Auto-Replies', desc: 'Is the WhatsApp bot currently active and responding?' },
                  { id: 'enableSmartReviews', label: 'Smart Google Reviews', desc: 'Are automated NPS & Google review routing enabled?' },
                  { id: 'autonomousEnabled', label: 'Fully Autonomous Mode', desc: 'Allows AI agents to take actions on behalf of staff' },
                ].map((toggle) => (
                  <label key={toggle.id} className="flex items-start gap-3 p-4 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={editForm[toggle.id as keyof typeof editForm] as boolean}
                        onChange={(e) => setEditForm(prev => ({ ...prev, [toggle.id]: e.target.checked }))}
                        className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">{toggle.label}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{toggle.desc}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-white/10">
                <button 
                  type="submit"
                  disabled={updateTenantMutation.isPending}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-sm transition-transform active:scale-95 flex items-center gap-2"
                >
                  {updateTenantMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {showAssignPlanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assign Plan</h2>
              <button onClick={() => setShowAssignPlanModal(false)} className="p-2 text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Select Plan</label>
              {plansLoading ? (
                <div className="h-12 bg-gray-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">-- Choose a plan --</option>
                  {plans?.map((plan: any) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.currency} {plan.price})
                    </option>
                  ))}
                </select>
              )}
              
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mt-4">Billing Interval</label>
              <select
                value={billingInterval}
                onChange={(e) => setBillingInterval(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
                <option value="CUSTOM">Custom Expiry</option>
              </select>

              {billingInterval === 'CUSTOM' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Custom Expiry Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none mt-1"
                  />
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFreeToggle"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="isFreeToggle" className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Grant for Free (Do not bill this tenant)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowAssignPlanModal(false)} 
                className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (selectedPlanId) assignPlanMutation.mutate({ planId: selectedPlanId, billingInterval, customEndDate, isFree });
                }}
                disabled={!selectedPlanId || assignPlanMutation.isPending || (billingInterval === 'CUSTOM' && !customEndDate)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                {assignPlanMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}