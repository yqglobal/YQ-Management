import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';
import { Save, Plus, GripVertical, Trash2, MessagesSquare, FormInput, PhoneCall, LayoutTemplate, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Card, CardContent } from '../../../../components/ui/card';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

const PRESET_TEMPLATES = [
  {
    name: 'Hospital / Clinic',
    fields: [
      { id: 't_symptoms', type: 'textarea', label: 'Primary Symptoms', required: true },
      { id: 't_fever', type: 'dropdown', label: 'Do you have a fever?', required: true, options: ['Yes', 'No'] },
      { id: 't_travel', type: 'dropdown', label: 'Have you traveled recently?', required: false, options: ['Yes', 'No'] }
    ]
  },
  {
    name: 'Restaurant / Dining',
    fields: [
      { id: 't_party', type: 'dropdown', label: 'Party Size', required: true, options: ['1-2', '3-4', '5-6', '7+'] },
      { id: 't_seating', type: 'dropdown', label: 'Seating Preference', required: false, options: ['Indoor', 'Outdoor', 'Any'] },
      { id: 't_allergies', type: 'textarea', label: 'Any allergies?', required: false }
    ]
  },
  {
    name: 'General Queue',
    fields: [
      { id: 't_purpose', type: 'text', label: 'Purpose of Visit', required: true }
    ]
  }
];

