import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { Save, Plus, GripVertical, Trash2, MessagesSquare, FormInput, PhoneCall } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent } from '../../../components/ui/card';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-500">{description}</p>
            </div>
            <Button onClick={() => handleAddField(path)} variant="outline" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="relative flex gap-4 items-start bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 rounded-xl p-4">
                <div className="pt-3 text-gray-400 dark:text-zinc-600">
                  <GripVertical className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-1">Field Label</label>
                      <Input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateField(path, index, { label: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-1">Field Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(path, index, { type: e.target.value })}
                        className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 appearance-none"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="dropdown">Dropdown (Select)</option>
                        <option value="phone">Phone Number</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="rating">Star Rating (1-5)</option>
                      </select>
                    </div>
                  </div>
                  {field.type === 'dropdown' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-1">Options (comma separated)</label>
                      <Input
                        type="text"
                        value={(field.options || []).join(', ')}
                        onChange={(e) => handleUpdateField(path, index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={field.required} onChange={(e) => handleUpdateField(path, index, { required: e.target.checked })} className="accent-indigo-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-zinc-400">Required</span>
                    </label>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveField(path, index)} className="pt-2 p-2 text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            ))}
            {fields.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-zinc-500 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                No questions configured yet. Click 'Add Question' to start.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SettingsLayout pageTitle="Customer Experience" pageSubtitle="Manage customer facing flows">
        <div className="p-8 text-center text-gray-500">Loading settings...</div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout pageTitle="Customer Experience" pageSubtitle="Manage customer facing flows and forms">
      <Head>
        <title>Customer Experience Settings | Qmova</title>
      </Head>

      <div className="flex flex-col h-full min-h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Customer Experience</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Customize what your customers see when booking and checking in.</p>
          </div>
          <Button 
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg disabled:opacity-50"
          >
            {saveSettingsMutation.isPending ? <Save className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-200 dark:border-white/10 px-6 pt-4 gap-6">
          <button 
            onClick={() => setActiveTab('portal')}
            className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'portal' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <PhoneCall className="w-4 h-4" />
            Portal Settings
          </button>
          <button 
            onClick={() => setActiveTab('intake')}
            className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'intake' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <FormInput className="w-4 h-4" />
            Global Intake Form
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'feedback' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <MessagesSquare className="w-4 h-4" />
            Feedback & Survey
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 bg-gray-50 dark:bg-black/20 flex-1">
          {activeTab === 'portal' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Portal Branding</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Welcome Title</label>
                      <Input
                        type="text"
                        value={config.portal.welcomeTitle}
                        onChange={(e) => setConfig({ ...config, portal: { ...config.portal, welcomeTitle: e.target.value } })}
                        placeholder="e.g. Welcome to Acme Clinic"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Support Contact (Email/Phone)</label>
                      <Input
                        type="text"
                        value={config.portal.supportContact}
                        onChange={(e) => setConfig({ ...config, portal: { ...config.portal, supportContact: e.target.value } })}
                        placeholder="e.g. support@acme.com"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Welcome Message</label>
                      <textarea
                        value={config.portal.welcomeMessage}
                        onChange={(e) => setConfig({ ...config, portal: { ...config.portal, welcomeMessage: e.target.value } })}
                        placeholder="Please enter your details to proceed..."
                        className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'intake' && (
            renderFormBuilder('globalIntakeForm', 'Global Intake Questions', 'These questions will be asked to all customers during the check-in or booking process, regardless of the queue they join.')
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <label className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer shadow-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Enable Automated Feedback Collection</p>
                  <p className="text-sm text-gray-500 dark:text-zinc-500">Automatically send a survey link to customers after their visit is completed.</p>
                </div>
                <div className="relative inline-flex items-center">
                  <input type="checkbox" checked={config.feedback.enabled} onChange={e => setConfig({ ...config, feedback: { ...config.feedback, enabled: e.target.checked } })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </div>
              </label>

              {config.feedback.enabled && renderFormBuilder('feedback.questions', 'Feedback Survey Questions', 'Customize the survey customers receive post-visit.')}
            </div>
          )}
        </div>
      </div>
    </SettingsLayout>
  );
}
