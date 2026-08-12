import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { Shield, Activity, ChevronDown, ChevronUp, Loader2, Search, Filter } from 'lucide-react';
import { useAuth } from '../../../components/AuthContext';

export default function AuditLogs() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const take = 50;
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auditLogs', page, filterAction, filterStatus],
    queryFn: () => {
      const queryParams = new URLSearchParams({
        skip: (page * take).toString(),
        take: take.toString(),
      });
      if (filterAction) queryParams.append('action', filterAction);
      if (filterStatus && filterStatus !== 'all') queryParams.append('status', filterStatus);
      return fetchApi(`/audit?${queryParams.toString()}`);
    },
    enabled: !!(user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'),
  });

  if (!user || (user.role !== 'TENANT_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) return null;

  return (
    <SettingsLayout pageTitle="Audit Logs" pageSubtitle="Comprehensive record of all workspace activities">
      <Head>
        <title>Audit Logs | Qmova</title>
      </Head>

      <div className="max-w-6xl space-y-6 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workspace Audit Logs</h1>
            <p className="text-gray-500 dark:text-zinc-400">View detailed history of all system events and API requests.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-zinc-900/50 p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by action (e.g. USER_LOGIN)"
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="success">Successful (2xx-3xx)</option>
              <option value="error">Errors (4xx-5xx)</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 text-gray-500 dark:text-zinc-400 font-medium border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4">Status / IP</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p>Loading audit logs...</p>
                      </div>
                    </td>
                  </tr>
                ) : data?.data?.length > 0 ? (
                  data.data.map((log: any) => (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-zinc-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          {log.user ? (
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{log.user.email}</p>
                              <p className="text-xs text-gray-500">{log.user.role}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">System / Anonymous</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-zinc-400">
                          {log.resource || log.endpoint || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex w-max px-2 py-0.5 rounded text-xs font-bold ${log.statusCode >= 200 && log.statusCode < 300 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                              {log.statusCode || 'N/A'}
                            </span>
                            <span className="text-xs font-mono text-gray-500" title="IP Address">
                              {log.ipAddress || 'Unknown IP'}
                            </span>
                          </div>
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
                        <tr className="bg-gray-50/50 dark:bg-zinc-900/80 border-b border-gray-200 dark:border-white/10">
                          <td colSpan={6} className="px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Request Metadata</h4>
                                <ul className="space-y-1 text-sm text-gray-700 dark:text-zinc-300">
                                  <li><strong>Method:</strong> {log.method || 'N/A'}</li>
                                  <li><strong>Endpoint:</strong> {log.endpoint || 'N/A'}</li>
                                  <li><strong>Duration:</strong> {log.durationMs}ms</li>
                                  <li><strong>User Agent:</strong> <span className="font-mono text-xs">{log.userAgent || 'Unknown'}</span></li>
                                </ul>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Payload Details</h4>
                                <div className="bg-black/5 dark:bg-black/40 rounded-xl p-4 overflow-auto max-h-60">
                                  <pre className="text-xs font-mono text-gray-800 dark:text-zinc-300 whitespace-pre-wrap">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No audit logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {data?.total > take && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-800/30">
              <span className="text-sm text-gray-500">
                Showing {page * take + 1} to {Math.min((page + 1) * take, data.total)} of {data.total} entries
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 text-sm font-medium bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={(page + 1) * take >= data.total}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 text-sm font-medium bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsLayout>
  );
}
