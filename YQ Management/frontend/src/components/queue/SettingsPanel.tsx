import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Plus, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectItem } from '../../components/ui/select';
import { Card, CardContent } from '../../components/ui/card';
import { toast } from 'sonner';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  system: boolean;
  options?: string[];
}

interface SettingsPanelProps {
  queueId: string;
  queueName: string;
  formConfig: FormField[];
  setQueueName: (name: string) => void;
  setFormConfig: (config: FormField[]) => void;
  allQueues: Array<{ id: string; name: string }>;
  nextQueueId: string;
  setNextQueueId: (id: string) => void;
  allowAppointments: boolean;
  setAllowAppointments: (v: boolean) => void;
  requireManualCheckIn: boolean;
  setRequireManualCheckIn: (v: boolean) => void;
  appointmentGranularityMins: number;
  setAppointmentGranularityMins: (v: number) => void;
  showName: boolean;
  setShowName: (v: boolean) => void;
  showTokenNumber: boolean;
  setShowTokenNumber: (v: boolean) => void;
  generationMode: 'sequential' | 'random';
  setGenerationMode: (v: 'sequential' | 'random') => void;
  tokenFormat: 'alphanumeric' | 'numeric';
  setTokenFormat: (v: 'alphanumeric' | 'numeric') => void;
  tokenPrefix: string;
  setTokenPrefix: (v: string) => void;
  ttsTemplate: string;
  setTtsTemplate: (v: string) => void;
}

