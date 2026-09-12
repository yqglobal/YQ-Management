import React from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { History as HistoryIcon, Download, TrendingUp, Clock, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AnalyticsResponse, Visit } from '../../types/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Computes actual wait time in minutes from a visit's real timestamps.
 * Uses serviceStart - waitingStart when available, falls back to serviceStart - createdAt.
 * Returns null when timestamps are absent (e.g. visit never reached service).
 */
function computeWaitMins(visit: Visit): number | null {
  if (visit.serviceStart && visit.waitingStart) {
    const ms = new Date(visit.serviceStart).getTime() - new Date(visit.waitingStart).getTime();
    return Math.max(0, Math.floor(ms / 60000));
  }
  if (visit.serviceStart && visit.createdAt) {
    const ms = new Date(visit.serviceStart).getTime() - new Date(visit.createdAt).getTime();
    return Math.max(0, Math.floor(ms / 60000));
  }
  return null;
}

const STATE_BADGE: Record<string, string> = {
  COMPLETED:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  NO_SHOW:     'bg-red-500/10 text-red-400 border-red-500/20',
  CANCELLED:   'bg-red-500/10 text-red-400 border-red-500/20',
  MISSED:      'bg-amber-500/10 text-amber-400 border-amber-500/20',
};
const DEFAULT_BADGE = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';

const exportCsv = (data: Visit[]) => {
  if (!data.length) return;
  const rows = data.map(record => ({
    'Visit ID':          record.id,
    'Display ID':        record.displayId || '',
    'Customer Name':     record.customer?.name || 'Unknown',
    'Customer Phone':    record.customer?.phone || '',
    'Service':           record.service?.name || 'Unknown',
    'Location':          record.location?.name || 'Unknown',
    'Status':            record.currentState,
    'Source':            record.source,
    'Wait Time (mins)':  computeWaitMins(record) ?? '',
    'Rating':            record.rating ?? '',
    'Created At':        new Date(record.createdAt).toLocaleString(),
    'Completed At':      record.completedAt ? new Date(record.completedAt).toLocaleString() : '',
  }));
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(h => JSON.stringify((row as Record<string, string | number>)[h] ?? '')).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'visits-history.csv';
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const tz = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

  // Real analytics KPIs + chart data from the analytics service
  const { data: analytics } = useQuery({
    queryKey: ['analytics-history', '7d', tz],
    queryFn: (): Promise<AnalyticsResponse | null> =>
      fetchApi<AnalyticsResponse>(`/analytics?timeframe=7d&tz=${encodeURIComponent(tz)}`).catch(() => null),
  });

  // Raw visit records for the data table
  const { data: visitsRaw, isLoading } = useQuery({
    queryKey: ['visits-history'],
    queryFn: (): Promise<Visit[] | null> => fetchApi<Visit[]>('/visits?scope=history'),
  });
  const visits: Visit[] = visitsRaw ?? [];

  const kpis = analytics?.kpis;

  // Chart data sorted chronologically — analytics endpoint returns YYYY-MM-DD labels
  const chartData = (analytics?.chartData ?? [])
    .slice()
    .sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));

  return (
    <AdminLayout pageTitle="Analytics & Records" pageSubtitle="Visit history and analytics">
      <Head>
        <title>Analytics & History | Qmova</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-12 p-4 sm:p-6 lg:p-8">

        {/* Header Section */}
        <div className="flex items-end justify-between border-b border-gray-200 dark:border-white/10 pb-6">
          <div>
            <p className="text-gray-500 dark:text-zinc-400 text-sm font-medium tracking-wider uppercase mb-1">Overview</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
              Analytics & Records
            </h1>
          </div>
          <button
            onClick={() => exportCsv(visits)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-white rounded-lg font-medium transition-colors border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* KPI Cards — wired to real backend analytics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Total Served</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {kpis?.totalServed ?? '—'}
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Avg Wait Time</p>
                {/* Real computation: serviceStart - createdAt averaged across all served visits */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {kpis != null
                    ? <>{kpis.averageWaitTimeMins} <span className="text-base font-normal text-gray-500">mins</span></>
                    : '—'
                  }
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                <HistoryIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Total Visits (7d)</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {kpis?.totalVisits ?? '—'}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Chart — sorted chronologically, not reversed */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Visit Volume (Last 7 Days)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#6B7280"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => {
                    // Format "YYYY-MM-DD" to "Sep 12" etc.
                    try { return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
                    catch { return v; }
                  }}
                />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181B', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#818CF8' }}
                  labelFormatter={v => {
                    try { return new Date(v).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
                    catch { return v; }
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  name="Visits"
                  stroke="#6366F1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
          <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Visits</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400 whitespace-nowrap">
              <thead className="text-xs uppercase bg-gray-100/50 dark:bg-black/40 text-gray-500 dark:text-zinc-500 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Wait</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">Loading history...</td>
                  </tr>
                ) : visits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">No past records found.</td>
                  </tr>
                ) : (
                  visits.slice(0, 50).map((record) => {
                    const waitMins = computeWaitMins(record);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-700 dark:text-zinc-300">
                          {record.customer?.name || 'Walk-in'}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {record.service?.name || 'Unknown Service'}
                        </td>
                        <td className="px-6 py-4">{record.location?.name || 'Unknown'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 text-xs font-medium">
                            {record.source}
                          </span>
                        </td>
                        <td className="px-6 py-4 tabular-nums">
                          {waitMins != null
                            ? <span className="text-zinc-300">{waitMins}m</span>
                            : <span className="text-zinc-600">—</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${STATE_BADGE[record.currentState] ?? DEFAULT_BADGE}`}>
                            {record.currentState}
                          </span>
                        </td>
                        <td className="px-6 py-4">{new Date(record.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
