const fs = require('fs');
const file = 'frontend/src/components/modals/ServiceModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// The replacement for the custom booking questions section
const newQuestionsSection = `
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
`;

// we need to replace the exact block in the file
const startRegex = /<div className="pt-4 border-t border-gray-200 dark:border-white\/10 space-y-4">\s*<div className="flex justify-between items-center">\s*<h3 className="text-sm font-bold text-gray-900 dark:text-white">Custom Booking Questions<\/h3>/;
const endRegex = /<\/div>\s*<\/form>\s*<div className="p-6 border-t border-gray-200 dark:border-white\/10 bg-gray-50 dark:bg-black\/20 flex justify-end gap-3 shrink-0">/;

// First, make sure we import Plus
content = content.replace("import { X, Loader2 } from 'lucide-react';", "import { X, Loader2, Plus } from 'lucide-react';");

const startIndex = content.search(startRegex);
const endIndex = content.search(endRegex);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newQuestionsSection + "        </form>\n\n        <div className=\"p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-end gap-3 shrink-0\">" + content.substring(endIndex + 125);
  fs.writeFileSync(file, content);
  console.log('Patched ServiceModal.tsx successfully');
} else {
  console.log('Could not find boundaries to patch');
}

