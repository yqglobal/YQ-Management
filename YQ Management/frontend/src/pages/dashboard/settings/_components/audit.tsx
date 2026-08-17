import React, { useState } from 'react';
import Head from 'next/head';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { Shield, Activity, ChevronDown, ChevronUp, Loader2, Search, Filter } from 'lucide-react';
import { useAuth } from '../../../../components/AuthContext';

export default function AuditLogs() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const take = 10;
  
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
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#E11D48]"></div>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-[#E11D48]" style={{ fontVariationSettings: "'FILL' 1" }}>policy</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Audit Logs</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">View system activities and security events.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search strokeWidth={1.5} className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            placeholder="Search by action (e.g. USER_LOGIN)"
            value={filterAction}
            onChange={(e) => {
              setFilterAction(e.target.value);
              setPage(0);
            }}
            className="w-full h-[44px] pl-11 pr-4 bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg font-body-md text-body-md text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-[#E11D48] focus:border-[#E11D48] shadow-sm"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter strokeWidth={1.5} className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(0);
            }}
            className="w-full h-[44px] pl-11 pr-10 bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg font-body-md text-body-md text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-[#E11D48] focus:border-[#E11D48] appearance-none shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="success">Successful (2xx-3xx)</option>
            <option value="error">Errors (4xx-5xx)</option>
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">expand_more</span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-surface-container-lowest dark:bg-black/20 border-b border-border dark:border-dark-border font-label-caps text-label-caps text-on-surface-variant font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 w-40">Timestamp</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Resource</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border dark:divide-dark-border font-body-md text-body-md">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-outline">
                    <Loader2 strokeWidth={1.5} className="w-8 h-8 animate-spin" />
                    <p>Loading audit logs...</p>
                  </div>
                </td>
              </tr>
            ) : data?.data?.length > 0 ? (
              data.data.map((log: any) => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-on-surface-variant dark:text-outline">
                      {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      {log.user ? (
                        <div>
                          <p className="font-bold text-on-surface dark:text-white truncate max-w-[150px]" title={log.user.personalSettings?.fullName || log.user.name || log.user.email}>
                            {log.user.personalSettings?.fullName || log.user.name || log.user.email}
                          </p>
                          <p className="text-[12px] text-on-surface-variant dark:text-outline mt-0.5">{log.user.role}</p>
                        </div>
                      ) : (
                        <span className="text-outline italic">System / Anonymous</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-on-surface dark:text-white bg-surface-container-low dark:bg-black/50 px-2 py-1 rounded border border-border dark:border-dark-border text-[12px] tracking-wide uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-data-mono text-[13px] text-on-surface-variant dark:text-outline">
                      {log.resource || log.endpoint || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] font-bold uppercase tracking-wider border ${log.statusCode >= 200 && log.statusCode < 300 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-error-container text-on-error-container border-error/20'}`}>
                        {log.statusCode || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className="p-2 hover:bg-surface-container-low dark:hover:bg-white/10 rounded-lg text-outline transition-colors"
                      >
                        {expandedId === log.id ? <ChevronUp strokeWidth={1.5} className="w-5 h-5" /> : <ChevronDown strokeWidth={1.5} className="w-5 h-5" />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="bg-surface-container-lowest dark:bg-black/20 border-b border-border dark:border-dark-border">
                      <td colSpan={6} className="px-6 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <h4 className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider mb-4 border-b border-border dark:border-dark-border pb-2">Request Metadata</h4>
                            <ul className="space-y-3 font-body-sm text-body-sm text-on-surface dark:text-white">
                              <li className="flex justify-between border-b border-border dark:border-dark-border pb-2"><strong className="text-on-surface-variant dark:text-outline">Method:</strong> <span>{log.method || 'N/A'}</span></li>
                              <li className="flex justify-between border-b border-border dark:border-dark-border pb-2"><strong className="text-on-surface-variant dark:text-outline">Endpoint:</strong> <span className="font-data-mono">{log.endpoint || 'N/A'}</span></li>
                              <li className="flex justify-between border-b border-border dark:border-dark-border pb-2"><strong className="text-on-surface-variant dark:text-outline">Duration:</strong> <span>{log.durationMs}ms</span></li>
                              <li className="flex flex-col gap-1 pt-1"><strong className="text-on-surface-variant dark:text-outline">User Agent:</strong> <span className="font-data-mono text-[12px] bg-surface-container-low dark:bg-black/50 p-2 rounded border border-border dark:border-dark-border break-all">{log.userAgent || 'Unknown'}</span></li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider mb-4 border-b border-border dark:border-dark-border pb-2">Payload Details</h4>
                            <div className="bg-surface-container-lowest dark:bg-black/50 rounded-xl p-4 border border-border dark:border-dark-border overflow-auto max-h-[200px]">
                              <pre className="font-data-mono text-[13px] text-on-surface dark:text-white whitespace-pre-wrap">
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
                <td colSpan={6} className="px-6 py-12 text-center text-outline font-body-md">
                  No audit logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {data?.total > take && (
          <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-border dark:border-dark-border bg-surface-container-lowest dark:bg-black/20 gap-4">
            <span className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline">
              Showing {page * take + 1} to {Math.min((page + 1) * take, data.total)} of {data.total} entries
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="h-[36px] px-4 font-body-sm font-semibold bg-white dark:bg-zinc-800 border border-border dark:border-dark-border text-on-surface dark:text-white rounded-lg hover:bg-surface-container-lowest dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={(page + 1) * take >= data.total}
                onClick={() => setPage(p => p + 1)}
                className="h-[36px] px-4 font-body-sm font-semibold bg-white dark:bg-zinc-800 border border-border dark:border-dark-border text-on-surface dark:text-white rounded-lg hover:bg-surface-container-lowest dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
