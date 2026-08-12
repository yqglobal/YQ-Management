import React from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { fetchApi } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { Building2, CreditCard, Users, Activity, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['super-admin-metrics'],
    queryFn: () => fetchApi('/super-admin/metrics')
  });

  const stats = [
    { name: 'Total Businesses', value: metrics?.totalTenants || 0, icon: Building2, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' },
    { name: 'Active Queues', value: metrics?.activeQueues || 0, icon: Activity, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
    { name: 'Total Customers Served', value: metrics?.totalCustomersServed || 0, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' },
    { name: 'Total Revenue (ZAR)', value: `R${metrics?.totalRevenue || 0}`, icon: CreditCard, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
  ];

  return (
    <SuperAdminLayout pageTitle="Overview" pageSubtitle="Platform-wide metrics and quick actions">
      <Head>
        <title>Command Center | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Command Center</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">God Mode overview of the entire Qmova platform.</p>
        </div>

        {/* Top level stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className={`rounded-2xl border ${stat.bg} p-6 flex flex-col`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-white dark:bg-zinc-900 border border-white/20 shadow-sm ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-1">{stat.name}</h3>
              <div className="text-4xl font-black text-gray-900 dark:text-white">
                {isLoading ? <div className="h-10 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse" /> : stat.value}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 hover:border-indigo-500 dark:hover:border-indigo-500/50 transition-colors group">
                <span className="font-bold text-gray-700 dark:text-zinc-200">Add New Tenant</span>
                <ArrowUpRight className="w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </button>
              <Link href="/super-admin/system-logs" className="w-full flex items-center justify-between p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 hover:border-indigo-500 dark:hover:border-indigo-500/50 transition-colors group">
                <span className="font-bold text-gray-700 dark:text-zinc-200">System Logs</span>
                <ArrowUpRight className="w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </Link>
            </div>
          </div>

          {/* System Health */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Platform Health</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/10">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Redis & BullMQ</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">Background job processing</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Operational</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-white/10">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Evolution API (WhatsApp)</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">External messaging gateway</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  );
}
