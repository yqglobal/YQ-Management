import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { fetchApi } from '../../lib/api';
import { FeatureGuard } from '../../components/guards/FeatureGuard';
import { Search, Users, Phone, Mail, Clock, BarChart2 } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function avgWaitMinutes(visits: any[]): string {
  const completed = visits.filter((v: any) => v.completedAt && v.createdAt);
  if (!completed.length) return '—';
  const avg = completed.reduce((s: number, v: any) =>
    s + (new Date(v.completedAt).getTime() - new Date(v.createdAt).getTime()), 0) / completed.length;
  const mins = Math.round(avg / 60000);
  return mins < 1 ? '<1 min' : `${mins} min`;
}

function lastVisitLabel(visits: any[]): string {
  if (!visits.length) return '—';
  const sorted = [...visits].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const d = new Date(sorted[0].createdAt);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const SLA_THRESHOLD_MINS = 15;

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [activeTab, setActiveTab] = useState<'insights' | 'customers'>('insights');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSort, setCustomerSort] = useState<'visits' | 'recent' | 'name'>('visits');

  // All historical visits (for analytics & customers)
  const { data: visits = [], isLoading: isVisitsLoading } = useQuery({
    queryKey: ['visits', 'history-all'],
    queryFn: () => fetchApi('/visits').catch(() => []),
  });

  // Queues for per-queue breakdown
  const { data: queues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue').catch(() => []),
  });

  // ── KPI calculations ────────────────────────────────────────────────────
  const servedVisits = (visits as any[]).filter((v) => v.serviceStart && v.waitingStart);
  const completedOrExited = (visits as any[]).filter((v) =>
    ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(v.currentState)
  );
  const walkawayCount = (visits as any[]).filter((v) =>
    ['NO_SHOW', 'CANCELLED'].includes(v.currentState)
  ).length;

  let totalWaitMs = 0;
  let slaViolations = 0;

  servedVisits.forEach((v) => {
    const wait = new Date(v.serviceStart).getTime() - new Date(v.waitingStart).getTime();
    totalWaitMs += wait;
    if (wait > SLA_THRESHOLD_MINS * 60 * 1000) slaViolations++;
  });

  const avgWaitMs = servedVisits.length > 0 ? totalWaitMs / servedVisits.length : 0;
  const avgWaitMins = Math.floor(avgWaitMs / 60000);
  const avgWaitSecs = Math.floor((avgWaitMs % 60000) / 1000);
  const walkawayRate = completedOrExited.length > 0
    ? ((walkawayCount / completedOrExited.length) * 100).toFixed(1)
    : '0.0';

  // ── Chart data ──────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const v = visits as any[];
    if (timeRange === 'Day') {
      const hours = Array.from({ length: 24 }, (_, i) => ({ time: `${i.toString().padStart(2, '0')}:00`, visits: 0 }));
      v.forEach((visit) => {
        if (!visit.createdAt) return;
        const d = new Date(visit.createdAt);
        if (d.toDateString() === new Date().toDateString()) hours[d.getHours()].visits++;
      });
      return hours;
    }
    if (timeRange === 'Week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => ({ time: d, visits: 0 }));
      v.forEach((visit) => {
        if (!visit.createdAt) return;
        const day = new Date(visit.createdAt).getDay();
        if (day >= 0 && day < 7) days[day].visits++;
      });
      return days;
    }
    const days = Array.from({ length: 30 }, (_, i) => ({ time: `${i + 1}`, visits: 0 }));
    v.forEach((visit) => {
      if (!visit.createdAt) return;
      const d = new Date(visit.createdAt).getDate() - 1;
      if (d >= 0 && d < 30) days[d].visits++;
    });
    return days;
  }, [visits, timeRange]);

  // ── Per-queue SLA heatmap (REAL data) ──────────────────────────────────
  const queueStats = useMemo(() => {
    const v = visits as any[];
    const map = new Map<string, { name: string; totalWaitMs: number; count: number; violations: number }>();

    (queues as any[]).forEach((q) => {
      map.set(q.id, { name: q.name, totalWaitMs: 0, count: 0, violations: 0 });
    });

    v.forEach((visit) => {
      if (!visit.queue?.id && !visit.queueId) return;
      const qId = visit.queue?.id || visit.queueId;
      if (!map.has(qId)) return;
      if (visit.serviceStart && visit.waitingStart) {
        const wait = new Date(visit.serviceStart).getTime() - new Date(visit.waitingStart).getTime();
        const entry = map.get(qId)!;
        entry.totalWaitMs += wait;
        entry.count++;
        if (wait > SLA_THRESHOLD_MINS * 60 * 1000) entry.violations++;
      }
    });

    return Array.from(map.values()).map((q) => ({
      ...q,
      avgMins: q.count > 0 ? Math.round(q.totalWaitMs / q.count / 60000) : null,
    }));
  }, [visits, queues]);

  // ── Customer map (absorbing Records page) ──────────────────────────────
  const { people } = useMemo(() => {
    const peopleMap = new Map<string, any>();
    (visits as any[]).forEach((v) => {
      if (v.customer?.id) {
        if (!peopleMap.has(v.customer.id)) {
          peopleMap.set(v.customer.id, { ...v.customer, visits: [v] });
        } else {
          peopleMap.get(v.customer.id).visits.push(v);
        }
      }
    });

    let list = Array.from(peopleMap.values());
    if (customerSearch) {
      const q = customerSearch.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.phone?.includes(customerSearch) ||
        p.email?.toLowerCase().includes(q)
      );
    }
    if (customerSort === 'visits') list.sort((a, b) => b.visits.length - a.visits.length);
    else if (customerSort === 'recent') list.sort((a, b) => {
      const la = a.visits.reduce((m: number, v: any) => Math.max(m, new Date(v.createdAt).getTime()), 0);
      const lb = b.visits.reduce((m: number, v: any) => Math.max(m, new Date(v.createdAt).getTime()), 0);
      return lb - la;
    });
    else list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return { people: list, total: peopleMap.size };
  }, [visits, customerSearch, customerSort]);

  const kpiVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AdminLayout pageTitle="Analytics">
      <Head>
        <title>Analytics | Qmova</title>
      </Head>

      <FeatureGuard
        featureKey="advancedAnalytics"
        featureName="Advanced Analytics"
      >
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Tab Bar */}
          <div className="flex gap-1 bg-surface-container-low dark:bg-zinc-900 p-1 rounded-xl w-fit border border-border dark:border-dark-border">
            {(['insights', 'customers'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-white dark:bg-zinc-800 text-on-surface dark:text-white shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                }`}
              >
                {tab === 'insights' ? '📊 Insights' : '👥 Customers'}
              </button>
            ))}
          </div>

          {/* ── INSIGHTS TAB ── */}
          {activeTab === 'insights' && (
            <>
              {/* AI Insights Ribbon */}
              {/* <motion.div
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-sky-500/10 to-indigo-500/10 border border-sky-500/20 rounded-xl p-5 mb-4 shadow-sm flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-sky-400">auto_awesome</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-on-surface dark:text-white font-bold mb-1">AI Summary & Insights</h4>
                  <p className="text-body-sm text-outline leading-relaxed">
                    Wait times have been exceptionally low today! However, based on the last 30 days, we've identified a 30% visitor surge between <span className="text-on-surface dark:text-white font-semibold">10 AM and 11 AM</span>. Consider assigning an additional desk during this peak hour.
                  </p>
                </div>
              </motion.div> */}

              {/* KPI Ribbon */}
              <motion.div
                initial="hidden" animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              >
                <motion.div variants={kpiVariants} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-5 shadow-sm">
                  <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold">Total Visits</p>
                  <p className="font-mono text-3xl font-bold text-on-surface dark:text-white">{(visits as any[]).length}</p>
                  <p className="text-xs text-outline mt-1">All time</p>
                </motion.div>

                <motion.div variants={kpiVariants} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-5 shadow-sm">
                  <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold">Avg Wait Time</p>
                  <p className="font-mono text-3xl font-bold text-on-surface dark:text-white">
                    {servedVisits.length > 0 ? `${avgWaitMins}m ${avgWaitSecs.toString().padStart(2, '0')}s` : '—'}
                  </p>
                  <p className="text-xs text-outline mt-1">Served customers</p>
                </motion.div>

                <motion.div variants={kpiVariants} className="bg-card dark:bg-dark-card border border-alert/30 dark:border-alert/20 rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-alert rounded-l-xl" />
                  <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold">SLA Violations</p>
                  <p className="font-mono text-3xl font-bold text-alert">{slaViolations}</p>
                  <p className="text-xs text-outline mt-1">&gt;{SLA_THRESHOLD_MINS} min waits</p>
                </motion.div>

                <motion.div variants={kpiVariants} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-5 shadow-sm">
                  <p className="text-on-surface-variant text-xs mb-1 uppercase tracking-wider font-semibold">Walkaway Rate</p>
                  <p className="font-mono text-3xl font-bold text-on-surface dark:text-white">{walkawayRate}%</p>
                  <p className="text-xs text-outline mt-1">No-shows & cancels</p>
                </motion.div>
              </motion.div>

              {/* Throughput Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-6 shadow-sm"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-on-surface dark:text-white">Visit Volume</h3>
                  <div className="flex gap-1.5">
                    {(['Day', 'Week', 'Month'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          timeRange === r
                            ? 'bg-primary text-white'
                            : 'bg-surface-container-low dark:bg-zinc-800 text-on-surface-variant hover:text-on-surface dark:hover:text-white border border-border dark:border-dark-border'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="w-full h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1571ff" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#1571ff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.4} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#707881' }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#707881' }} />
                      <Tooltip 
                        isAnimationActive={false} 
                        contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '10px' }} 
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }} 
                        labelStyle={{ color: '#a1a1aa' }} 
                        cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area type="monotone" dataKey="visits" stroke="#1571ff" strokeWidth={2.5} fill="url(#colorVisits)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Per-Queue SLA Heatmap — REAL DATA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              >
                <h3 className="font-semibold text-on-surface dark:text-white mb-4">Queue Performance (Avg Wait)</h3>
                {queueStats.length === 0 ? (
                  <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-10 text-center">
                    <p className="text-on-surface-variant text-sm">No queues configured yet. Create queues to see per-queue SLA data.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {queueStats.map((q, i) => {
                      const isViolating = q.avgMins !== null && q.avgMins > SLA_THRESHOLD_MINS;
                      const hasData = q.avgMins !== null;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className={`rounded-xl p-5 flex flex-col justify-between min-h-[110px] shadow-sm border ${
                            !hasData
                              ? 'bg-surface-container-low dark:bg-zinc-900 border-border dark:border-dark-border'
                              : isViolating
                              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          <p className={`font-semibold text-sm truncate ${
                            !hasData ? 'text-on-surface-variant' : isViolating ? 'text-rose-900 dark:text-rose-300' : 'text-emerald-900 dark:text-emerald-300'
                          }`}>{q.name}</p>
                          <div className="flex items-end justify-between mt-3">
                            <span className={`font-mono text-2xl font-bold ${
                              !hasData ? 'text-on-surface-variant' : isViolating ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {hasData ? `${q.avgMins}m` : '—'}
                            </span>
                            {hasData ? (
                              <span className={`material-symbols-outlined text-[20px] ${isViolating ? 'text-rose-500' : 'text-emerald-500'}`}
                                style={{ fontVariationSettings: "'FILL' 1" }}>
                                {isViolating ? 'warning' : 'check_circle'}
                              </span>
                            ) : (
                              <span className="text-xs text-on-surface-variant">No data</span>
                            )}
                          </div>
                          {q.count > 0 && (
                            <p className="text-[10px] text-outline mt-1">{q.count} served · {q.violations} violations</p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </>
          )}

          {/* ── CUSTOMERS TAB (absorbs Records page) ── */}
          {activeTab === 'customers' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Customers', value: people.length, icon: Users },
                  { label: 'Total Visits', value: (visits as any[]).length, icon: BarChart2 },
                  { label: 'Avg Visits / Customer', value: people.length ? ((visits as any[]).length / people.length).toFixed(1) : '0', icon: Clock },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon strokeWidth={1.5} className="w-4 h-4 text-primary" />
                      <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">{label}</p>
                    </div>
                    <p className="text-2xl font-bold text-on-surface dark:text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Search name, phone or email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface dark:text-white placeholder:text-on-surface-variant w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-on-surface-variant">Sort:</span>
                  {(['visits', 'recent', 'name'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setCustomerSort(s)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all capitalize ${
                        customerSort === s
                          ? 'bg-primary text-white'
                          : 'bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Table */}
              <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
                {isVisitsLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-14 bg-surface-container-low dark:bg-white/5 animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : people.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-white/[0.02] text-xs uppercase tracking-wider text-on-surface-variant font-semibold">
                          <th className="p-4">Customer</th>
                          <th className="p-4">Contact</th>
                          <th className="p-4 text-center">Visits</th>
                          <th className="p-4 text-center">Avg Time</th>
                          <th className="p-4">Last Visit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border dark:divide-dark-border">
                        {people.map((person: any) => (
                          <tr key={person.id} className="hover:bg-surface-container-low dark:hover:bg-white/[0.02] transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                                  {(person.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <p className="font-semibold text-on-surface dark:text-white text-sm">{person.name || 'Unknown'}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-0.5">
                                {person.phone && (
                                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                    <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />{person.phone}
                                  </div>
                                )}
                                {person.email && (
                                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                    <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />{person.email}
                                  </div>
                                )}
                                {!person.phone && !person.email && <span className="text-xs text-on-surface-variant">—</span>}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold bg-primary/10 dark:bg-primary/20 text-primary rounded-full">
                                {person.visits.length}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-sm text-on-surface-variant font-medium">{avgWaitMinutes(person.visits)}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm text-on-surface-variant">{lastVisitLabel(person.visits)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-surface-container-low dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-on-surface-variant opacity-40" strokeWidth={1.5} />
                    </div>
                    <p className="text-lg font-semibold text-on-surface dark:text-white mb-1">No customer data yet</p>
                    <p className="text-sm text-on-surface-variant max-w-sm">
                      {customerSearch ? 'No customers match your search.' : 'Customers appear here after their first visit.'}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </FeatureGuard>
    </AdminLayout>
  );
}
