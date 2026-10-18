import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '../../../components/AuthContext';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { WIDGET_MAP } from '../../../components/my-desk/WidgetRegistry';
import SettingsLayout from '../../../components/SettingsLayout';
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';

const AVAILABLE_WIDGETS = Object.keys(WIDGET_MAP).map(key => ({
  id: key,
  name: key.replace(/([A-Z])/g, ' $1').trim()
}));

export default function StaffViewSettings() {
  const { user, refetch } = useAuth();
  const [layout, setLayout] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');

  useEffect(() => {
    const loadTenant = async () => {
      try {
        const tenantData = await fetchApi('/tenant/me');
        setTenantId(tenantData.id);
        if (tenantData.staffViewLayout && Array.isArray(tenantData.staffViewLayout)) {
          setLayout(tenantData.staffViewLayout);
        } else {
          // Default empty or minimal
          setLayout([]);
        }
      } catch (err) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadTenant();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchApi(`/tenant/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ staffViewLayout: layout })
      });
      toast.success('Staff View layout saved successfully!');
      await refetch();
    } catch (err) {
      toast.error('Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const addWidget = (type: string) => {
    const newWidget = {
      id: `${type.toLowerCase()}-${Date.now()}`,
      type,
      position: { colSpan: 1, rowSpan: 1 }
    };
    setLayout([...layout, newWidget]);
  };

  const removeWidget = (index: number) => {
    const newLayout = [...layout];
    newLayout.splice(index, 1);
    setLayout(newLayout);
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === layout.length - 1) return;
    
    const newLayout = [...layout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newLayout[index];
    newLayout[index] = newLayout[targetIndex];
    newLayout[targetIndex] = temp;
    setLayout(newLayout);
  };

  const updateSpan = (index: number, field: 'colSpan' | 'rowSpan', value: number) => {
    const newLayout = [...layout];
    newLayout[index].position[field] = value;
    setLayout(newLayout);
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Staff View Settings | YQ Management</title>
      </Head>

      <div className="max-w-5xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Layout Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card dark:bg-dark-card shadow-sm rounded-2xl border border-border dark:border-dark-border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-on-surface dark:text-white">Active Grid Layout</h2>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {layout.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border dark:border-dark-border rounded-xl text-on-surface-variant">
                No widgets added yet. Add some from the library.
              </div>
            ) : (
              <div className="space-y-4">
                {layout.map((widget, index) => (
                  <div key={widget.id} className="flex flex-col sm:flex-row gap-4 items-center bg-surface-container-low dark:bg-dark-surface p-4 rounded-xl border border-border dark:border-dark-border">
                    
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => moveWidget(index, 'up')} disabled={index === 0} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 disabled:opacity-30 shrink-0">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => moveWidget(index, 'down')} disabled={index === layout.length - 1} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500 disabled:opacity-30 shrink-0">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{widget.type.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-xs text-zinc-500 truncate">ID: {widget.id}</p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                        Cols:
                        <select 
                          value={widget.position.colSpan || 1} 
                          onChange={(e) => updateSpan(index, 'colSpan', parseInt(e.target.value))}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded p-1"
                        >
                          <option value={1}>1 (33%)</option>
                          <option value={2}>2 (66%)</option>
                          <option value={3}>3 (100%)</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                        Rows:
                        <select 
                          value={widget.position.rowSpan || 1} 
                          onChange={(e) => updateSpan(index, 'rowSpan', parseInt(e.target.value))}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded p-1"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </label>
                    </div>

                    <button 
                      onClick={() => removeWidget(index)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0 transition-colors"
                      title="Remove Widget"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Widget Library */}
        <div className="space-y-6">
          <div className="bg-card dark:bg-dark-card shadow-sm rounded-2xl border border-border dark:border-dark-border p-6 sticky top-6">
            <h3 className="text-lg font-bold text-on-surface dark:text-white mb-4">Widget Library</h3>
            <p className="text-sm text-on-surface-variant mb-6">Click a widget to add it to your staff's dashboard grid.</p>
            
            <div className="space-y-3">
              {AVAILABLE_WIDGETS.map(widget => (
                <button
                  key={widget.id}
                  onClick={() => addWidget(widget.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-surface hover:bg-primary/5 hover:border-primary/40 transition-colors group text-left"
                >
                  <span className="font-medium text-on-surface dark:text-white group-hover:text-primary transition-colors">
                    {widget.name}
                  </span>
                  <Plus className="w-4 h-4 text-outline group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

StaffViewSettings.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <SettingsLayout pageTitle="Staff View Builder" pageSubtitle="Customize the My-Desk dashboard layout for your staff.">
      {page}
    </SettingsLayout>
  );
};
