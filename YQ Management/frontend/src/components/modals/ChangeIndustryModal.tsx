import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  X,
  Loader2,
  Sparkles,
  RefreshCw,
  Trash2,
  Shield,
  Layers,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import {
  INDUSTRY_GROUPS,
  findSubIndustry,
  type IndustryGroup,
  type SubIndustry,
} from '../../lib/subIndustries';
import { getIndustryConfig } from '../../lib/industryConfig';

interface ChangeIndustryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  currentBusinessType: string;
  onSuccess?: (newBusinessType: string) => void;
}

export function ChangeIndustryModal({
  isOpen,
  onClose,
  tenantId,
  currentBusinessType,
  onSuccess,
}: ChangeIndustryModalProps) {
  const queryClient = useQueryClient();

  // Wizard state
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGroup, setSelectedGroup] = useState<IndustryGroup | null>(null);
  const [selectedSub, setSelectedSub] = useState<SubIndustry | null>(null);

  // Strategy & Confirmation state
  const [serviceStrategy, setServiceStrategy] = useState<
    'KEEP' | 'REMOVE_TEMPLATE_ONLY' | 'DELETE_ALL'
  >('REMOVE_TEMPLATE_ONLY');
  const [provisionNewService, setProvisionNewService] = useState(true);
  const [confirmInput, setConfirmInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Migration Preview
  const { data: preview, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['tenant', tenantId, 'industry-migration-preview'],
    queryFn: () =>
      fetchApi(`/tenant/${tenantId}/industry-migration-preview`).catch(() => ({
        currentBusinessType: currentBusinessType || 'general',
        totalServices: 0,
        templateServices: [],
        customServices: [],
        activeVisitsCount: 0,
      })),
    enabled: isOpen && !!tenantId,
  });

  // Current config info
  const currentSub = findSubIndustry(currentBusinessType);
  const currentGroup = INDUSTRY_GROUPS.find(
    (g) =>
      g.id === currentBusinessType ||
      g.subIndustries.some((s) => s.id === currentBusinessType),
  );
  const currentConfig = getIndustryConfig(currentBusinessType);

  // Target config info
  const targetConfig = selectedSub ? getIndustryConfig(selectedSub.id) : null;

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedGroup(null);
      setSelectedSub(null);
      setServiceStrategy('REMOVE_TEMPLATE_ONLY');
      setProvisionNewService(true);
      setConfirmInput('');
    }
  }, [isOpen]);

  const handleSelectGroup = (group: IndustryGroup) => {
    setSelectedGroup(group);
  };

  const handleSelectSub = (sub: SubIndustry) => {
    setSelectedSub(sub);
  };

  const handleProceedToAudit = () => {
    if (!selectedSub) {
      toast.error('Please select a business type to proceed.');
      return;
    }
    if (selectedSub.id === currentBusinessType) {
      toast.info('You already have this business type selected.');
      return;
    }
    setStep(2);
  };

  const handleExecuteChange = async () => {
    if (confirmInput.trim().toUpperCase() !== 'CONFIRM') {
      toast.error('Please type CONFIRM to authorize this change.');
      return;
    }
    if (!selectedSub || !tenantId) return;

    setIsSubmitting(true);
    try {
      await fetchApi(`/tenant/${tenantId}/change-industry`, {
        method: 'POST',
        body: JSON.stringify({
          newBusinessType: selectedSub.id,
          serviceStrategy,
          provisionNewService,
        }),
      });

      toast.success(
        `Business category changed to ${selectedSub.label}! Workspace reconfigured.`,
      );

      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['service-flows'] });

      onSuccess?.(selectedSub.id);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change business category');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-3xl max-h-[90vh] bg-card dark:bg-zinc-950 border border-border dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border dark:border-zinc-800/80 flex items-center justify-between shrink-0 bg-surface-container-low dark:bg-zinc-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-on-surface dark:text-white">
                    Change Business Category & Template
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    High Impact
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400">
                  {step === 1
                    ? 'Step 1 of 2: Select your new industry vertical & business type'
                    : 'Step 2 of 2: Impact audit, service handling & confirmation'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* ──────── STEP 1: Select New Industry & Sub-Industry ──────── */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Current vs Change Notice */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-border dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {currentSub?.icon || currentGroup?.icon || '🏢'}
                    </span>
                    <div>
                      <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Current Business Type
                      </div>
                      <div className="font-bold text-sm text-on-surface dark:text-white">
                        {currentSub?.label || currentBusinessType.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    Changing this updates customer portal, flow blueprints, and terminology.
                  </div>
                </div>

                {/* Sub-industry selection when an industry group is picked */}
                {selectedGroup ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedGroup(null);
                          setSelectedSub(null);
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back to all categories
                      </button>
                      <span className="text-xs font-bold text-zinc-500">
                        {selectedGroup.icon} {selectedGroup.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedGroup.subIndustries.map((sub) => {
                        const isSelected = selectedSub?.id === sub.id;
                        const isCurrent = currentBusinessType === sub.id;
                        return (
                          <div
                            key={sub.id}
                            onClick={() => !isCurrent && handleSelectSub(sub)}
                            className={`p-4 rounded-2xl border text-left transition-all relative ${
                              isCurrent
                                ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30'
                                : isSelected
                                ? 'border-primary ring-2 ring-primary/20 bg-primary/5 cursor-pointer shadow-sm'
                                : 'border-border dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-surface-container-low dark:bg-zinc-900/40 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-2xl mb-2">{sub.icon}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                  Current Active
                                </span>
                              )}
                              {isSelected && !isCurrent && (
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div className="font-bold text-sm text-on-surface dark:text-white">
                              {sub.label}
                            </div>
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                              {sub.description}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-3">
                              {sub.whatYouGet.slice(0, 3).map((stg, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                >
                                  {stg}
                                </span>
                              ))}
                              {sub.whatYouGet.length > 3 && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  +{sub.whatYouGet.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* 12 Industry Categories Grid */
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Select New Industry Category:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {INDUSTRY_GROUPS.map((group) => {
                        const isCurrentGroup =
                          group.id === currentBusinessType ||
                          group.subIndustries.some((s) => s.id === currentBusinessType);
                        return (
                          <button
                            key={group.id}
                            onClick={() => handleSelectGroup(group)}
                            className="flex flex-col items-center gap-2 p-3.5 rounded-2xl border border-border dark:border-zinc-800 hover:border-primary/50 dark:hover:border-primary/50 bg-surface-container-low dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all text-center group"
                          >
                            <span className="text-2xl group-hover:scale-110 transition-transform">
                              {group.icon}
                            </span>
                            <span className="text-xs font-bold text-on-surface dark:text-white leading-tight">
                              {group.label}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {group.subIndustries.length} types
                              {isCurrentGroup && ' • (Active)'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ──────── STEP 2: Impact Audit & Hard Confirmation Shield ──────── */}
            {step === 2 && selectedSub && (
              <div className="space-y-6">
                {/* Side-by-side transition bar */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-border dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {currentSub?.icon || currentGroup?.icon || '🏢'}
                    </span>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400">
                        Current
                      </div>
                      <div className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                        {currentSub?.label || currentBusinessType}
                      </div>
                    </div>
                  </div>

                  <ArrowRightLeft className="w-5 h-5 text-amber-500 shrink-0" />

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-primary">
                        New Target
                      </div>
                      <div className="font-bold text-sm text-primary">
                        {selectedSub.label}
                      </div>
                    </div>
                    <span className="text-2xl">{selectedSub.icon}</span>
                  </div>
                </div>

                {/* Active visits queue check */}
                {preview && preview.activeVisitsCount > 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                        Attention: {preview.activeVisitsCount} Active Visits In Progress!
                      </div>
                      <p className="text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                        There are currently active customer visits waiting or being served in your
                        queues. We strongly recommend completing or clearing active tickets before
                        changing templates to avoid disruption to in-person staff.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>No active customer visits in queues. Safe window for reconfiguration.</span>
                  </div>
                )}

                {/* Audit: What will this affect? */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold text-on-surface dark:text-white uppercase tracking-wider">
                      Audit: What this change will affect
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Terminology shift */}
                    <div className="p-3.5 rounded-xl border border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900/40 space-y-1.5">
                      <div className="text-[11px] font-bold text-primary flex items-center gap-1">
                        <span>🏷️ Terminology Shift</span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Service desk, portal, and TV displays will switch labels:
                      </p>
                      <div className="text-[11px] space-y-0.5 pt-1 text-on-surface dark:text-zinc-300">
                        <div>
                          • <span className="text-zinc-400">Person:</span>{' '}
                          <span className="line-through text-zinc-400">
                            {currentConfig.terminology.customer}
                          </span>{' '}
                          ➔{' '}
                          <span className="font-bold text-emerald-500">
                            {targetConfig?.terminology.customer || 'Customer'}
                          </span>
                        </div>
                        <div>
                          • <span className="text-zinc-400">Staff:</span>{' '}
                          <span className="line-through text-zinc-400">
                            {currentConfig.terminology.provider}
                          </span>{' '}
                          ➔{' '}
                          <span className="font-bold text-emerald-500">
                            {targetConfig?.terminology.provider || 'Staff'}
                          </span>
                        </div>
                        <div>
                          • <span className="text-zinc-400">Token:</span>{' '}
                          <span className="line-through text-zinc-400">
                            {currentConfig.terminology.ticket}
                          </span>{' '}
                          ➔{' '}
                          <span className="font-bold text-emerald-500">
                            {targetConfig?.terminology.ticket || 'Ticket'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Flow Blueprint */}
                    <div className="p-3.5 rounded-xl border border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900/40 space-y-1.5">
                      <div className="text-[11px] font-bold text-primary flex items-center gap-1">
                        <span>⚡ Flow Blueprint</span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Standard journey stages for {selectedSub.label}:
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedSub.whatYouGet.slice(0, 4).map((stage, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                          >
                            {stage}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Staff View Layout */}
                    <div className="p-3.5 rounded-xl border border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900/40 space-y-1.5">
                      <div className="text-[11px] font-bold text-primary flex items-center gap-1">
                        <span>🖥️ Service Desk</span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Desk action buttons, triage cards, and layout adapt to{' '}
                        {selectedSub.label} operations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Service Handling Decision (The 3 Options) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-on-surface dark:text-white uppercase tracking-wider">
                      Select Service Handling Strategy:
                    </label>
                    <span className="text-xs text-zinc-500">
                      Total existing services: {preview?.totalServices ?? 0}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Strategy 1: Keep All */}
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        serviceStrategy === 'KEEP'
                          ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                          : 'border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="serviceStrategy"
                        value="KEEP"
                        checked={serviceStrategy === 'KEEP'}
                        onChange={() => setServiceStrategy('KEEP')}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-on-surface dark:text-white">
                            Keep All Existing Services
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                            Safest
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                          Keeps all {preview?.totalServices ?? 0} existing services (both template
                          and custom). All queues remain untouched.
                        </p>
                      </div>
                    </label>

                    {/* Strategy 2: Remove Template Only */}
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        serviceStrategy === 'REMOVE_TEMPLATE_ONLY'
                          ? 'border-primary ring-1 ring-primary/30 bg-primary/5'
                          : 'border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="serviceStrategy"
                        value="REMOVE_TEMPLATE_ONLY"
                        checked={serviceStrategy === 'REMOVE_TEMPLATE_ONLY'}
                        onChange={() => setServiceStrategy('REMOVE_TEMPLATE_ONLY')}
                        className="mt-1 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-on-surface dark:text-white">
                            Remove Previous Template Services Only
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                          Removes {preview?.templateServices?.length ?? 0} auto-provisioned services
                          from the previous template, while preserving your{' '}
                          {preview?.customServices?.length ?? 0} custom manually created services.
                          Associated visits are safely moved to the historical archive.
                        </p>
                        {preview?.templateServices && preview.templateServices.length > 0 && (
                          <div className="mt-2 text-[11px] text-zinc-400 flex flex-wrap gap-1">
                            <span>To be removed:</span>
                            {preview.templateServices.map((s: any) => (
                              <span
                                key={s.id}
                                className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                              >
                                {s.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Strategy 3: Delete All */}
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        serviceStrategy === 'DELETE_ALL'
                          ? 'border-red-500 ring-1 ring-red-500/30 bg-red-500/5'
                          : 'border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="serviceStrategy"
                        value="DELETE_ALL"
                        checked={serviceStrategy === 'DELETE_ALL'}
                        onChange={() => setServiceStrategy('DELETE_ALL')}
                        className="mt-1 text-red-500 focus:ring-red-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-red-600 dark:text-red-400">
                            Delete All Services (Complete Clean Slate)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold">
                            Destructive
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                          Deletes all {preview?.totalServices ?? 0} existing services including custom
                          ones. Queues will be unlinked. Past visit history is archived, but all
                          active service queues will be wiped.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Auto-provision checkbox */}
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={provisionNewService}
                    onChange={(e) => setProvisionNewService(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="text-xs font-bold text-on-surface dark:text-white">
                      Auto-provision starter service for {selectedSub.label}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Creates a default service with pre-configured {selectedSub.label} journey
                      stages.
                    </div>
                  </div>
                </label>

                {/* Non-reversible notice & confirmation input */}
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold text-red-600 dark:text-red-400">
                        Non-Reversible Action Confirmation:
                      </span>
                      <p className="text-zinc-600 dark:text-zinc-300 mt-0.5">
                        To prevent accidental disruption to live queue operations, you must type{' '}
                        <span className="font-mono font-bold text-red-600 dark:text-red-400">
                          CONFIRM
                        </span>{' '}
                        in capital letters below to authorize this workspace reconfiguration.
                      </p>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Type CONFIRM to proceed"
                    className="w-full h-11 px-4 font-mono font-bold text-sm bg-white dark:bg-zinc-900 border border-red-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-on-surface dark:text-white placeholder:text-zinc-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900/40 flex items-center justify-between shrink-0">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToAudit}
                  disabled={!selectedSub || selectedSub.id === currentBusinessType}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:opacity-90 disabled:opacity-40 transition-all shadow-md"
                >
                  Proceed to Impact Audit
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Categories
                </button>
                <button
                  type="button"
                  onClick={handleExecuteChange}
                  disabled={confirmInput.trim().toUpperCase() !== 'CONFIRM' || isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-all shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reconfiguring Workspace...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Authorize & Apply Migration
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
