import React, { useState } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import { Search, Plus, Filter, Users, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';

export default function PeoplePage() {
  const [search, setSearch] = useState('');

  // Fetch unique customers from visits for now (or a dedicated /customers endpoint if available)
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: () => fetchApi('/visits').catch(() => []),
  });

  // Extract unique customers
  const peopleMap = new Map();
  visits.forEach((v: any) => {
    if (v.customer && v.customer.id) {
      if (!peopleMap.has(v.customer.id)) {
        peopleMap.set(v.customer.id, {
          ...v.customer,
          visits: [v],
        });
      } else {
        peopleMap.get(v.customer.id).visits.push(v);
      }
    }
  });

  const people = Array.from(peopleMap.values());
  const filteredPeople = people.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.phone && p.phone.includes(search)));

  return (
    <AdminLayout pageTitle="People" pageSubtitle="Manage your customers and visit history.">
      <Head>
        <title>People | YQ Platform</title>
      </Head>

      <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">People</h1>
            <p className="text-gray-500 dark:text-zinc-400">Customer directory and visit history.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-500/50 hover:-translate-y-0.5">
              <Plus className="w-5 h-5" />
              Add Customer
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white w-full shadow-sm"
            />
          </div>
          <button className="p-2 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors bg-white dark:bg-zinc-900/50 shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* List View */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            {filteredPeople.length > 0 ? (
              <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-zinc-800/20 text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-400 font-semibold border-b border-gray-200 dark:border-white/10">
                  <th className="p-4">Name</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Total Visits</th>
                  <th className="p-4">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredPeople.map((person: any) => {
                  const lastVisit = person.visits.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                  
                  return (
                    <tr key={person.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors group cursor-pointer">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-500/20 dark:to-purple-500/20 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-400 shrink-0">
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">{person.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {person.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                              <Phone className="w-3.5 h-3.5" />
                              {person.phone}
                            </div>
                          )}
                          {person.email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                              <Mail className="w-3.5 h-3.5" />
                              {person.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-md">
                          {person.visits.length} visits
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500 dark:text-zinc-400">
                        {lastVisit ? new Date(lastVisit.createdAt).toLocaleDateString() : 'Unknown'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No customers yet</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm mb-6">
                Customers will appear here after their first booking or walk-in visit.
              </p>
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                Add Customer Manually
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
