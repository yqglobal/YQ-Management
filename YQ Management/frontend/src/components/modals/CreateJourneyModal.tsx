import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Workflow, ArrowRight, LayoutTemplate } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

interface CreateJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateJourneyModal({ isOpen, onClose }: CreateJourneyModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateKey, setTemplateKey] = useState('');

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['journey-templates'],
    queryFn: () => fetchApi('/service-flows/templates/list'),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; templateKey: string }) => {
      // Create the underlying Service first
      const service = await fetchApi('/service', {
        method: 'POST',
        body: JSON.stringify({ 
          name: data.name,
          description: data.description || '',
          allowAppointments: true
        }),
      });

      if (data.templateKey) {
        // Apply template
        const flow = await fetchApi(`/service-flows/templates/${data.templateKey}/apply?serviceId=${service.id}`, { method: 'POST' });
        
        // Update the flow name and description to match user's input
        await fetchApi(`/service-flows/${flow.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: data.name, description: data.description })
        });
        
        return flow;
      } else {
        // Create an empty flow
        const flow = await fetchApi('/service-flows', {
          method: 'POST',
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            serviceId: service.id
          }),
        });
        return flow;
      }
    },
    onSuccess: (data) => {
      toast.success('Journey created successfully');
      onClose();
      router.push(`/dashboard/journeys/${data.id}`);
    },
    onError: () => toast.error('Failed to create journey'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim(), templateKey });
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTemplateKey(val);
    
    // Optional: auto-fill name and description if they are empty and a template is chosen
    if (val) {
      const t = templates.find((t: any) => t.key === val);
      if (t) {
        if (!name) setName(t.name);
        if (!description) setDescription(t.description);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Workflow className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface dark:text-white">New Journey</h2>
              <p className="text-sm text-on-surface-variant dark:text-zinc-400">Design a new step-by-step process</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface dark:text-zinc-300 mb-1">
                Journey Name
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Onboarding Process"
                className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-on-surface dark:text-zinc-300 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this journey is for..."
                className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface dark:text-zinc-300 mb-1 flex items-center justify-between">
                <span>Start from a Template</span>
                {templatesLoading && <span className="text-xs text-zinc-500">Loading...</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-400">
                  <LayoutTemplate className="w-5 h-5" />
                </div>
                <select
                  value={templateKey}
                  onChange={handleTemplateChange}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Start from scratch</option>
                  {templates?.map((t: any) => (
                    <option key={t.key} value={t.key}>
                      {t.name} ({t.stepCount} steps)
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-on-surface-variant hover:text-on-surface dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || createMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Journey'}
                {!createMutation.isPending && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
