import React from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function SuperAdminSubscriptions() {
  const { data: data, isLoading } = useQuery({
    queryKey: ['super-admin-subscriptions'],
    queryFn: () => fetchApi('/super-admin/subscriptions'),
  });

  const getStatusBadge = (status: string) => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';
    switch (status) {
      case 'ACTIVE': return `${base} bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20`;
      case 'TRIAL': return `${base} bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20`;
      case 'PAST_DUE': return `${base} bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20`;
      case 'CANCELLED': return `${base} bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20`;
      case 'PENDING_PAYMENT': return `${base} bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20`;
      default: return `${base} bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20`;
    }
  };

  const subscriptions = data?.subscriptions || [];
  const metrics = data?.metrics || {};

  return (
    <SuperAdminLayout pageTitle="Subscriptions" pageSubtitle="Manage tenant subscriptions and billing">
      <Head>
        <title>Subscriptions | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Subscriptions</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">Overview of all tenant subscriptions</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: metrics.total || subscriptions.length, color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Active', value: metrics.active || subscriptions.filter((s: any) => s.status === 'ACTIVE').length, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'On Trial', value: metrics.trial || subscriptions.filter((s: any) => s.status === 'TRIAL').length, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Past Due', value: metrics.pastDue || subscriptions.filter((s: any) => s.status === 'PAST_DUE').length, color: 'text-red-600 dark:text-red-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-zinc-950 rounded-xl p-4 border border-gray-200 dark:border-white/10">
              <p className="text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Subscriptions Table */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
              <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4">Tenant</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Billing</th>
                  <th className="px-6 py-4">Next Billing</th>
                  <th className="px-6 py-4">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-zinc-500">Loading...</td>
                  </tr>
                ) : subscriptions?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-zinc-500">No subscriptions found.</td>
                  </tr>
                ) : (
                  subscriptions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        {sub.tenant?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white text-sm">
                        {sub.plan?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(sub.status)}>{sub.status}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {sub.billingInterval || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                        {sub.nextBillingDate ? format(new Date(sub.nextBillingDate), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-zinc-400">
                        {sub.createdAt
                          ? formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}