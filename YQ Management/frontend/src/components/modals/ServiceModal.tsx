import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { ScheduleEditor, WeeklySchedule } from '../common/ScheduleEditor';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  service?: any; // If provided, modal is in EDIT mode
}

export function ServiceModal({ isOpen, onClose, locationId, service }: ServiceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('15');
  const [selectedLocId, setSelectedLocId] = useState(locationId || '');
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [allowAppointments, setAllowAppointments] = useState(false);
  const [allowProviderSelection, setAllowProviderSelection] = useState(false);
  const [requireManualCheckIn, setRequireManualCheckIn] = useState(false);
  const [appointmentGranularityMins, setAppointmentGranularityMins] = useState(15);
  const [formConfig, setFormConfig] = useState<any[]>([]);

  // Cascading Availability States
  const [useLocationHours, setUseLocationHours] = useState(true);
  const [businessHoursOverride, setBusinessHoursOverride] = useState<any>(null);
  const [exceptionDatesOverride, setExceptionDatesOverride] = useState<string[]>([]);
  const [newExceptionDate, setNewExceptionDate] = useState('');

  const queryClient = useQueryClient();

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
      let initialFormConfig = service.formConfig || [];
      if (initialFormConfig.length === 0 && service.queues && service.queues.length > 0) {
        const queueWithConfig = service.queues.find((q: any) => q.formConfig && q.formConfig.length > 0);
        if (queueWithConfig) {
          initialFormConfig = queueWithConfig.formConfig;
        }
      }
      setFormConfig(initialFormConfig);
      if (service.queues) {
        setSelectedQueueIds(service.queues.map((q: any) => q.id));
      }
      setUseLocationHours(service.useLocationHours ?? true);
      
      if (service.businessHoursOverride) {
        const newHours: any = {
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
      setSelectedQueueIds([]);
      setAllowAppointments(false);
      setAllowProviderSelection(false);
      setRequireManualCheckIn(false);
      setAppointmentGranularityMins(15);
      setFormConfig([]);
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

  const { data: queues = [], isLoading: queuesLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue'),
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
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
    
    saveMutation.mutate({ 
      name, 
      description, 
      expectedDuration: parseInt(expectedDuration, 10),
      locationId: selectedLocId,
      queueIds: selectedQueueIds,
      allowAppointments,
      allowProviderSelection,
      requireManualCheckIn,
      appointmentGranularityMins,
      formConfig,
      useLocationHours,
      businessHoursOverride: useLocationHours ? null : businessHoursOverride,
      exceptionDatesOverride: useLocationHours ? null : exceptionDatesOverride
    });
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-200">
      <div className="bg-surface dark:bg-dark-surface border-l border-border dark:border-dark-border w-full max-w-md shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {service ? 'Edit Service' : 'Add New Service'}
          </h2>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Location</label>
              <select
                value={selectedLocId}
                onChange={(e) => setSelectedLocId(e.target.value)}
                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
              >
                <option value="">All Locations (Global Service)</option>
                {locations.map((loc: any) => (
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

            {allowAppointments && (
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
                    <option value={5}>Every 5 minutes</option>
                    <option value={10}>Every 10 minutes</option>
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every 1 hour</option>
                  </select>
                </div>
              </>
            )}

            <div className="pt-4 mt-2 border-t border-gray-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Operating Hours & Schedule</h3>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={useLocationHours}
                  onChange={(e) => setUseLocationHours(e.target.checked)}
                  className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white block">Inherit Location Operating Hours</span>
                  <span className="text-xs text-gray-500 dark:text-zinc-500 block">Use the global schedule configured for this location</span>
                </div>
              </label>

              {!useLocationHours && (
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100 dark:border-indigo-500/10">
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300 mb-2">Custom Service Schedule</p>
                  <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70 mb-4">
                    Since this service operates on a different schedule, please configure its custom hours below.
                  </p>
                  
                  {!businessHoursOverride ? (
                    <button 
                      type="button" 
                      onClick={() => {
                        setBusinessHoursOverride({
                          monday: [{ start: '09:00', end: '17:00' }],
                          tuesday: [{ start: '09:00', end: '17:00' }],
                          wednesday: [{ start: '09:00', end: '17:00' }],
                          thursday: [{ start: '09:00', end: '17:00' }],
                          friday: [{ start: '09:00', end: '17:00' }],
                          saturday: [],
                          sunday: [],
                        });
                        toast.success('Custom schedule initialized. Edit below.');
                      }}
                      className="w-full py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors"
                    >
                      Setup Custom Schedule
                    </button>
                  ) : (
                    <div className="mt-4">
                      <ScheduleEditor
                        schedule={businessHoursOverride}
                        onChange={setBusinessHoursOverride}
                        exceptionDates={exceptionDatesOverride}
                        onChangeExceptions={setExceptionDatesOverride}
                      />
                      <button 
                        type="button" 
                        onClick={() => setBusinessHoursOverride(null)}
                        className="mt-4 text-xs font-semibold px-3 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                      >
                        Remove Custom Schedule
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {service && queues.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Linked Queues</label>
              <div className="bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                {queues.map((q: any) => (
                  <label key={q.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedQueueIds.includes(q.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          setSelectedQueueIds([...selectedQueueIds, q.id]);
                        } else {
                          setSelectedQueueIds(selectedQueueIds.filter(id => id !== q.id));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-zinc-300">{q.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          
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
