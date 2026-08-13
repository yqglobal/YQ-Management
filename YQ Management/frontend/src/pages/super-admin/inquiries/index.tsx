import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { Loader2, Mail, Phone, Building2, User, Clock, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function InquiriesPage() {
  const queryClient = useQueryClient();

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ['super-admin-inquiries'],
    queryFn: () => fetchApi('/super-admin/inquiries'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => 
      fetchApi(`/super-admin/inquiries/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['super-admin-inquiries'] });
    },
    onError: () => toast.error('Failed to update status')
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
      case 'CONTACTED': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300';
      case 'RESOLVED': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <SuperAdminLayout>
      <Head>
        <title>Enterprise Inquiries | Super Admin</title>
      </Head>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Enterprise Inquiries</h1>
          <p className="text-gray-500 dark:text-zinc-400 mt-2">Manage incoming requests for enterprise plans.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="grid gap-6">
            {inquiries?.map((inquiry: any) => (
              <div key={inquiry.id} className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${getStatusColor(inquiry.status)}`}>
                        {inquiry.status}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(inquiry.createdAt).toLocaleString()}</span>
                      {inquiry.tenant && (
                        <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-lg">
                          Tenant: {inquiry.tenant.name}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">{inquiry.companyName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-zinc-300">{inquiry.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${inquiry.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{inquiry.email}</a>
                      </div>
                      {inquiry.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <a href={`tel:${inquiry.phone}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{inquiry.phone}</a>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-black/30 rounded-2xl border border-gray-100 dark:border-white/5 text-sm text-gray-700 dark:text-zinc-300">
                      {inquiry.message}
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2 shrink-0">
                    <button 
                      onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: 'PENDING' })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${inquiry.status === 'PENDING' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-white/5 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10'}`}
                    >
                      Pending
                    </button>
                    <button 
                      onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: 'CONTACTED' })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${inquiry.status === 'CONTACTED' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-white/5 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10'}`}
                    >
                      Contacted
                    </button>
                    <button 
                      onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: 'RESOLVED' })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${inquiry.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-white/5 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/10'}`}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Resolved
                    </button>
                  </div>

                </div>
              </div>
            ))}
            {inquiries?.length === 0 && (
              <div className="text-center py-20 bg-white dark:bg-zinc-900/50 rounded-3xl border border-gray-200 dark:border-white/10">
                <Building2 className="w-12 h-12 text-gray-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Inquiries</h3>
                <p className="text-gray-500 dark:text-zinc-400">There are currently no enterprise inquiries.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
