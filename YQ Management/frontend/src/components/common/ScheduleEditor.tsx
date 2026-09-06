import React, { useState } from 'react';
import { Plus, X, Copy, Trash2, Calendar as CalendarIcon, Info } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export type TimeSlot = { start: string; end: string };
export type DaySchedule = TimeSlot[];
export type WeeklySchedule = Record<string, DaySchedule>;

type BaseHours = { start: string; end: string; isClosed: boolean };
type Break = { start: string; end: string };

function parseDay(slots: DaySchedule): { base: BaseHours; breaks: Break[] } {
  if (!slots || slots.length === 0) return { base: { start: '09:00', end: '17:00', isClosed: true }, breaks: [] };
  const base = { start: slots[0].start, end: slots[slots.length - 1].end, isClosed: false };
  const breaks: Break[] = [];
  for (let i = 0; i < slots.length - 1; i++) {
    breaks.push({ start: slots[i].end, end: slots[i+1].start });
  }
  return { base, breaks };
}

function buildDay(base: BaseHours, breaks: Break[]): DaySchedule {
  if (base.isClosed) return [];
  
  const validBreaks = [...breaks].sort((a, b) => a.start.localeCompare(b.start));
  const slots: DaySchedule = [];
  let currentStart = base.start;
  
  for (const b of validBreaks) {
    if (b.start > currentStart) {
      slots.push({ start: currentStart, end: b.start });
    }
    currentStart = b.end;
  }
  
  if (currentStart < base.end) {
    slots.push({ start: currentStart, end: base.end });
  }
  return slots;
}

interface ScheduleEditorProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  exceptionDates: string[];
  onChangeExceptions: (dates: string[]) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DEFAULT_SLOT = { start: '09:00', end: '17:00' };