export function SettingsPanel({
  queueId, queueName, formConfig, setQueueName, setFormConfig,
  allQueues, nextQueueId, setNextQueueId,
  allowAppointments, setAllowAppointments,
  requireManualCheckIn, setRequireManualCheckIn,
  appointmentGranularityMins, setAppointmentGranularityMins,
  showName, setShowName,
  showTokenNumber, setShowTokenNumber,
  generationMode, setGenerationMode,
  tokenFormat, setTokenFormat,
  tokenPrefix, setTokenPrefix,
  ttsTemplate, setTtsTemplate,
}: SettingsPanelProps) {
  const queryClient = useQueryClient();

  const saveSettingsMutation = useMutation({
    mutationFn: () => fetchApi(`/queue/${queueId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: queueName,
        formConfig,
        nextQueueId: nextQueueId || null,
        allowAppointments,
        requireManualCheckIn,
        appointmentGranularityMins,
        tokenDisplayConfig: {
          showName,
          showTokenNumber,
          generationMode,
          format: tokenFormat,
          prefix: tokenPrefix,
          ttsTemplate,
        },
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', queueId] });
      toast.success('Settings saved successfully!');
    },
    onError: () => toast.error('Error saving settings'),
  });

  const handleAddField = () => {
    setFormConfig([
      ...formConfig,
      { id: `field_${Date.now()}`, type: 'text', label: 'New Question', required: false, system: false },
    ]);
  };

  const handleUpdateField = (index: number, updates: Partial<FormField>) => {
    const newConfig = [...formConfig];
    newConfig[index] = { ...newConfig[index], ...updates };
    setFormConfig(newConfig);
  };

  const handleRemoveField = (index: number) => {
    const newConfig = [...formConfig];
    newConfig.splice(index, 1);
    setFormConfig(newConfig);
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newConfig = [...formConfig];
    const [moved] = newConfig.splice(draggedIndex, 1);
    newConfig.splice(targetIndex, 0, moved);
    setFormConfig(newConfig);
    setDraggedIndex(targetIndex);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">General Settings</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-500">Manage basic queue settings.</p>
            </div>
            <Button
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              {saveSettingsMutation.isPending ? <Save className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Queue Name</label>
              <Input
                type="text"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Auto-Transfer Next Queue</label>
              <select
                value={nextQueueId}
                onChange={(e) => setNextQueueId(e.target.value)}
                className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm dark:shadow-none appearance-none"
              >
                <option value="">None (End of flow)</option>
                {allQueues.filter((q: any) => q.id !== queueId).map((q: any) => (
                  <option key={q.id} value={q.id}>{q.name}</option>
                ))}
              </select>
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Display Settings</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-500">Customize what is shown on the display screen.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Show Customer Name</p>
                <p className="text-sm text-gray-500 dark:text-zinc-500">Display customer name on the queue display screen.</p>
              </div>
              <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} className="sr-only peer" />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Show Token Number</p>
                <p className="text-sm text-gray-500 dark:text-zinc-500">Display the token number on the queue display screen.</p>
              </div>
              <input type="checkbox" checked={showTokenNumber} onChange={e => setShowTokenNumber(e.target.checked)} className="sr-only peer" />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>

            <div className="p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl">
              <div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">Text-to-Speech Announcement Template</p>
                <p className="text-sm text-gray-500 dark:text-zinc-500 mb-3">
                  Customize the voice announcement. Use <code>{'{token}'}</code>, <code>{'{name}'}</code>, and <code>{'{queueName}'}</code> as variables.
                </p>
                <Input
                  type="text"
                  value={ttsTemplate}
                  onChange={(e) => setTtsTemplate(e.target.value)}
                  placeholder="Ticket number {token}, {name}, kindly proceed to {queueName}."
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Token Number Generation</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-500">Configure how token numbers are generated for this queue.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Generation Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer">
                  <input type="radio" name="generationMode" value="sequential" checked={generationMode === 'sequential'} onChange={() => setGenerationMode('sequential')} className="accent-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Sequential</p>
                    <p className="text-sm text-gray-500 dark:text-zinc-500">Incremental numbers (1, 2, 3...)</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer">
                  <input type="radio" name="generationMode" value="random" checked={generationMode === 'random'} onChange={() => setGenerationMode('random')} className="accent-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Random</p>
                    <p className="text-sm text-gray-500 dark:text-zinc-500">Random numbers for each token</p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Token Format</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer">
                  <input type="radio" name="tokenFormat" value="alphanumeric" checked={tokenFormat === 'alphanumeric'} onChange={() => setTokenFormat('alphanumeric')} className="accent-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Alphanumeric</p>
                    <p className="text-sm text-gray-500 dark:text-zinc-500">Prefix + numbers (e.g. CC876)</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl cursor-pointer">
                  <input type="radio" name="tokenFormat" value="numeric" checked={tokenFormat === 'numeric'} onChange={() => setTokenFormat('numeric')} className="accent-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Numeric Only</p>
                    <p className="text-sm text-gray-500 dark:text-zinc-500">Numbers only (e.g. 876)</p>
                  </div>
                </label>
              </div>
            </div>

            {tokenFormat === 'alphanumeric' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Token Prefix</label>
                <Input
                  type="text"
                  value={tokenPrefix}
                  onChange={(e) => setTokenPrefix(e.target.value.toUpperCase())}
                  placeholder="CC"
                  maxLength={5}
                  className="max-w-24"
                />
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">Prefix added before the token number. Leave empty for numbers only.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customer Intake Form</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-500">Customize the questions asked during virtual check-in.</p>
            </div>
            <Button onClick={handleAddField} variant="outline" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Field
            </Button>
          </div>

          <div className="space-y-4">
            {formConfig.map((field, index) => (
               <div
                 key={field.id || index}
                 draggable={true}
                 onDragStart={() => handleDragStart(index)}
                 onDragOver={(e) => handleDragOver(e, index)}
                 onDragEnd={handleDragEnd}
                 className={`relative flex gap-4 items-start bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl p-4 transition-all ${draggedIndex === index ? 'opacity-50 rotate-[0.5deg] shadow-lg' : 'hover:shadow-md'}`}
               >
                 <div className={`pt-3 text-gray-400 dark:text-zinc-600 cursor-grab active:cursor-grabbing transition-colors ${draggedIndex === index ? 'text-indigo-500' : ''}`}>
                   <GripVertical className="w-5 h-5" />
                 </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-1">Field Label</label>
                      <Input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-1">Field Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(index, { type: e.target.value })}
                        className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 appearance-none"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="dropdown">Dropdown (Select)</option>
                        <option value="phone">Phone Number</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                    </div>
                  </div>

                  {field.type === 'dropdown' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-1">Options (comma separated)</label>
                      <Input
                        type="text"
                        value={(field.options || []).join(', ')}
                        onChange={(e) => handleUpdateField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={field.required} onChange={(e) => handleUpdateField(index, { required: e.target.checked })} className="accent-indigo-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-zinc-400">Required</span>
                    </label>
                  </div>
                </div>

                <Button variant="ghost" size="icon" onClick={() => handleRemoveField(index)} className="pt-2 p-2 text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}