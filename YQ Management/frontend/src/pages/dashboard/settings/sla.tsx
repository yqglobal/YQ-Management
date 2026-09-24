import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SlaPoliciesPage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    warningThresholdMins: 15,
    breachThresholdMins: 30,
    escalationPhones: ''
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['sla-policies'],
    queryFn: () => fetchApi('/sla-policies')
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/sla-policies', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
      setIsEditing(null);
      toast.success('SLA Policy created');
    },
    onError: () => toast.error('Failed to create policy')
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => fetchApi(`/sla-policies/${data.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
      setIsEditing(null);
      toast.success('SLA Policy updated');
    },
    onError: () => toast.error('Failed to update policy')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/sla-policies/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-policies'] });
      toast.success('SLA Policy deleted');
    },
    onError: () => toast.error('Failed to delete policy')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      escalationPhones: formData.escalationPhones.split(',').map(p => p.trim()).filter(p => p)
    };
    if (isEditing && isEditing !== 'new') {
      updateMutation.mutate({ id: isEditing, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (policy: any) => {
    setFormData({
      name: policy.name,
      warningThresholdMins: policy.warningThresholdMins,
      breachThresholdMins: policy.breachThresholdMins,
      escalationPhones: policy.escalationPhones?.join(', ') || ''
    });
    setIsEditing(policy.id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this policy? Any services using it will no longer have SLA monitoring.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <SettingsLayout pageTitle="SLA & Automation" pageSubtitle="Manage Service Level Agreements (SLAs) for Wait Times">
      <Head>
        <title>SLA Policies | Settings</title>
      </Head>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-on-surface dark:text-white">SLA Policies</h2>
          <p className="text-sm text-outline">Set up thresholds to automatically alert you when wait times get too long.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => {
              setFormData({ name: '', warningThresholdMins: 15, breachThresholdMins: 30, escalationPhones: '' });
              setIsEditing('new');
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors"
          >
            <Plus className="w-4 h-4" /> New Policy
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-surface-container dark:bg-inverse-surface border border-border dark:border-dark-border p-6 rounded-xl mb-6 shadow-sm">
          <h3 className="text-md font-bold mb-4">{isEditing === 'new' ? 'Create New Policy' : 'Edit Policy'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Policy Name</label>
              <input 
                required 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-card dark:bg-dark-card border border-border dark:border-dark-border px-3 py-2 rounded-lg text-sm focus:border-primary outline-none" 
                placeholder="e.g. VIP Urgent Care"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Escalation WhatsApp Numbers (comma separated)</label>
              <input 
                type="text" 
                value={formData.escalationPhones} 
                onChange={e => setFormData({ ...formData, escalationPhones: e.target.value })}
                className="w-full bg-card dark:bg-dark-card border border-border dark:border-dark-border px-3 py-2 rounded-lg text-sm focus:border-primary outline-none" 
                placeholder="e.g. 14155552671, 14155552672"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Warning Threshold (Minutes)</label>
              <input 
                required 
                type="number" 
                min="1"
                value={formData.warningThresholdMins} 
                onChange={e => setFormData({ ...formData, warningThresholdMins: parseInt(e.target.value) })}
                className="w-full bg-card dark:bg-dark-card border border-border dark:border-dark-border px-3 py-2 rounded-lg text-sm focus:border-primary outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Breach Threshold (Minutes)</label>
              <input 
                required 
                type="number" 
                min="1"
                value={formData.breachThresholdMins} 
                onChange={e => setFormData({ ...formData, breachThresholdMins: parseInt(e.target.value) })}
                className="w-full bg-card dark:bg-dark-card border border-border dark:border-dark-border px-3 py-2 rounded-lg text-sm focus:border-primary outline-none" 
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setIsEditing(null)} 
              className="px-4 py-2 text-sm font-semibold text-outline hover:bg-surface-container rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Save Policy
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-sm text-outline">Loading policies...</div>
      ) : policies.length === 0 && !isEditing ? (
        <div className="text-center py-12 border border-dashed border-border dark:border-dark-border rounded-xl">
          <p className="text-outline mb-2">No SLA policies defined.</p>
          <p className="text-sm text-outline max-w-sm mx-auto">Create an SLA policy and assign it to a Service to automatically monitor waiting customers and send WhatsApp escalations when wait times exceed thresholds.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy: any) => (
            <div key={policy.id} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border p-4 rounded-xl flex items-center justify-between shadow-sm">
              <div>
                <h4 className="font-bold text-on-surface dark:text-white text-md">{policy.name}</h4>
                <div className="flex gap-4 mt-1 text-xs text-outline">
                  <span>Warning: {policy.warningThresholdMins}m</span>
                  <span>Breach: {policy.breachThresholdMins}m</span>
                  <span>Assigned Services: {policy._count?.services || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(policy)} className="p-2 text-outline hover:bg-surface-container hover:text-primary rounded-lg transition-colors" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(policy.id)} className="p-2 text-outline hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SettingsLayout>
  );
}
