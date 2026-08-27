import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, UserPlus, QrCode } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { CreateCustomerModal } from './CreateCustomerModal';
import { usePlan } from '../../hooks/usePlan';
import { QuotaExhaustedModal } from '../QuotaExhaustedModal';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { detectCountryCode } from '../../lib/country-codes';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateAppointmentModal({ isOpen, onClose }: CreateAppointmentModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [locationId, setLocationId] = useState('');
  const [queueId, setQueueId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');
  const [defaultCountry, setDefaultCountry] = useState<any>('US');
  
  const queryClient = useQueryClient();
  const plan = usePlan();

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/customer', { method: 'POST', body: JSON.stringify(data) })
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
    enabled: isOpen,
  });

  React.useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('qmova_scanner_country');
        if (saved) {
          setDefaultCountry(saved);
        } else {
          detectCountryCode().then(country => {
            if (country) setDefaultCountry(country.country);
          });
        }
      }
      
      if (locations.length === 1 && !locationId) {
        setLocationId(locations[0].id);
      }
    }
  }, [isOpen, locations, locationId]);

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
    enabled: isOpen,
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue'),
    enabled: isOpen,
  });

  const { data: availableSlots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: ['slots', queueId, scheduledDate],
    queryFn: () => fetchApi(`/queue/${queueId}/slots?date=${scheduledDate}`),
    enabled: !!queueId && !!scheduledDate,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment created successfully');
      handleClose();
    },
    onError: () => toast.error('Error creating appointment'),
  });

  const handleClose = () => {
    setName('');
    setAge('');
    setPhone('');
    setEmail('');
    setLocationId('');
    setQueueId('');
    setServiceId('');
    setScheduledDate('');
    setScheduledTime('');
    setNotes('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !locationId || !serviceId || !scheduledDate || !scheduledTime) return;
    
    try {
      const service = services.find((s: any) => s.id === serviceId);
      const duration = service?.expectedDuration || 15;
      
      let scheduledStart: Date;
      let scheduledEnd: Date;

      if (queueId) {
        // scheduledTime is a full ISO string from the slots endpoint
        scheduledStart = new Date(scheduledTime);
        scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000);
      } else {
        scheduledStart = new Date(`${scheduledDate}T${scheduledTime}:00`);
        scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000);
      }

      // 1. Create or find customer
      const customer = await createCustomerMutation.mutateAsync({
        name,
        phone: phone || undefined,
        email: email || undefined,
      });
      
      // 2. Create appointment
      await createMutation.mutateAsync({
        customerId: customer.id,
        locationId,
        queueId: queueId || undefined,
        serviceId,
        customerNotes: notes,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        bookingSource: 'APPOINTMENT',
        status: 'CONFIRMED',
        tenantId: '',
        formData: age ? { age } : undefined
      });
    } catch (error) {
      toast.error('Failed to create appointment');
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  if (plan.isAtTokenLimit) {
    return (
      <QuotaExhaustedModal
        type="tokens"
        isOpen={isOpen}
        onClose={onClose}
        usage={plan.usage.tokensThisMonth}
        limit={plan.limits.maxTokens}
        planName={plan.planName}
      />
    );
  }

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Appointment</h2>
                <button
                  onClick={() => {
                    handleClose();
                    router.push('/dashboard/check-in');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all active:scale-[0.98]"
                >
                  <QrCode className="w-4 h-4" /> Scan QR
                </button>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Age <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Optional)</span></label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    placeholder="e.g. 30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Phone <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Optional)</span></label>
                  <PhoneInput
                    international
                    defaultCountry={defaultCountry}
                    onCountryChange={(country) => {
                      if (country) {
                        setDefaultCountry(country);
                        localStorage.setItem('qmova_scanner_country', country);
                      }
                    }}
                    value={phone}
                    onChange={(value) => setPhone(value || '')}
                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 text-gray-900 dark:text-white focus-within:ring-2 focus-within:ring-indigo-500 transition-all text-sm h-11"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Email <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">(Optional)</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Location <span className="text-red-500">*</span></label>
                <select 
                  value={locationId}
                  onChange={(e) => {
                    setLocationId(e.target.value);
                    setQueueId('');
                    setServiceId('');
                  }}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  required
                >
                  <option value="">Select a location</option>
                  {locations.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Service <span className="text-red-500">*</span></label>
                <select 
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    setQueueId('');
                  }}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  required
                  disabled={!locationId}
                >
                  <option value="">Select a service</option>
                  {services
                    .filter((s: any) => !s.locationId || s.locationId === locationId)
                    .map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.expectedDuration} min)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Queue (Optional)</label>
                <select 
                  value={queueId}
                  onChange={(e) => setQueueId(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  disabled={!serviceId}
                >
                  <option value="">No specific queue</option>
                  {(() => {
                    const selectedService = services.find((s: any) => s.id === serviceId);
                    if (!selectedService || !selectedService.queues) return null;
                    return selectedService.queues
                      .filter((q: any) => q.allowAppointments && (!q.locationId || q.locationId === locationId) && q.status === 'ACTIVE')
                      .map((q: any) => (
                      <option key={q.id} value={q.id}>{q.name}</option>
                    ));
                  })()}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Date <span className="text-red-500">*</span></label>
                  <input 
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Time <span className="text-red-500">*</span></label>
                  {queueId && scheduledDate ? (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {isLoadingSlots ? (
                        <p className="col-span-3 text-sm text-center text-gray-500">Loading slots...</p>
                      ) : availableSlots.length === 0 ? (
                        <p className="col-span-3 text-sm text-center text-red-500">No slots available.</p>
                      ) : (
                        availableSlots.map((slot: string) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setScheduledTime(slot)}
                            className={`p-2 rounded-lg text-sm font-bold transition-colors ${scheduledTime === slot ? 'bg-indigo-600 text-white shadow-md border-transparent' : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-900 dark:text-white'}`}
                          >
                            {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    <input 
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-[46px]"
                      required
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[80px]"
                  placeholder="Optional notes for this appointment..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-white/10">
                <button 
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createMutation.isPending || !name || !locationId || !serviceId || !scheduledDate || !scheduledTime}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createMutation.isPending ? 'Creating...' : 'Create Appointment'}
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
