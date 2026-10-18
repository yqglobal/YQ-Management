import React, { useState, useEffect } from 'react';
import { useMyDesk } from '../MyDeskContext';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { Pill, Plus, Trash2, Save, Send } from 'lucide-react';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export const PrescriptionWidget = ({ widgetId }: { widgetId: string }) => {
  const { activeVisit } = useMyDesk();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [rxId, setRxId] = useState<string | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!activeVisit) {
      setMedications([]);
      setNotes('');
      setRxId(null);
      return;
    }

    const fetchRx = async () => {
      setLoading(true);
      try {
        const data = await fetchApi(`/visits/${activeVisit.id}/prescription`);
        if (data) {
          setRxId(data.id);
          setMedications(data.medications || []);
          setNotes(data.notes || '');
        } else {
          setRxId(null);
          setMedications([]);
          setNotes('');
        }
      } catch (err) {
        console.error('Failed to fetch prescription', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRx();
  }, [activeVisit]);

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const updateMed = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...medications];
    newMeds[index][field] = value;
    setMedications(newMeds);
  };

  const removeMed = (index: number) => {
    const newMeds = [...medications];
    newMeds.splice(index, 1);
    setMedications(newMeds);
  };

  const handleSave = async () => {
    if (!activeVisit) return;
    setSaving(true);
    try {
      const payload = { medications, notes };
      const res = await fetchApi(`/visits/${activeVisit.id}/prescription`, {
        method: rxId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload)
      });
      if (!rxId && res.id) setRxId(res.id);
      toast.success('Prescription saved successfully');
    } catch (err) {
      toast.error('Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  if (!activeVisit) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center h-full text-zinc-500">
        No patient currently selected. Pick a patient to prescribe medication.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-zinc-900 dark:text-white">e-Prescription (Rx)</h3>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={addMedication}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Med
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Rx'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
            <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
          </div>
        ) : medications.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
            No medications prescribed yet.<br/>
            <button onClick={addMedication} className="mt-2 text-emerald-600 hover:underline">Add one now</button>
          </div>
        ) : (
          <div className="space-y-4">
            {medications.map((med, idx) => (
              <div key={idx} className="p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3 relative group">
                <button 
                  onClick={() => removeMed(idx)}
                  className="absolute top-3 right-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Medication Name</label>
                    <input 
                      type="text" 
                      value={med.name} 
                      onChange={e => updateMed(idx, 'name', e.target.value)}
                      placeholder="e.g. Amoxicillin" 
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Dosage</label>
                    <input 
                      type="text" 
                      value={med.dosage} 
                      onChange={e => updateMed(idx, 'dosage', e.target.value)}
                      placeholder="e.g. 500mg" 
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Frequency</label>
                    <input 
                      type="text" 
                      value={med.frequency} 
                      onChange={e => updateMed(idx, 'frequency', e.target.value)}
                      placeholder="e.g. 3 times a day" 
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Duration</label>
                    <input 
                      type="text" 
                      value={med.duration} 
                      onChange={e => updateMed(idx, 'duration', e.target.value)}
                      placeholder="e.g. 7 days" 
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Special Instructions (Optional)</label>
                  <input 
                    type="text" 
                    value={med.instructions} 
                    onChange={e => updateMed(idx, 'instructions', e.target.value)}
                    placeholder="e.g. Take after meals" 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm" 
                  />
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">General Pharmacy Notes</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes for the pharmacist..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 text-sm min-h-[60px]"
              />
            </div>
            
            {rxId && (
              <div className="pt-2 flex justify-end">
                <button className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                  <Send className="w-4 h-4" /> Send Rx to Patient
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
