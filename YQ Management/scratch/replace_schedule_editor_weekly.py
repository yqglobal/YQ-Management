import re

with open("frontend/src/components/common/ScheduleEditor.tsx", "r") as f:
    content = f.read()


helper_functions = """export type TimeSlot = { start: string; end: string };
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
}"""

content = re.sub(r"export type TimeSlot =.*?export type WeeklySchedule = Record<string, DaySchedule>;", helper_functions, content, flags=re.DOTALL)


weekly_tab_ui = """        {activeTab === 'weekly' && (
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
        )}"""

content = re.sub(r"        \{activeTab === 'weekly'.*?        \{activeTab === 'exceptions'", weekly_tab_ui + "\n\n        {activeTab === 'exceptions'", content, flags=re.DOTALL)

with open("frontend/src/components/common/ScheduleEditor.tsx", "w") as f:
    f.write(content)

