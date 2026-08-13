import React, { useState } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { BarChart3, TrendingUp, Users, Clock, CalendarDays, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';

export default function Analytics() {
  const [timeframe, setTimeframe] = useState('7d');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', timeframe],
    queryFn: () => fetchApi(`/analytics/dashboard?timeframe=${timeframe}`)
  });
  const metrics = {
    totalVisits: data?.kpis?.totalServed || 0,
    avgWaitTime: `${data?.kpis?.averageWaitTimeMins || 0}m`,
    avgServiceTime: `${data?.kpis?.averageServiceTimeMins || 0}m`,
    dropOffRate: `${data?.kpis?.dropOffRate || 0}%`,
  };

  const chartData = data?.chartData || [];
  const staffPerformance = data?.staffPerformance || [];



  return (
    <AdminLayout pageTitle="Analytics" pageSubtitle="Insights into your visits and performance.">
      <Head>
        <title>Analytics | YQ Platform</title>
      </Head>

      <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Analytics</h1>
            <p className="text-gray-500 dark:text-zinc-400">Track visit volumes, wait times, and staff performance.</p>
          </div>
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 outline-none"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64 text-gray-500">Loading analytics...</div>
        ) : (
          <>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Visits" 
            value={metrics.totalVisits.toLocaleString()} 

            icon={<Users className="w-5 h-5 text-indigo-500" />} 
            positive={true}
          />
          <MetricCard 
            title="Avg. Wait Time" 
            value={metrics.avgWaitTime} 
            icon={<Clock className="w-5 h-5 text-amber-500" />} 
          />
          <MetricCard 
            title="Avg. Service Time" 
            value={metrics.avgServiceTime} 
            icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} 
          />
          <MetricCard 
            title="Drop-off Rate" 
            value={metrics.dropOffRate} 
            icon={<CalendarDays className="w-5 h-5 text-red-500" />} 
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Visit Volume</h3>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                  <span className="text-xs text-gray-500">Appointments</span>
                </div>
              </div>
            </div>

            <div className="h-64 flex items-end justify-between gap-2 mt-4 px-2">
              {chartData.map((d: any, i: number) => {
                const maxVol = Math.max(...chartData.map((cd: any) => cd.volume), 1);
                const height = (d.volume / maxVol) * 100;
                return (
                <div key={i} className="flex flex-col items-center justify-end w-full group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    {d.volume} visits<br/>
                    <span className="text-gray-300">{d.avgWaitTime}m avg wait</span>
                  </div>
                  
                  <div className="w-full flex flex-col justify-end mb-2 h-full">
                    <div 
                      className="w-full bg-indigo-500 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-400" 
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{d.timeLabel}</span>
                </div>
              )})}
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Staff Performance</h3>
              <div className="space-y-4">
                {staffPerformance.map((staff: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-zinc-800 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-gray-600 dark:text-zinc-400">
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{staff.name}</h4>
                        <p className="text-xs text-gray-500">{staff.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{staff.avgServiceTimeMins}m avg</p>
                      <p className="text-xs text-gray-500">{staff.served} served</p>
                    </div>
                  </div>
                ))}
                {staffPerformance.length === 0 && (
                  <p className="text-sm text-gray-500">No staff performance data available for this period.</p>
                )}
              </div>
            </div>
          </div>

        </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricCard({ title, value, trend, icon, subtitle, positive }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-sm group hover:border-indigo-500/30 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-xl">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${
            positive 
            ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10' 
            : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-500/10'
          }`}>
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h3>
        {subtitle && <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">{subtitle}</p>}
      </div>
    </div>
  );
}

function ServiceRank({ rank, name, count, percentage }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 w-4">{rank}.</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}
