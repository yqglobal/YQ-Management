import React from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { BarChart3, TrendingUp, Users, Clock, CalendarDays, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function Analytics() {
  // Mocking the data that would normally come from the API
  const metrics = {
    totalVisits: 1420,
    visitsGrowth: '+12.5%',
    avgWaitTime: '18m',
    waitGrowth: '-2.4m',
    avgServiceTime: '24m',
    serviceGrowth: '+1.2m',
    walkInRatio: 65,
  };

  const chartHeights = [40, 70, 45, 90, 60, 30, 80];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
          <select className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 outline-none">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
          </select>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard 
            title="Total Visits" 
            value={metrics.totalVisits.toLocaleString()} 
            trend={metrics.visitsGrowth} 
            icon={<Users className="w-5 h-5 text-indigo-500" />} 
            positive={true}
          />
          <MetricCard 
            title="Avg Wait Time" 
            value={metrics.avgWaitTime} 
            trend={metrics.waitGrowth} 
            icon={<Clock className="w-5 h-5 text-emerald-500" />} 
            positive={true} // Less wait time is good
          />
          <MetricCard 
            title="Avg Service Time" 
            value={metrics.avgServiceTime} 
            trend={metrics.serviceGrowth} 
            icon={<TrendingUp className="w-5 h-5 text-orange-500" />} 
            positive={false}
          />
          <MetricCard 
            title="Walk-in vs Appt" 
            value={`${metrics.walkInRatio}%`} 
            subtitle="Walk-in ratio"
            icon={<CalendarDays className="w-5 h-5 text-blue-500" />} 
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
                  <span className="text-xs text-gray-500">Walk-ins</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                  <span className="text-xs text-gray-500">Appointments</span>
                </div>
              </div>
            </div>

            <div className="h-64 flex items-end justify-between gap-2">
              {chartHeights.map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative h-full flex flex-col justify-end">
                    {/* Tooltip mock */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      {Math.floor(height * 1.5)} visits
                    </div>
                    {/* Walk-in Stack */}
                    <div 
                      className="w-full bg-indigo-500 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-400" 
                      style={{ height: `${height}%` }}
                    ></div>
                    {/* Appointment Stack */}
                    <div 
                      className="w-full bg-blue-400 rounded-b-sm transition-all duration-500 mt-0.5 group-hover:bg-blue-300" 
                      style={{ height: `${height * 0.4}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{days[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Top Services</h3>
              <div className="space-y-4">
                <ServiceRank rank={1} name="General Consultation" count={450} percentage={40} />
                <ServiceRank rank={2} name="Follow-up Check" count={280} percentage={25} />
                <ServiceRank rank={3} name="Specialist Session" count={120} percentage={15} />
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Wait Time Efficiency</h3>
              <p className="text-sm text-gray-500 mb-4">Percentage of visits starting within 10 minutes of arrival.</p>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-bold text-emerald-500">82%</span>
                <span className="text-sm text-emerald-500 font-medium flex items-center mb-1">
                  <ArrowUpRight className="w-4 h-4 mr-0.5" /> +5%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '82%' }}></div>
              </div>
            </div>
          </div>

        </div>
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
