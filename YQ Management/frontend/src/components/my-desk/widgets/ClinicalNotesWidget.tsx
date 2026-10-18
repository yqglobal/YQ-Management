import React, { useState, useEffect } from 'react';
import { useMyDesk } from '../MyDeskContext';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { Save, FileText, Activity, Stethoscope, ClipboardList } from 'lucide-react';

export const ClinicalNotesWidget = ({ widgetId }: { widgetId: string }) => {
  const { activeVisit } = useMyDesk();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [noteId, setNoteId] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [vitals, setVitals] = useState({ bp: '', hr: '', temp: '', weight: '' });
  const [diagnosis, setDiagnosis] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    if (!activeVisit) {
      setSymptoms('');
      setVitals({ bp: '', hr: '', temp: '', weight: '' });
      setDiagnosis('');
      setPlan('');
      setNoteId(null);
      return;
    }

    const fetchNote = async () => {
      setLoading(true);
      try {
        const data = await fetchApi(`/visits/${activeVisit.id}/clinical-note`);
        if (data) {
          setNoteId(data.id);
          setSymptoms(data.symptoms || '');
          setDiagnosis(data.diagnosis || '');
          setPlan(data.plan || '');
          if (data.vitals) {
            setVitals({
              bp: data.vitals.bp || '',
              hr: data.vitals.hr || '',
              temp: data.vitals.temp || '',
              weight: data.vitals.weight || ''
            });
          }
        } else {
          setNoteId(null);
          setSymptoms('');
          setVitals({ bp: '', hr: '', temp: '', weight: '' });
          setDiagnosis('');
          setPlan('');
        }
      } catch (err) {
        console.error('Failed to fetch clinical note', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [activeVisit]);

  const handleSave = async () => {
    if (!activeVisit) return;
    setSaving(true);
    try {
      const payload = {
        symptoms,
        diagnosis,
        plan,
        vitals
      };
      
      const res = await fetchApi(`/visits/${activeVisit.id}/clinical-note`, {
        method: noteId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!noteId && res.id) setNoteId(res.id);
      toast.success('Clinical note saved successfully');
    } catch (err) {
      toast.error('Failed to save clinical note');
    } finally {
      setSaving(false);
    }
  };

  if (!activeVisit) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center h-full text-zinc-500">
        No patient currently selected. Pick a patient from the queue.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-zinc-900 dark:text-white">Clinical Notes</h3>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
            <div className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
          </div>
        ) : (
          <>
            {/* Subjective */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <FileText className="w-4 h-4" /> Symptoms / Chief Complaint
              </label>
              <textarea
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
                placeholder="Patient reports feeling..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              />
            </div>

            {/* Objective (Vitals) */}
            <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <Activity className="w-4 h-4" /> Vitals & Measurements
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Blood Pressure</label>
                  <input type="text" value={vitals.bp} onChange={e => setVitals({...vitals, bp: e.target.value})} placeholder="120/80" className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Heart Rate</label>
                  <input type="text" value={vitals.hr} onChange={e => setVitals({...vitals, hr: e.target.value})} placeholder="72 bpm" className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Temp (°C)</label>
                  <input type="text" value={vitals.temp} onChange={e => setVitals({...vitals, temp: e.target.value})} placeholder="37.0" className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Weight (kg)</label>
                  <input type="text" value={vitals.weight} onChange={e => setVitals({...vitals, weight: e.target.value})} placeholder="70" className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1.5 text-sm" />
                </div>
              </div>
            </div>

            {/* Assessment */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <Stethoscope className="w-4 h-4" /> Assessment / Diagnosis
              </label>
              <textarea
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                placeholder="Doctor's evaluation and primary diagnosis..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              />
            </div>

            {/* Plan */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <ClipboardList className="w-4 h-4" /> Plan / Treatment / Rest
              </label>
              <textarea
                value={plan}
                onChange={e => setPlan(e.target.value)}
                placeholder="Advised rest, follow up in 2 weeks, diet changes..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
