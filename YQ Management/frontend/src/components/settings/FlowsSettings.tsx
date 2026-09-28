import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { Workflow, Trash2, Plus, Loader2, ArrowRight, Settings2, GripVertical, CheckCircle2, ChevronRight, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { FlowBuilder } from './FlowBuilder';

export function FlowsSettings() {
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [editingStep, setEditingStep] = useState<any>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [localSteps, setLocalSteps] = useState<any[]>([]);

  // Form State
  const [stepForm, setStepForm] = useState({
    name: '',
    description: '',
    type: 'SERVICE',
    isOptional: false,
    triggerRule: 'MANUAL',
    outcomeOptions: [] as string[],
    customerInstruction: '',
    staffInstruction: '',
    floorNumber: '',
    roomNumber: '',
    mapImageUrl: ''
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
  });

  const { data: flow, isLoading: flowLoading } = useQuery({
    queryKey: ['service-flow', selectedServiceId],
    queryFn: () => fetchApi(`/service-flows/by-service/${selectedServiceId}`),
    enabled: selectedServiceId !== 'all',
    retry: false
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['service-flow-templates'],
    queryFn: () => fetchApi('/service-flows/templates/list'),
  });

  useEffect(() => {
    if (flow?.steps) {
      setLocalSteps([...flow.steps].sort((a: any, b: any) => a.stepOrder - b.stepOrder));
    } else {
      setLocalSteps([]);
    }
  }, [flow?.steps]);

  // Mutations
  const applyTemplateMutation = useMutation({
    mutationFn: (templateKey: string) => fetchApi(`/service-flows/templates/${templateKey}/apply?serviceId=${selectedServiceId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-flow', selectedServiceId] });
      toast.success('Blueprint applied!');
    }
  });

  const deleteFlowMutation = useMutation({
    mutationFn: (flowId: string) => fetchApi(`/service-flows/${flowId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-flow', selectedServiceId] });
      toast.success('Flow reset to standard queue');
    }
  });

  const createStepMutation = useMutation({
    mutationFn: (dto: any) => fetchApi(`/service-flows/${flow.id}/steps`, { method: 'POST', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-flow', selectedServiceId] });
      toast.success('Stage added');
      setIsAddingStep(false);
    }
  });

  const updateStepMutation = useMutation({
    mutationFn: (dto: any) => fetchApi(`/service-flows/${flow.id}/steps/${dto.id || editingStep?.id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-flow', selectedServiceId] });
      toast.success('Stage updated');
      setEditingStep(null);
    }
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => fetchApi(`/service-flows/${flow.id}/steps/${stepId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-flow', selectedServiceId] });
      toast.success('Stage removed');
      setEditingStep(null);
    }
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => fetchApi(`/service-flows/${flow.id}/steps/reorder`, { 
      method: 'POST', 
      body: JSON.stringify({ orderedStepIds: orderedIds }) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-flow', selectedServiceId] });
      toast.success('Flow order saved');
    }
  });

  const handleSaveTransitions = (fromStepId: string, transitions: any[]) => {
    // We update the step with the new transitions
    updateStepMutation.mutate({ id: fromStepId, transitions });
  };

  const handleSaveStep = () => {
    if (!stepForm.name) return toast.error('Name is required');
    const payload = {
      ...stepForm,
      floorNumber: stepForm.floorNumber ? parseInt(stepForm.floorNumber, 10) : null,
      stepPrice: stepForm.stepPrice ? parseFloat(stepForm.stepPrice) : null
    };
    if (isAddingStep) {
      createStepMutation.mutate({ ...payload, stepOrder: localSteps.length + 1 });
    } else if (editingStep) {
      updateStepMutation.mutate({ ...payload, id: editingStep.id });
    }
  };

  const openEdit = (step: any) => {
    setEditingStep(step);
    setIsAddingStep(false);
    setStepForm({
      name: step.name,
      description: step.description || '',
      type: step.type,
      isOptional: step.isOptional,
      triggerRule: step.triggerRule || 'MANUAL',
      outcomeOptions: step.outcomeOptions || [],
      customerInstruction: step.customerInstruction || '',
      staffInstruction: step.staffInstruction || '',
      floorNumber: step.floorNumber?.toString() || '',
      roomNumber: step.roomNumber || '',
      mapImageUrl: step.mapImageUrl || '',
      stepPrice: step.stepPrice?.toString() || '',
      stepPriceCurrency: step.stepPriceCurrency || 'ZAR',
      isPriceVariable: step.isPriceVariable || false
    });
  };

  const openAdd = () => {
    setIsAddingStep(true);
    setEditingStep(null);
    setStepForm({ 
      name: '', 
      description: '', 
      type: 'SERVICE', 
      isOptional: false, 
      triggerRule: 'MANUAL', 
      outcomeOptions: [],
      customerInstruction: '',
      staffInstruction: '',
      floorNumber: '',
      roomNumber: '',
      mapImageUrl: '',
      stepPrice: '',
      stepPriceCurrency: 'ZAR',
      isPriceVariable: false
    });
  };

  return (
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-6 sm:p-8 relative overflow-hidden mb-8 min-h-[600px]">
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-indigo-500 to-purple-500" />
      
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <Workflow className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-white tracking-tight">Workflow Engine</h2>
          </div>
          <p className="text-on-surface-variant dark:text-zinc-400 font-body-sm text-body-sm max-w-xl leading-relaxed">
            Design dynamic, multi-stage routing for your business operations. Build custom funnels, add conditional checkpoints, and orchestrate complex patient or customer journeys.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-semibold text-on-surface dark:text-white mb-2 uppercase tracking-wide">Target Service</label>
        <select 
          value={selectedServiceId} 
          onChange={e => setSelectedServiceId(e.target.value)}
          className="w-full sm:max-w-md px-4 py-3 bg-surface-container-lowest dark:bg-[#0a0a0a] border border-border dark:border-dark-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
        >
          <option value="all">-- Select a Service to Configure --</option>
          {services.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedServiceId !== 'all' && (
        <div className="mt-8 border-t border-border dark:border-dark-border pt-8 relative">
          {flowLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-10 h-10 animate-spin text-indigo-500" /></div>
          ) : flow && flow.id ? (
            <div className="flex flex-col lg:flex-row gap-8">
              
              {/* Visual Flow Canvas */}
              <div className="flex-1 max-w-2xl">
                <div className="flex justify-between items-center mb-6 bg-surface-container-low dark:bg-zinc-800/30 p-4 rounded-2xl border border-border dark:border-dark-border">
                  <div>
                    <h3 className="text-xl font-bold text-on-surface dark:text-white flex items-center gap-2">
                      {flow.name}
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">Active</span>
                    </h3>
                    <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1">{flow.description}</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm('Delete this flow and revert to basic?')) deleteFlowMutation.mutate(flow.id);
                    }}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    title="Reset Flow"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative">
                  <FlowBuilder 
                    flow={flow} 
                    onEditStep={openEdit} 
                    onSaveTransitions={handleSaveTransitions}
                  />

                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={openAdd}
                    className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/50 shadow-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add New Stage
                  </motion.button>
                </div>
              </div>

              {/* Property Editor Panel */}
              <AnimatePresence mode="wait">
                {(editingStep || isAddingStep) && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                    className="w-full lg:w-96 shrink-0 bg-surface-container-lowest dark:bg-[#0a0a0a] border border-border dark:border-dark-border rounded-2xl shadow-xl overflow-hidden flex flex-col h-fit"
                  >
                    <div className="p-5 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-zinc-800/50 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-on-surface dark:text-white">{isAddingStep ? 'New Stage' : 'Configure Stage'}</h3>
                      </div>
                      <button onClick={() => { setEditingStep(null); setIsAddingStep(false); }} className="text-zinc-400 hover:text-on-surface">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5">Stage Name</label>
                        <input 
                          type="text" 
                          value={stepForm.name} 
                          onChange={e => setStepForm({...stepForm, name: e.target.value})}
                          className="w-full px-3 py-2 bg-surface dark:bg-black border border-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="e.g. Triage, Payment, Checkout"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5">Description</label>
                        <textarea 
                          value={stepForm.description} 
                          onChange={e => setStepForm({...stepForm, description: e.target.value})}
                          className="w-full px-3 py-2 bg-surface dark:bg-black border border-border dark:border-dark-border rounded-lg text-sm min-h-[80px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                          placeholder="Internal notes for this stage..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5">Node Type</label>
                          <select 
                            value={stepForm.type} 
                            onChange={e => setStepForm({...stepForm, type: e.target.value})}
                            className="w-full px-3 py-2 bg-surface dark:bg-black border border-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="CHECKPOINT">Checkpoint</option>
                            <option value="SERVICE">Service Area</option>
                            <option value="PAYMENT">Payment</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5">Trigger</label>
                          <select 
                            value={stepForm.triggerRule} 
                            onChange={e => setStepForm({...stepForm, triggerRule: e.target.value})}
                            className="w-full px-3 py-2 bg-surface dark:bg-black border border-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="MANUAL">Manual Routing</option>
                            <option value="AUTO">Auto-Advance</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border dark:border-dark-border space-y-4">
                        <h4 className="text-xs font-bold text-on-surface dark:text-white uppercase tracking-wider">Wayfinding & Instructions</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5">Floor No.</label>
                            <input 
                              type="number" 
                              value={stepForm.floorNumber} 
                              onChange={e => setStepForm({...stepForm, floorNumber: e.target.value})}
                              className="w-full px-3 py-2 bg-surface dark:bg-black border border-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="e.g. 2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5">Room / Counter</label>
                            <input 
                              type="text" 
                              value={stepForm.roomNumber} 
                              onChange={e => setStepForm({...stepForm, roomNumber: e.target.value})}
                              className="w-full px-3 py-2 bg-surface dark:bg-black border border-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="e.g. Room A1"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5">Digital Ticket Instruction</label>
                          <textarea 
                            value={stepForm.customerInstruction} 
                            onChange={e => setStepForm({...stepForm, customerInstruction: e.target.value})}
                            className="w-full px-3 py-2 bg-surface dark:bg-black border border-border dark:border-dark-border rounded-lg text-sm min-h-[60px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="e.g. Please wait here until called..."
                          />
                        </div>
                      </div>

                      {stepForm.type === 'PAYMENT' && (
                        <div className="pt-4 border-t border-border dark:border-dark-border space-y-4 animate-in fade-in slide-in-from-top-2">
                          <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Payment Settings</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5">Fixed Price</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="text-zinc-500 sm:text-sm">{stepForm.stepPriceCurrency === 'ZAR' ? 'R' : '$'}</span>
                                </div>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={stepForm.stepPrice} 
                                  onChange={e => setStepForm({...stepForm, stepPrice: e.target.value})}
                                  disabled={stepForm.isPriceVariable}
                                  className="w-full pl-7 pr-3 py-2 bg-surface dark:bg-black border border-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5">Currency</label>
                              <select 
                                value={stepForm.stepPriceCurrency} 
                                onChange={e => setStepForm({...stepForm, stepPriceCurrency: e.target.value})}
                                className="w-full px-3 py-2 bg-surface dark:bg-black border border-border dark:border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                              >
                                <option value="ZAR">ZAR (R)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                              </select>
                            </div>
                          </div>
                          
                          <label className="flex items-center gap-3 cursor-pointer p-3 border border-border dark:border-dark-border rounded-xl hover:bg-surface-container-low dark:hover:bg-zinc-800/30 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={stepForm.isPriceVariable} 
                              onChange={e => setStepForm({...stepForm, isPriceVariable: e.target.checked, stepPrice: e.target.checked ? '' : stepForm.stepPrice})}
                              className="w-4 h-4 text-emerald-600 rounded border-gray-300 dark:border-zinc-700 bg-surface dark:bg-black"
                            />
                            <div>
                              <div className="text-sm font-semibold text-on-surface dark:text-white">Variable Pricing (Quote)</div>
                              <div className="text-xs text-on-surface-variant dark:text-zinc-400">Price is determined by staff during the visit based on services rendered.</div>
                            </div>
                          </label>
                        </div>
                      )}


                      <div className="pt-2 border-t border-border dark:border-dark-border">
                        <label className="flex items-center gap-3 cursor-pointer p-3 border border-border dark:border-dark-border rounded-xl hover:bg-surface-container-low dark:hover:bg-zinc-800/30 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={stepForm.isOptional} 
                            onChange={e => setStepForm({...stepForm, isOptional: e.target.checked})}
                            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 dark:bg-black dark:border-zinc-700"
                          />
                          <div>
                            <div className="font-semibold text-sm text-on-surface dark:text-white">Optional Stage</div>
                            <div className="text-xs text-on-surface-variant dark:text-zinc-400">Can be skipped by customers</div>
                          </div>
                        </label>
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button 
                          onClick={handleSaveStep}
                          disabled={createStepMutation.isPending || updateStepMutation.isPending}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors flex justify-center items-center gap-2"
                        >
                          {(createStepMutation.isPending || updateStepMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                          Save Configuration
                        </button>
                        {editingStep && (
                          <button 
                            onClick={() => {
                              if (confirm('Delete this stage?')) deleteStepMutation.mutate(editingStep.id);
                            }}
                            className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-surface-container-lowest dark:bg-[#0a0a0a] rounded-3xl border border-dashed border-border dark:border-dark-border">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Workflow className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-on-surface dark:text-white mb-2 tracking-tight">No Dynamic Flow Configured</h3>
              <p className="text-base text-on-surface-variant dark:text-zinc-400 max-w-lg mx-auto mb-8 leading-relaxed">
                Unlock advanced capabilities. Apply a multi-stage blueprint below to instantly generate a specialized routing architecture for your industry.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left max-w-5xl mx-auto">
                {templates.map((tpl: any) => (
                  <button 
                    key={tpl.key}
                    onClick={() => applyTemplateMutation.mutate(tpl.key)}
                    disabled={applyTemplateMutation.isPending}
                    className="p-5 rounded-2xl border border-border dark:border-dark-border hover:border-indigo-500 hover:shadow-md dark:hover:shadow-indigo-500/10 hover:-translate-y-1 bg-surface dark:bg-zinc-900 transition-all group flex flex-col h-full"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-on-surface dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {tpl.name}
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div className="text-xs text-on-surface-variant dark:text-zinc-400 leading-relaxed mb-3 flex-1">
                      {tpl.description}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(tpl.steps || []).slice(0, 3).map((s: any, i: number) => (
                        <span key={i} className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">{s.name}</span>
                      ))}
                      {(tpl.steps || []).length > 3 && <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">+{(tpl.steps || []).length - 3}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