export default function CustomerExperienceSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'portal' | 'intake' | 'feedback'>('portal');

  const { data: tenant = null, isLoading } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me'),
  });

  const [config, setConfig] = useState<any>({
    portal: { welcomeTitle: '', welcomeMessage: '', supportContact: '' },
    globalIntakeForm: [],
    feedback: { enabled: false, questions: [] },
  });

  useEffect(() => {
    if (tenant?.customerExperience) {
      setConfig({
        portal: tenant.customerExperience.portal || { welcomeTitle: '', welcomeMessage: '', supportContact: '' },
        globalIntakeForm: tenant.customerExperience.globalIntakeForm || [],
        feedback: tenant.customerExperience.feedback || { enabled: false, questions: [] },
      });
    }
  }, [tenant]);

  const saveSettingsMutation = useMutation({
    mutationFn: (newConfig: any) => fetchApi(`/tenant/${tenant.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ customerExperience: newConfig }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      toast.success('Customer Experience settings saved!');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(config);
  };

  const handleAddField = (path: 'globalIntakeForm' | 'feedback.questions') => {
    setConfig((prev: any) => {
      const newField = { id: `field_${Date.now()}`, type: 'text', label: 'New Question', required: false };
      if (path === 'globalIntakeForm') {
        return { ...prev, globalIntakeForm: [...prev.globalIntakeForm, newField] };
      } else {
        return { ...prev, feedback: { ...prev.feedback, questions: [...prev.feedback.questions, newField] } };
      }
    });
  };

  const handleUpdateField = (path: 'globalIntakeForm' | 'feedback.questions', index: number, updates: Partial<FormField>) => {
    setConfig((prev: any) => {
      if (path === 'globalIntakeForm') {
        const newArr = [...prev.globalIntakeForm];
        newArr[index] = { ...newArr[index], ...updates };
        return { ...prev, globalIntakeForm: newArr };
      } else {
        const newArr = [...prev.feedback.questions];
        newArr[index] = { ...newArr[index], ...updates };
        return { ...prev, feedback: { ...prev.feedback, questions: newArr } };
      }
    });
  };

  const handleRemoveField = (path: 'globalIntakeForm' | 'feedback.questions', index: number) => {
    setConfig((prev: any) => {
      if (path === 'globalIntakeForm') {
        const newArr = [...prev.globalIntakeForm];
        newArr.splice(index, 1);
        return { ...prev, globalIntakeForm: newArr };
      } else {
        const newArr = [...prev.feedback.questions];
        newArr.splice(index, 1);
        return { ...prev, feedback: { ...prev.feedback, questions: newArr } };
      }
    });
  };

  const renderFormBuilder = (path: 'globalIntakeForm' | 'feedback.questions', title: string, description: string) => {
    const fields: FormField[] = path === 'globalIntakeForm' ? config.globalIntakeForm : config.feedback.questions;
    
    return (
      <div className="bg-surface-bright dark:bg-zinc-900 rounded-2xl border border-border dark:border-dark-border p-6 relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 border-b border-border dark:border-dark-border pb-4 gap-4">
          <div>
            <h3 className="font-body-lg text-body-lg font-semibold text-on-surface dark:text-white">{title}</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline mt-1">{description}</p>
          </div>
          <div className="flex gap-2">
            {path === 'globalIntakeForm' && (
              <div className="relative">
                <select 
                  onChange={(e) => {
                    const t = PRESET_TEMPLATES.find(t => t.name === e.target.value);
                    if (t) {
                      setConfig((prev: any) => ({ ...prev, globalIntakeForm: t.fields }));
                    }
                    e.target.value = "";
                  }}
                  className="h-[40px] pl-4 pr-10 bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-lg text-sm text-on-surface dark:text-white outline-none hover:bg-surface-container-low transition-colors appearance-none"
                >
                  <option value="">Load Template...</option>
                  {PRESET_TEMPLATES.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline text-sm">expand_more</span>
              </div>
            )}
            <button onClick={() => handleAddField(path)} className="h-[40px] px-4 border border-border dark:border-dark-border rounded-lg text-primary hover:bg-surface-container-low dark:hover:bg-white/5 transition-colors font-body-sm font-semibold flex items-center gap-2 bg-white dark:bg-transparent shadow-sm">
              <Plus strokeWidth={1.5} className="w-4 h-4" /> Add Question
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="relative flex gap-4 items-start bg-surface-container-low dark:bg-black/40 border border-border dark:border-white/5 rounded-xl p-5">
              <div className="pt-2 text-outline">
                <GripVertical strokeWidth={1.5} className="w-5 h-5 cursor-grab" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Field Label</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleUpdateField(path, index, { label: e.target.value })}
                      className="w-full h-[40px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-3 font-body-sm text-body-sm text-on-surface dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Field Type</label>
                    <div className="relative">
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(path, index, { type: e.target.value })}
                        className="w-full h-[40px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-3 font-body-sm text-body-sm text-on-surface dark:text-white outline-none focus:border-primary appearance-none"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="dropdown">Dropdown (Select)</option>
                        <option value="phone">Phone Number</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="rating">Star Rating (1-5)</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline text-sm">expand_more</span>
                    </div>
                  </div>
                </div>
                {field.type === 'dropdown' && (
                  <div>
                    <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Options (comma separated)</label>
                    <input
                      type="text"
                      value={(field.options || []).join(', ')}
                      onChange={(e) => handleUpdateField(path, index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                      placeholder="Option 1, Option 2, Option 3"
                      className="w-full h-[40px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-3 font-body-sm text-body-sm text-on-surface dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input type="checkbox" checked={field.required} onChange={(e) => handleUpdateField(path, index, { required: e.target.checked })} className="w-4 h-4 text-primary border-border rounded focus:ring-primary bg-white dark:bg-black/50" />
                    <span className="text-body-sm font-medium text-on-surface-variant dark:text-outline">Required Field</span>
                  </label>
                </div>
              </div>
              <button onClick={() => handleRemoveField(path, index)} className="p-2 text-outline hover:text-error hover:bg-error-container rounded-lg transition-colors">
                <Trash2 strokeWidth={1.5} className="w-5 h-5" />
              </button>
            </div>
          ))}
          {fields.length === 0 && (
            <div className="text-center py-10 text-outline border-2 border-dashed border-border dark:border-dark-border rounded-xl">
              <LayoutTemplate strokeWidth={1.5} className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="font-body-md">No questions configured yet.</p>
              <p className="font-body-sm mt-1">Click 'Add Question' or load a template to start.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-outline">Loading...</div>;
  }

  return (
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#D97706]"></div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-[#D97706]" style={{ fontVariationSettings: "'FILL' 1" }}>supervised_user_circle</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Customer Experience</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Customize what your customers see when booking and checking in.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending}
          className="h-[44px] px-6 bg-[#D97706] hover:bg-[#B45309] text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saveSettingsMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save strokeWidth={1.5} className="w-5 h-5" />}
          Save Changes
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-border dark:border-dark-border pb-2">
        <button 
          onClick={() => setActiveTab('portal')}
          className={`px-4 h-[44px] rounded-t-lg font-body-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'portal' ? 'border-[#D97706] text-[#D97706]' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          <PhoneCall strokeWidth={1.5} className="w-4 h-4" />
          Portal Branding
        </button>
        <button 
          onClick={() => setActiveTab('intake')}
          className={`px-4 h-[44px] rounded-t-lg font-body-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'intake' ? 'border-[#D97706] text-[#D97706]' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          <FormInput strokeWidth={1.5} className="w-4 h-4" />
          Global Intake Form
        </button>
        <button 
          onClick={() => setActiveTab('feedback')}
          className={`px-4 h-[44px] rounded-t-lg font-body-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === 'feedback' ? 'border-[#D97706] text-[#D97706]' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          <MessagesSquare strokeWidth={1.5} className="w-4 h-4" />
          Feedback Survey
        </button>
      </div>

      <div>
        {activeTab === 'portal' && (
          <div className="bg-surface-bright dark:bg-zinc-900 rounded-2xl border border-border dark:border-dark-border p-6">
            <h3 className="font-body-lg text-body-lg font-semibold text-on-surface dark:text-white mb-6 border-b border-border dark:border-dark-border pb-4">Portal Branding</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Welcome Title</label>
                <input
                  type="text"
                  value={config.portal.welcomeTitle}
                  onChange={(e) => setConfig({ ...config, portal: { ...config.portal, welcomeTitle: e.target.value } })}
                  placeholder="e.g. Welcome to Acme Clinic"
                  className="w-full h-[44px] bg-white dark:bg-zinc-800 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-[#D97706] focus:border-[#D97706] outline-none text-on-surface dark:text-white"
                />
              </div>
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Support Contact</label>
                <input
                  type="text"
                  value={config.portal.supportContact}
                  onChange={(e) => setConfig({ ...config, portal: { ...config.portal, supportContact: e.target.value } })}
                  placeholder="e.g. support@acme.com"
                  className="w-full h-[44px] bg-white dark:bg-zinc-800 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-[#D97706] focus:border-[#D97706] outline-none text-on-surface dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Welcome Message</label>
                <textarea
                  value={config.portal.welcomeMessage}
                  onChange={(e) => setConfig({ ...config, portal: { ...config.portal, welcomeMessage: e.target.value } })}
                  placeholder="Please enter your details to proceed..."
                  className="w-full min-h-[120px] bg-white dark:bg-zinc-800 border border-border dark:border-dark-border rounded-lg p-4 font-body-md text-body-md focus:ring-1 focus:ring-[#D97706] focus:border-[#D97706] outline-none text-on-surface dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'intake' && (
          renderFormBuilder('globalIntakeForm', 'Global Intake Questions', 'These questions will be asked to all customers during check-in.')
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-6">
            <label className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl cursor-pointer hover:border-outline transition-colors h-[72px]">
              <div className="flex flex-col justify-center">
                <span className="font-body-md text-on-surface dark:text-white font-medium leading-none">Enable Automated Feedback Collection</span>
                <span className="text-[12px] text-outline mt-1 leading-none">Automatically send a survey link after visit completion.</span>
              </div>
              <div className="relative inline-flex items-center">
                <input type="checkbox" checked={config.feedback.enabled} onChange={e => setConfig({ ...config, feedback: { ...config.feedback, enabled: e.target.checked } })} className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D97706]"></div>
              </div>
            </label>

            {config.feedback.enabled && renderFormBuilder('feedback.questions', 'Feedback Survey Questions', 'Customize the post-visit survey.')}
          </div>
        )}
      </div>
    </div>
  );
}
