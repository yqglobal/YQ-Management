import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { Settings, ArrowLeft, Loader2, ListOrdered, Save, Calendar, CheckSquare, Settings2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';

export default function QueueDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState<'general' | 'token' | 'form' | 'appointments'>('general');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<any>({});

  const { data: queue = null, isLoading } = useQuery({
    queryKey: ['queue', id],
    queryFn: () => fetchApi(`/queue/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (queue) {
      setFormData({
        name: queue.name,
        allowAppointments: queue.allowAppointments || false,
        requireManualCheckIn: queue.requireManualCheckIn || false,
        appointmentGranularityMins: queue.appointmentGranularityMins || 15,
        tokenDisplayConfig: queue.tokenDisplayConfig || { prefix: '', format: 'SEQUENTIAL' },
        formConfig: queue.formConfig || { requireEmail: false, requirePhone: false, customFields: [] },
      });
    }
  }, [queue]);

  const updateQueueMutation = useMutation({
    mutationFn: (data: any) => fetchApi(`/queue/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', id] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      toast.success('Queue updated successfully');
    },
    onError: () => toast.error('Error updating queue'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => fetchApi(`/queue/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', id] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      toast.success('Queue status updated');
    },
    onError: () => toast.error('Error updating status'),
  });

  const handleSave = () => {
    updateQueueMutation.mutate(formData);
  };

  const handleToggleStatus = () => {
    if (!queue) return;
    const newStatus = queue.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    updateStatusMutation.mutate(newStatus);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </AdminLayout>
    );
  }

  if (!queue) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-red-500">Queue not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={queue.name} pageSubtitle="Configure your queue parameters">
      <Head>
        <title>{queue.name} Settings | Qmova</title>
      </Head>

      <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/queues" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <ListOrdered className="w-8 h-8 text-indigo-500" />
                {queue.name}
              </h1>
              <p className="text-gray-500 dark:text-zinc-400 mt-1">
                Currently {queue.status.toLowerCase()} • {queue.services?.length || 0} linked services
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleToggleStatus}
              disabled={updateStatusMutation.isPending}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                queue.status === 'ACTIVE' 
                  ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 dark:hover:bg-amber-500/20'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20'
              }`}
            >
              {updateStatusMutation.isPending ? 'Updating...' : (queue.status === 'ACTIVE' ? 'Pause Queue' : 'Activate Queue')}
            </button>
            <button 
              onClick={handleSave}
              disabled={updateQueueMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {updateQueueMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10 gap-6">
          <TabButton 
            active={activeTab === 'general'} 
            onClick={() => setActiveTab('general')}
            icon={<Settings className="w-4 h-4" />}
            label="General" 
          />
          <TabButton 
            active={activeTab === 'token'} 
            onClick={() => setActiveTab('token')}
            icon={<ListOrdered className="w-4 h-4" />}
            label="Token Settings" 
          />
          <TabButton 
            active={activeTab === 'appointments'} 
            onClick={() => setActiveTab('appointments')}
            icon={<Calendar className="w-4 h-4" />}
            label="Appointments" 
          />
        </div>

        {/* Tab Content */}
        <div className="pt-6">
          {activeTab === 'general' && (
            <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-4">General Settings</h2>
              
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Queue Name</label>
                  <input 
                    type="text" 
                    value={formData.name || ''} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
                
                <div className="pt-4 flex items-start gap-3">
                  <div className="flex items-center h-5 mt-1">
                    <input 
                      type="checkbox" 
                      id="requireManual"
                      checked={formData.requireManualCheckIn || false}
                      onChange={(e) => setFormData({...formData, requireManualCheckIn: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="requireManual" className="font-medium text-gray-900 dark:text-white">Require Manual Check-in</label>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Customers joining online must physical scan a QR code at the location to be marked as checked-in.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'token' && (
            <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-4">Token Display Configuration</h2>
              
              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Token Prefix</label>
                  <input 
                    type="text" 
                    value={formData.tokenDisplayConfig?.prefix || ''} 
                    onChange={(e) => setFormData({
                      ...formData, 
                      tokenDisplayConfig: { ...formData.tokenDisplayConfig, prefix: e.target.value }
                    })}
                    placeholder="e.g. A, VIP, EX"
                    className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Appended before the token number (e.g. VIP-001)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Number Format</label>
                  <select 
                    value={formData.tokenDisplayConfig?.format || 'SEQUENTIAL'} 
                    onChange={(e) => setFormData({
                      ...formData, 
                      tokenDisplayConfig: { ...formData.tokenDisplayConfig, format: e.target.value }
                    })}
                    className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  >
                    <option value="SEQUENTIAL">Sequential (1, 2, 3...)</option>
                    <option value="RANDOM">Random 4-digit (e.g. 8492)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-4">Appointments & Booking</h2>
              
              <div className="space-y-6 max-w-xl">
                <div className="flex items-start gap-3">
                  <div className="flex items-center h-5 mt-1">
                    <input 
                      type="checkbox" 
                      id="allowAppointments"
                      checked={formData.allowAppointments || false}
                      onChange={(e) => setFormData({...formData, allowAppointments: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="allowAppointments" className="font-medium text-gray-900 dark:text-white">Allow Appointments</label>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Enable customers to book future timeslots in this queue.</p>
                  </div>
                </div>

                {formData.allowAppointments && (
                  <div className="pl-7">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Timeslot Granularity (Minutes)</label>
                    <select 
                      value={formData.appointmentGranularityMins || 15} 
                      onChange={(e) => setFormData({...formData, appointmentGranularityMins: parseInt(e.target.value)})}
                      className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    >
                      <option value={5}>Every 5 minutes</option>
                      <option value={10}>Every 10 minutes</option>
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={60}>Every 1 hour</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-medium text-sm transition-colors ${
        active 
          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' 
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
      }`}
    >
      {icon} {label}
    </button>
  );
}
