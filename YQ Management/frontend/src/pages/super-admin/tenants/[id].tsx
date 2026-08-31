import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, CreditCard, Users, QrCode, Trash2, Activity, MapPin, Phone, Mail, Globe, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react';
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

  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['super-admin-plans', 'ACTIVE'],
    queryFn: () => fetchApi('/super-admin/plans?status=ACTIVE'),
  });

  const assignPlanMutation = useMutation({
    mutationFn: (planId: string) => fetchApi(`/super-admin/tenants/${id}/assign-plan`, { method: 'POST', body: JSON.stringify({ planId }) }),
    onSuccess: () => {
      toast.success('Plan assigned successfully');
      setShowAssignPlanModal(false);
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant', id] });
    },
    onError: () => toast.error('Failed to assign plan'),
  });

  const deleteTenantMutation = useMutation({
    mutationFn: (tenantId: string) => fetchApi(`/super-admin/tenants/${tenantId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Tenant removed');
      router.push('/super-admin/tenants');
    },
    onError: () => toast.error('Failed to remove tenant'),
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this tenant? This action cannot be undone.')) {
      deleteTenantMutation.mutate(id as string);
    }
  };

  if (isLoading) {
    return (
      <SuperAdminLayout pageTitle="Business Details" pageSubtitle="Loading...">
        <Head>
          <title>Business Details | Super Admin</title>
        </Head>
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          <div className="h-10 w-48 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
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
        <Head>
          <title>Business Not Found | Super Admin</title>
        </Head>
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 dark:text-zinc-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Business Not Found</h2>
            <p className="text-gray-500 dark:text-zinc-400 mb-4">The requested business could not be found.</p>
            <Link href="/super-admin/tenants" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Businesses
            </Link>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout pageTitle={tenant.name} pageSubtitle="Business details and management">
      <Head>
        <title>{tenant.name} | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/tenants" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 dark:text-zinc-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">{tenant.name}</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-1 font-mono text-xs">{tenant.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Activity className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Status</span>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">Active</span>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Subscription</span>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              tenant.subscriptionStatus === 'ACTIVE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400' :
              tenant.subscriptionStatus === 'TRIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' :
              'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
            }`}>{tenant.subscriptionStatus}</span>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Joined</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-white">{tenant.createdAt ? formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true }) : '-'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-500" /> Workspaces
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
              <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Subdomain</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Queues</th>
                  <th className="px-6 py-4">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {tenant.workspaces?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 dark:text-zinc-500">No workspaces found.</td>
                  </tr>
                ) : (
                  tenant.workspaces?.map((ws: any) => (
                    <tr key={ws.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{ws.name}</td>
                      <td className="px-6 py-4 font-mono text-sm text-gray-500 dark:text-zinc-400">{ws.subdomain || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          ws.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          ws.subscriptionStatus === 'TRIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' :
                          'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                        }`}>{ws.subscriptionStatus}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{ws._count?.queues || 0}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{ws._count?.transactions || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" /> Users
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
              <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {tenant.users?.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-gray-400 dark:text-zinc-500">No users found.</td>
                  </tr>
                ) : (
                  tenant.users?.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400' :
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

        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-500" /> Recent Transactions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
              <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {tenant.transactions?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400 dark:text-zinc-500">No transactions found.</td>
                  </tr>
                ) : (
                  tenant.transactions?.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{tx.currency} {tx.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'COMPLETE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          tx.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' :
                          'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {tx.status === 'COMPLETE' && <CheckCircle2 className="w-3 h-3" />}
                          {tx.status === 'PENDING' && <Clock className="w-3 h-3" />}
                          {(tx.status === 'CANCELLED' || tx.status === 'ERROR') && <XCircle className="w-3 h-3" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-zinc-400 text-sm">{tx.createdAt ? format(new Date(tx.createdAt), 'MMM d, yyyy') : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAssignPlanModal(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" /> Assign Plan
          </button>
          <button className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" /> Remove Business
          </button>
        </div>
      </div>

      {showAssignPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
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
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                This will immediately cancel any existing active or trial subscriptions and grant access to the selected plan.
              </p>
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
                  if (selectedPlanId) assignPlanMutation.mutate(selectedPlanId);
                }}
                disabled={!selectedPlanId || assignPlanMutation.isPending}
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