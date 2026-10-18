import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { fetchApi } from '../../lib/api';

export default function MessageTemplatesSettings() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      const res: any = await fetchApi('/communication/templates/whatsapp');
      setTemplates(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async (key: string, content: string, isActive: boolean) => {
    setSaving(key);
    try {
      await fetchApi(`/communication/templates/whatsapp/${key}`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          isActive
        })
      });
      const toastEvent = new CustomEvent('admin-toast', { detail: { message: 'Template saved successfully', type: 'success' } });
      window.dispatchEvent(toastEvent);
    } catch (err) {
      const toastEvent = new CustomEvent('admin-toast', { detail: { message: 'Failed to save template', type: 'error' } });
      window.dispatchEvent(toastEvent);
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async (key: string) => {
    try {
      await fetchApi(`/communication/templates/whatsapp/${key}`, { method: 'DELETE' });
      const toastEvent = new CustomEvent('admin-toast', { detail: { message: 'Template reset to default', type: 'success' } });
      window.dispatchEvent(toastEvent);
      fetchTemplates();
    } catch (err) {
      const toastEvent = new CustomEvent('admin-toast', { detail: { message: 'Failed to reset template', type: 'error' } });
      window.dispatchEvent(toastEvent);
    }
  };

  return (
    <>

      <div className="space-y-6 max-w-4xl">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-lg"></div>)}
          </div>
        ) : (
          templates.map((tpl) => (
            <div key={tpl.key} className="bg-surface dark:bg-dark-surface border border-border dark:border-dark-border rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-on-surface dark:text-white">{tpl.name}</h3>
                  <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1">Key: {tpl.key}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleReset(tpl.key)}
                    className="text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
              
              <textarea
                className="w-full bg-canvas dark:bg-dark-canvas border border-border dark:border-dark-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary min-h-[100px] outline-none"
                defaultValue={tpl.content}
                onChange={(e) => {
                  const newTemplates = [...templates];
                  const index = newTemplates.findIndex(t => t.key === tpl.key);
                  newTemplates[index].content = e.target.value;
                  setTemplates(newTemplates);
                }}
              />
              
              <div className="mt-4 flex justify-between items-center">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Available variables: {'{{name}}, {{token}}, {{service_name}}, {{wait_time}}, {{link}}, etc.'}
                </div>
                <button
                  onClick={() => handleSave(tpl.key, tpl.content, true)}
                  disabled={saving === tpl.key}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving === tpl.key ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

