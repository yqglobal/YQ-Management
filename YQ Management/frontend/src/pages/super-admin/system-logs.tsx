import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../components/SuperAdminLayout';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { ShieldAlert, Terminal, ChevronDown, ChevronUp, Loader2, Filter } from 'lucide-react';
import { useAuth } from '../../components/AuthContext';

export default function SystemLogs() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const take = 50;
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterTenantId, setFilterTenantId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['systemLogs', page, filterLevel, filterTenantId],
    queryFn: () => {
      const queryParams = new URLSearchParams({
        skip: (page * take).toString(),
        take: take.toString(),
      });
      if (filterLevel && filterLevel !== 'all') queryParams.append('level', filterLevel);
      if (filterTenantId) queryParams.append('tenantId', filterTenantId);
      return fetchApi(`/system-logs?${queryParams.toString()}`);
    },
    enabled: !!(user?.role === 'SUPER_ADMIN'),
  });

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  return (
    <SuperAdminLayout pageTitle="Global System Logs" pageSubtitle="Real-time unhandled exceptions and system health events">
      <Head>
        <title>System Logs | Super Admin</title>
      </Head>

      <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-zinc-900/50 p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="relative min-w-[200px]">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterLevel}
              onChange={(e) => {
                setFilterLevel(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-gray-900 dark:text-white"
            >
              <option value="all">All Levels</option>
              <option value="ERROR">Errors Only</option>
              <option value="WARN">Warnings Only</option>
              <option value="INFO">Info</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative flex-1">
            <Terminal className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by Tenant ID (optional)"
              value={filterTenantId}
              onChange={(e) => {
                setFilterTenantId(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 text-gray-500 dark:text-zinc-400 font-medium border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4 w-48">Timestamp</th>
                  <th className="px-6 py-4 w-32">Level</th>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">Tenant</th>
                  <th className="px-6 py-4 text-right">Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5 font-mono">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="font-sans">Loading system logs...</p>
                      </div>
                    </td>
                  </tr>
                ) : data?.data?.length > 0 ? (
                  data.data.map((log: any) => (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-zinc-400">
                          {new Date(log.createdAt).toISOString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${
                            log.level === 'ERROR' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                            log.level === 'WARN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-800 dark:text-zinc-300 break-all">
                          {log.message}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 break-all">
                          {log.tenantId || '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"
                          >
                            {expandedId === log.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>
                      {expandedId === log.id && (
                        <tr className="bg-gray-50/50 dark:bg-zinc-950/80 border-b border-gray-200 dark:border-white/10">
                          <td colSpan={5} className="px-6 py-6">
                            <div className="space-y-4">
                              {log.context && (
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 font-sans">Context Payload</h4>
                                  <div className="bg-black/5 dark:bg-black/40 rounded-xl p-4 overflow-auto max-h-60">
                                    <pre className="text-xs text-gray-800 dark:text-zinc-300 whitespace-pre-wrap">
                                      {JSON.stringify(log.context, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                              {log.stackTrace && (
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 font-sans flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-red-500" />
                                    Stack Trace
                                  </h4>
                                  <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-4 overflow-auto max-h-96 border border-red-100 dark:border-red-900/50">
                                    <pre className="text-[11px] text-red-900 dark:text-red-300 whitespace-pre-wrap">
                                      {log.stackTrace}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-sans">
                      No system logs found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {data?.total > take && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-800/30 font-sans">
              <span className="text-sm text-gray-500">
                Showing {page * take + 1} to {Math.min((page + 1) * take, data.total)} of {data.total} entries
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 text-sm font-medium bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={(page + 1) * take >= data.total}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 text-sm font-medium bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
