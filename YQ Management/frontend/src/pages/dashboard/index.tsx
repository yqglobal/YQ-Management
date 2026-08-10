import React, { useState } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { 
  Users, Clock, CalendarCheck, CheckCircle2, 
  Plus, Search, Filter, MoreVertical, Play, 
  Pause, Check, X 
} from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ALL' | 'WAITING' | 'IN_SERVICE'>('ALL');

  // Fetch Visits instead of Queues
  const { data: visits = [], isLoading: isVisitsLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: () => fetchApi('/visits').catch(() => []),
  });

  // Calculate stats
  const waitingVisits = visits.filter((v: any) => v.currentState === 'WAITING' || v.currentState === 'CHECKED_IN');
  const inServiceVisits = visits.filter((v: any) => v.currentState === 'IN_SERVICE');
  const completedVisits = visits.filter((v: any) => v.currentState === 'COMPLETED');
  
  const avgWaitTime = waitingVisits.length > 0 ? 12 : 0; // Mock calculation for now

  const displayVisits = visits.filter((v: any) => {
    if (activeTab === 'WAITING') return v.currentState === 'WAITING' || v.currentState === 'CHECKED_IN';
    if (activeTab === 'IN_SERVICE') return v.currentState === 'IN_SERVICE';
    return true;
  });

  return (
    <AdminLayout pageTitle="Today's Overview" pageSubtitle="Real-time pulse of your operations.">
      <Head>
        <title>Today | YQ Platform</title>
      </Head>

      <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Today's Visits</h1>
            <p className="text-gray-500 dark:text-zinc-400">Manage walk-ins and appointments seamlessly.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl font-semibold transition-all border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md">
              <CalendarCheck className="w-4 h-4" />
              Appointments
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-500/50 hover:-translate-y-0.5">
              <Plus className="w-5 h-5" />
              New Walk-in
            </button>
          </div>
        </div>

        {/* Stats Grid - Premium Glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<Users className="w-6 h-6 text-indigo-500" />}
            title="Total Waiting"
            value={waitingVisits.length}
            subtitle="Live customers"
            pulse
          />
          <StatCard 
            icon={<Play className="w-6 h-6 text-emerald-500" />}
            title="In Service"
            value={inServiceVisits.length}
            subtitle="Currently serving"
          />
          <StatCard 
            icon={<CheckCircle2 className="w-6 h-6 text-blue-500" />}
            title="Completed"
            value={completedVisits.length}
            subtitle="Served today"
          />
          <StatCard 
            icon={<Clock className="w-6 h-6 text-orange-500" />}
            title="Avg Wait Time"
            value={`~${avgWaitTime}`}
            suffix="mins"
            subtitle="Across all services"
          />
        </div>

        {/* Live Visits Table */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-2">
              <TabButton active={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')}>All Visits</TabButton>
              <TabButton active={activeTab === 'WAITING'} onClick={() => setActiveTab('WAITING')}>Waiting</TabButton>
              <TabButton active={activeTab === 'IN_SERVICE'} onClick={() => setActiveTab('IN_SERVICE')}>In Service</TabButton>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search customer..." 
                  className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white w-64"
                />
              </div>
              <button className="p-2 border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-zinc-800/20 text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Service</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">State</th>
                  <th className="p-4">Wait Time</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {displayVisits.map((visit: any) => (
                  <tr key={visit.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-gray-900 dark:text-white">{visit.customer?.name || 'Walk-in Customer'}</div>
                      <div className="text-xs text-gray-500">{visit.customer?.phone || 'No phone'}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-700 dark:text-zinc-300">
                      {visit.service?.name || 'General Consultation'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        visit.source === 'APPOINTMENT' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
                      }`}>
                        {visit.source}
                      </span>
                    </td>
                    <td className="p-4">
                      <StateBadge state={visit.currentState} />
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-600 dark:text-zinc-400">
                      {visit.currentState === 'WAITING' ? '12m' : '--'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {visit.currentState === 'WAITING' && (
                          <button className="p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-md transition-colors" title="Call Next">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {visit.currentState === 'IN_SERVICE' && (
                          <button className="p-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-md transition-colors" title="Complete">
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 rounded-md transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {displayVisits.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-zinc-400">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Users className="w-12 h-12 text-gray-300 dark:text-zinc-600" />
                        <p className="text-lg font-medium">No visits found</p>
                        <p className="text-sm">There are no customers matching your current filter.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon, title, value, suffix = '', subtitle, pulse = false }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-sm group hover:border-indigo-500/30 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-gray-50 dark:bg-black/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        {pulse && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100/50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></div>
            Live
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 mb-1">{title}</p>
        <div className="flex items-baseline gap-1">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h3>
          {suffix && <span className="text-sm font-medium text-gray-500">{suffix}</span>}
        </div>
        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">{subtitle}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
        ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm' 
        : 'text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
      }`}
    >
      {children}
    </button>
  );
}

function StateBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    WAITING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20',
    CHECKED_IN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    IN_SERVICE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    COMPLETED: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border-gray-200 dark:border-white/10',
    NO_SHOW: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20',
  };

  const style = colors[state] || colors.COMPLETED;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${style}`}>
      {state.replace('_', ' ')}
    </span>
  );
}
