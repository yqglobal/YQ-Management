import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, QrCode, Users, ListOrdered, Info, ChevronDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/router';
import { useAuth } from '../AuthContext';

interface CreateVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocationId?: string;
}

const inputCls = "w-full bg-surface-container-low dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-2.5 text-on-surface dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm";
const labelCls = "block text-xs font-medium text-on-surface-variant mb-1";

export function CreateVisitModal({ isOpen, onClose, defaultLocationId }: CreateVisitModalProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Customer fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Visit fields
  const [locationId, setLocationId] = useState(defaultLocationId && defaultLocationId !== 'all' ? defaultLocationId : '');
  const [serviceId, setServiceId] = useState('');
  const [queueId, setQueueId] = useState('');
  const [accompanyingGuests, setAccompanyingGuests] = useState('0');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('0');

  const queryClient = useQueryClient();

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

  // Fetch queues for selected location (to show queue selector)
  const { data: locationQueues = [] } = useQuery({
    queryKey: ['queues-for-location', locationId],
    queryFn: () => fetchApi(`/queue?locationId=${locationId}`),
    enabled: isOpen && !!locationId,
  });

  // Fetch service flow preview when a service is selected
  const { data: serviceFlow } = useQuery({
    queryKey: ['service-flow-preview', serviceId],
    queryFn: () => fetchApi(`/service-flow/by-service/${serviceId}`),
    enabled: isOpen && !!serviceId,
    retry: false,
  });

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'ADMIN';

  const locations = isAdmin
    ? allLocations
    : allLocations.filter((l: AnyFixMe) => user?.allowedLocationIds?.includes(l.id));

  const services = (isAdmin
    ? allServices
    : allServices.filter((s: AnyFixMe) => user?.allowedServiceIds?.includes(s.id))
  ).filter((s: AnyFixMe) => !s.locationId || s.locationId === locationId);

  // Queues relevant to selected service
  const relevantQueues = locationQueues.filter(
    (q: AnyFixMe) => !serviceId || q.services?.some((s: AnyFixMe) => s.id === serviceId)
  );

  const walkInMutation = useMutation({
    mutationFn: (data: AnyFixMe) =>
      fetchApi('/visits/staff-walkin', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['service-desk'] });
      toast.success('Walk-in created and added to queue');
      handleClose();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create walk-in'),
  });

  const handleClose = () => {
    setName(''); setAge(''); setPhone(''); setEmail('');
    setLocationId(defaultLocationId && defaultLocationId !== 'all' ? defaultLocationId : '');
    setServiceId(''); setQueueId(''); setAccompanyingGuests('0');
    setNotes(''); setPriority('0');
    onClose();
  };

  const handleLocationChange = (v: string) => {
    setLocationId(v);
    setServiceId('');
    setQueueId('');
  };

  const handleServiceChange = (v: string) => {
    setServiceId(v);
    setQueueId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !locationId || !serviceId) return;

    walkInMutation.mutate({
      customerName: name.trim(),
      phone: phone || undefined,
      email: email || undefined,
      age: age ? parseInt(age) : undefined,
      locationId,
      serviceId,
      queueId: queueId || undefined,
      accompanyingGuests: parseInt(accompanyingGuests) || 0,
      notes: notes || undefined,
      priority: parseInt(priority) || 0,
    });
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const flowSteps: AnyFixMe[] = serviceFlow?.steps || [];

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface dark:bg-dark-card border border-border dark:border-dark-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-on-surface dark:text-white">New Walk-in</h2>
                <button
                  onClick={() => { handleClose(); router.push('/dashboard/scan'); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold rounded-lg transition-all"
                >
                  <QrCode className="w-4 h-4" /> Scan QR Instead
                </button>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">

              {/* ── Customer Details ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">Customer Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe" className={inputCls} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Age <span className="text-outline text-[10px]">(Optional)</span></label>
                    <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 30" min="0" max="150" className={inputCls} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Phone <span className="text-outline text-[10px]">(Optional — for WhatsApp)</span></label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 8900" className={inputCls} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Email <span className="text-outline text-[10px]">(Optional)</span></label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" className={inputCls} />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50" />

              {/* ── Service Selection ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">Service & Queue</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Location <span className="text-red-500">*</span></label>
                    <select value={locationId} onChange={(e) => handleLocationChange(e.target.value)} required className={`${inputCls} appearance-none cursor-pointer`}>
                      <option value="">Select location...</option>
                      {locations.map((l: AnyFixMe) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Service <span className="text-red-500">*</span></label>
                    <select value={serviceId} onChange={(e) => handleServiceChange(e.target.value)} required disabled={!locationId} className={`${inputCls} appearance-none cursor-pointer disabled:opacity-50`}>
                      <option value="">Select service...</option>
                      {services.map((s: AnyFixMe) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.expectedDuration} min)</option>
                      ))}
                    </select>
                  </div>

                  {/* Queue selector — optional, auto-resolves if left blank */}
                  {relevantQueues.length > 1 && (
                    <div className="col-span-2">
                      <label className={labelCls}>Queue <span className="text-outline text-[10px]">(Auto-assigned if not set)</span></label>
                      <select value={queueId} onChange={(e) => setQueueId(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                        <option value="">Auto-assign to open queue</option>
                        {relevantQueues.map((q: AnyFixMe) => (
                          <option key={q.id} value={q.id}>{q.name} ({q.status})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Service Flow Preview */}
                {serviceId && (
                  <div className="mt-3">
                    {flowSteps.length > 0 ? (
                      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <ListOrdered className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            Service Flow: {flowSteps.length} step{flowSteps.length !== 1 ? 's' : ''}
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
                              {i + 1}. {step.name}{step.isOptional ? ' *' : ''}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1.5">* Optional steps can be skipped by the customer or staff</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-low dark:bg-black/20 rounded-xl p-3 border border-border dark:border-dark-border">
                        <Info className="w-4 h-4 shrink-0" />
                        No service flow configured for this service. Standard queue only.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-border/50" />

              {/* ── Visit Options ── */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">Visit Options</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>
                      <Users className="w-3.5 h-3.5 inline mr-1" />
                      Accompanying Guests
                    </label>
                    <input
                      type="number"
                      value={accompanyingGuests}
                      onChange={e => setAccompanyingGuests(e.target.value)}
                      min="0"
                      max="50"
                      className={inputCls}
                    />
                    <p className="text-[10px] text-on-surface-variant mt-1">Affects meal/entitlement formulas in service flows</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Priority Override <span className="text-outline text-[10px]">(0 = normal)</span></label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                      <option value="0">Normal</option>
                      <option value="1">Elevated</option>
                      <option value="2">High</option>
                      <option value="3">Urgent / VIP</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Staff Notes <span className="text-outline text-[10px]">(Internal — not visible to customer)</span></label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      placeholder="e.g. Wheelchair user, follow-up from last visit..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={handleClose} className="px-5 py-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-xl font-medium transition-colors text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={walkInMutation.isPending || !name.trim() || !locationId || !serviceId}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 text-sm min-w-[140px]"
                >
                  {walkInMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to Queue'}
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
