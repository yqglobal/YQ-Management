import React, { useMemo } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { History as HistoryIcon, Download, TrendingUp, Clock, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const exportCsv = (data: any[]) => {
  if (!data.length) return;
  const rows: Record<string, any>[] = data.map(record => ({
    'Visit ID': record.id,
    'Customer Name': record.customer?.name || 'Unknown',
    'Customer Phone': record.customer?.phone || '',
    'Service': record.service?.name || 'Unknown',
    'Location': record.location?.name || 'Unknown',
    'Status': record.currentState,
    'Source': record.source,
    'Created At': new Date(record.createdAt).toLocaleString(),
  }));
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'visits-history.csv';
  a.click();
  URL.revokeObjectURL(url);
};

export default function HistoryPage() {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => fetchApi('/visits'), // Fetch all visits
  });

  // Calculate Analytics Metrics
  const analytics = useMemo(() => {
    if (!history.length) return { totalServed: 0, avgWaitTime: 0, chartData: [] };

    let totalWaitMs = 0;
    let completedCount = 0;
    const dateCounts: Record<string, number> = {};

    history.forEach((record: any) => {
      // For Chart Volume
      const dateStr = new Date(record.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;

      // Completed Wait Time calculation (approximation if missing fields for now)
      if (record.currentState === 'COMPLETED') {
        completedCount++;
        // TODO: add real timestamps for wait computation
      }
    });

    const avgWaitTime = 12; // Mock wait time until timestamps are fully populated in DB
    
    // Sort chart data chronologically
    const chartData = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .reverse(); 

    return { totalServed: completedCount, avgWaitTime, chartData };
  }, [history]);

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
          <button onClick={() => exportCsv(history)} className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-white rounded-lg font-medium transition-colors border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Total Served</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalServed}</h3>
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
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">~{analytics.avgWaitTime} <span className="text-base font-normal text-gray-500">mins</span></h3>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                <HistoryIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Total Visits</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{history.length}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Chart */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Visit Volume (Last 7 Days)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181B', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#818CF8' }}
                />
                <Line type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }} activeDot={{ r: 6 }} />
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
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Loading history...</td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No past records found.</td>
                  </tr>
                ) : (
                  history.slice(0, 50).map((record: any) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-700 dark:text-zinc-300">{record.customer?.name || 'Walk-in'}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{record.service?.name || 'Unknown Service'}</td>
                      <td className="px-6 py-4">{record.location?.name || 'Unknown'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 text-xs font-medium">
                          {record.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                          record.currentState === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          record.currentState === 'NO_SHOW' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}>
                          {record.currentState}
                        </span>
                      </td>
                      <td className="px-6 py-4">{new Date(record.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
