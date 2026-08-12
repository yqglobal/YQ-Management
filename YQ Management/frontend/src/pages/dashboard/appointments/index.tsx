import React, { useState } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import { Calendar, Search, Filter, Plus, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { VisitDrawer } from '../../../components/VisitDrawer';
import { CreateAppointmentModal } from '../../../components/modals/CreateAppointmentModal';

export default function AppointmentsPage() {
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch appointments (using visits endpoint filtered by APPOINTMENT source for now, 
  // or a dedicated /appointments endpoint if one exists)
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: () => fetchApi('/visits').catch(() => []),
  });

  const appointments = visits.filter((v: any) => v.source === 'APPOINTMENT' || v.appointmentId);

  return (
    <AdminLayout pageTitle="Appointments" pageSubtitle="Manage scheduled visits and bookings.">
      <Head>
        <title>Appointments | YQ Platform</title>
      </Head>

      <div className="max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Appointments</h1>
            <p className="text-gray-500 dark:text-zinc-400">View and manage upcoming bookings.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-500/50 hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              New Appointment
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-xl p-1 shadow-sm w-fit">
            <button className="px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg">Today</button>
            <button className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Week</button>
            <button className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Month</button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button className="p-2 border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 min-w-[120px] text-center">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <button className="p-2 border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-9 pr-4 py-2 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white w-64 shadow-sm"
              />
            </div>
            <button className="p-2 border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors bg-white dark:bg-zinc-900/50 shadow-sm">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List View */}
        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
          {appointments.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {appointments.map((apt: any) => (
                <div 
                  key={apt.id} 
                  className="p-5 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  onClick={() => setSelectedVisit(apt)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                      <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                        {apt.scheduledTime ? new Date(apt.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">{apt.customer?.name || 'Unknown Customer'}</h3>
                      <p className="text-sm text-gray-500 dark:text-zinc-400">{apt.service?.name || 'General Service'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        apt.currentState === 'COMPLETED' ? 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/10 dark:text-gray-300 dark:border-white/10' :
                        apt.currentState === 'WAITING' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20' :
                        'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                      }`}>
                        {apt.currentState.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-400 dark:text-zinc-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No appointments today</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-sm mb-6">
                Customers can book through your public booking page or you can create one manually.
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Appointment
              </button>
            </div>
          )}
        </div>
      </div>

      <VisitDrawer 
        isOpen={!!selectedVisit} 
        onClose={() => setSelectedVisit(null)} 
        visit={selectedVisit} 
      />
      
      <CreateAppointmentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </AdminLayout>
  );
}
