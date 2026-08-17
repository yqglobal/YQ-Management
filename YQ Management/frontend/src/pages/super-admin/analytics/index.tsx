import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  Building2,
  Activity,
  Target,
  DollarSign,
  Globe,
  Navigation,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Layers,
  Sparkles,
  Smartphone,
  Tv,
  QrCode,
  Calendar,
  ShieldCheck,
  Zap,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-3 rounded-xl shadow-xl text-xs">
        <p className="font-bold text-gray-800 dark:text-zinc-200 mb-1">
          {label && typeof label === 'string' && label.includes('-') && label.length === 10
            ? format(new Date(label), 'MMM d, yyyy')
            : label}
        </p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color || '#6366f1' }} className="font-semibold">
            {entry.name}: <span className="font-mono font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function SuperAdminAnalytics() {
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'revenue' | 'geography' | 'traffic'>('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-analytics'],
    queryFn: () => fetchApi('/super-admin/analytics'),
  });

  const metrics = data?.metrics || {};
  const trends = data?.trends || [];
  const topTenants = data?.topTenants || [];

  const financials = data?.financials || { realMRR: 0, realARR: 0, arpu: 0, planTiers: [] };
  const operational = data?.operational || { avgWaitMins: 0, peakWindow: 'N/A' };
  const geographyData: any[] = data?.geography || [];
  const rawTraffic: any[] = data?.trafficPages || [];

  const iconsMap: Record<string, any> = {
    '/dashboard/queues': Activity,
    '/dashboard/check-in': QrCode,
    '/dashboard/display-picker': Tv,
    '/dashboard/settings/whatsapp': Smartphone,
    '/dashboard/history': BarChart3,
  };
  const trafficPages = rawTraffic.map((t: any) => ({
    ...t,
    icon: iconsMap[t.page] || Navigation,
  }));

  // Token status distribution calculation from real database counts
  const totalTokensVal = metrics.totalTokens || 1;
  const tokenStats = [
    { name: 'Completed', value: metrics.completedTokens || 0, color: '#10B981' },
    { name: 'Waiting Now', value: metrics.waitingTokens || 0, color: '#6366F1' },
    { name: 'Currently Serving', value: metrics.servedTokens || 0, color: '#3B82F6' },
    { name: 'Missed / Cancelled', value: metrics.missedTokens || 0, color: '#F43F5E' },
  ];

  return (
    <SuperAdminLayout pageTitle="Analytics" pageSubtitle="Platform intelligence, growth, and throughput telemetry">
      <Head>
        <title>Platform Analytics | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        {/* Header and Tab Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> God Mode Intelligence
            </div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Platform Analytics</h1>
            <p className="text-gray-500 dark:text-zinc-400 mt-1">Holistic telemetry, daily tenant growth, revenue projections, and infrastructure usage.</p>
          </div>

          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl gap-1 border border-gray-200 dark:border-white/10 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview & Growth', icon: TrendingUp },
              { id: 'usage', label: 'Queue Workload', icon: Activity },
              { id: 'revenue', label: 'Revenue & ARR', icon: DollarSign },
              { id: 'geography', label: 'Geography', icon: Globe },
              { id: 'traffic', label: 'Traffic & Pages', icon: Navigation },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-gray-400 dark:text-zinc-500 animate-pulse">
            <Activity className="w-10 h-10 mx-auto mb-4 opacity-40 animate-spin" />
            <p className="text-sm font-semibold">Aggregating real-time database telemetry...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW & GROWTH */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* KPI Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Businesses', value: metrics.totalTenants || 0, icon: Building2, subtitle: 'Registered tenants', color: 'text-indigo-500', border: 'hover:border-indigo-500/30' },
                    { label: 'Total Operators', value: metrics.totalUsers || 0, icon: Users, subtitle: 'Staff & admin accounts', color: 'text-blue-500', border: 'hover:border-blue-500/30' },
                    { label: 'Active Queues', value: metrics.activeQueues !== undefined ? metrics.activeQueues : (metrics.totalQueues || 0), icon: Activity, subtitle: 'Live routing lines', color: 'text-emerald-500', border: 'hover:border-emerald-500/30' },
                    { label: 'Tokens Processed', value: metrics.totalTokens || 0, icon: Target, subtitle: 'Total customer tickets', color: 'text-amber-500', border: 'hover:border-amber-500/30' },
                  ].map((stat, i) => (
                    <div key={i} className={`bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm transition-all ${stat.border}`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">{stat.label}</span>
                        <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                          <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                      </div>
                      <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 font-medium">{stat.subtitle}</p>
                    </div>
                  ))}
                </div>

                {/* Grouped Daily Tenant Growth Interactive Chart */}
                <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-500" /> Daily Business Onboarding & Growth
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                        Grouped strictly to a single entry per day over the trailing period.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                        <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" /> Daily New Tenants
                      </span>
                      <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Cumulative Total
                      </span>
                    </div>
                  </div>

                  {trends.length > 0 ? (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(str) => (str && str.length === 10 ? format(new Date(str), 'MMM d') : str)}
                            stroke="#9CA3AF"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="totalTenants" name="Total Businesses" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                          <Area type="monotone" dataKey="newTenants" name="New Businesses Today" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 dark:text-zinc-500">
                      <p className="text-sm">No growth trend data available yet.</p>
                    </div>
                  )}
                </div>

                {/* Top Businesses Table */}
                <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 p-6 md:p-8 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" /> Top Performing Tenants by Active Workspaces & Queues
                  </h3>
                  {topTenants.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                      {topTenants.map((tenant: any, i: number) => (
                        <div key={tenant.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-2 group hover:bg-gray-50/50 dark:hover:bg-white/[0.02] px-2 rounded-xl transition-all">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-xs font-black text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20">
                              #{i + 1}
                            </span>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{tenant.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-xs font-semibold text-gray-600 dark:text-zinc-400">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                              <Activity className="w-3.5 h-3.5" /> {tenant.queueCount} Active Queues
                            </span>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                              <Users className="w-3.5 h-3.5" /> {tenant.userCount} Staff Users
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-zinc-500 py-6 text-center">No tenant ranking data available yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: QUEUE & TOKEN WORKLOAD */}
            {activeTab === 'usage' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Token Status Distribution Card */}
                  <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm md:col-span-2">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-500" /> Ticket & Customer Status Distribution
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6">Real-time throughput breakdown across all active business lobbies.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {tokenStats.map((stat, idx) => {
                        const pct = Math.round((stat.value / Math.max(1, totalTokensVal)) * 100);
                        return (
                          <div key={idx} className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-zinc-300 mb-2">
                              <span className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }} /> {stat.name}
                              </span>
                              <span className="font-mono">{pct}%</span>
                            </div>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mb-2">{stat.value}</p>
                            <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: stat.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational Throughput Metrics */}
                  <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-zinc-950 text-white rounded-2xl p-6 border border-indigo-500/20 shadow-xl flex flex-col justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1.5 mb-4">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> High-Performance Routing
                      </span>
                      <h4 className="text-xl font-black mb-2">Average Wait Time</h4>
                      <p className="text-3xl font-black text-emerald-400 font-mono">{operational.avgWaitMins} mins</p>
                      <p className="text-xs text-indigo-200 mt-3 leading-relaxed">
                        Measured directly from customer check-in timestamps to counter service initiation across all live queues.
                      </p>
                    </div>
                    <div className="pt-6 border-t border-white/10 mt-6 text-xs text-indigo-300 flex items-center justify-between">
                      <span>Peak Lobby Window:</span>
                      <span className="font-bold text-white font-mono">{operational.peakWindow}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REVENUE & FINANCIALS */}
            {activeTab === 'revenue' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                    <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Real MRR</span>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">${financials.realMRR.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" /> Calculated from active database subscriptions
                    </p>
                  </div>

                  <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                    <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Real ARR</span>
                    <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2 font-mono">${financials.realARR.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Annualized from actual live billing plans</p>
                  </div>

                  <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                    <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">ARPU (Per Business)</span>
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2 font-mono">${financials.arpu.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Average real revenue per registered tenant</p>
                  </div>
                </div>

                {/* Plan Distribution Breakdown */}
                <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-500" /> Subscription Tier Adoption
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {financials.planTiers.map((plan: any, idx: number) => (
                      <div key={idx} className={`p-5 rounded-xl border ${plan.color} transition-all`}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1">{plan.tier}</p>
                        <p className="text-3xl font-black font-mono">{plan.count}</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 font-medium">Active tenant workspaces on tier</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: USER GEOGRAPHY */}
            {activeTab === 'geography' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 p-6 md:p-8 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-500" /> Global Tenant Deployment & Operator Geography
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6">Distribution of YQ Qmova kiosks, lobby displays, and customer check-ins across global operating regions.</p>

                  <div className="space-y-5">
                    {geographyData.map((geo, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300">{geo.code}</span>
                            {geo.region}
                          </span>
                          <div className="flex items-center gap-3 font-semibold text-xs text-gray-600 dark:text-zinc-400">
                            <span>{geo.tenants} Businesses</span>
                            <span className="font-mono font-bold w-12 text-right">{geo.share}%</span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${geo.color}`} style={{ width: `${geo.share}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: TRAFFIC & PAGES */}
            {activeTab === 'traffic' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 p-6 md:p-8 shadow-sm">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-indigo-500" /> Platform Traffic Telemetry & Most Visited Endpoints
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6">Analysis of portal interactions across operator dashboards, lobby screens, and automated notification services.</p>

                  <div className="divide-y divide-gray-100 dark:divide-white/5">
                    {trafficPages.map((item, idx) => (
                      <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{item.title}</p>
                            <span className="text-xs font-mono text-gray-400 dark:text-zinc-500">{item.page}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="font-mono font-bold text-gray-900 dark:text-white">{item.visits} visits</p>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.trend} this week</span>
                          </div>
                          <div className="w-24 bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SuperAdminLayout>
  );
}