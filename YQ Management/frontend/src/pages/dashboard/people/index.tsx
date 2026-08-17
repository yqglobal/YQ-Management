import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import { Search, Users, Phone, Mail, Clock, BarChart2, Plus, MessageSquare, Star, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { CreateCustomerModal } from '../../../components/modals/CreateCustomerModal';

function avgWaitMinutes(visits: any[]): string {
  const completed = visits.filter((v: any) => v.completedAt && v.createdAt);
  if (!completed.length) return '—';
  const avg = completed.reduce((sum: number, v: any) => {
    return sum + (new Date(v.completedAt).getTime() - new Date(v.createdAt).getTime());
  }, 0) / completed.length;
  const mins = Math.round(avg / 60000);
  return mins < 1 ? '<1 min' : `${mins} min`;
}

function lastVisitLabel(visits: any[]): string {
  if (!visits.length) return '—';
  const sorted = [...visits].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const d = new Date(sorted[0].createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function RecordsPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'visits' | 'recent' | 'name'>('visits');

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: () => fetchApi('/visits').catch(() => []),
  });

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

  const people = useMemo(() => {
    let list = Array.from(peopleMap.values());

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.phone?.includes(search) ||
        p.email?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'visits') list.sort((a, b) => b.visits.length - a.visits.length);
    else if (sortBy === 'recent') list.sort((a, b) => {
      const la = a.visits.reduce((max: number, v: any) => Math.max(max, new Date(v.createdAt).getTime()), 0);
      const lb = b.visits.reduce((max: number, v: any) => Math.max(max, new Date(v.createdAt).getTime()), 0);
      return lb - la;
    });
    else list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits, search, sortBy]);

  return (
    <AdminLayout pageTitle="Records">
      <Head>
        <title>Records | Qmova</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-white tracking-tight">Customer Records</h1>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-0.5">Visit history, timing analysis, and customer profiles.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl font-semibold transition-all shadow-sm border border-primary/20 hover:-translate-y-0.5 w-fit"
          >
            <Plus className="w-5 h-5" strokeWidth={1.5} />
            Add Customer
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Customers', value: peopleMap.size, icon: Users },
            { label: 'Total Visits', value: (visits as any[]).length, icon: BarChart2 },
            { label: 'Avg. Visits / Customer', value: peopleMap.size ? ((visits as any[]).length / peopleMap.size).toFixed(1) : '0', icon: Clock },
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface dark:text-white placeholder:text-on-surface-variant w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-on-surface-variant">Sort:</span>
            {(['visits', 'recent', 'name'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all capitalize ${
                  sortBy === s
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
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
                    <th className="p-4 text-center">Total Visits</th>
                    <th className="p-4 text-center">Avg. Time</th>
                    <th className="p-4">Last Visit</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-dark-border">
                  {people.map((person: any) => (
                    <tr key={person.id} className="hover:bg-surface-container-low dark:hover:bg-white/[0.02] transition-colors group">
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
                              <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
                              {person.phone}
                            </div>
                          )}
                          {person.email && (
                            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                              <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
                              {person.email}
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
                        <span className="text-sm text-on-surface-variant font-medium">
                          {avgWaitMinutes(person.visits)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-on-surface-variant">{lastVisitLabel(person.visits)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Message on WhatsApp"><MessageSquare className="w-4 h-4" /></button>
                           <button className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" title="Mark VIP"><Star className="w-4 h-4" /></button>
                           <button className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Block"><ShieldAlert className="w-4 h-4" /></button>
                        </div>
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
              <p className="text-lg font-semibold text-on-surface dark:text-white mb-1">No records yet</p>
              <p className="text-sm text-on-surface-variant max-w-sm mb-6">
                {search ? 'No customers match your search.' : 'Customers will appear here after their first booking or walk-in.'}
              </p>
              {!search && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium transition-colors hover:bg-primary-container"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} /> Add Customer Manually
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </AdminLayout>
  );
}
