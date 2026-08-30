import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { ScheduleEditor, WeeklySchedule } from '../common/ScheduleEditor';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: any; // If provided, we are editing. If null, we are creating.
}

const DEFAULT_HOURS: WeeklySchedule = {
  monday: [{ start: '09:00', end: '17:00' }],
  tuesday: [{ start: '09:00', end: '17:00' }],
  wednesday: [{ start: '09:00', end: '17:00' }],
  thursday: [{ start: '09:00', end: '17:00' }],
  friday: [{ start: '09:00', end: '17:00' }],
  saturday: [],
  sunday: [],
};

export function LocationModal({ isOpen, onClose, location }: LocationModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  
  const [businessHours, setBusinessHours] = useState<WeeklySchedule>(DEFAULT_HOURS);
  const [exceptionDates, setExceptionDates] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (location) {
        setName(location.name || '');
        setAddress(location.address || '');
        setCity(location.city || '');

        if (location.businessHours) {
          const newHours: any = { ...DEFAULT_HOURS };
          Object.keys(location.businessHours).forEach(day => {
            const val = location.businessHours[day];
            if (Array.isArray(val)) {
              newHours[day] = val;
            } else if (val) {
              newHours[day] = val.closed ? [] : [{ start: val.start, end: val.end }];
            }
          });
          setBusinessHours(newHours);
        } else {
          setBusinessHours(DEFAULT_HOURS);
        }
        setExceptionDates(location.exceptionDates || []);
      } else {
        setName('');
        setAddress('');
        setCity('');
        setBusinessHours(DEFAULT_HOURS);
        setExceptionDates([]);
      }
    }
  }, [location, isOpen]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (location) {
        return fetchApi(`/location/${location.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        return fetchApi('/location', { method: 'POST', body: JSON.stringify(data) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success(`Location ${location ? 'updated' : 'created'} successfully`);
      onClose();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save location'),
  });

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    saveMutation.mutate({
      name,
      address,
      city,
      businessHours,
      exceptionDates,
    });
  };

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-200">
      <div className="bg-surface dark:bg-dark-surface border-l border-border dark:border-dark-border w-full max-w-[600px] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {location ? 'Edit Location' : 'Create Location'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Configure details and operating hours</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <form id="location-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-border dark:border-dark-border pb-2">General Info</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Location Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Downtown Office"
                  className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 123 Main St"
                    className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New York"
                    className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-border dark:border-dark-border pb-2">Operating Hours</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Set the default opening hours for this location. Services can inherit this schedule or define their own.</p>
              <ScheduleEditor
                schedule={businessHours}
                onChange={setBusinessHours}
                exceptionDates={exceptionDates}
                onChangeExceptions={setExceptionDates}
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="location-form"
            disabled={saveMutation.isPending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Location
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
