import React, { useState } from 'react';
import { useMyDesk } from '../MyDeskContext';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';

export const CustomFormWidget = ({ widgetId, formId }: { widgetId: string, formId?: string }) => {
  const { activeVisit, refetchVisits } = useMyDesk();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!activeVisit) return;
    setSaving(true);
    try {
      await fetchApi(`/visits/${activeVisit.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: notes, formId })
      });
      toast.success('Notes saved successfully');
      setNotes('');
      refetchVisits();
    } catch (err) {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  if (!activeVisit) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center h-full text-zinc-500">
        Waiting for active task to enable form...
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-full flex flex-col">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 shrink-0">
        {formId ? `Form: ${formId}` : 'Notes / Prescription'}
      </h3>
      
      <div className="flex-1 min-h-0 flex flex-col">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter notes, diagnosis, or prescription here..."
          className="flex-1 w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
        />
        <div className="mt-4 flex justify-end shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || !notes.trim()}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium py-2 px-6 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
};
