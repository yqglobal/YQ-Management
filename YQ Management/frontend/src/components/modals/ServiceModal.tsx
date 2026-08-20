import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

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
  const [requireManualCheckIn, setRequireManualCheckIn] = useState(false);
  const [appointmentGranularityMins, setAppointmentGranularityMins] = useState(15);
  const [formConfig, setFormConfig] = useState<any[]>([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setDescription(service.description || '');
      setExpectedDuration(service.expectedDuration?.toString() || '15');
      setSelectedLocId(service.locationId || locationId || '');
      setAllowAppointments(service.allowAppointments || false);
      setRequireManualCheckIn(service.requireManualCheckIn || false);
      setAppointmentGranularityMins(service.appointmentGranularityMins || 15);
      setFormConfig(service.formConfig || []);
      // If service includes queues, map them
      if (service.queues) {
        setSelectedQueueIds(service.queues.map((q: any) => q.id));
      }
    } else {
      setName('');
      setDescription('');
      setExpectedDuration('15');
      setSelectedLocId(locationId || '');
      setSelectedQueueIds([]);
      setAllowAppointments(false);
      setRequireManualCheckIn(false);
      setAppointmentGranularityMins(15);
      setFormConfig([]);
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
      requireManualCheckIn,
      appointmentGranularityMins,
      formConfig
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
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Location <span className="text-red-500">*</span></label>
              <select
                value={selectedLocId}
                onChange={(e) => setSelectedLocId(e.target.value)}
                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              >
                <option value="" disabled>Select a location</option>
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

          <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Custom Booking Questions</h3>
              <button
                type="button"
                onClick={() => setFormConfig([...formConfig, { id: Math.random().toString(36).substr(2, 9), type: 'text', label: '', required: false, system: false }])}
                className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
              >
                + Add Question
              </button>
            </div>
            {formConfig.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-zinc-500 italic">No custom questions added. By default, Name and Phone are collected.</p>
            ) : (
              <div className="space-y-3">
                {formConfig.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 p-4 rounded-xl relative group">
                    <button
                      type="button"
                      onClick={() => setFormConfig(formConfig.filter((_, i) => i !== index))}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3 pr-6">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Question Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const newConfig = [...formConfig];
                            newConfig[index].label = e.target.value;
                            setFormConfig(newConfig);
                          }}
                          placeholder="e.g. Order Number"
                          className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Response Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const newConfig = [...formConfig];
                            newConfig[index].type = e.target.value;
                            setFormConfig(newConfig);
                          }}
                          className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="text">Short Text</option>
                          <option value="textarea">Long Text</option>
                          <option value="phone">Phone Number</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="checkbox">Checkbox (Yes/No)</option>
                        </select>
                      </div>
                    </div>
                    {field.type === 'dropdown' && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Dropdown Options (comma-separated)</label>
                        <input
                          type="text"
                          value={field.options ? field.options.join(', ') : ''}
                          onChange={(e) => {
                            const newConfig = [...formConfig];
                            newConfig[index].options = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                            setFormConfig(newConfig);
                          }}
                          placeholder="Option 1, Option 2, Option 3"
                          className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => {
                          const newConfig = [...formConfig];
                          newConfig[index].required = e.target.checked;
                          setFormConfig(newConfig);
                        }}
                        className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">Required field</span>
                    </label>
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
