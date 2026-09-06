import re

with open("frontend/src/components/common/ScheduleEditor.tsx", "r") as f:
    content = f.read()

# Remove react-datepicker import
content = re.sub(r"import DatePicker from 'react-datepicker';\nimport 'react-datepicker/dist/react-datepicker\.css';\n", "", content)

# Modify state for custom exception date
content = re.sub(r"const \[selectedDate, setSelectedDate\] = useState<Date \| null>\(null\);", "const [selectedDateStr, setSelectedDateStr] = useState<string>('');", content)


handleAddException = """  const handleAddException = () => {
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
  };"""

content = re.sub(r"  const handleAddException = \(\) => {.*?setSelectedDate\(null\);\n  };", handleAddException, content, flags=re.DOTALL)


exceptions_tab_ui = """        {activeTab === 'exceptions' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-sm p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-indigo-100 dark:border-indigo-500/20">
              <div>
                <p className="font-semibold mb-1">Add Holiday or Closure</p>
                <p className="text-xs opacity-90">Select specific dates when this service will be entirely closed.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => addQuickDate(0)}
                  className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-500/30 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => addQuickDate(1)}
                  className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-500/30 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors whitespace-nowrap"
                >
                  Tomorrow
                </button>
                <div className="flex items-center gap-2 ml-auto sm:ml-2">
                  <input
                    type="date"
                    value={selectedDateStr}
                    onChange={(e) => setSelectedDateStr(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-500/30 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-500 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddException}
                    disabled={!selectedDateStr}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                    title="Add Custom Date"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Upcoming Closures</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 pb-2">
                {exceptionDates.length === 0 ? (
                  <div className="col-span-1 sm:col-span-2 text-center p-8 border border-dashed border-gray-300 dark:border-zinc-800 rounded-xl text-gray-500 text-sm">
                    No custom closed dates added.
                  </div>
                ) : (
                  exceptionDates.map(date => (
                    <div key={date} className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 shadow-sm rounded-xl border border-gray-200 dark:border-zinc-800 hover:border-red-200 dark:hover:border-red-900/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold uppercase leading-none mb-0.5">
                            {new Date(date).toLocaleDateString(undefined, { month: 'short' })}
                          </span>
                          <span className="text-sm font-bold leading-none">
                            {new Date(date).getDate()}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 dark:text-zinc-200">
                            {new Date(date).toLocaleDateString(undefined, { weekday: 'long' })}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-zinc-500">
                            {new Date(date).getFullYear()}
                          </span>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeException(date)} 
                        className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Remove Holiday"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}"""

content = re.sub(r"        \{activeTab === 'exceptions'.*?\}\s*</div>\s*\)\}\s*</div>\s*</div>\s*\);\s*}", exceptions_tab_ui + "\n      </div>\n    </div>\n  );\n}", content, flags=re.DOTALL)

with open("frontend/src/components/common/ScheduleEditor.tsx", "w") as f:
    f.write(content)

