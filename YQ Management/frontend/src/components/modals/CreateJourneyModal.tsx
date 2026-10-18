import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Workflow, ArrowRight, LayoutTemplate, X, ChevronRight, AlertCircle, Check, Loader2, Boxes } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

interface CreateJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'service' | 'template';

export function CreateJourneyModal({ isOpen, onClose }: CreateJourneyModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Wizard state
  const [step, setStep] = useState<Step>('service');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [journeyName, setJourneyName] = useState('');
  const [journeyDescription, setJourneyDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('service');
      setSelectedServiceId('');
      setJourneyName('');
      setJourneyDescription('');
      setSelectedTemplate('');
    }
  }, [isOpen]);

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
    enabled: isOpen,
  });

  const { data: flows = [] } = useQuery({
    queryKey: ['service-flows'],
    queryFn: () => fetchApi('/service-flows'),
    enabled: isOpen,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['journey-templates'],
    queryFn: () => fetchApi('/service-flows/templates/list'),
    enabled: isOpen && step === 'template',
  });

  // Build a set of serviceIds that already have a flow
  const linkedServiceIds = new Set<string>(
    (flows as any[]).map((f) => f.serviceId).filter(Boolean)
  );

  // Services that don't yet have a flow
  const availableServices = (services as any[]).filter((s) => !linkedServiceIds.has(s.id));

  const selectedServiceObj = (services as any[]).find((s) => s.id === selectedServiceId);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (selectedTemplate) {
        // Apply a template — this creates/replaces the flow for the service
        const flow = await fetchApi(
          `/service-flows/templates/${selectedTemplate}/apply?serviceId=${selectedServiceId}`,
          { method: 'POST' }
        );
        // Override flow name/description if user provided custom ones
        if (journeyName.trim()) {
          await fetchApi(`/service-flows/${flow.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              name: journeyName.trim() || flow.name,
              description: journeyDescription.trim() || flow.description,
            }),
          });
        }
        return flow;
      } else {
        // Create an empty flow linked to the selected service
        const flow = await fetchApi('/service-flows', {
          method: 'POST',
          body: JSON.stringify({
            name: journeyName.trim() || selectedServiceObj?.name || 'New Journey',
            description: journeyDescription.trim(),
            serviceId: selectedServiceId,
          }),
        });
        return flow;
      }
    },
    onSuccess: (data) => {
      toast.success('Journey created!');
      queryClient.invalidateQueries({ queryKey: ['service-flows'] });
      onClose();
      router.push(`/dashboard/journeys/${data.id}`);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create journey'),
  });

  if (!isOpen) return null;

  const canProceedToTemplate = !!selectedServiceId;
  const canCreate = !!selectedServiceId;

  // Auto-fill journey name from service if not set
  const handleServiceSelect = (id: string) => {
    setSelectedServiceId(id);
    const svc = (services as any[]).find((s) => s.id === id);
    if (svc && !journeyName) {
      setJourneyName(svc.name);
      if (svc.description && !journeyDescription) setJourneyDescription(svc.description);
    }
  };

  const selectedTemplateObj = (templates as any[]).find((t) => t.key === selectedTemplate);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-surface dark:bg-zinc-900 rounded-3xl w-full max-w-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                <Workflow className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface dark:text-white leading-tight">New Journey</h2>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400">Design a multi-step flow for a service</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-on-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-0 px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
            {[
              { id: 'service', label: 'Select Service' },
              { id: 'template', label: 'Choose Template' },
            ].map((s, i) => {
              const isActive = step === s.id;
              const isDone = (s.id === 'service' && step === 'template');
              return (
                <React.Fragment key={s.id}>
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 mx-1" />}
                  <div className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                    isDone ? 'text-indigo-600 dark:text-indigo-400' :
                    isActive ? 'text-on-surface dark:text-white' :
                    'text-zinc-400 dark:text-zinc-500'
                  }`}>
                    {isDone ? (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    ) : (
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                      }`}>{i + 1}</span>
                    )}
                    {s.label}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <div className="p-6 space-y-5">
            {/* ── STEP 1: Select Service ── */}
            {step === 'service' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-on-surface dark:text-white mb-1">
                    Which service will this journey belong to?
                  </p>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-3">
                    Each service can have one journey. Only services without a journey are shown.
                  </p>

                  {servicesLoading ? (
                    <div className="flex items-center justify-center py-8 text-zinc-400">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <span className="text-sm">Loading services...</span>
                    </div>
                  ) : availableServices.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                        <Boxes className="w-5 h-5 text-zinc-400" />
                      </div>
                      <p className="text-sm font-semibold text-on-surface dark:text-white mb-1">All services have journeys</p>
                      <p className="text-xs text-on-surface-variant dark:text-zinc-400 max-w-xs">
                        Every service already has a journey linked to it. To add a journey, first create a new service.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {availableServices.map((svc: any) => (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => handleServiceSelect(svc.id)}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                            selectedServiceId === svc.id
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            selectedServiceId === svc.id
                              ? 'bg-indigo-100 dark:bg-indigo-900/40'
                              : 'bg-zinc-100 dark:bg-zinc-800'
                          }`}>
                            <Workflow className={`w-4 h-4 ${
                              selectedServiceId === svc.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-on-surface dark:text-white truncate">{svc.name}</div>
                            {svc.description && (
                              <div className="text-xs text-on-surface-variant dark:text-zinc-400 truncate mt-0.5">{svc.description}</div>
                            )}
                          </div>
                          {selectedServiceId === svc.id && (
                            <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Optional: custom name override */}
                  {selectedServiceId && (
                    <div className="mt-4 space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div>
                        <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">
                          Journey Name <span className="text-zinc-400 font-normal">(optional, defaults to service name)</span>
                        </label>
                        <input
                          type="text"
                          value={journeyName}
                          onChange={(e) => setJourneyName(e.target.value)}
                          placeholder={selectedServiceObj?.name || 'Journey name...'}
                          className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl text-sm text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('template')}
                    disabled={!canProceedToTemplate}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Choose Template ── */}
            {step === 'template' && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-on-surface dark:text-white mb-1">
                    Start from a template or blank canvas?
                  </p>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-3">
                    Templates give you a ready-made flow for your industry. You can always modify it later.
                  </p>

                  {templatesLoading ? (
                    <div className="flex items-center justify-center py-6 text-zinc-400">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <span className="text-sm">Loading templates...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {/* Blank option */}
                      <button
                        type="button"
                        onClick={() => setSelectedTemplate('')}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                          selectedTemplate === ''
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedTemplate === '' ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-zinc-100 dark:bg-zinc-800'
                        }`}>
                          <LayoutTemplate className={`w-4 h-4 ${
                            selectedTemplate === '' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-on-surface dark:text-white">Blank Canvas</div>
                          <div className="text-xs text-zinc-500 mt-0.5">Start with just check-in and check-out</div>
                        </div>
                        {selectedTemplate === '' && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </button>

                      {/* Template options */}
                      {(templates as any[]).map((tpl) => (
                        <button
                          key={tpl.key}
                          type="button"
                          onClick={() => setSelectedTemplate(tpl.key)}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                            selectedTemplate === tpl.key
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base ${
                            selectedTemplate === tpl.key ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-zinc-100 dark:bg-zinc-800'
                          }`}>
                            {tpl.icon || '📋'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-on-surface dark:text-white truncate">{tpl.name}</span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase shrink-0">{tpl.stepCount} stages</span>
                            </div>
                            {tpl.description && (
                              <div className="text-xs text-zinc-500 truncate mt-0.5">{tpl.description}</div>
                            )}
                          </div>
                          {selectedTemplate === tpl.key && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3.5 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Service:</span>
                    <span className="font-semibold text-on-surface dark:text-white">{selectedServiceObj?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Journey Name:</span>
                    <span className="font-semibold text-on-surface dark:text-white">
                      {journeyName || selectedServiceObj?.name || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Template:</span>
                    <span className="font-semibold text-on-surface dark:text-white">
                      {selectedTemplateObj?.name || 'Blank Canvas'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('service')}
                    className="px-5 py-2 rounded-xl text-sm text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => createMutation.mutate()}
                    disabled={!canCreate || createMutation.isPending}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {createMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                    ) : (
                      <>Create Journey <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
