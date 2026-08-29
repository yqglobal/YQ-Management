import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Check, Clock, CalendarOff } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface LocationHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: any;
}

const DEFAULT_HOURS = {
  monday: { closed: false, start: '09:00', end: '17:00' },
  tuesday: { closed: false, start: '09:00', end: '17:00' },
  wednesday: { closed: false, start: '09:00', end: '17:00' },
  thursday: { closed: false, start: '09:00', end: '17:00' },
  friday: { closed: false, start: '09:00', end: '17:00' },
  saturday: { closed: true, start: '09:00', end: '17:00' },
  sunday: { closed: true, start: '09:00', end: '17:00' },
};

export function LocationHoursModal({ isOpen, onClose, location }: LocationHoursModalProps) {
  const queryClient = useQueryClient();
  const [businessHours, setBusinessHours] = useState<any>(DEFAULT_HOURS);
  const [exceptionDates, setExceptionDates] = useState<string[]>([]);
  const [newExceptionDate, setNewExceptionDate] = useState('');
  const [activeTab, setActiveTab] = useState<'hours' | 'holidays'>('hours');

  useEffect(() => {
    if (location) {
      if (location.businessHours) {
        setBusinessHours({ ...DEFAULT_HOURS, ...location.businessHours });
      } else {
        setBusinessHours(DEFAULT_HOURS);
      }
      setExceptionDates(location.exceptionDates || []);
    }
  }, [location, isOpen]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => fetchApi(`/location/${location.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Operating hours updated successfully');
      onClose();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update hours'),
  });

  if (!isOpen || typeof document === 'undefined') return null;

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const handleSave = () => {
    updateMutation.mutate({
      businessHours,
      exceptionDates,
    });
  };

  const handleAddException = () => {
    if (newExceptionDate && !exceptionDates.includes(newExceptionDate)) {
      setExceptionDates([...exceptionDates, newExceptionDate]);
      setNewExceptionDate('');
    }
  };

  const removeException = (date: string) => {
    setExceptionDates(exceptionDates.filter(d => d !== date));
  };

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-200">
      <div className="bg-surface dark:bg-dark-surface border-l border-border dark:border-dark-border w-full max-w-md shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Operating Hours
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{location.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>

        <div className="flex space-x-1 border-b border-border dark:border-dark-border p-2 shrink-0">
          <button
            onClick={() => setActiveTab('hours')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'hours'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Clock className="w-4 h-4" /> Weekly Schedule
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'holidays'
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <CalendarOff className="w-4 h-4" /> Holidays & Exceptions
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'hours' && (
            <div className="space-y-4">
              {days.map(day => (
                <div key={day} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5">
                  <div className="flex items-center gap-3 w-32">
                    <input
                      type="checkbox"
                      checked={!businessHours[day].closed}
                      onChange={(e) => setBusinessHours({
                        ...businessHours,
                        [day]: { ...businessHours[day], closed: !e.target.checked }
                      })}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold capitalize text-gray-700 dark:text-zinc-300">{day}</span>
                  </div>
                  
                  {!businessHours[day].closed ? (
                    <div className="flex items-center gap-2 flex-1 ml-4">
                      <input
                        type="time"
                        value={businessHours[day].start}
                        onChange={(e) => setBusinessHours({
                          ...businessHours,
                          [day]: { ...businessHours[day], start: e.target.value }
                        })}
                        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-sm outline-none"
                      />
                      <span className="text-gray-400 text-xs font-medium">to</span>
                      <input
                        type="time"
                        value={businessHours[day].end}
                        onChange={(e) => setBusinessHours({
                          ...businessHours,
                          [day]: { ...businessHours[day], end: e.target.value }
                        })}
                        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-sm outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 ml-4 flex justify-end">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-gray-200 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-md">Closed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'holidays' && (
             <div className="space-y-4">
               <p className="text-sm text-gray-500 dark:text-zinc-400">
                 Add dates when this location is entirely closed (e.g. public holidays).
               </p>
               
               <div className="flex gap-2">
                 <input
                   type="date"
                   value={newExceptionDate}
                   onChange={e => setNewExceptionDate(e.target.value)}
                   className="flex-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white outline-none focus:border-indigo-500"
                 />
                 <button
                   onClick={handleAddException}
                   disabled={!newExceptionDate}
                   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium disabled:opacity-50"
                 >
                   Add
                 </button>
               </div>

               <div className="mt-6 space-y-2">
                 {exceptionDates.length === 0 ? (
                   <div className="text-center p-6 border border-dashed border-gray-300 dark:border-zinc-800 rounded-xl text-gray-500 text-sm">
                     No holidays added yet.
                   </div>
                 ) : (
                   exceptionDates.sort().map(date => (
                     <div key={date} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5">
                       <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                         {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                       </span>
                       <button onClick={() => removeException(date)} className="text-gray-400 hover:text-red-500 p-1">
                         <X className="w-4 h-4" />
                       </button>
                     </div>
                   ))
                 )}
               </div>
             </div>
          )}
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
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Operating Hours
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
