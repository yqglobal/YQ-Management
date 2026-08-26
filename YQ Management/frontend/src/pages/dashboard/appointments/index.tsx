import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, Calendar, Download, RefreshCw, Eye, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { VisitDrawer } from '../../../components/VisitDrawer';
import { CreateAppointmentModal } from '../../../components/modals/CreateAppointmentModal';
import { MatrixCalendar } from '../../../components/MatrixCalendar';
import { format } from 'date-fns';

type CalendarView = 'day' | 'week' | 'month';

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export default function AppointmentsPage() {
  const queryClient = useQueryClient();
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<CalendarView>('day');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  
  // Reschedule Confirmation State
  const [rescheduleData, setRescheduleData] = useState<{apt: any, newTime: Date, serviceId: string | null} | null>(null);

  const { data: visitsData = [], isLoading: visitsLoading, refetch: refetchVisits } = useQuery({
    queryKey: ['visits'],
    queryFn: () => fetchApi('/visits').catch(() => []),
  });

  const { data: appointmentsData = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => fetchApi('/appointments').catch(() => []),
  });

  const { data: queuesData = [], isLoading: queuesLoading, refetch: refetchQueues } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue').catch(() => []),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service').catch(() => []),
  });

  const isLoading = visitsLoading || appointmentsLoading || queuesLoading;

  const handleRefresh = () => {
    refetchVisits();
    refetchAppointments();
    refetchQueues();
  };

  const checkInMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CHECKED_IN' }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] })
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, scheduledStart, serviceId }: { id: string, scheduledStart: Date, serviceId: string | null }) => 
      fetchApi(`/appointments/${id}`, { 
        method: 'PATCH', 
        body: JSON.stringify({ scheduledStart, serviceId }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setRescheduleData(null);
    }
  });

  const combinedItems = useMemo(() => {
    const items: any[] = [];
    
    // Add true Appointments
    appointmentsData.forEach((apt: any) => {
      items.push({
        ...apt,
        _type: 'Appointment',
        scheduledTime: apt.scheduledStart || apt.createdAt,
        currentState: apt.status,
      });
    });

    // Add Visits (Walk-ins or legacy)
    visitsData.forEach((v: any) => {
      if (!v.appointmentId) {
        items.push({
          ...v,
          _type: 'Visit',
          scheduledTime: v.createdAt,
          currentState: v.status || v.currentState,
        });
      }
    });

    // Add Tokens from Queues (Walk-ins)
    queuesData.forEach((q: any) => {
      if (q.tokens) {
        q.tokens.forEach((t: any) => {
          items.push({
            ...t,
            _type: t.isAppointment ? 'Token (Scheduled)' : 'Token (Walk-in)',
            scheduledTime: t.scheduledFor || t.createdAt,
            currentState: t.status,
            customer: { name: t.customerName, phone: t.phone },
            service: { name: q.name, id: q.serviceId },
            serviceId: q.serviceId
          });
        });
      }
    });

    return items;
  }, [appointmentsData, visitsData, queuesData]);

  const filteredAppointments = useMemo(() => {
    return combinedItems.filter((apt: any) => {
      const searchMatch = !searchQuery ||
        apt.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.customer?.phone?.includes(searchQuery) ||
        apt.customerName?.toLowerCase().includes(searchQuery.toLowerCase());

      const aptDate = apt.scheduledTime ? new Date(apt.scheduledTime) : new Date(apt.createdAt);

      let dateMatch = false;
      if (view === 'day') {
        dateMatch = isSameDay(aptDate, currentDate);
      } else if (view === 'week') {
        const ws = getWeekStart(currentDate);
        const we = new Date(ws);
        we.setDate(we.getDate() + 6);
        we.setHours(23, 59, 59, 999);
        dateMatch = aptDate >= ws && aptDate <= we;
      } else {
        const ms = getMonthStart(currentDate);
        const me = getMonthEnd(currentDate);
        me.setHours(23, 59, 59, 999);
        dateMatch = aptDate >= ms && aptDate <= me;
      }

      const statusMatch = statusFilter === 'ALL' || apt.currentState === statusFilter;
      const serviceMatch = serviceFilter === 'ALL' || apt.serviceId === serviceFilter;

      return searchMatch && dateMatch && statusMatch && serviceMatch;
    });
  }, [combinedItems, searchQuery, currentDate, view, statusFilter, serviceFilter]);

  const exportToCSV = () => {
    const headers = ['Type', 'Customer Name', 'Phone', 'Service', 'Date & Time', 'Status'];
    const rows = filteredAppointments.map(apt => {
      const d = apt.scheduledTime ? new Date(apt.scheduledTime) : new Date(apt.createdAt);
      return [
        apt._type,
        apt.customer?.name || apt.customerName || '',
        apt.customer?.phone || '',
        apt.service?.name || '',
        `${format(d, 'yyyy-MM-dd HH:mm')}`,
        apt.currentState || 'Scheduled'
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `appointments_${format(currentDate, 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedAppointments = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredAppointments.forEach(apt => {
      const d = apt.scheduledTime ? new Date(apt.scheduledTime) : new Date(apt.createdAt);
      const dateKey = format(d, 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(apt);
    });
    // Sort keys
    const sortedKeys = Object.keys(groups).sort();
    return sortedKeys.map(k => ({ dateKey: k, appointments: groups[k] }));
  }, [filteredAppointments]);

  const navigate = (dir: 1 | -1) => {
    const d = new Date(currentDate);
    if (view === 'day') d.setDate(d.getDate() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const dateLabel = () => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } else if (view === 'week') {
      const ws = getWeekStart(currentDate);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const isToday = view === 'day' && isSameDay(currentDate, new Date());

  return (
    <AdminLayout pageTitle="Appointments">
      <Head>
        <title>Appointments | Qmova</title>
      </Head>

      <div className="max-w-7xl mx-auto space-y-5 p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-white tracking-tight">Appointments</h1>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-0.5">View and manage upcoming bookings.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-sm border border-primary/20 hover:-translate-y-0.5 w-fit"
          >
            <Plus strokeWidth={1.5} className="w-5 h-5" />
            New Appointment
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl p-1">
            {(['day', 'week', 'month'] as CalendarView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all capitalize ${
                  view === v
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Date navigation + search + filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl p-1">
              <button
                onClick={handleRefresh}
                title="Refresh Data"
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors border-r border-border dark:border-dark-border mr-1 pr-2"
              >
                <RefreshCw strokeWidth={2} className={`w-4 h-4 ${isLoading ? 'animate-spin text-primary' : ''}`} />
              </button>
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <ChevronLeft strokeWidth={2} className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all min-w-[170px] text-center ${
                  isToday ? 'text-primary dark:text-sky-400 font-semibold' : 'text-on-surface dark:text-white'
                }`}
              >
                {dateLabel()}
              </button>
              <button
                onClick={() => navigate(1)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                <ChevronRight strokeWidth={2} className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search strokeWidth={1.5} className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface dark:text-white placeholder:text-on-surface-variant w-40"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 max-w-[150px] truncate bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-on-surface dark:text-white"
            >
              <option value="ALL">All Services</option>
              {services.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-2 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl text-sm hover:bg-surface-container hover:text-primary transition-colors text-on-surface dark:text-white"
            >
              <Download strokeWidth={1.5} className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-sm text-on-surface-variant dark:text-zinc-400">
          <Calendar strokeWidth={1.5} className="w-4 h-4" />
          <span>
            <span className="font-semibold text-on-surface dark:text-white">{filteredAppointments.length}</span> appointment{filteredAppointments.length !== 1 ? 's' : ''} for this {view}
          </span>
          {isLoading && <span className="text-xs animate-pulse">Loading...</span>}
        </div>

        {/* Calendar */}
        {view === 'day' ? (
          <div className="mt-2">
            <MatrixCalendar 
              appointments={filteredAppointments} 
              services={services} 
              currentDate={currentDate} 
              onReschedule={(apt, newTime, serviceId) => setRescheduleData({ apt, newTime, serviceId })}
            />
          </div>
        ) : (
          /* Week / Month: grouped list view */
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
            {groupedAppointments.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-center">
                <Calendar strokeWidth={1.5} className="w-12 h-12 text-on-surface-variant mb-4 opacity-40" />
                <p className="font-semibold text-on-surface dark:text-white">No appointments</p>
                <p className="text-sm text-on-surface-variant mt-1">No bookings found for this {view}.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {groupedAppointments.map((group) => {
                  const groupDate = new Date(group.dateKey + 'T12:00:00'); // Midday to avoid TZ issues
                  const isTodayGroup = isSameDay(groupDate, new Date());
                  return (
                    <div key={group.dateKey} className="border-b border-border dark:border-dark-border last:border-0">
                      <div className={`px-6 py-3 font-semibold text-sm flex items-center gap-2 ${isTodayGroup ? 'bg-primary/5 text-primary dark:text-sky-400' : 'bg-surface-container-lowest dark:bg-inverse-surface/10 text-on-surface dark:text-white'}`}>
                        {format(groupDate, 'EEEE, MMMM d, yyyy')}
                        {isTodayGroup && <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] uppercase tracking-wider">Today</span>}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-border dark:border-dark-border text-xs uppercase tracking-wider text-on-surface-variant">
                              <th className="px-6 py-3 font-medium">Time</th>
                              <th className="px-6 py-3 font-medium">Customer</th>
                              <th className="px-6 py-3 font-medium">Service</th>
                              <th className="px-6 py-3 font-medium">Status</th>
                              <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border dark:divide-dark-border">
                            {group.appointments.map((apt: any) => {
                              const d = apt.scheduledTime ? new Date(apt.scheduledTime) : new Date(apt.createdAt);
                              const isCancelled = apt.currentState === 'CANCELLED' || apt.currentState === 'REJECTED' || apt.currentState === 'MISSED';
                              return (
                                <tr
                                  key={apt.id}
                                  className={`hover:bg-surface-container-low dark:hover:bg-white/[0.02] transition-colors ${isCancelled ? 'opacity-60' : ''}`}
                                >
                                  <td className="px-6 py-4 text-sm font-data-mono text-on-surface dark:text-white">
                                    {format(d, 'h:mm a')}
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="font-medium text-on-surface dark:text-white text-sm">{apt.customer?.name || apt.customerName || '—'}</p>
                                    {apt.customer?.phone && <p className="text-xs text-on-surface-variant">{apt.customer.phone}</p>}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-on-surface-variant dark:text-zinc-400">
                                    {apt.service?.name || '—'}
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary/70">{apt._type}</span>
                                      {(() => {
                                         if (!apt.scheduledTime || !apt.waitingStart) return null;
                                         const diffMins = (new Date(apt.waitingStart).getTime() - new Date(apt.scheduledTime).getTime()) / 60000;
                                         if (diffMins < -15) return <span className="font-label-caps text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Early</span>;
                                         if (diffMins > 15) return <span className="font-label-caps text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Late</span>;
                                         return null;
                                      })()}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      apt.currentState === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                      : isCancelled ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                      : apt.currentState === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                      : apt.currentState === 'SERVING' || apt.currentState === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                                      : 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400'
                                    }`}>
                                      {apt.currentState || 'Scheduled'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      {apt._type === 'Appointment' && (apt.currentState === 'SCHEDULED' || apt.currentState === 'CONFIRMED') && isSameDay(d, new Date()) && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); checkInMutation.mutate(apt.id); }}
                                          disabled={checkInMutation.isPending}
                                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1 transition-colors"
                                        >
                                          Check In
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedVisit(apt); }}
                                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        title="View Details"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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

      {/* Reschedule Confirmation Modal */}
      {rescheduleData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card dark:bg-dark-card rounded-2xl w-full max-w-md shadow-xl border border-border dark:border-dark-border overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">Confirm Reschedule</h3>
              <p className="text-on-surface-variant mb-6 text-sm">
                Are you sure you want to reschedule the appointment for <strong>{rescheduleData.apt.customer?.name || rescheduleData.apt.customerName || 'Walk-in'}</strong>?
              </p>
              
              <div className="bg-surface-container-low dark:bg-white/5 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">From:</span>
                  <span className="font-medium">{format(new Date(rescheduleData.apt.scheduledTime || rescheduleData.apt.createdAt), 'MMM d, h:mm a')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-on-surface-variant">To:</span>
                  <span className="font-medium text-indigo-500">{format(rescheduleData.newTime, 'MMM d, h:mm a')}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setRescheduleData(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-surface-container-high transition-colors"
                  disabled={rescheduleMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={() => rescheduleMutation.mutate({ 
                    id: rescheduleData.apt.id, 
                    scheduledStart: rescheduleData.newTime,
                    serviceId: rescheduleData.serviceId
                  })}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                  disabled={rescheduleMutation.isPending}
                >
                  {rescheduleMutation.isPending ? 'Rescheduling...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
