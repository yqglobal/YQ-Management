import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, QrCode, Users, ListOrdered, Info, Calendar, Clock, CheckCircle2 } from 'lucide-react';
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
  'w-full bg-surface-container-low dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-2.5 text-on-surface dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm';
const labelCls = 'block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1';

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

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            
            {/* Header & Mode Switch */}
            <div className="p-5 border-b border-border dark:border-zinc-800 bg-surface-container-low dark:bg-black/20 shrink-0 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-on-surface dark:text-white">
                    Reception Service Booking
                  </h2>
                  <button
                    onClick={() => {
                      handleClose();
                      router.push('/dashboard/scan');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold rounded-lg transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Scan QR
                  </button>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 hover:bg-surface-container-high rounded-full transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Segmented Booking Mode Selector */}
              <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setBookingMode('walkin')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    bookingMode === 'walkin'
                      ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-sky-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Live Walk-in (Queue Slot)
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('appointment')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    bookingMode === 'appointment'
                      ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-sky-400 shadow-xs'
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
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1">
                  Customer Details
                </p>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="col-span-2 sm:col-span-1">
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

                  <div className="col-span-2 sm:col-span-1 grid grid-cols-2 gap-2">
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
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className={`${inputCls} appearance-none cursor-pointer`}
                      >
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>
                      Phone <span className="text-[10px] text-zinc-400 lowercase font-normal">(for WhatsApp tracking)</span>
                    </label>
                    <div className="h-[42px] rounded-xl bg-surface-container-low dark:bg-black/50 border border-border dark:border-dark-border focus-within:ring-1 focus-within:ring-primary focus-within:border-primary overflow-hidden flex items-center px-3">
                      <PhoneInput
                        value={phone}
                        onChange={setPhone}
                        placeholder="+1 234 567 8900"
                        className="w-full text-sm text-on-surface dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 dark:border-zinc-800" />

              {/* ── Service & Location ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                  Service Selection
                </p>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>
                      Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={locationId}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      required
                      className={`${inputCls} appearance-none cursor-pointer`}
                    >
                      <option value="">Select location...</option>
                      {locations.map((l: AnyFixMe) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>
                      Service <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={serviceId}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      required
                      disabled={!locationId}
                      className={`${inputCls} appearance-none cursor-pointer disabled:opacity-50`}
                    >
                      <option value="">Select service...</option>
                      {services.map((s: AnyFixMe) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.expectedDuration || 15} min)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mode-specific Slot or Queue selection */}
                  {bookingMode === 'walkin' ? (
                    relevantQueues.length > 1 && (
                      <div className="col-span-2">
                        <label className={labelCls}>
                          Queue{' '}
                          <span className="text-[10px] text-zinc-400 lowercase font-normal">
                            (Auto-assigned if not selected)
                          </span>
                        </label>
                        <select
                          value={queueId}
                          onChange={(e) => setQueueId(e.target.value)}
                          className={`${inputCls} appearance-none cursor-pointer`}
                        >
                          <option value="">Auto-assign to open queue</option>
                          {relevantQueues.map((q: AnyFixMe) => (
                            <option key={q.id} value={q.id}>
                              {q.name} ({q.status})
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  ) : (
                    /* Appointment Slot Picker */
                    <div className="col-span-2 space-y-3 bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>
                            <Calendar className="w-3.5 h-3.5 inline mr-1" />
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
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className={labelCls}>
                              <Clock className="w-3.5 h-3.5 inline mr-1" />
                              Time Slot <span className="text-red-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsCustomTime(!isCustomTime)}
                              className="text-[10px] font-semibold text-indigo-600 dark:text-sky-400 hover:underline"
                            >
                              {isCustomTime ? 'Use slot grid' : 'Custom time'}
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
                            <div className="text-xs text-zinc-500 py-1">
                              {scheduledTime ? (
                                <span className="font-semibold text-indigo-600 dark:text-sky-400">
                                  Selected:{' '}
                                  {scheduledTime.includes('T')
                                    ? new Date(scheduledTime).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : scheduledTime}
                                </span>
                              ) : (
                                'Select a slot below'
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Slot selection grid */}
                      {!isCustomTime && (
                        <div>
                          <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2 flex items-center justify-between">
                            <span>Available Time Slots for {scheduledDate}:</span>
                            {isLoadingSlots && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                                <Loader2 className="w-3 h-3 animate-spin" /> Checking optimizer...
                              </span>
                            )}
                          </div>

                          {!serviceId ? (
                            <p className="text-xs text-zinc-400 py-2 text-center">
                              Select a service above to view available slots.
                            </p>
                          ) : isLoadingSlots ? (
                            <div className="py-4 text-center text-xs text-zinc-400">
                              Calculating slot availability from schedule...
                            </div>
                          ) : availableSlots.length === 0 ? (
                            <div className="p-3 text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-xl">
                              No slots available on this date or service hours are closed. Use &quot;Custom time&quot; to override.
                            </div>
                          ) : (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1">
                              {availableSlots.map((slot: any, idx: number) => {
                                const isAvail = slot.available !== false;
                                const timeLabel =
                                  slot.time ||
                                  (slot.start
                                    ? new Date(slot.start).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : `Slot ${idx + 1}`);
                                const slotVal = slot.start || slot.time;
                                const isSelected = scheduledTime === slotVal;

                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    disabled={!isAvail}
                                    onClick={() => setScheduledTime(slotVal)}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold font-mono text-center transition-all ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : isAvail
                                        ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500'
                                        : 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 line-through cursor-not-allowed opacity-50'
                                    }`}
                                  >
                                    {timeLabel}
                                  </button>
                                );
                              })}
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
                      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3">
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
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-low dark:bg-black/20 rounded-xl p-2.5 border border-border dark:border-dark-border">
                        <Info className="w-4 h-4 shrink-0" />
                        Single stage service queue.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 dark:border-zinc-800" />

              {/* ── Visit Options ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                  Visit Details & Notes
                </p>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>
                      <Users className="w-3.5 h-3.5 inline mr-1" />
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
                    <div className="col-span-2 sm:col-span-1">
                      <label className={labelCls}>Priority Level</label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className={`${inputCls} appearance-none cursor-pointer`}
                      >
                        <option value="0">Normal</option>
                        <option value="1">Elevated</option>
                        <option value="2">High</option>
                        <option value="3">Urgent / Priority</option>
                      </select>
                    </div>
                  )}

                  <div className="col-span-2">
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
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="pt-2 flex justify-end gap-3 border-t border-border/50 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-xl font-medium transition-colors text-sm"
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
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 text-sm min-w-[150px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : bookingMode === 'walkin' ? (
                    'Add to Queue'
                  ) : (
                    'Book Appointment'
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
