import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Globe, Clock, Sparkles } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { ScheduleEditor, WeeklySchedule } from '../common/ScheduleEditor';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: AnyFixMe;
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

const PRESET_HOURS: Record<string, { label: string; schedule: WeeklySchedule }> = {
  office: {
    label: 'Standard Office (Mon-Fri 9AM-5PM)',
    schedule: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
      saturday: [],
      sunday: [],
    },
  },
  clinic: {
    label: 'Hospital / Clinic (Mon-Sat 9AM-5PM with Lunch Break)',
    schedule: {
      monday: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }],
      saturday: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }],
      sunday: [],
    },
  },
  retail: {
    label: 'Extended Retail (Mon-Sun 8AM-8PM)',
    schedule: {
      monday: [{ start: '08:00', end: '20:00' }],
      tuesday: [{ start: '08:00', end: '20:00' }],
      wednesday: [{ start: '08:00', end: '20:00' }],
      thursday: [{ start: '08:00', end: '20:00' }],
      friday: [{ start: '08:00', end: '20:00' }],
      saturday: [{ start: '08:00', end: '20:00' }],
      sunday: [{ start: '08:00', end: '20:00' }],
    },
  },
};

export function LocationModal({ isOpen, onClose, location }: LocationModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [totalFloors, setTotalFloors] = useState<number | ''>('');
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });

  const [businessHours, setBusinessHours] = useState<WeeklySchedule>(DEFAULT_HOURS);
  const [exceptionDates, setExceptionDates] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (location) {
        setName(location.name || '');
        setAddress(location.address || '');
        setCity(location.city || '');
        setTotalFloors(location.totalFloors || '');
        setTimezone(location.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

        if (location.businessHours) {
          const newHours: AnyFixMe = { ...DEFAULT_HOURS };
          Object.keys(location.businessHours).forEach((day) => {
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
        setTotalFloors('');
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
        setBusinessHours(DEFAULT_HOURS);
        setExceptionDates([]);
      }
    }
  }, [location, isOpen]);

  const saveMutation = useMutation({
    mutationFn: (data: AnyFixMe) => {
      if (location) {
        return fetchApi(`/location/${location.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        return fetchApi('/location', { method: 'POST', body: JSON.stringify(data) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['location'] });
      toast.success(`Location ${location ? 'updated' : 'created'} successfully`);
      onClose();
    },
    onError: (err: AnyFixMe) => toast.error(err.message || 'Failed to save location'),
  });

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    saveMutation.mutate({
      name,
      address,
      city,
      totalFloors: totalFloors !== '' ? Number(totalFloors) : null,
      timezone: timezone || 'UTC',
      businessHours,
      exceptionDates,
    });
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESET_HOURS[presetKey];
    if (preset) {
      setBusinessHours(preset.schedule);
      toast.success(`Applied "${preset.label}" preset`);
    }
  };

  const commonTimezones = [
    'Asia/Kolkata',
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Africa/Johannesburg',
  ];

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-200">
      <div className="bg-surface dark:bg-dark-surface border-l border-border dark:border-dark-border w-full max-w-[650px] shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {location ? 'Edit Location' : 'Create Location'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Configure details, timezone, and operating hours
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <form id="location-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-border dark:border-dark-border pb-2">
                General Info
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Downtown Office"
                  className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 123 Main St"
                    className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New York"
                    className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* Timezone & Total Floors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    Timezone *
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white text-sm appearance-none cursor-pointer"
                  >
                    {!commonTimezones.includes(timezone) && (
                      <option value={timezone}>{timezone} (Current)</option>
                    )}
                    {commonTimezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Ensures appointments align precisely with local opening hours.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Total Floors
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={totalFloors}
                    onChange={(e) =>
                      setTotalFloors(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="e.g. 3"
                    className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:text-white text-sm"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    For ticket wayfinding instructions.
                  </p>
                </div>
              </div>
            </div>

            {/* Operating Hours & Schedule Presets */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border dark:border-dark-border pb-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-500" /> Operating Hours & Schedule
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Services can inherit this schedule or define custom hours.
                  </p>
                </div>
              </div>

              {/* Quick 1-step schedule presets */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('office')}
                    className="text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 rounded-lg font-medium text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs"
                  >
                    Office (Mon-Fri 9-5)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('clinic')}
                    className="text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 rounded-lg font-medium text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs"
                  >
                    Hospital / Clinic (Mon-Sat 9-5 with Lunch Break)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('retail')}
                    className="text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-500 rounded-lg font-medium text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs"
                  >
                    7 Days (8AM - 8PM)
                  </button>
                </div>
              </div>

              {/* Full Schedule Editor with Breaks */}
              <ScheduleEditor
                schedule={businessHours}
                onChange={setBusinessHours}
                exceptionDates={exceptionDates}
                onChangeExceptions={setExceptionDates}
              />
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-border dark:border-dark-border rounded-xl text-sm font-medium hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="location-form"
            disabled={saveMutation.isPending || !name.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-container text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {saveMutation.isPending
              ? 'Saving...'
              : location
              ? 'Save Location'
              : 'Create Location'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
