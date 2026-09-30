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
  const [editingEdge, setEditingEdge] = useState<any>(null);
  const [edgeForm, setEdgeForm] = useState({
    label: '',
    isDefault: false,
    conditionOutcome: ''
  });

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
    mapImageUrl: '',
    expiresAfterDays: '',
    expiresAfterHours: '',
    deferredByDays: '',
    deferredByHours: '',
    stepPrice: '',
    stepPriceCurrency: 'ZAR',
    isPriceVariable: false,
    entitlementUnit: '',
    entitlementFormula: '',
    entitlementFixed: '',
    allowPartialRedemption: false,
    preventDoubleRedemption: true
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
      stepPrice: stepForm.stepPrice ? parseFloat(stepForm.stepPrice) : null,
      expiresAfterDays: stepForm.expiresAfterDays ? parseInt(stepForm.expiresAfterDays, 10) : null,
      expiresAfterHours: stepForm.expiresAfterHours ? parseInt(stepForm.expiresAfterHours, 10) : null,
      deferredByDays: stepForm.deferredByDays ? parseInt(stepForm.deferredByDays, 10) : null,
      deferredByHours: stepForm.deferredByHours ? parseInt(stepForm.deferredByHours, 10) : null,
      entitlementFixed: stepForm.entitlementFixed ? parseInt(stepForm.entitlementFixed, 10) : null
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
    setEditingEdge(null);
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
      isPriceVariable: step.isPriceVariable || false,
      expiresAfterDays: step.expiresAfterDays?.toString() || '',
      expiresAfterHours: step.expiresAfterHours?.toString() || '',
      deferredByDays: step.deferredByDays?.toString() || '',
      deferredByHours: step.deferredByHours?.toString() || '',
      entitlementUnit: step.entitlementUnit || '',
      entitlementFormula: step.entitlementFormula || '',
      entitlementFixed: step.entitlementFixed?.toString() || '',
      allowPartialRedemption: step.allowPartialRedemption || false,
      preventDoubleRedemption: step.preventDoubleRedemption ?? true
    });
  };

  const openEditEdge = (edge: any) => {
    setEditingStep(null);
    setIsAddingStep(false);
    setEditingEdge(edge);
    
    const parentStep = flow?.steps?.find((s: any) => s.id === edge.source);
    const transition = parentStep?.transitions?.find((t: any) => t.toStepId === edge.target);
    
    setEdgeForm({
      label: transition?.label || '',
      isDefault: transition?.isDefault || false,
      conditionOutcome: transition?.condition?.outcome || ''
    });
  };

  const handleSaveEdge = () => {
    if (!editingEdge) return;
    const parentStep = flow.steps.find((s: any) => s.id === editingEdge.source);
    if (!parentStep) return;

    const currentTransitions = parentStep.transitions || [];
    
    let updatedTransitions = currentTransitions.map((t: any) => {
      if (t.toStepId === editingEdge.target) {
        return {
          ...t,
          label: edgeForm.label,
          isDefault: edgeForm.isDefault,
          condition: edgeForm.conditionOutcome ? { outcome: edgeForm.conditionOutcome } : null
        };
      }
      if (edgeForm.isDefault) {
        return { ...t, isDefault: false };
      }
      return t;
    });

    updateStepMutation.mutate({ id: parentStep.id, transitions: updatedTransitions });
    setEditingEdge(null);
  };

  const openAdd = () => {
    setIsAddingStep(true);
    setEditingStep(null);
    setEditingEdge(null);
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
      isPriceVariable: false,
      expiresAfterDays: '',
      expiresAfterHours: '',
      deferredByDays: '',
      deferredByHours: '',
      entitlementUnit: '',
      entitlementFormula: '',
      entitlementFixed: '',
      allowPartialRedemption: false,
      preventDoubleRedemption: true
    });
  };

  return (
    <div className="flex flex-col gap-0 -mx-6 sm:-mx-8 -mb-8">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-border dark:border-dark-border bg-surface dark:bg-dark-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl shrink-0">
              <Workflow className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-on-surface dark:text-white tracking-tight">Workflow Engine</h2>
              <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-0.5">
                Design multi-stage routing flows with conditional branching and automated transitions.
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {[
              { color: '#6366f1', label: 'Checkpoint' },
              { color: '#8b5cf6', label: 'Service' },
              { color: '#059669', label: 'Collection' },
              { color: '#f59e0b', label: 'Payment' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-xs text-on-surface-variant dark:text-zinc-400 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Selector */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-bold text-on-surface dark:text-white whitespace-nowrap shrink-0">Target Service:</label>
          <select
            value={selectedServiceId}
            onChange={e => setSelectedServiceId(e.target.value)}
            className="flex-1 sm:max-w-sm h-11 px-4 bg-surface-container-lowest dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm text-on-surface dark:text-white font-medium text-sm"
          >
            <option value="all">— Select a Service to Configure —</option>
            {services.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {selectedServiceId !== 'all' && flow && flow.id && (
            <button
              onClick={() => {
                if (confirm('Reset this flow back to a standard queue?')) deleteFlowMutation.mutate(flow.id);
              }}
              className="h-11 px-4 flex items-center gap-2 rounded-xl text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-900/15 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Reset Flow
            </button>
          )}
        </div>
      </div>

      {/* ─── Body ────────────────────────────────────────────────────────── */}
      {selectedServiceId === 'all' ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center mb-5 mx-auto">
            <Workflow className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-on-surface dark:text-white mb-2">Select a Service to Begin</h3>
          <p className="text-on-surface-variant dark:text-zinc-400 max-w-md leading-relaxed">
            Choose a service above to configure or view its workflow. Each service can have its own multi-stage routing pipeline.
          </p>
        </div>
      ) : flowLoading ? (
        <div className="flex justify-center items-center py-32">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      ) : flow && flow.id ? (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-280px)] min-h-[600px]">

          {/* ── Canvas ── */}
          <div className="flex-1 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950/50">
            {/* Canvas header bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-sm text-on-surface dark:text-white">{flow.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant dark:text-zinc-500">{localSteps.length} stage{localSteps.length !== 1 ? 's' : ''}</span>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Stage
                </button>
              </div>
            </div>

            {/* Canvas area */}
            <div className="absolute inset-0 pt-[52px]">
              <FlowBuilder
                flow={flow}
                onEditStep={openEdit}
                onSaveTransitions={handleSaveTransitions}
                onEditEdge={openEditEdge}
              />
            </div>
          </div>

          {/* ── Side Panel ── */}
          <AnimatePresence mode="wait">
            {(editingStep || isAddingStep || editingEdge) && (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
                className="w-full lg:w-[380px] shrink-0 flex flex-col bg-surface dark:bg-zinc-900 border-l border-border dark:border-zinc-800 overflow-y-auto"
              >
                {/* Panel header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface dark:bg-zinc-900 border-b border-border dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Settings2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-on-surface dark:text-white text-sm">
                      {editingEdge ? 'Configure Transition' : isAddingStep ? 'New Stage' : 'Edit Stage'}
                    </h3>
                  </div>
                  <button
                    onClick={() => { setEditingStep(null); setIsAddingStep(false); setEditingEdge(null); }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-on-surface hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Edge editor */}
                {editingEdge && (
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-2">Edge Label</label>
                      <input
                        type="text"
                        value={edgeForm.label}
                        onChange={e => setEdgeForm({ ...edgeForm, label: e.target.value })}
                        className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="e.g. Yes, No, Approved"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-2">Condition Outcome</label>
                      <input
                        type="text"
                        value={edgeForm.conditionOutcome}
                        onChange={e => setEdgeForm({ ...edgeForm, conditionOutcome: e.target.value })}
                        className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="e.g. Abnormal Result"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1.5">If the parent step produces this exact outcome, this route is taken.</p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer p-3.5 border border-border dark:border-zinc-700 rounded-xl hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={edgeForm.isDefault}
                        onChange={e => setEdgeForm({ ...edgeForm, isDefault: e.target.checked })}
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-zinc-700"
                      />
                      <div>
                        <div className="font-semibold text-sm text-on-surface dark:text-white">Default Route</div>
                        <div className="text-xs text-on-surface-variant dark:text-zinc-400">Taken when no other conditions match.</div>
                      </div>
                    </label>
                    <button
                      onClick={handleSaveEdge}
                      disabled={updateStepMutation.isPending}
                      className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-60"
                    >
                      {updateStepMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Transition
                    </button>
                  </div>
                )}

                {/* Step editor */}
                {(editingStep || isAddingStep) && !editingEdge && (
                  <div className="p-5 space-y-5">

                    {/* Basic Info */}
                    <section className="space-y-3">
                      <h4 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Basic Info</h4>
                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Stage Name *</label>
                        <input
                          type="text"
                          value={stepForm.name}
                          onChange={e => setStepForm({ ...stepForm, name: e.target.value })}
                          className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="e.g. Triage, Payment, Checkout"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Description</label>
                        <textarea
                          value={stepForm.description}
                          onChange={e => setStepForm({ ...stepForm, description: e.target.value })}
                          className="w-full px-4 py-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white min-h-[80px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                          placeholder="Internal notes for staff..."
                        />
                      </div>
                    </section>

                    {/* Stage Type & Trigger */}
                    <section className="space-y-3">
                      <h4 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Stage Configuration</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Node Type</label>
                          <select
                            value={stepForm.type}
                            onChange={e => setStepForm({ ...stepForm, type: e.target.value })}
                            className="w-full h-11 px-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="CHECKPOINT">Checkpoint</option>
                            <option value="SERVICE">Service Area</option>
                            <option value="COLLECTION">Collection</option>
                            <option value="PAYMENT">Payment</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Trigger</label>
                          <select
                            value={stepForm.triggerRule}
                            onChange={e => setStepForm({ ...stepForm, triggerRule: e.target.value })}
                            className="w-full h-11 px-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="MANUAL">Manual Routing</option>
                            <option value="AUTO">Auto-Advance</option>
                          </select>
                        </div>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer p-3.5 border border-border dark:border-zinc-700 rounded-xl hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={stepForm.isOptional}
                          onChange={e => setStepForm({ ...stepForm, isOptional: e.target.checked })}
                          className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-zinc-700"
                        />
                        <div>
                          <div className="font-semibold text-sm text-on-surface dark:text-white">Optional Stage</div>
                          <div className="text-xs text-on-surface-variant dark:text-zinc-400">Can be skipped by customers or staff.</div>
                        </div>
                      </label>
                    </section>

                    {/* Wayfinding */}
                    <section className="space-y-3">
                      <h4 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Wayfinding</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Floor No.</label>
                          <input
                            type="number"
                            value={stepForm.floorNumber}
                            onChange={e => setStepForm({ ...stepForm, floorNumber: e.target.value })}
                            className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. 2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Room / Counter</label>
                          <input
                            type="text"
                            value={stepForm.roomNumber}
                            onChange={e => setStepForm({ ...stepForm, roomNumber: e.target.value })}
                            className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Room A1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Customer Instruction</label>
                        <textarea
                          value={stepForm.customerInstruction}
                          onChange={e => setStepForm({ ...stepForm, customerInstruction: e.target.value })}
                          className="w-full px-4 py-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white min-h-[60px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                          placeholder="e.g. Please wait here until called..."
                        />
                      </div>
                    </section>

                    {/* Payment Settings */}
                    {stepForm.type === 'PAYMENT' && (
                      <section className="space-y-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10">
                        <h4 className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Payment Settings</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Fixed Price</label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-sm">{stepForm.stepPriceCurrency === 'ZAR' ? 'R' : '$'}</span>
                              <input
                                type="number"
                                step="0.01"
                                value={stepForm.stepPrice}
                                onChange={e => setStepForm({ ...stepForm, stepPrice: e.target.value })}
                                disabled={stepForm.isPriceVariable}
                                className="w-full h-11 pl-8 pr-3 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Currency</label>
                            <select
                              value={stepForm.stepPriceCurrency}
                              onChange={e => setStepForm({ ...stepForm, stepPriceCurrency: e.target.value })}
                              className="w-full h-11 px-3 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                            >
                              <option value="ZAR">ZAR (R)</option>
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR (€)</option>
                              <option value="GBP">GBP (£)</option>
                            </select>
                          </div>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700">
                          <input
                            type="checkbox"
                            checked={stepForm.isPriceVariable}
                            onChange={e => setStepForm({ ...stepForm, isPriceVariable: e.target.checked, stepPrice: e.target.checked ? '' : stepForm.stepPrice })}
                            className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                          />
                          <div>
                            <div className="text-sm font-semibold text-on-surface dark:text-white">Variable Pricing</div>
                            <div className="text-xs text-on-surface-variant dark:text-zinc-400">Set by staff during visit.</div>
                          </div>
                        </label>
                      </section>
                    )}

                    {/* Collection Settings */}
                    {stepForm.type === 'COLLECTION' && (
                      <section className="space-y-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10">
                        <h4 className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Collection Config</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Formula</label>
                            <input
                              type="text"
                              value={stepForm.entitlementFormula}
                              onChange={e => setStepForm({ ...stepForm, entitlementFormula: e.target.value })}
                              className="w-full h-11 px-4 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                              placeholder="accompanyingGuests + 1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Fixed Qty</label>
                            <input
                              type="number"
                              value={stepForm.entitlementFixed}
                              onChange={e => setStepForm({ ...stepForm, entitlementFixed: e.target.value })}
                              className="w-full h-11 px-4 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                              placeholder="e.g. 4"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={stepForm.allowPartialRedemption}
                              onChange={e => setStepForm({ ...stepForm, allowPartialRedemption: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-on-surface dark:text-zinc-300 font-medium">Allow Partial</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={stepForm.preventDoubleRedemption}
                              onChange={e => setStepForm({ ...stepForm, preventDoubleRedemption: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-on-surface dark:text-zinc-300 font-medium">Prevent Double</span>
                          </label>
                        </div>
                      </section>
                    )}

                    {/* TTL */}
                    <section className="space-y-3">
                      <h4 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Time-to-Live (TTL)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Expire After Days</label>
                          <input
                            type="number"
                            value={stepForm.expiresAfterDays}
                            onChange={e => setStepForm({ ...stepForm, expiresAfterDays: e.target.value })}
                            className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. 1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">Expire After Hours</label>
                          <input
                            type="number"
                            value={stepForm.expiresAfterHours}
                            onChange={e => setStepForm({ ...stepForm, expiresAfterHours: e.target.value })}
                            className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. 24"
                          />
                        </div>
                      </div>
                    </section>

                    {/* Action buttons */}
                    <div className="pt-2 flex gap-3 sticky bottom-0 bg-surface dark:bg-zinc-900 pb-4">
                      <button
                        onClick={handleSaveStep}
                        disabled={createStepMutation.isPending || updateStepMutation.isPending}
                        className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-60"
                      >
                        {(createStepMutation.isPending || updateStepMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isAddingStep ? 'Create Stage' : 'Save Changes'}
                      </button>
                      {editingStep && (
                        <button
                          onClick={() => { if (confirm('Delete this stage?')) deleteStepMutation.mutate(editingStep.id); }}
                          className="h-11 px-4 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-red-200 dark:border-red-900/30 flex items-center"
                          title="Delete Stage"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* No flow configured */
        <div className="px-6 sm:px-8 py-12">
          <div className="text-center py-16 px-4 bg-surface-container-lowest dark:bg-zinc-900/50 rounded-3xl border border-dashed border-border dark:border-zinc-700">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Workflow className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-on-surface dark:text-white mb-2">No Dynamic Flow Configured</h3>
            <p className="text-on-surface-variant dark:text-zinc-400 max-w-lg mx-auto mb-8 leading-relaxed">
              Apply a multi-stage blueprint to instantly generate a specialized routing architecture for your industry.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left max-w-5xl mx-auto">
              {templates.map((tpl: any) => (
                <button
                  key={tpl.key}
                  onClick={() => applyTemplateMutation.mutate(tpl.key)}
                  disabled={applyTemplateMutation.isPending}
                  className="p-5 rounded-2xl border border-border dark:border-zinc-700 hover:border-indigo-500 hover:shadow-lg dark:hover:shadow-indigo-500/10 hover:-translate-y-1 bg-surface dark:bg-zinc-900 transition-all group flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-on-surface dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {tpl.name}
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="text-xs text-on-surface-variant dark:text-zinc-400 leading-relaxed mb-3 flex-1">{tpl.description}</div>
                  <div className="flex flex-wrap gap-1">
                    {(tpl.steps || []).slice(0, 3).map((s: any, i: number) => (
                      <span key={i} className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">{s.name}</span>
                    ))}
                    {(tpl.steps || []).length > 3 && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">+{(tpl.steps || []).length - 3}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