export function ScheduleEditor({ schedule, onChange, exceptionDates, onChangeExceptions }: ScheduleEditorProps) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'exceptions'>('weekly');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  const updateDay = (day: string, newSlots: DaySchedule) => {
    onChange({ ...schedule, [day]: newSlots });
  };

  const addSlot = (day: string) => {
    const slots = schedule[day] || [];
    updateDay(day, [...slots, { ...DEFAULT_SLOT }]);
  };

  const removeSlot = (day: string, index: number) => {
    const slots = [...(schedule[day] || [])];
    slots.splice(index, 1);
    updateDay(day, slots);
  };

  const updateSlot = (day: string, index: number, field: 'start' | 'end', value: string) => {
    const slots = [...(schedule[day] || [])];
    slots[index] = { ...slots[index], [field]: value };
    updateDay(day, slots);
  };

  const copyToAll = (sourceDay: string) => {
    const sourceSlots = schedule[sourceDay] || [];
    const newSchedule = { ...schedule };
    DAYS.forEach(day => {
      // Don't copy to weekends by default, unless user explicitly copied FROM a weekend
      if ((day === 'saturday' || day === 'sunday') && (sourceDay !== 'saturday' && sourceDay !== 'sunday')) return;
      newSchedule[day] = sourceSlots.map(s => ({ ...s }));
    });
    onChange(newSchedule);
  };

  const handleAddException = () => {
    if (!selectedDateStr) return;
    if (!exceptionDates.includes(selectedDateStr)) {
      onChangeExceptions([...exceptionDates, selectedDateStr].sort());
    }
    setSelectedDateStr('');
  };

  const addQuickDate = (daysForward: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysForward);
    const dateStr = d.toISOString().split('T')[0];
    if (!exceptionDates.includes(dateStr)) {
      onChangeExceptions([...exceptionDates, dateStr].sort());
    }
  };

  const removeException = (dateStr: string) => {
    onChangeExceptions(exceptionDates.filter(d => d !== dateStr));
  };

  return (
    <div className="flex flex-col w-full bg-white dark:bg-zinc-950 border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
      {/* Tabs */}
      <div className="flex border-b border-border dark:border-dark-border bg-gray-50 dark:bg-zinc-900/50">
        <button
          type="button"
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'weekly' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:bg-surface-container dark:hover:bg-white/5'}`}
        >
          Weekly Hours & Breaks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('exceptions')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'exceptions' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:bg-surface-container dark:hover:bg-white/5'}`}
        >
          Holidays / Closed
        </button>
      </div>

      <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
        {activeTab === 'weekly' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-sm p-4 rounded-xl flex gap-3 items-start border border-indigo-100 dark:border-indigo-500/20">
              <Info className="w-5 h-5 shrink-0" />
              <p>Set your overall operating hours for each day. Then, use "+ Add Break" to block out specific times (e.g. lunch) when you do not accept appointments.</p>
            </div>

            <div className="space-y-4">
              {DAYS.map(day => {
                const slots = schedule[day] || [];
                const { base, breaks } = parseDay(slots);
                const isClosed = base.isClosed;

                const handleToggle = (checked: boolean) => {
                  if (checked) {
                    onChange({ ...schedule, [day]: buildDay({ start: '09:00', end: '17:00', isClosed: false }, []) });
                  } else {
                    onChange({ ...schedule, [day]: [] });
                  }
                };

                const handleBaseChange = (field: 'start' | 'end', value: string) => {
                  onChange({ ...schedule, [day]: buildDay({ ...base, [field]: value }, breaks) });
                };

                const addBreak = () => {
                  onChange({ ...schedule, [day]: buildDay(base, [...breaks, { start: '12:00', end: '13:00' }]) });
                };

                const updateBreak = (index: number, field: 'start' | 'end', value: string) => {
                  const newBreaks = [...breaks];
                  newBreaks[index] = { ...newBreaks[index], [field]: value };
                  onChange({ ...schedule, [day]: buildDay(base, newBreaks) });
                };

                const removeBreak = (index: number) => {
                  const newBreaks = [...breaks];
                  newBreaks.splice(index, 1);
                  onChange({ ...schedule, [day]: buildDay(base, newBreaks) });
                };

                return (
                  <div key={day} className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-dark-border rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!isClosed}
                            onChange={(e) => handleToggle(e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                        </label>
                        <span className="font-semibold text-sm text-gray-900 dark:text-white capitalize w-24">
                          {day}
                        </span>
                        {isClosed && (
                          <span className="text-xs font-semibold px-2 py-1 bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-zinc-400 rounded">Closed</span>
                        )}
                      </div>
                      
                      {!isClosed && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToAll(day)}
                            className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-2 py-1 rounded transition-colors"
                            title="Copy to all weekdays"
                          >
                            <Copy className="w-3 h-3" /> Copy to All
                          </button>
                        </div>
                      )}
                    </div>

                    {!isClosed && (
                      <div className="space-y-3 sm:ml-12 mt-4">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="text-xs font-semibold text-gray-500 w-16">OPENING:</span>
                          <input
                            type="time"
                            value={base.start}
                            onChange={(e) => handleBaseChange('start', e.target.value)}
                            className="bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500 w-[110px] dark:text-white"
                          />
                          <span className="text-gray-500 text-sm">to</span>
                          <input
                            type="time"
                            value={base.end}
                            onChange={(e) => handleBaseChange('end', e.target.value)}
                            className="bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500 w-[110px] dark:text-white"
                          />
                        </div>

                        {breaks.length > 0 && (
                          <div className="space-y-2 mt-3 pt-3 border-t border-gray-200 dark:border-zinc-800">
                            {breaks.map((brk, i) => (
                              <div key={i} className="flex flex-wrap items-center gap-2 sm:gap-3 group">
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-500 w-16">BREAK:</span>
                                <input
                                  type="time"
                                  value={brk.start}
                                  onChange={(e) => updateBreak(i, 'start', e.target.value)}
                                  className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-amber-500 w-[110px] dark:text-amber-100"
                                />
                                <span className="text-gray-500 text-sm">to</span>
                                <input
                                  type="time"
                                  value={brk.end}
                                  onChange={(e) => updateBreak(i, 'end', e.target.value)}
                                  className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-amber-500 w-[110px] dark:text-amber-100"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeBreak(i)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => addBreak()}
                          className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-500 hover:text-amber-700 font-medium py-1 mt-2"
                        >
                          <Plus className="w-4 h-4" /> Add Break
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'exceptions' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Select specific dates when you will be entirely closed (e.g. public holidays).
            </p>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-auto flex justify-center bg-gray-50 dark:bg-zinc-900/30 p-4 rounded-xl border border-gray-200 dark:border-zinc-800">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date: Date) => setSelectedDate(date)}
                  inline
                  calendarClassName="dark:bg-transparent dark:border-none border-none shadow-none"
                  dayClassName={date => "dark:text-white hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-full"}
                />
              </div>
              <div className="flex-1 space-y-4">
                <button
                  type="button"
                  onClick={handleAddException}
                  disabled={!selectedDate}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <CalendarIcon className="w-4 h-4" />
                  Add Selected Date as Holiday
                </button>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {exceptionDates.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-gray-300 dark:border-zinc-800 rounded-xl text-gray-500 text-sm">
                      No holidays added yet.
                    </div>
                  ) : (
                    exceptionDates.map(date => (
                      <div key={date} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-zinc-800">
                        <span className="text-sm font-medium text-gray-900 dark:text-zinc-200">
                          {new Date(date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                        <button type="button" onClick={() => removeException(date)} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
