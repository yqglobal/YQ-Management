import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Plus, AlertCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { ScheduleEditor } from '../common/ScheduleEditor';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  service?: AnyFixMe; // If provided, modal is in EDIT mode
}

export function ServiceModal({ isOpen, onClose, locationId, service }: ServiceModalProps) {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('15');
  const [selectedLocId, setSelectedLocId] = useState(locationId || '');

  const [allowAppointments, setAllowAppointments] = useState(true);
  const [allowProviderSelection, setAllowProviderSelection] = useState(false);
  const [requireManualCheckIn, setRequireManualCheckIn] = useState(false);
  const [appointmentGranularityMins, setAppointmentGranularityMins] = useState(15);
  const [slaMode, setSlaMode] = useState<string>('Disabled');
  const [warningThresholdMins, setWarningThresholdMins] = useState<string>('15');
  const [breachThresholdMins, setBreachThresholdMins] = useState<string>('30');
  const [escalationPhones, setEscalationPhones] = useState<string>('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [dateSelectionType, setDateSelectionType] = useState('calendar');
  const [maxDaysInAdvance, setMaxDaysInAdvance] = useState(30);
  const [formConfig, setFormConfig] = useState<AnyFixMe[]>([]);

  // Cascading Availability States
  const [useLocationHours, setUseLocationHours] = useState(true);
  const [businessHoursOverride, setBusinessHoursOverride] = useState<AnyFixMe>(null);
  const [exceptionDatesOverride, setExceptionDatesOverride] = useState<string[]>([]);
  const [newExceptionDate, setNewExceptionDate] = useState('');

  // Pricing & Payments
  const [basePrice, setBasePrice] = useState<string>('');
  const [priceCurrency, setPriceCurrency] = useState('ZAR');
  const [paymentTiming, setPaymentTiming] = useState('NONE');
  const [checkinPayMode, setCheckinPayMode] = useState<string>('COUNTER_ONLY');
  const [allowUnpaidCheckout, setAllowUnpaidCheckout] = useState(false);
  const [autoSendInvoice, setAutoSendInvoice] = useState(false);

  const queryClient = useQueryClient();

  const { data: paymentStatus } = useQuery({
    queryKey: ['tenant-payment-status'],
    queryFn: () => fetchApi('/tenant-payments/status').catch(() => null),
  });
  const stripeConnected = !!(paymentStatus?.chargesEnabled && paymentStatus?.payoutsEnabled);

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setDescription(service.description || '');
      setExpectedDuration(service.expectedDuration?.toString() || '15');
      setSelectedLocId(service.locationId || locationId || '');
      setAllowAppointments(service.allowAppointments || false);
      setAllowProviderSelection(service.allowProviderSelection || false);
      setRequireManualCheckIn(service.requireManualCheckIn || false);
      setAppointmentGranularityMins(service.appointmentGranularityMins || 15);
      
      if (service.slaPolicy) {
        setSlaMode('Custom');
        setWarningThresholdMins(service.slaPolicy.warningThresholdMins?.toString() || '15');
        setBreachThresholdMins(service.slaPolicy.breachThresholdMins?.toString() || '30');
        setEscalationPhones(service.slaPolicy.escalationPhones?.join(', ') || '');
      } else {
        setSlaMode('Disabled');
        setWarningThresholdMins('15');
        setBreachThresholdMins('30');
        setEscalationPhones('');
      }

      setRequiredSkills(service.requiredSkills?.join(', ') || '');
      setDateSelectionType(service.dateSelectionType || 'calendar');
      setMaxDaysInAdvance(service.maxDaysInAdvance ?? 30);
      setBasePrice(service.basePrice ? (service.basePrice / 100).toString() : '');
      setPriceCurrency(service.priceCurrency || 'ZAR');
      
      if (service.serviceFlow) {
        setPaymentTiming(service.serviceFlow.paymentTiming || 'NONE');
        setCheckinPayMode(service.serviceFlow.checkinPayMode || 'COUNTER_ONLY');
        setAllowUnpaidCheckout(service.serviceFlow.allowUnpaidCheckout || false);
        setAutoSendInvoice(service.serviceFlow.autoSendInvoice || false);
      } else {
        setPaymentTiming('NONE');
        setCheckinPayMode('COUNTER_ONLY');
        setAllowUnpaidCheckout(false);
        setAutoSendInvoice(false);
      }
      let initialFormConfig = service.formConfig || [];
      if (initialFormConfig.length === 0 && service.queues && service.queues.length > 0) {
        const queueWithConfig = service.queues.find((q: AnyFixMe) => q.formConfig && q.formConfig.length > 0);
        if (queueWithConfig) {
          initialFormConfig = queueWithConfig.formConfig;
        }
      }
      setFormConfig(initialFormConfig);

      setUseLocationHours(service.useLocationHours ?? true);
      
      if (service.businessHoursOverride) {
        const newHours: AnyFixMe = {
          monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
        };
        Object.keys(service.businessHoursOverride).forEach(day => {
          const val = service.businessHoursOverride[day];
          if (Array.isArray(val)) {
            newHours[day] = val;
          } else if (val) {
            newHours[day] = val.closed ? [] : [{ start: val.start, end: val.end }];
          }
        });
        setBusinessHoursOverride(newHours);
      } else {
        setBusinessHoursOverride(null);
      }
      setExceptionDatesOverride(service.exceptionDatesOverride || []);
    } else {
      setName('');
      setDescription('');
      setExpectedDuration('15');
      setSelectedLocId(locationId || '');

      setAllowAppointments(true);
      setAllowProviderSelection(false);
      setRequireManualCheckIn(false);
      setAppointmentGranularityMins(15);
      setSlaMode('Disabled');
      setWarningThresholdMins('15');
      setBreachThresholdMins('30');
      setEscalationPhones('');
      setRequiredSkills('');
      setFormConfig([]);
      setBasePrice('');
      setPriceCurrency('ZAR');
      setPaymentTiming('NONE');
      setCheckinPayMode('COUNTER_ONLY');
      setAllowUnpaidCheckout(false);
      setAutoSendInvoice(false);
      setUseLocationHours(true);
      setBusinessHoursOverride(null);
      setExceptionDatesOverride([]);
    }
  }, [service, locationId, isOpen]);

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['location'],
    queryFn: () => fetchApi('/location'),
    enabled: isOpen,
  });

  useEffect(() => {
    if (locations.length > 0 && !selectedLocId && !service) {
      setSelectedLocId(locations[0].id);
    }
  }, [locations, selectedLocId, service]);

  const { data: queues = [], isLoading: queuesLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue'),
    enabled: isOpen,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchApi('/users'),
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AnyFixMe) => {
      if (service) {
        return fetchApi(`/service/${service.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        return fetchApi('/service', { method: 'POST', body: JSON.stringify(data) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      if (selectedLocId) {
        queryClient.invalidateQueries({ queryKey: ['location', selectedLocId, 'services'] });
      }
      toast.success(`Service ${service ? 'updated' : 'created'} successfully`);
      handleClose();
    },
    onError: () => toast.error(`Error ${service ? 'updating' : 'creating'} service`),
  });

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedLocId) return;

    if (paymentTiming !== 'NONE' && (checkinPayMode === 'STRIPE_ONLY' || checkinPayMode === 'BOTH')) {
      const numPrice = parseFloat(basePrice || '0');
      const minReqs: Record<string, number> = { ZAR: 8.0, USD: 0.5, EUR: 0.5, GBP: 0.3 };
      const minVal = minReqs[priceCurrency] || 0.5;
      if (numPrice < minVal) {
        toast.error(
          `For Stripe payments in ${priceCurrency}, the minimum amount required by the gateway is ${priceCurrency} ${minVal.toFixed(2)}. Please increase the Base Price.`
        );
        return;
      }
    }
    
    saveMutation.mutate({ 
      name, 
      description, 
      expectedDuration: parseInt(expectedDuration, 10),
      locationId: selectedLocId,

      allowAppointments,
      allowProviderSelection,
      requireManualCheckIn,
      appointmentGranularityMins,
      slaMode,
      warningThresholdMins: parseInt(warningThresholdMins, 10),
      breachThresholdMins: parseInt(breachThresholdMins, 10),
      escalationPhones: escalationPhones.split(',').map(s => s.trim()).filter(Boolean),
      requiredSkills: requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
      dateSelectionType,
      maxDaysInAdvance,
      basePrice: basePrice ? Math.round(parseFloat(basePrice) * 100) : null,
      priceCurrency,
      paymentTiming,
      checkinPayMode: (!stripeConnected || !checkinPayMode) ? 'COUNTER_ONLY' : checkinPayMode,
      allowUnpaidCheckout,
      autoSendInvoice,
      formConfig,
      useLocationHours,
      businessHoursOverride: useLocationHours ? null : businessHoursOverride,
      exceptionDatesOverride: useLocationHours ? null : exceptionDatesOverride
    });
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-200">
      <div className="bg-surface dark:bg-dark-surface border-l border-border dark:border-dark-border w-full max-w-xl shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {service ? 'Edit Service' : 'Add New Service'}
            </h2>
            <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setIsAdvancedMode(false)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${!isAdvancedMode ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'}`}
              >
                Simple
              </button>
              <button
                type="button"
                onClick={() => setIsAdvancedMode(true)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${isAdvancedMode ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'}`}
              >
                Advanced
              </button>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {!locationsLoading && locations.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 rounded-xl text-sm border border-amber-200 dark:border-amber-500/20">
              <p className="font-semibold mb-1">No Locations Found</p>
              <p>You need to create a location before you can add services.</p>
              <a href="/dashboard/settings/operations" className="underline mt-2 inline-block">Go to Settings &gt; Operations to add a location</a>
            </div>
          )}

          {locations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Location <span className="text-red-500">*</span></label>
              <select
                value={selectedLocId}
                onChange={(e) => setSelectedLocId(e.target.value)}
                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                required
              >
                {locations.map((loc: AnyFixMe) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Service Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. General Consultation"
              className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the service..."
              className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none h-24 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
            />
          </div>

          <div className="pt-4 mt-2 border-t border-gray-200 dark:border-white/10">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Pricing & Payments</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Base Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="e.g. 50.00"
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                />
                {paymentTiming !== "NONE" && (checkinPayMode === "STRIPE_ONLY" || checkinPayMode === "BOTH") && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium">
                    <span>⚠️</span>
                    <span>Stripe gateway minimum: {priceCurrency === 'ZAR' ? 'R8.00' : priceCurrency === 'GBP' ? '£0.30' : '$0.50 / €0.50'}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Currency</label>
                <select
                  value={priceCurrency}
                  onChange={(e) => setPriceCurrency(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="ZAR">ZAR (R)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
            {isAdvancedMode && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Payment Settings</label>
                <div className="p-4 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl space-y-4">
                  {/* Row 1: How to Collect (Payment Medium) */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                      How to Collect
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPaymentTiming("NONE")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          paymentTiming === "NONE"
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                        }`}
                      >
                        No payment (Free)
                      </button>

                      <button
                        type="button"
                        disabled={!stripeConnected}
                        onClick={() => {
                          if (stripeConnected) {
                            setCheckinPayMode("STRIPE_ONLY");
                            if (paymentTiming === "NONE" || paymentTiming === "CHECKIN") {
                              setPaymentTiming("BOOKING");
                            }
                          }
                        }}
                        title={
                          !stripeConnected
                            ? "Connect Stripe in Settings to enable online payments"
                            : undefined
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          !stripeConnected
                            ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-400"
                            : paymentTiming !== "NONE" && checkinPayMode === "STRIPE_ONLY"
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                        }`}
                      >
                        Pay via Stripe Online
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCheckinPayMode("COUNTER_ONLY");
                          if (paymentTiming === "NONE" || paymentTiming === "BOOKING") {
                            setPaymentTiming("CHECKIN");
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          paymentTiming !== "NONE" && checkinPayMode === "COUNTER_ONLY"
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                        }`}
                      >
                        Pay at Counter (Cash/Card)
                      </button>

                      <button
                        type="button"
                        disabled={!stripeConnected}
                        onClick={() => {
                          if (stripeConnected) {
                            setCheckinPayMode("BOTH");
                            if (paymentTiming === "NONE") {
                              setPaymentTiming("BOOKING");
                            }
                          }
                        }}
                        title={
                          !stripeConnected
                            ? "Connect Stripe in Settings to enable online payments"
                            : undefined
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          !stripeConnected
                            ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-400"
                            : paymentTiming !== "NONE" && checkinPayMode === "BOTH"
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                        }`}
                      >
                        Both (Customer Chooses)
                      </button>
                    </div>
                  </div>

                  {/* Row 2: When to Collect (Dynamic) */}
                  {paymentTiming !== "NONE" && (
                    <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-white/10">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                          When to Collect
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* STRIPE_ONLY options */}
                          {checkinPayMode === "STRIPE_ONLY" && (
                            <>
                              <button
                                type="button"
                                onClick={() => setPaymentTiming("BOOKING")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                                  paymentTiming === "BOOKING" || paymentTiming === "CHECKIN"
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                                }`}
                              >
                                <span>Pay at Booking (Online)</span>
                                <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                                  Recommended
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentTiming("CHECKOUT")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  paymentTiming === "CHECKOUT"
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                                }`}
                              >
                                Pay at Counter Checkout (Stripe Link/QR)
                              </button>
                            </>
                          )}

                          {/* COUNTER_ONLY options */}
                          {checkinPayMode === "COUNTER_ONLY" && (
                            <>
                              <button
                                type="button"
                                onClick={() => setPaymentTiming("CHECKIN")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  paymentTiming === "CHECKIN" || paymentTiming === "BOOKING"
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                                }`}
                              >
                                Pay at Check-in (Counter)
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentTiming("CHECKOUT")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  paymentTiming === "CHECKOUT"
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                                }`}
                              >
                                Pay at Check-out (Counter)
                              </button>
                            </>
                          )}

                          {/* BOTH options */}
                          {checkinPayMode === "BOTH" && (
                            <>
                              <button
                                type="button"
                                onClick={() => setPaymentTiming("BOOKING")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  paymentTiming === "BOOKING"
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                                }`}
                              >
                                Online at Booking (or Counter Check-in)
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentTiming("CHECKOUT")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  paymentTiming === "CHECKOUT"
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700"
                                }`}
                              >
                                At Counter Check-out (Stripe QR or Cash/Card)
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {!stripeConnected && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>Stripe not connected — online payments disabled. Customers will pay at counter.</span>
                        </div>
                      )}

                      {paymentTiming === "CHECKOUT" && (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowUnpaidCheckout}
                            onChange={(e) => setAllowUnpaidCheckout(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-zinc-300">Allow checkout without payment</span>
                        </label>
                      )}

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoSendInvoice}
                          onChange={(e) => setAutoSendInvoice(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-zinc-300">Auto-send invoice</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Expected Duration (mins)</label>
            <input
              type="number"
              min="1"
              value={expectedDuration}
              onChange={(e) => setExpectedDuration(e.target.value)}
              className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {isAdvancedMode && (
            <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Intelligent Routing & SLA</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Required Skills</label>
                <input
                  type="text"
                  value={requiredSkills}
                  onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder="e.g. Spanish, Advanced Certification (Comma separated)"
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                />
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">Customers booking this service will only be assigned to staff members possessing these skills.</p>
              </div>
              <div className="space-y-4 border-t border-gray-100 dark:border-white/5 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Wait Time Escalation (SLA)</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">SLA Mode</label>
                  <select
                    value={slaMode}
                    onChange={(e) => {
                      setSlaMode(e.target.value);
                      if (e.target.value === 'Standard') {
                         setWarningThresholdMins('15');
                         setBreachThresholdMins('30');
                      } else if (e.target.value === 'Urgent') {
                         setWarningThresholdMins('5');
                         setBreachThresholdMins('15');
                      }
                    }}
                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option value="Disabled">Disabled</option>
                    <option value="Standard">Standard (15m Warn / 30m Breach)</option>
                    <option value="Urgent">Urgent (5m Warn / 15m Breach)</option>
                    <option value="Custom">Custom Thresholds</option>
                  </select>
                </div>

                {slaMode !== 'Disabled' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Warning Threshold (Mins)</label>
                      <input type="number" min="1" value={warningThresholdMins} onChange={e => setWarningThresholdMins(e.target.value)} disabled={slaMode !== 'Custom'} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Breach Threshold (Mins)</label>
                      <input type="number" min="1" value={breachThresholdMins} onChange={e => setBreachThresholdMins(e.target.value)} disabled={slaMode !== 'Custom'} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Escalation Phone Numbers</label>
                      <input type="text" placeholder="e.g. +1234567890, +9876543210" value={escalationPhones} onChange={e => setEscalationPhones(e.target.value)} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {users.filter((u: any) => u.phone).map((u: any) => (
                          <button key={u.id} type="button" onClick={() => setEscalationPhones(prev => prev ? (prev.includes(u.phone) ? prev : `${prev}, ${u.phone}`) : u.phone)} className="text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                            + Add {u.name || 'User'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Appointments & Booking</h3>
            
            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={allowAppointments}
                onChange={(e) => setAllowAppointments(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white block">Allow Appointments</span>
                <span className="text-xs text-gray-500 dark:text-zinc-500 block">Customers can book future timeslots</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={allowProviderSelection}
                onChange={(e) => setAllowProviderSelection(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white block">Allow Provider Selection</span>
                <span className="text-xs text-gray-500 dark:text-zinc-500 block">Customers can pick their preferred staff member</span>
              </div>
            </label>

            {allowAppointments && isAdvancedMode && (
              <>
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireManualCheckIn}
                    onChange={(e) => setRequireManualCheckIn(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white block">Require Manual Check-In</span>
                    <span className="text-xs text-gray-500 dark:text-zinc-500 block">Customers must physically check-in at location</span>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Timeslot Size (Minutes)</label>
                  <select
                    value={appointmentGranularityMins}
                    onChange={(e) => setAppointmentGranularityMins(Number(e.target.value))}
                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option value={5}>5 mins</option>
                    <option value={10}>10 mins</option>
                    <option value={15}>15 mins</option>
                    <option value={20}>20 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Date Selection UI Type</label>
                  <select
                    value={dateSelectionType}
                    onChange={(e) => setDateSelectionType(e.target.value)}
                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option value="calendar">Full Calendar (Recommended)</option>
                    <option value="slider">Date Slider (Great for short-term)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Max Days in Advance</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={maxDaysInAdvance}
                    onChange={(e) => setMaxDaysInAdvance(Number(e.target.value))}
                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">Maximum number of days in the future customers can book</p>
                </div>
              </>
            )}

            <div className="pt-4 mt-2 border-t border-gray-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    Operating Hours & Schedule
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Define whether this service shares the location schedule or has custom operational hours.
                  </p>
                </div>
              </div>

              {/* Inherit Location Hours Card */}
              <div className="p-4 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLocationHours}
                    onChange={(e) => {
                      setUseLocationHours(e.target.checked);
                      if (e.target.checked) {
                        setBusinessHoursOverride(null);
                      }
                    }}
                    className="w-4 h-4 mt-0.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                      Inherit Location Operating Hours
                    </span>
                    <span className="text-xs text-gray-500 dark:text-zinc-400 block mt-0.5">
                      Automatically follows the schedule configured for{' '}
                      <strong>{locations.find((l: AnyFixMe) => l.id === selectedLocId)?.name || 'this location'}</strong>.
                    </span>
                  </div>
                </label>

                {useLocationHours && (
                  <div className="pt-2 border-t border-gray-200/60 dark:border-white/5 flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-500">
                      Want to use the location schedule with slight modifications?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const loc = locations.find((l: AnyFixMe) => l.id === selectedLocId);
                        if (!loc || !loc.businessHours) {
                          setUseLocationHours(false);
                          setBusinessHoursOverride({
                            monday: [{ start: '09:00', end: '17:00' }],
                            tuesday: [{ start: '09:00', end: '17:00' }],
                            wednesday: [{ start: '09:00', end: '17:00' }],
                            thursday: [{ start: '09:00', end: '17:00' }],
                            friday: [{ start: '09:00', end: '17:00' }],
                            saturday: [],
                            sunday: [],
                          });
                          toast.info('Initialized default schedule. Customize below.');
                          return;
                        }
                        setUseLocationHours(false);
                        setBusinessHoursOverride(loc.businessHours);
                        setExceptionDatesOverride(loc.exceptionDates || []);
                        toast.success(`Copied operating hours from ${loc.name}. You can now customize breaks and hours.`);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg transition-colors border border-indigo-200 dark:border-indigo-500/20 shrink-0"
                    >
                      Copy Location Hours as Baseline
                    </button>
                  </div>
                )}
              </div>

              {/* Custom Schedule Editor */}
              {!useLocationHours && (
                <div className="p-4 bg-indigo-50/30 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-indigo-950 dark:text-indigo-300">
                        Custom Service Schedule & Breaks
                      </p>
                      <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70">
                        Configure exact opening times, doctor shifts, and break periods for this service.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const loc = locations.find((l: AnyFixMe) => l.id === selectedLocId);
                          if (loc && loc.businessHours) {
                            setBusinessHoursOverride(loc.businessHours);
                            setExceptionDatesOverride(loc.exceptionDates || []);
                            toast.success(`Re-synced baseline hours from ${loc.name}`);
                          } else {
                            toast.error('Location schedule not found.');
                          }
                        }}
                        className="text-xs font-semibold px-2.5 py-1 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        Copy Location Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUseLocationHours(true);
                          setBusinessHoursOverride(null);
                        }}
                        className="text-xs font-semibold px-2.5 py-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      >
                        Reset to Inherit
                      </button>
                    </div>
                  </div>

                  <ScheduleEditor
                    schedule={
                      businessHoursOverride || {
                        monday: [{ start: '09:00', end: '17:00' }],
                        tuesday: [{ start: '09:00', end: '17:00' }],
                        wednesday: [{ start: '09:00', end: '17:00' }],
                        thursday: [{ start: '09:00', end: '17:00' }],
                        friday: [{ start: '09:00', end: '17:00' }],
                        saturday: [],
                        sunday: [],
                      }
                    }
                    onChange={setBusinessHoursOverride}
                    exceptionDates={exceptionDatesOverride}
                    onChangeExceptions={setExceptionDatesOverride}
                  />
                </div>
              )}
            </div>
          </div>



          
          {isAdvancedMode && (
            <div className="pt-6 border-t border-gray-200 dark:border-white/10 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Custom Booking Questions</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Ask customers for extra information during booking.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormConfig([...formConfig, { id: Math.random().toString(36).substr(2, 9), type: 'text', label: '', required: false, system: false }])}
                    className="text-xs font-semibold px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Blank Form Field
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                 <span className="text-xs font-medium text-gray-500 py-1.5 px-1">Templates:</span>
                 <button type="button" onClick={() => setFormConfig([...formConfig, { id: Math.random().toString(36).substr(2, 9), type: 'email', label: 'Email Address', required: true, system: false }])} className="text-[11px] px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-md hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Email</button>
                 <button type="button" onClick={() => setFormConfig([...formConfig, { id: Math.random().toString(36).substr(2, 9), type: 'date', label: 'Date of Birth', required: false, system: false }])} className="text-[11px] px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-md hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Date of Birth</button>
                 <button type="button" onClick={() => setFormConfig([...formConfig, { id: Math.random().toString(36).substr(2, 9), type: 'text', label: 'ID Number', required: true, system: false }])} className="text-[11px] px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-md hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">ID Number</button>
                 <button type="button" onClick={() => setFormConfig([...formConfig, { id: Math.random().toString(36).substr(2, 9), type: 'textarea', label: 'Reason for Visit', required: false, system: false }])} className="text-[11px] px-2.5 py-1.5 border border-gray-200 dark:border-white/10 rounded-md hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Reason for Visit</button>
              </div>

              {formConfig.length === 0 ? (
                <div className="bg-gray-50 dark:bg-black/20 border border-dashed border-gray-300 dark:border-white/10 rounded-xl p-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-zinc-500 font-medium">No custom questions added.</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">By default, Name and Phone are collected automatically.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formConfig.map((field, index) => (
                    <div key={field.id} className="bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 shadow-sm p-4.5 rounded-xl relative group">
                      <button
                        type="button"
                        onClick={() => setFormConfig(formConfig.filter((_, i) => i !== index))}
                        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                        title="Remove field"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4 pr-10 mt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Question Label</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => {
                              const newConfig = [...formConfig];
                              newConfig[index].label = e.target.value;
                              setFormConfig(newConfig);
                            }}
                            placeholder="e.g. Order Number"
                            className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Response Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const newConfig = [...formConfig];
                              newConfig[index].type = e.target.value;
                              setFormConfig(newConfig);
                            }}
                            className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all font-medium"
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Long Text</option>
                            <option value="email">Email Address</option>
                            <option value="phone">Phone Number</option>
                            <option value="date">Date</option>
                            <option value="number">Number</option>
                            <option value="dropdown">Dropdown List</option>
                            <option value="checkbox">Checkbox (Yes/No)</option>
                          </select>
                        </div>
                      </div>

                      {field.type === 'dropdown' && (
                        <div className="mb-4 pr-10">
                          <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Dropdown Options</label>
                          <input
                            type="text"
                            value={field.options ? field.options.join(', ') : ''}
                            onChange={(e) => {
                              const newConfig = [...formConfig];
                              newConfig[index].options = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                              setFormConfig(newConfig);
                            }}
                            placeholder="Separate options with commas (e.g. Apple, Banana, Orange)"
                            className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-zinc-900 transition-all"
                          />
                          <p className="text-[10px] text-gray-500 mt-1.5">Enter comma-separated values.</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 bg-gray-50 dark:bg-black/20 p-3 rounded-lg border border-gray-100 dark:border-white/5">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => {
                              const newConfig = [...formConfig];
                              newConfig[index].required = e.target.checked;
                              setFormConfig(newConfig);
                            }}
                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Required field</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saveMutation.isPending || !name.trim() || !selectedLocId}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {service ? 'Save Changes' : 'Create Service'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
