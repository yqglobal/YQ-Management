import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Loader2,
  QrCode,
  Users,
  ListOrdered,
  Info,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Briefcase,
  CalendarCheck,
  User,
  Sparkles,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/router';
import { useAuth } from '../AuthContext';
import PhoneInput from '../PhoneInput';
import { format } from 'date-fns';

interface CreateVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocationId?: string;
  initialMode?: 'walkin' | 'appointment';
}

const inputCls =
  'w-full h-11 bg-white dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all [&:-webkit-autofill]:shadow-[0_0_0_1000px_#09090b_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#f4f4f5]';
const labelCls =
  'block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5';

const formatSlotDisplay = (slot: any): string => {
  if (!slot) return '';
  if (typeof slot === 'string') {
    if (slot.includes('T')) {
      try {
        return new Date(slot).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      } catch {
        return slot;
      }
    }
    return slot;
  }
  if (slot.displayTime) return slot.displayTime;
  if (slot.localTime) {
    const parts = slot.localTime.split(':');
    if (parts.length >= 2) {
      const hour = parseInt(parts[0], 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      return `${h12}:${parts[1]} ${ampm}`;
    }
    return slot.localTime;
  }
  const raw = slot.time || slot.start;
  if (raw && typeof raw === 'string' && raw.includes('T')) {
    try {
      return new Date(raw).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return raw;
    }
  }
  return slot.time || 'Slot';
};

export function CreateVisitModal({
  isOpen,
  onClose,
  defaultLocationId,
  initialMode = 'walkin',
}: CreateVisitModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Mode: Walk-in vs Appointment
  const [bookingMode, setBookingMode] = useState<'walkin' | 'appointment'>(initialMode);

  // Customer fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Visit / Service fields
  const [locationId, setLocationId] = useState(
    defaultLocationId && defaultLocationId !== 'all' ? defaultLocationId : ''
  );
  const [serviceId, setServiceId] = useState('');
  const [queueId, setQueueId] = useState('');
  const [accompanyingGuests, setAccompanyingGuests] = useState('0');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('0');

  // Appointment specific fields
  const [scheduledDate, setScheduledDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [scheduledTime, setScheduledTime] = useState('');
  const [isCustomTime, setIsCustomTime] = useState(false);

  // Sync mode if initialMode changes
  React.useEffect(() => {
    if (isOpen) {
      setBookingMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const { data: allLocations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
    enabled: isOpen,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
    enabled: isOpen,
  });

  // Queues for location
  const { data: locationQueues = [] } = useQuery({
    queryKey: ['queues-for-location', locationId],
    queryFn: () => fetchApi(`/queue?locationId=${locationId}`),
    enabled: isOpen && !!locationId,
  });

  // Service flow preview
  const { data: serviceFlow } = useQuery({
    queryKey: ['service-flow-preview', serviceId],
    queryFn: () => fetchApi(`/service-flows/by-service/${serviceId}`),
    enabled: isOpen && !!serviceId,
    retry: false,
  });

  // Available slots for appointment mode
  const { data: availableSlots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: ['available-slots', serviceId, scheduledDate],
    queryFn: () => {
      if (!serviceId || !scheduledDate) return Promise.resolve([]);
      return fetchApi(`/service/${serviceId}/slots?date=${scheduledDate}`);
    },
    enabled: isOpen && bookingMode === 'appointment' && !!serviceId && !!scheduledDate,
  });

  const isAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'OWNER' || user?.role === 'ADMIN';

  const locations = isAdmin
    ? allLocations
    : allLocations.filter((l: AnyFixMe) => user?.allowedLocationIds?.includes(l.id));

  const services = (
    isAdmin
      ? allServices
      : allServices.filter((s: AnyFixMe) => user?.allowedServiceIds?.includes(s.id))
  ).filter((s: AnyFixMe) => !s.locationId || s.locationId === locationId);

  const relevantQueues = locationQueues.filter(
    (q: AnyFixMe) => !serviceId || q.services?.some((s: AnyFixMe) => s.id === serviceId)
  );

  const walkInMutation = useMutation({
    mutationFn: (data: AnyFixMe) =>
      fetchApi('/visits/staff-walkin', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['service-desk'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Walk-in created and added to live queue');
      handleClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create walk-in'),
  });

  const appointmentMutation = useMutation({
    mutationFn: async (payload: AnyFixMe) => {
      // 1. Ensure customer profile exists
      let customerId: string | undefined;
      try {
        const custRes = await fetchApi('/customer', {
          method: 'POST',
          body: JSON.stringify({
            name: payload.name,
            phone: payload.phone || undefined,
            email: payload.email || undefined,
            notes: payload.notes || undefined,
          }),
        });
        customerId = custRes.id;
      } catch {
        /* proceed if customer already exists or failover */
      }

      // 2. Post appointment
      return fetchApi('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          customerName: payload.name,
          phone: payload.phone || undefined,
          email: payload.email || undefined,
          serviceId: payload.serviceId,
          locationId: payload.locationId,
          queueId: payload.queueId || undefined,
          scheduledStart: payload.scheduledStart,
          scheduledEnd: payload.scheduledEnd,
          customerNotes: payload.notes || undefined,
          accompanyingGuests: payload.accompanyingGuests,
          bookingSource: 'RECEPTION',
          status: 'CONFIRMED',
          formData: {
            age: payload.age || undefined,
            gender: payload.gender || undefined,
          },
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-view'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Appointment booked successfully');
      handleClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to book appointment'),
  });

  const handleClose = () => {
    setName('');
    setAge('');
    setGender('');
    setPhone('');
    setEmail('');
    setLocationId(defaultLocationId && defaultLocationId !== 'all' ? defaultLocationId : '');
    setServiceId('');
    setQueueId('');
    setAccompanyingGuests('0');
    setNotes('');
    setPriority('0');
    setScheduledDate(format(new Date(), 'yyyy-MM-dd'));
    setScheduledTime('');
    setIsCustomTime(false);
    onClose();
  };

  const handleLocationChange = (v: string) => {
    setLocationId(v);
    setServiceId('');
    setQueueId('');
    setScheduledTime('');
  };

  const handleServiceChange = (v: string) => {
    setServiceId(v);
    setQueueId('');
    setScheduledTime('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !locationId || !serviceId) return;

    if (bookingMode === 'walkin') {
      walkInMutation.mutate({
        customerName: name.trim(),
        phone: phone || undefined,
        email: email || undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        locationId,
        serviceId,
        queueId: queueId || undefined,
        accompanyingGuests: parseInt(accompanyingGuests, 10) || 0,
        notes: notes || undefined,
        priority: parseInt(priority, 10) || 0,
      });
    } else {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Please select an appointment date and time slot.');
        return;
      }

      const selectedService = services.find((s: AnyFixMe) => s.id === serviceId);
      const durationMins = selectedService?.expectedDuration || 30;

      let scheduledStart: Date;
      if (scheduledTime.includes('T')) {
        scheduledStart = new Date(scheduledTime);
      } else {
        scheduledStart = new Date(`${scheduledDate}T${scheduledTime}:00`);
      }
      const scheduledEnd = new Date(scheduledStart.getTime() + durationMins * 60000);

      appointmentMutation.mutate({
        name: name.trim(),
        phone: phone || undefined,
        email: email || undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        locationId,
        serviceId,
        queueId: queueId || undefined,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        accompanyingGuests: parseInt(accompanyingGuests, 10) || 0,
        notes: notes || undefined,
      });
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const flowSteps: AnyFixMe[] = serviceFlow?.steps || [];
  const isSubmitting = walkInMutation.isPending || appointmentMutation.isPending;

  const quickDates = useMemo(() => {
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(today.getDate() + 1);
    const d2 = new Date(today);
    d2.setDate(today.getDate() + 2);
    const d3 = new Date(today);
    d3.setDate(today.getDate() + 3);

    return [
      { label: 'Today', date: format(today, 'yyyy-MM-dd') },
      { label: 'Tomorrow', date: format(d1, 'yyyy-MM-dd') },
      { label: format(d2, 'EEE, d MMM'), date: format(d2, 'yyyy-MM-dd') },
      { label: format(d3, 'EEE, d MMM'), date: format(d3, 'yyyy-MM-dd') },
    ];
  }, []);

  if (!isOpen || typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            
            {/* Header & Mode Switch */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/40 shrink-0 space-y-3.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/70 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
                      Reception Service Booking
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Issue live ticket or book scheduled appointment slot
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleClose();
                      router.push('/dashboard/scan');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-semibold rounded-xl transition-all active:scale-95"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Scan QR
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Segmented Booking Mode Selector */}
              <div className="flex bg-zinc-100/90 dark:bg-zinc-950 p-1 rounded-xl gap-1 border border-zinc-200/60 dark:border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setBookingMode('walkin')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    bookingMode === 'walkin'
                      ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-sky-400 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Live Walk-in (Queue Slot)
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('appointment')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    bookingMode === 'appointment'
                      ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-sky-400 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Book Appointment (Slot Select)
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* ── Customer Details ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  Customer Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelCls}>
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="e.g. John Doe"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      Phone <span className="text-[10px] text-zinc-400 lowercase font-normal">(for WhatsApp tracking)</span>
                    </label>
                    <div className="h-11 rounded-xl bg-white dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 hover:border-zinc-300 dark:hover:border-zinc-700 overflow-hidden flex items-center px-3 transition-all">
                      <PhoneInput
                        value={phone}
                        onChange={setPhone}
                        placeholder="+1 234 567 8900"
                        className="w-full text-sm text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={labelCls}>Age</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 30"
                        min="0"
                        max="150"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Gender</label>
                      <div className="relative">
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className={`${inputCls} appearance-none pr-8 cursor-pointer`}
                        >
                          <option value="">Select...</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800/80" />

              {/* ── Service & Location ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                  Service Selection
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelCls}>
                      <MapPin className="w-3 h-3 inline mr-1 text-zinc-400" />
                      Location <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={locationId}
                        onChange={(e) => handleLocationChange(e.target.value)}
                        required
                        className={`${inputCls} appearance-none pr-9 cursor-pointer`}
                      >
                        <option value="">Select location...</option>
                        {locations.map((l: AnyFixMe) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`${labelCls} mb-0`}>
                        <Briefcase className="w-3 h-3 inline mr-1 text-zinc-400" />
                        Service <span className="text-red-500">*</span>
                      </label>
                      {serviceId && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/70">
                          {services.find((s: any) => s.id === serviceId)?.expectedDuration || 15} mins
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <select
                        value={serviceId}
                        onChange={(e) => handleServiceChange(e.target.value)}
                        required
                        disabled={!locationId}
                        className={`${inputCls} appearance-none pr-9 cursor-pointer disabled:opacity-50`}
                      >
                        <option value="">Select service...</option>
                        {services.map((s: AnyFixMe) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.expectedDuration || 15} min)
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Mode-specific Slot or Queue selection */}
                  {bookingMode === 'walkin' ? (
                    relevantQueues.length > 1 && (
                      <div className="col-span-1 sm:col-span-2">
                        <label className={labelCls}>
                          Queue{' '}
                          <span className="text-[10px] text-zinc-400 lowercase font-normal">
                            (Auto-assigned if not selected)
                          </span>
                        </label>
                        <div className="relative">
                          <select
                            value={queueId}
                            onChange={(e) => setQueueId(e.target.value)}
                            className={`${inputCls} appearance-none pr-9 cursor-pointer`}
                          >
                            <option value="">Auto-assign to open queue</option>
                            {relevantQueues.map((q: AnyFixMe) => (
                              <option key={q.id} value={q.id}>
                                {q.name} ({q.status})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    )
                  ) : (
                    /* Appointment Slot Picker */
                    <div className="col-span-1 sm:col-span-2 space-y-4 bg-zinc-50/80 dark:bg-zinc-950/60 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>
                            <Calendar className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
                            Appointment Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={scheduledDate}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => {
                              setScheduledDate(e.target.value);
                              setScheduledTime('');
                            }}
                            required
                            className={inputCls}
                          />

                          {/* Quick Date Chips */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[10px] text-zinc-400 font-medium">Quick:</span>
                            {quickDates.map((qd) => (
                              <button
                                key={qd.label}
                                type="button"
                                onClick={() => {
                                  setScheduledDate(qd.date);
                                  setScheduledTime('');
                                }}
                                className={`text-[11px] px-2 py-0.5 rounded-lg font-medium transition-all ${
                                  scheduledDate === qd.date
                                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                                    : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                                }`}
                              >
                                {qd.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className={`${labelCls} mb-0`}>
                              <Clock className="w-3.5 h-3.5 inline mr-1 text-zinc-400" />
                              Time Slot <span className="text-red-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomTime(!isCustomTime);
                                setScheduledTime('');
                              }}
                              className="text-[11px] font-semibold text-indigo-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                            >
                              {isCustomTime ? 'Use slot grid' : 'Set custom time'}
                            </button>
                          </div>

                          {isCustomTime ? (
                            <input
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              required
                              className={inputCls}
                            />
                          ) : (
                            <div className="h-11 rounded-xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 flex items-center px-3.5 text-xs text-zinc-500">
                              {scheduledTime ? (
                                <span className="font-semibold text-indigo-600 dark:text-sky-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Selected: {formatSlotDisplay(scheduledTime)}
                                </span>
                              ) : (
                                <span>Select an available time slot below</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Slot selection grid */}
                      {!isCustomTime && (
                        <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                          <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2.5 flex items-center justify-between">
                            <span>
                              Available Time Slots for{' '}
                              <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                                {new Date(scheduledDate + 'T00:00:00').toLocaleDateString([], {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                              :
                            </span>
                            {isLoadingSlots && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                                <Loader2 className="w-3 h-3 animate-spin" /> Checking optimizer...
                              </span>
                            )}
                          </div>

                          {!serviceId ? (
                            <div className="py-6 text-center text-xs text-zinc-400 bg-white dark:bg-zinc-900/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                              Please select a service above to view available appointment slots.
                            </div>
                          ) : isLoadingSlots ? (
                            <div className="py-8 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                              Calculating real-time slot availability...
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <div className="p-4 text-center text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                              No slots available on this date or service hours are closed.{' '}
                              <button
                                type="button"
                                onClick={() => setIsCustomTime(true)}
                                className="underline font-bold hover:text-amber-800 dark:hover:text-amber-300 ml-1"
                              >
                                Set custom time
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                                {availableSlots.map((slot: any, idx: number) => {
                                  const isAvail = slot.available !== false;
                                  const timeLabel = formatSlotDisplay(slot);
                                  const slotVal = slot.time || slot.start || slot.localTime || slot;
                                  const isSelected =
                                    scheduledTime === slotVal ||
                                    scheduledTime === slot.time ||
                                    scheduledTime === slot.start;

                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      disabled={!isAvail}
                                      onClick={() => setScheduledTime(slotVal)}
                                      className={`py-2 px-2 rounded-xl text-xs font-semibold text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                                        isSelected
                                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/40 font-bold scale-[1.02]'
                                          : isAvail
                                          ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20'
                                          : 'bg-zinc-100/80 dark:bg-zinc-900/40 text-zinc-400 dark:text-zinc-600 line-through cursor-not-allowed border border-transparent opacity-40'
                                      }`}
                                    >
                                      <span className="font-mono text-xs">{timeLabel}</span>
                                      {!isAvail && (
                                        <span className="text-[9px] font-sans font-normal opacity-75">
                                          Booked
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {scheduledTime && (
                                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>
                                    Confirmed: <strong>{formatSlotDisplay(scheduledTime)}</strong> for{' '}
                                    {services.find((s: any) => s.id === serviceId)?.name || 'Service'} on{' '}
                                    {new Date(scheduledDate + 'T00:00:00').toLocaleDateString([], {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Service Flow Preview for Walk-in */}
                {bookingMode === 'walkin' && serviceId && (
                  <div className="mt-3">
                    {flowSteps.length > 0 ? (
                      <div className="bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <ListOrdered className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            Execution Flow: {flowSteps.length} step{flowSteps.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {flowSteps.map((step: AnyFixMe, i: number) => (
                            <span
                              key={step.id}
                              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                step.isOptional
                                  ? 'bg-indigo-100/80 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300'
                                  : 'bg-indigo-200 text-indigo-800 dark:bg-indigo-800/60 dark:text-indigo-200'
                              }`}
                            >
                              {i + 1}. {step.name}
                              {step.isOptional ? ' *' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl p-2.5 border border-zinc-200 dark:border-zinc-800">
                        <Info className="w-4 h-4 shrink-0 text-zinc-400" />
                        Single stage service queue.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800/80" />

              {/* ── Visit Options ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-indigo-500" />
                  Visit Details & Notes
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className={labelCls}>
                      <Users className="w-3 h-3 inline mr-1 text-zinc-400" />
                      Accompanying Guests
                    </label>
                    <input
                      type="number"
                      value={accompanyingGuests}
                      onChange={(e) => setAccompanyingGuests(e.target.value)}
                      min="0"
                      max="50"
                      className={inputCls}
                    />
                  </div>

                  {bookingMode === 'walkin' && (
                    <div>
                      <label className={labelCls}>Priority Level</label>
                      <div className="relative">
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className={`${inputCls} appearance-none pr-9 cursor-pointer`}
                        >
                          <option value="0">Normal</option>
                          <option value="1">Elevated</option>
                          <option value="2">High</option>
                          <option value="3">Urgent / Priority</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div className="col-span-1 sm:col-span-2">
                    <label className={labelCls}>
                      Internal Staff Notes{' '}
                      <span className="text-[10px] text-zinc-400 lowercase font-normal">
                        (not visible to customer)
                      </span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="e.g. Wheelchair assistance required, returning customer..."
                      className="w-full bg-white dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="pt-3 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !name.trim() ||
                    !locationId ||
                    !serviceId ||
                    (bookingMode === 'appointment' && (!scheduledDate || !scheduledTime))
                  }
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl font-semibold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:shadow-none text-sm min-w-[170px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : bookingMode === 'walkin' ? (
                    <>
                      <Users className="w-4 h-4" /> Add to Live Queue
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="w-4 h-4" /> Confirm Appointment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
