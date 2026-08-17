import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, MoreVertical, Search, Users, QrCode, ArrowUpRight, Trash2, CreditCard, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SuperAdminTenants() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'joined' | 'name' | 'queues' | 'users'>('joined');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showActions, setShowActions] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['super-admin-tenants', search],
    queryFn: () => fetchApi(`/super-admin/tenants?search=${encodeURIComponent(search)}`),
  });

  const deleteTenantMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/super-admin/tenants/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      toast.success('Tenant removed');
    },
    onError: () => toast.error('Failed to remove tenant'),
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this tenant? This action cannot be undone.')) {
      deleteTenantMutation.mutate(id);
    }
  };

  const filteredAndSortedTenants = (tenants || [])
    .filter((t: any) => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'ACTIVE') return t.subscriptionStatus === 'ACTIVE';
      if (statusFilter === 'TRIAL') return !t.subscriptionStatus || t.subscriptionStatus === 'TRIAL';
      return t.subscriptionStatus === statusFilter;
    })
    .sort((a: any, b: any) => {
      let valA, valB;
      if (sortBy === 'name') {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else if (sortBy === 'queues') {
        valA = a._count?.queues || 0;
        valB = b._count?.queues || 0;
      } else if (sortBy === 'users') {
        valA = a._count?.users || 0;
        valB = b._count?.users || 0;
      } else {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

  return (
    <SuperAdminLayout pageTitle="Businesses" pageSubtitle="Manage all tenants and subscriptions">
      <Head>
        <title>Businesses | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6 pb-24" onClick={() => setShowActions(null)}>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Businesses</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">Manage all tenants and subscriptions on the platform.</p>
        </div>

        {/* Control Bar: Full width, compact height */}
        <div className="w-full bg-white dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-xl p-3 px-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition-all">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search businesses by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 dark:text-zinc-500 hidden sm:inline" />
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:inline">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-zinc-200 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border-l border-gray-200 dark:border-white/10 pl-3">
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-zinc-200 text-xs font-medium rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="joined">Joined Date</option>
                <option value="name">Business Name</option>
                <option value="queues">Queues Count</option>
                <option value="users">Users Count</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-300 transition-colors"
                title={sortOrder === 'asc' ? 'Ascending Order' : 'Descending Order'}
              >
                {sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />}
                <span className="uppercase">{sortOrder}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Business List Table */}
        <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-visible">
          <div className="overflow-x-auto sm:overflow-visible">
            <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
              <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10 rounded-t-2xl">
                <tr>
                  <th className="px-6 py-4">Business</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Subscription</th>
                  <th className="px-6 py-4">Users</th>
                  <th className="px-6 py-4">Queues</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-zinc-500">Loading businesses...</td>
                  </tr>
                ) : filteredAndSortedTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-zinc-500">No businesses match the current filter and search criteria.</td>
                  </tr>
                ) : (
                  filteredAndSortedTenants.map((tenant: any) => {
                    const isMenuOpen = showActions === tenant.id;
                    return (
                      <tr
                        key={tenant.id}
                        className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group ${
                          isMenuOpen ? 'relative z-[100]' : 'relative'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                          {tenant.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tenant.subscriptionStatus === 'ACTIVE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400' :
                            tenant.subscriptionStatus === 'TRIAL' || !tenant.subscriptionStatus ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' :
                            'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400'
                          }`}>
                            {tenant.subscriptionStatus || 'TRIAL'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                          {tenant._count?.users || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                          {tenant._count?.queues || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-zinc-300 font-medium">
                          {tenant.createdAt ? format(new Date(tenant.createdAt), 'MMM d, yyyy • h:mm a') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right relative">
                          <div className="inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowActions(isMenuOpen ? null : tenant.id);
                              }}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"
                              title="More Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {isMenuOpen && (
                              <div className="absolute right-6 mt-1 w-48 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-2xl py-1 z-[999] ring-1 ring-black/5 text-left">
                                <Link
                                  href={`/super-admin/tenants/${tenant.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5"
                                  onClick={() => setShowActions(null)}
                                >
                                  <ArrowUpRight className="w-4 h-4 text-indigo-500" /> View Details
                                </Link>
                                <button
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 w-full text-left"
                                  onClick={() => { router.push('/super-admin/plans'); setShowActions(null); }}
                                >
                                  <CreditCard className="w-4 h-4 text-emerald-500" /> Assign Plan
                                </button>
                                <button
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 w-full text-left"
                                  onClick={() => { router.push(`/super-admin/tenants/${tenant.id}`); setShowActions(null); }}
                                >
                                  <QrCode className="w-4 h-4 text-blue-500" /> Manage Workspace
                                </button>
                                <hr className="my-1 border-gray-100 dark:border-white/5" />
                                <button
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 w-full text-left"
                                  onClick={() => { handleDelete(tenant.id); setShowActions(null); }}
                                >
                                  <Trash2 className="w-4 h-4" /> Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
