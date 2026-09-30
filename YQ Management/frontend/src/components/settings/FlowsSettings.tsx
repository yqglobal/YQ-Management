import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "../../lib/api";
import {
  Workflow,
  Trash2,
  Plus,
  Loader2,
  ArrowRight,
  Settings2,
  X,
  AlertCircle,
  MessageCircle,
  QrCode,
  Users,
  Info,
  Zap,
  CreditCard,
  Package,
  ChevronDown,
  ChevronUp,
  Eye,
  BellRing,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FlowBuilder } from "./FlowBuilder";
import { INDUSTRY_GROUPS } from "../../lib/subIndustries";

// ─── Helpers ────────────────────────────────────────────────────────────────

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1 align-middle">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 bg-zinc-900 dark:bg-zinc-700 text-white text-[11px] rounded-lg p-2.5 leading-relaxed shadow-xl border border-zinc-700">
          {text}
        </span>
      )}
    </span>
  );
}

function FieldLabel({ label, info }: { label: string; info?: string }) {
  return (
    <label className="flex items-center text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1.5">
      {label}
      {info && <InfoTip text={info} />}
    </label>
  );
}

// Generates a plain-English summary of the flow steps
function generateFlowSummary(steps: any[]): string {
  if (!steps || steps.length === 0) return "";
  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
  const parts = sorted.map((step, i) => {
    const prefix =
      i === 0 ? "Customer starts at" : step.isOptional ? "→ (optional)" : "→";
    let desc = `**${step.name}**`;
    if (step.type === "CHECKPOINT") desc += " (scan-in point)";
    if (step.type === "PAYMENT")
      desc += ` (payment${step.stepPrice ? ` of ${step.stepPriceCurrency || ""} ${step.stepPrice}` : " collected here"})`;
    if (step.type === "COLLECTION") {
      if (step.entitlementFixed)
        desc += ` (customer receives ${step.entitlementFixed}× ${step.entitlementUnit || "item"})`;
      else desc += ` (customer collects ${step.entitlementUnit || "items"})`;
    }
    if (step.customerInstruction) desc += ` — "${step.customerInstruction}"`;
    return `${prefix} ${desc}`;
  });
  return parts.join(" ");
}

// ─── Form defaults ───────────────────────────────────────────────────────────

const defaultForm = {
  name: "",
  description: "",
  type: "SERVICE",
  isOptional: false,
  trigger: "MANUAL_STAFF",
  outcomeOptions: [] as string[],
  customerInstruction: "",
  staffInstruction: "",
  floorNumber: "",
  roomNumber: "",
  mapImageUrl: "",
  expiresAfterDays: "",
  expiresAfterHours: "",
  deferredByDays: "",
  deferredByHours: "",
  stepPrice: "",
  stepPriceCurrency: "ZAR",
  isPriceVariable: false,
  entitlementUnit: "",
  entitlementFormula: "",
  entitlementFixed: "",
  allowPartialRedemption: false,
  preventDoubleRedemption: true,
  requiresQrScan: false,
  requiresStaffAction: false,
  notifyCustomerOnActivation: false,
  notificationTemplate: "",
  notifyStaffOnActivation: false,
};

// ─── Stage type labels (plain English) ───────────────────────────────────────

const STAGE_TYPES = [
  {
    value: "CHECKPOINT",
    label: "📍 Check-In Point",
    info: "A scan or arrival gate. Customer shows up here to register their presence (e.g. front gate, reception).",
  },
  {
    value: "SERVICE",
    label: "🛎 Service Area",
    info: "Where the customer is actually served by staff (e.g. doctor consultation, haircut, counter service).",
  },
  {
    value: "COLLECTION",
    label: "📦 Collection / Pickup",
    info: "Customer collects something they are entitled to (e.g. meal, medication, event pack). You can set a quantity limit.",
  },
  {
    value: "PAYMENT",
    label: "💳 Payment",
    info: "Customer pays at this step. Set a fixed price or let staff enter the amount.",
  },
  {
    value: "WAITING_PERIOD",
    label: "⏳ Waiting Room",
    info: "Customer waits here before being called. Useful for deferred or timed stages.",
  },
  {
    value: "NOTIFICATION",
    label: "🔔 Notification Only",
    info: "Sends a WhatsApp or system message to the customer automatically. No physical action needed.",
  },
];

const TRIGGER_OPTIONS = [
  {
    value: "MANUAL_STAFF",
    label: "Staff advances the customer",
    info: "A staff member manually moves the customer to this stage.",
  },
  {
    value: "MANUAL_CUSTOMER",
    label: "Customer self-advances",
    info: "The customer taps a button or scans a QR themselves to proceed.",
  },
  {
    value: "AUTOMATIC",
    label: "Automatic (after previous stage)",
    info: "The system moves the customer here automatically as soon as the previous stage completes.",
  },
  {
    value: "SCHEDULED",
    label: "Scheduled / Time-based",
    info: "Triggers at a set time or after a set delay (e.g. 24 hours after check-in).",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlowsSettings() {
  const queryClient = useQueryClient();
  const [selectedServiceId, setSelectedServiceId] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editingStep, setEditingStep] = useState<any>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [localSteps, setLocalSteps] = useState<any[]>([]);
  const [editingEdge, setEditingEdge] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [edgeForm, setEdgeForm] = useState({
    label: "",
    isDefault: false,
    conditionOutcome: "",
  });
  const [stepForm, setStepForm] = useState({ ...defaultForm });
  const [outcomeInput, setOutcomeInput] = useState("");

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetchApi("/service"),
  });

  const { data: flow, isLoading: flowLoading } = useQuery({
    queryKey: ["service-flow", selectedServiceId],
    queryFn: () => fetchApi(`/service-flows/by-service/${selectedServiceId}`),
    enabled: selectedServiceId !== "all",
    retry: false,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["service-flow-templates"],
    queryFn: () => fetchApi("/service-flows/templates/list"),
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant-me"],
    queryFn: () => fetchApi("/tenant/me").catch(() => null),
  });

  // Compute which templates are recommended based on tenant businessType
  const recommendedKeys = useMemo(() => {
    const bt = tenant?.businessType || "";
    if (!bt) return new Set<string>();
    const keys = new Set<string>();
    for (const group of INDUSTRY_GROUPS) {
      for (const sub of group.subIndustries) {
        if (sub.id === bt || sub.businessType === bt)
          keys.add(sub.blueprintKey);
      }
    }
    return keys;
  }, [tenant?.businessType]);

  useEffect(() => {
    if (flow?.steps) {
      setLocalSteps(
        [...flow.steps].sort((a: any, b: any) => a.stepOrder - b.stepOrder),
      );
    } else {
      setLocalSteps([]);
    }
  }, [flow?.steps]);

  const flowSummary = useMemo(
    () => generateFlowSummary(localSteps),
    [localSteps],
  );

  // ── Mutations ────────────────────────────────────────────────────────────

  const applyTemplateMutation = useMutation({
    mutationFn: (templateKey: string) =>
      fetchApi(
        `/service-flows/templates/${templateKey}/apply?serviceId=${selectedServiceId}`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["service-flow", selectedServiceId],
      });
      setSelectedTemplate(null);
      toast.success("Blueprint applied!");
    },
  });

  const deleteFlowMutation = useMutation({
    mutationFn: (flowId: string) =>
      fetchApi(`/service-flows/${flowId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["service-flow", selectedServiceId],
      });
      toast.success("Flow reset to standard queue");
    },
  });

  // Build a clean DTO from the form — maps to backend DTO (no id, no triggerRule)
  const buildStepDto = (form: typeof defaultForm, stepOrder?: number) => {
    const dto: any = {
      name: form.name,
      description: form.description || undefined,
      type: form.type || undefined,
      trigger: form.trigger || undefined, // correct field name — NOT triggerRule
      isOptional: form.isOptional,
      outcomeOptions:
        form.outcomeOptions.length > 0 ? form.outcomeOptions : undefined,
      customerInstruction: form.customerInstruction || undefined,
      staffInstruction: form.staffInstruction || undefined,
      floorNumber: form.floorNumber
        ? parseInt(form.floorNumber, 10)
        : undefined,
      roomNumber: form.roomNumber || undefined,
      mapImageUrl: form.mapImageUrl || undefined,
      stepPrice: form.stepPrice ? parseFloat(form.stepPrice) : undefined,
      stepPriceCurrency: form.stepPriceCurrency || undefined,
      isPriceVariable: form.isPriceVariable,
      expiresAfterDays: form.expiresAfterDays
        ? parseInt(form.expiresAfterDays, 10)
        : undefined,
      expiresAfterHours: form.expiresAfterHours
        ? parseInt(form.expiresAfterHours, 10)
        : undefined,
      deferredByDays: form.deferredByDays
        ? parseInt(form.deferredByDays, 10)
        : undefined,
      deferredByHours: form.deferredByHours
        ? parseInt(form.deferredByHours, 10)
        : undefined,
      entitlementUnit: form.entitlementUnit || undefined,
      entitlementFixed: form.entitlementFixed
        ? parseInt(form.entitlementFixed, 10)
        : undefined,
      entitlementFormula: form.entitlementFormula || undefined,
      allowPartialRedemption: form.allowPartialRedemption,
      preventDoubleRedemption: form.preventDoubleRedemption,
      requiresQrScan: form.requiresQrScan,
      requiresStaffAction: form.requiresStaffAction,
      notifyCustomerOnActivation: form.notifyCustomerOnActivation,
      notificationTemplate: form.notifyCustomerOnActivation
        ? form.notificationTemplate || undefined
        : undefined,
      notifyStaffOnActivation: form.notifyStaffOnActivation,
    };
    if (stepOrder !== undefined) dto.stepOrder = stepOrder;
    // Remove undefined keys to keep payload clean
    Object.keys(dto).forEach((k) => dto[k] === undefined && delete dto[k]);
    return dto;
  };

  const createStepMutation = useMutation({
    mutationFn: (dto: any) =>
      fetchApi(`/service-flows/${flow.id}/steps`, {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["service-flow", selectedServiceId],
      });
      toast.success("Stage added");
      setIsAddingStep(false);
    },
    onError: (err: any) =>
      toast.error(err?.message || "Failed to create stage"),
  });

  const updateStepMutation = useMutation({
    // NOTE: stepId comes from URL — NOT the body. Body must not contain `id`.
    mutationFn: ({ stepId, dto }: { stepId: string; dto: any }) =>
      fetchApi(`/service-flows/${flow.id}/steps/${stepId}`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["service-flow", selectedServiceId],
      });
      toast.success("Stage updated");
      setEditingStep(null);
    },
    onError: (err: any) =>
      toast.error(err?.message || "Failed to update stage"),
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) =>
      fetchApi(`/service-flows/${flow.id}/steps/${stepId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["service-flow", selectedServiceId],
      });
      toast.success("Stage removed");
      setEditingStep(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      fetchApi(`/service-flows/${flow.id}/steps/reorder`, {
        method: "POST",
        body: JSON.stringify({ orderedStepIds: orderedIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["service-flow", selectedServiceId],
      });
    },
  });

  const handleSaveTransitions = (fromStepId: string, transitions: any[]) => {
    updateStepMutation.mutate({ stepId: fromStepId, dto: { transitions } });
  };

  const handleSaveStep = () => {
    if (!stepForm.name.trim()) return toast.error("Stage name is required");
    if (isAddingStep) {
      createStepMutation.mutate(buildStepDto(stepForm, localSteps.length + 1));
    } else if (editingStep) {
      updateStepMutation.mutate({
        stepId: editingStep.id,
        dto: buildStepDto(stepForm),
      });
    }
  };

  const openEdit = (step: any) => {
    setEditingStep(step);
    setIsAddingStep(false);
    setEditingEdge(null);
    setOutcomeInput("");
    setStepForm({
      name: step.name,
      description: step.description || "",
      type: step.type,
      isOptional: step.isOptional,
      trigger: step.trigger || "MANUAL_STAFF",
      outcomeOptions: step.outcomeOptions || [],
      customerInstruction: step.customerInstruction || "",
      staffInstruction: step.staffInstruction || "",
      floorNumber: step.floorNumber?.toString() || "",
      roomNumber: step.roomNumber || "",
      mapImageUrl: step.mapImageUrl || "",
      stepPrice: step.stepPrice?.toString() || "",
      stepPriceCurrency: step.stepPriceCurrency || "ZAR",
      isPriceVariable: step.isPriceVariable || false,
      expiresAfterDays: step.expiresAfterDays?.toString() || "",
      expiresAfterHours: step.expiresAfterHours?.toString() || "",
      deferredByDays: step.deferredByDays?.toString() || "",
      deferredByHours: step.deferredByHours?.toString() || "",
      entitlementUnit: step.entitlementUnit || "",
      entitlementFormula: step.entitlementFormula || "",
      entitlementFixed: step.entitlementFixed?.toString() || "",
      allowPartialRedemption: step.allowPartialRedemption || false,
      preventDoubleRedemption: step.preventDoubleRedemption ?? true,
      requiresQrScan: step.requiresQrScan || false,
      requiresStaffAction: step.requiresStaffAction || false,
      notifyCustomerOnActivation: step.notifyCustomerOnActivation || false,
      notificationTemplate: step.notificationTemplate || "",
      notifyStaffOnActivation: step.notifyStaffOnActivation || false,
    });
  };

  const openEditEdge = (edge: any) => {
    setEditingStep(null);
    setIsAddingStep(false);
    setEditingEdge(edge);
    const parentStep = flow?.steps?.find((s: any) => s.id === edge.source);
    const transition = parentStep?.transitions?.find(
      (t: any) => t.toStepId === edge.target,
    );
    setEdgeForm({
      label: transition?.label || "",
      isDefault: transition?.isDefault || false,
      conditionOutcome: transition?.condition?.outcome || "",
    });
  };

  const handleSaveEdge = () => {
    if (!editingEdge) return;
    const parentStep = flow.steps.find((s: any) => s.id === editingEdge.source);
    if (!parentStep) return;
    const currentTransitions = parentStep.transitions || [];
    const updatedTransitions = currentTransitions.map((t: any) => {
      if (t.toStepId === editingEdge.target) {
        return {
          ...t,
          label: edgeForm.label,
          isDefault: edgeForm.isDefault,
          condition: edgeForm.conditionOutcome
            ? { outcome: edgeForm.conditionOutcome }
            : null,
        };
      }
      if (edgeForm.isDefault) return { ...t, isDefault: false };
      return t;
    });
    updateStepMutation.mutate({
      stepId: parentStep.id,
      dto: { transitions: updatedTransitions },
    });
    setEditingEdge(null);
  };

  const openAdd = () => {
    setIsAddingStep(true);
    setEditingStep(null);
    setEditingEdge(null);
    setOutcomeInput("");
    setStepForm({ ...defaultForm });
  };

  const addOutcome = () => {
    const v = outcomeInput.trim();
    if (!v || stepForm.outcomeOptions.includes(v)) return;
    setStepForm({
      ...stepForm,
      outcomeOptions: [...stepForm.outcomeOptions, v],
    });
    setOutcomeInput("");
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0 -mx-6 sm:-mx-8 -mb-8">
      {/* ─── Header ─── */}
      <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-border dark:border-dark-border bg-surface dark:bg-dark-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl shrink-0">
              <Workflow className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-on-surface dark:text-white tracking-tight">
                Workflow Engine
              </h2>
              <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-0.5">
                Build a step-by-step journey for your customers — from arrival
                to completion.
              </p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {[
              { color: "#6366f1", label: "Check-In" },
              { color: "#8b5cf6", label: "Service" },
              { color: "#059669", label: "Collection" },
              { color: "#f59e0b", label: "Payment" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-xs text-on-surface-variant dark:text-zinc-400 font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Selector */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <label className="text-sm font-bold text-on-surface dark:text-white whitespace-nowrap shrink-0">
            Target Service:
          </label>
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="flex-1 sm:max-w-sm h-11 px-4 bg-surface-container-lowest dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm text-on-surface dark:text-white font-medium text-sm"
          >
            <option value="all">
              — Choose a service to configure its flow —
            </option>
            {services.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {selectedServiceId !== "all" && flow && flow.id && (
            <button
              onClick={() => {
                if (confirm("Reset this flow back to a standard queue?"))
                  deleteFlowMutation.mutate(flow.id);
              }}
              className="h-11 px-4 flex items-center gap-2 rounded-xl text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-900/15 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Reset Flow
            </button>
          )}
        </div>
      </div>

      {/* ─── Body ─── */}
      {selectedServiceId === "all" ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center mb-5 mx-auto">
            <Workflow className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-on-surface dark:text-white mb-2">
            Pick a Service to Get Started
          </h3>
          <p className="text-on-surface-variant dark:text-zinc-400 max-w-md leading-relaxed">
            Each service can have its own unique customer journey. Choose one
            above and configure the steps your customers will go through.
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
            <div className="absolute top-0 left-0 right-0 z-10 flex flex-col bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-border dark:border-dark-border">
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-sm text-on-surface dark:text-white">
                    {flow.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSummary((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showSummary ? "Hide" : "Show"} Flow Summary
                    {showSummary ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                  <span className="text-xs text-on-surface-variant dark:text-zinc-500">
                    {localSteps.length} stage
                    {localSteps.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={openAdd}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Stage
                  </button>
                </div>
              </div>

              {/* Flow Summary */}
              {showSummary && flowSummary && (
                <div className="px-5 pb-3">
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 rounded-xl px-4 py-3">
                    <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                      ✨ What your customers experience:
                    </p>
                    <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
                      {localSteps
                        .sort((a, b) => a.stepOrder - b.stepOrder)
                        .map((step, i) => {
                          const typeIcon =
                            step.type === "CHECKPOINT"
                              ? "📍"
                              : step.type === "PAYMENT"
                                ? "💳"
                                : step.type === "COLLECTION"
                                  ? "📦"
                                  : step.type === "NOTIFICATION"
                                    ? "🔔"
                                    : "🛎";
                          return (
                            <span key={step.id}>
                              {i > 0 && (
                                <span className="mx-1.5 text-indigo-400">
                                  →
                                </span>
                              )}
                              <span className="font-semibold">
                                {typeIcon} {step.name}
                              </span>
                              {step.isOptional && (
                                <span className="text-indigo-400 ml-1">
                                  (optional)
                                </span>
                              )}
                              {step.type === "PAYMENT" && step.stepPrice && (
                                <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">
                                  ({step.stepPriceCurrency} {step.stepPrice})
                                </span>
                              )}
                              {step.type === "COLLECTION" &&
                                step.entitlementFixed && (
                                  <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                                    ×{step.entitlementFixed}{" "}
                                    {step.entitlementUnit}
                                  </span>
                                )}
                            </span>
                          );
                        })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Canvas area */}
            <div
              className={`absolute inset-0 ${showSummary && flowSummary ? "pt-[120px]" : "pt-[52px]"}`}
              style={{ transition: "padding-top 0.2s" }}
            >
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
                className="w-full lg:w-[400px] shrink-0 flex flex-col bg-surface dark:bg-zinc-900 border-l border-border dark:border-zinc-800 overflow-y-auto"
              >
                {/* Panel header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface dark:bg-zinc-900 border-b border-border dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Settings2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-on-surface dark:text-white text-sm">
                        {editingEdge
                          ? "Configure Connection"
                          : isAddingStep
                            ? "New Stage"
                            : "Edit Stage"}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
                        {editingEdge
                          ? "Set the label and condition for this arrow"
                          : isAddingStep
                            ? "Add a new step to your flow"
                            : `Editing: ${editingStep?.name}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingStep(null);
                      setIsAddingStep(false);
                      setEditingEdge(null);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-on-surface hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* ── Edge editor ── */}
                {editingEdge && (
                  <div className="p-5 space-y-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40">
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        💡 Connections (arrows) define where the customer goes
                        next. You can add a condition so only certain outcomes
                        follow this path.
                      </p>
                    </div>
                    <div>
                      <FieldLabel
                        label="Arrow Label"
                        info="A short label shown on the arrow, e.g. 'Approved', 'Veg', 'Yes'"
                      />
                      <input
                        type="text"
                        value={edgeForm.label}
                        onChange={(e) =>
                          setEdgeForm({ ...edgeForm, label: e.target.value })
                        }
                        className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="e.g. Yes, No, Approved, Veg"
                      />
                    </div>
                    <div>
                      <FieldLabel
                        label="Trigger Condition (optional)"
                        info="If the previous stage records this exact outcome, this path is taken. Leave blank to always follow this route."
                      />
                      <input
                        type="text"
                        value={edgeForm.conditionOutcome}
                        onChange={(e) =>
                          setEdgeForm({
                            ...edgeForm,
                            conditionOutcome: e.target.value,
                          })
                        }
                        className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="e.g. Abnormal Result, Paid, No-show"
                      />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer p-3.5 border border-border dark:border-zinc-700 rounded-xl hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={edgeForm.isDefault}
                        onChange={(e) =>
                          setEdgeForm({
                            ...edgeForm,
                            isDefault: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-zinc-700"
                      />
                      <div>
                        <div className="font-semibold text-sm text-on-surface dark:text-white">
                          Default Route
                        </div>
                        <div className="text-xs text-on-surface-variant dark:text-zinc-400">
                          If no other conditions match, use this path.
                        </div>
                      </div>
                    </label>
                    <button
                      onClick={handleSaveEdge}
                      disabled={updateStepMutation.isPending}
                      className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-60"
                    >
                      {updateStepMutation.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Save Connection
                    </button>
                  </div>
                )}

                {/* ── Step editor ── */}
                {(editingStep || isAddingStep) && !editingEdge && (
                  <div className="p-5 space-y-6">
                    {/* Basic Info */}
                    <section className="space-y-3">
                      <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        📝 Basic Info
                      </h4>
                      <div>
                        <FieldLabel
                          label="Stage Name *"
                          info="What this step is called — customers will see this."
                        />
                        <input
                          type="text"
                          value={stepForm.name}
                          onChange={(e) =>
                            setStepForm({ ...stepForm, name: e.target.value })
                          }
                          className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          placeholder="e.g. Gate Check-In, Doctor Consultation, Meal Collection"
                        />
                      </div>
                      <div>
                        <FieldLabel
                          label="Internal Description"
                          info="Staff-facing notes — not shown to customers."
                        />
                        <textarea
                          value={stepForm.description}
                          onChange={(e) =>
                            setStepForm({
                              ...stepForm,
                              description: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white min-h-[72px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                          placeholder="e.g. Nurse takes vitals before the doctor sees the patient"
                        />
                      </div>
                    </section>

                    {/* Stage Type & Trigger */}
                    <section className="space-y-3">
                      <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        ⚙️ Stage Setup
                      </h4>
                      <div>
                        <FieldLabel
                          label="What type of stage is this?"
                          info="Choose the category that best describes what happens here."
                        />
                        <select
                          value={stepForm.type}
                          onChange={(e) =>
                            setStepForm({ ...stepForm, type: e.target.value })
                          }
                          className="w-full h-11 px-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          {STAGE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        {(() => {
                          const found = STAGE_TYPES.find(
                            (t) => t.value === stepForm.type,
                          );
                          return found ? (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1.5 leading-relaxed">
                              {found.info}
                            </p>
                          ) : null;
                        })()}
                      </div>
                      <div>
                        <FieldLabel
                          label="How does this stage start?"
                          info="Decide who or what triggers the customer entering this stage."
                        />
                        <select
                          value={stepForm.trigger}
                          onChange={(e) =>
                            setStepForm({
                              ...stepForm,
                              trigger: e.target.value,
                            })
                          }
                          className="w-full h-11 px-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          {TRIGGER_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        {(() => {
                          const found = TRIGGER_OPTIONS.find(
                            (t) => t.value === stepForm.trigger,
                          );
                          return found ? (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1.5">
                              {found.info}
                            </p>
                          ) : null;
                        })()}
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer p-3.5 border border-border dark:border-zinc-700 rounded-xl hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={stepForm.isOptional}
                          onChange={(e) =>
                            setStepForm({
                              ...stepForm,
                              isOptional: e.target.checked,
                            })
                          }
                          className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-zinc-700"
                        />
                        <div>
                          <div className="font-semibold text-sm text-on-surface dark:text-white">
                            Optional Stage
                          </div>
                          <div className="text-xs text-on-surface-variant dark:text-zinc-400">
                            Can be skipped — customer doesn't have to go through
                            here.
                          </div>
                        </div>
                      </label>
                    </section>

                    {/* Scan & Staff toggles */}
                    <section className="space-y-3">
                      <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        🔧 How It Works
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        <label className="flex items-center gap-3 cursor-pointer p-3 border border-border dark:border-zinc-700 rounded-xl hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors">
                          <input
                            type="checkbox"
                            checked={stepForm.requiresQrScan}
                            onChange={(e) =>
                              setStepForm({
                                ...stepForm,
                                requiresQrScan: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-zinc-400" />
                            <div>
                              <div className="text-sm font-semibold text-on-surface dark:text-white">
                                Requires QR Scan
                              </div>
                              <div className="text-xs text-zinc-500">
                                Customer must scan their QR code to proceed
                              </div>
                            </div>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer p-3 border border-border dark:border-zinc-700 rounded-xl hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors">
                          <input
                            type="checkbox"
                            checked={stepForm.requiresStaffAction}
                            onChange={(e) =>
                              setStepForm({
                                ...stepForm,
                                requiresStaffAction: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-zinc-400" />
                            <div>
                              <div className="text-sm font-semibold text-on-surface dark:text-white">
                                Staff Must Act
                              </div>
                              <div className="text-xs text-zinc-500">
                                A staff member must confirm before the customer
                                continues
                              </div>
                            </div>
                          </div>
                        </label>
                      </div>
                    </section>

                    {/* Customer Message */}
                    <section className="space-y-3">
                      <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        📢 Instructions
                      </h4>
                      <div>
                        <FieldLabel
                          label="Message to Customer"
                          info="Shown on the customer's screen and/or sent via WhatsApp when they reach this stage."
                        />
                        <textarea
                          value={stepForm.customerInstruction}
                          onChange={(e) =>
                            setStepForm({
                              ...stepForm,
                              customerInstruction: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white min-h-[72px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                          placeholder="e.g. Please wait at Gate B until your name is called"
                        />
                      </div>
                      <div>
                        <FieldLabel
                          label="Instruction for Staff"
                          info="Only visible to your team — helps them know what to do when a customer reaches this stage."
                        />
                        <textarea
                          value={stepForm.staffInstruction}
                          onChange={(e) =>
                            setStepForm({
                              ...stepForm,
                              staffInstruction: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white min-h-[60px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                          placeholder="e.g. Check ID, verify booking, record vitals"
                        />
                      </div>
                    </section>

                    {/* WhatsApp Notifications */}
                    <section className="space-y-3 p-4 rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/10">
                      <h4 className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        Notifications
                      </h4>
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-zinc-800 rounded-xl border border-border dark:border-zinc-700">
                        <input
                          type="checkbox"
                          checked={stepForm.notifyCustomerOnActivation}
                          onChange={(e) =>
                            setStepForm({
                              ...stepForm,
                              notifyCustomerOnActivation: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded text-green-600"
                        />
                        <div>
                          <div className="text-sm font-semibold text-on-surface dark:text-white">
                            Notify customer on WhatsApp
                          </div>
                          <div className="text-xs text-zinc-500">
                            Sends a WhatsApp message when customer reaches this
                            stage
                          </div>
                        </div>
                      </label>
                      {stepForm.notifyCustomerOnActivation && (
                        <div>
                          <FieldLabel
                            label="WhatsApp Message Template"
                            info="The message sent to the customer. Leave blank to use the default system message."
                          />
                          <textarea
                            value={stepForm.notificationTemplate}
                            onChange={(e) =>
                              setStepForm({
                                ...stepForm,
                                notificationTemplate: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white min-h-[72px] focus:ring-2 focus:ring-green-500 outline-none resize-none"
                            placeholder="e.g. Hi {name}, you are now at the Payment stage. Please pay R{amount} at the counter."
                          />
                          <p className="text-[11px] text-zinc-500 mt-1">
                            Use {"{name}"} for customer name
                          </p>
                        </div>
                      )}
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-zinc-800 rounded-xl border border-border dark:border-zinc-700">
                        <input
                          type="checkbox"
                          checked={stepForm.notifyStaffOnActivation}
                          onChange={(e) =>
                            setStepForm({
                              ...stepForm,
                              notifyStaffOnActivation: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded text-green-600"
                        />
                        <div>
                          <div className="text-sm font-semibold text-on-surface dark:text-white">
                            Notify staff when customer arrives
                          </div>
                          <div className="text-xs text-zinc-500">
                            Staff get an alert when a customer reaches this
                            stage
                          </div>
                        </div>
                      </label>
                    </section>

                    {/* Location */}
                    <section className="space-y-3">
                      <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        📍 Location (Wayfinding)
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FieldLabel
                            label="Floor Number"
                            info="Which floor is this stage on? Shown to customers as directions."
                          />
                          <input
                            type="number"
                            value={stepForm.floorNumber}
                            onChange={(e) =>
                              setStepForm({
                                ...stepForm,
                                floorNumber: e.target.value,
                              })
                            }
                            className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. 2"
                          />
                        </div>
                        <div>
                          <FieldLabel
                            label="Room / Counter"
                            info="Specific room or desk number."
                          />
                          <input
                            type="text"
                            value={stepForm.roomNumber}
                            onChange={(e) =>
                              setStepForm({
                                ...stepForm,
                                roomNumber: e.target.value,
                              })
                            }
                            className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Room A1"
                          />
                        </div>
                      </div>
                    </section>

                    {/* Possible Outcomes */}
                    <section className="space-y-3">
                      <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        🎯 Possible Results
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-500 leading-relaxed">
                        What outcomes can staff record at this stage? (e.g.
                        "Approved", "Denied", "Referred"). These are used to
                        route customers down different paths.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={outcomeInput}
                          onChange={(e) => setOutcomeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addOutcome();
                            }
                          }}
                          className="flex-1 h-9 px-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Type a result and press Enter..."
                        />
                        <button
                          onClick={addOutcome}
                          className="px-3 h-9 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {stepForm.outcomeOptions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {stepForm.outcomeOptions.map((o, i) => (
                            <span
                              key={i}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium"
                            >
                              {o}
                              <button
                                onClick={() =>
                                  setStepForm({
                                    ...stepForm,
                                    outcomeOptions:
                                      stepForm.outcomeOptions.filter(
                                        (_, j) => j !== i,
                                      ),
                                  })
                                }
                                className="hover:text-red-500 transition-colors"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Payment Settings */}
                    {stepForm.type === "PAYMENT" && (
                      <section className="space-y-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10">
                        <h4 className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" /> Payment
                          Settings
                        </h4>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          Set a fixed price, or let staff enter the amount
                          during the visit.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <FieldLabel
                              label="Amount"
                              info="Fixed price charged at this step. Leave blank if amount varies."
                            />
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500 text-sm">
                                {stepForm.stepPriceCurrency === "ZAR"
                                  ? "R"
                                  : "$"}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                value={stepForm.stepPrice}
                                onChange={(e) =>
                                  setStepForm({
                                    ...stepForm,
                                    stepPrice: e.target.value,
                                  })
                                }
                                disabled={stepForm.isPriceVariable}
                                className="w-full h-11 pl-8 pr-3 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div>
                            <FieldLabel label="Currency" />
                            <select
                              value={stepForm.stepPriceCurrency}
                              onChange={(e) =>
                                setStepForm({
                                  ...stepForm,
                                  stepPriceCurrency: e.target.value,
                                })
                              }
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
                            onChange={(e) =>
                              setStepForm({
                                ...stepForm,
                                isPriceVariable: e.target.checked,
                                stepPrice: e.target.checked
                                  ? ""
                                  : stepForm.stepPrice,
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                          />
                          <div>
                            <div className="text-sm font-semibold text-on-surface dark:text-white">
                              Staff enters amount manually
                            </div>
                            <div className="text-xs text-on-surface-variant dark:text-zinc-400">
                              No fixed price — staff decide on the spot.
                            </div>
                          </div>
                        </label>
                      </section>
                    )}

                    {/* Collection Settings */}
                    {stepForm.type === "COLLECTION" && (
                      <section className="space-y-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10">
                        <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" /> Collection
                          Settings
                        </h4>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                          Define what the customer collects and how many they
                          are allowed.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <FieldLabel
                              label="What are they collecting?"
                              info="e.g. Meals, Medication, Event Pack, Vouchers"
                            />
                            <input
                              type="text"
                              value={stepForm.entitlementUnit}
                              onChange={(e) =>
                                setStepForm({
                                  ...stepForm,
                                  entitlementUnit: e.target.value,
                                })
                              }
                              className="w-full h-11 px-4 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                              placeholder="e.g. Meal, Plate, Pack"
                            />
                          </div>
                          <div>
                            <FieldLabel
                              label="Quantity per person"
                              info="How many items each customer is allowed to take. Leave blank to use a formula."
                            />
                            <input
                              type="number"
                              value={stepForm.entitlementFixed}
                              onChange={(e) =>
                                setStepForm({
                                  ...stepForm,
                                  entitlementFixed: e.target.value,
                                })
                              }
                              className="w-full h-11 px-4 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                              placeholder="e.g. 2"
                            />
                          </div>
                        </div>
                        <div>
                          <FieldLabel
                            label="Advanced formula (optional)"
                            info="For dynamic quantities — e.g. 'accompanyingGuests + 1'. Only needed for advanced setups."
                          />
                          <input
                            type="text"
                            value={stepForm.entitlementFormula}
                            onChange={(e) =>
                              setStepForm({
                                ...stepForm,
                                entitlementFormula: e.target.value,
                              })
                            }
                            className="w-full h-10 px-4 bg-white dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="accompanyingGuests + 1"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={stepForm.allowPartialRedemption}
                              onChange={(e) =>
                                setStepForm({
                                  ...stepForm,
                                  allowPartialRedemption: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-on-surface dark:text-zinc-300 font-medium">
                              Allow partial collection
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={stepForm.preventDoubleRedemption}
                              onChange={(e) =>
                                setStepForm({
                                  ...stepForm,
                                  preventDoubleRedemption: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-sm text-on-surface dark:text-zinc-300 font-medium">
                              One-time only (no repeats)
                            </span>
                          </label>
                        </div>
                      </section>
                    )}

                    {/* Expiry */}
                    <section className="space-y-3">
                      <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        ⏰ Stage Expiry
                      </h4>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        How long does the customer have to complete this stage
                        before their ticket expires?
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FieldLabel label="Expires after (days)" />
                          <input
                            type="number"
                            value={stepForm.expiresAfterDays}
                            onChange={(e) =>
                              setStepForm({
                                ...stepForm,
                                expiresAfterDays: e.target.value,
                              })
                            }
                            className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. 1"
                          />
                        </div>
                        <div>
                          <FieldLabel label="Expires after (hours)" />
                          <input
                            type="number"
                            value={stepForm.expiresAfterHours}
                            onChange={(e) =>
                              setStepForm({
                                ...stepForm,
                                expiresAfterHours: e.target.value,
                              })
                            }
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
                        disabled={
                          createStepMutation.isPending ||
                          updateStepMutation.isPending
                        }
                        className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-60"
                      >
                        {(createStepMutation.isPending ||
                          updateStepMutation.isPending) && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {isAddingStep ? "Add to Flow" : "Save Changes"}
                      </button>
                      {editingStep && (
                        <button
                          onClick={() => {
                            if (confirm("Remove this stage from the flow?"))
                              deleteStepMutation.mutate(editingStep.id);
                          }}
                          className="h-11 px-4 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-red-200 dark:border-red-900/30 flex items-center"
                          title="Remove Stage"
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
        /* No flow configured — show smart blueprint picker */
        <div className="px-6 sm:px-8 py-12">
          {/* Recommended Blueprints Banner */}
          {recommendedKeys.size > 0 &&
            templates.some((t: any) => recommendedKeys.has(t.key)) && (
              <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-900/40">
                <div className="flex items-center gap-2.5 mb-1">
                  <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-indigo-700 dark:text-indigo-300 text-lg">
                    Recommended for your business
                  </h3>
                </div>
                <p className="text-sm text-indigo-600/70 dark:text-indigo-400/70 mb-5">
                  Based on your configured business type, these blueprints are
                  the best fit for your workflow.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates
                    .filter((t: any) => recommendedKeys.has(t.key))
                    .map((tpl: any) => (
                      <button
                        key={tpl.key}
                        onClick={() => setSelectedTemplate(tpl)}
                        className="p-4 rounded-xl border border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5 bg-white dark:bg-indigo-900/20 transition-all group flex flex-col h-full text-left relative overflow-hidden"
                      >
                        <div className="absolute top-2 right-2">
                          <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600 text-white">
                            <Star className="w-2.5 h-2.5 fill-white" />{" "}
                            Recommended
                          </span>
                        </div>
                        <div className="font-bold text-sm text-on-surface dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-3 pr-24">
                          {tpl.name}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(tpl.steps || []).map((s: any, i: number) => (
                            <span
                              key={i}
                              className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

          {/* All Templates */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-on-surface dark:text-white mb-1">
              {recommendedKeys.size > 0
                ? "All Flow Blueprints"
                : "Choose a Flow Blueprint"}
            </h3>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400">
              {recommendedKeys.size > 0
                ? "Explore all available templates — every one is fully customisable."
                : "Templates are starting points. You can add, remove or modify every step after applying."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates
              .filter(
                (t: any) =>
                  recommendedKeys.size === 0 || !recommendedKeys.has(t.key),
              )
              .map((tpl: any) => (
                <button
                  key={tpl.key}
                  onClick={() => setSelectedTemplate(tpl)}
                  className="p-5 rounded-2xl border border-border dark:border-zinc-700 hover:border-indigo-500 hover:shadow-lg dark:hover:shadow-indigo-500/10 hover:-translate-y-1 bg-surface dark:bg-zinc-900 transition-all group flex flex-col h-full text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-on-surface dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm">
                      {tpl.name}
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                  <div className="text-xs text-on-surface-variant dark:text-zinc-400 leading-relaxed mb-3 flex-1">
                    {tpl.description}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(tpl.steps || []).slice(0, 4).map((s: any, i: number) => (
                      <span
                        key={i}
                        className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                      >
                        {s.name}
                      </span>
                    ))}
                    {(tpl.steps || []).length > 4 && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        +{(tpl.steps || []).length - 4} more
                      </span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Template Configuration Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-surface dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-5 border-b border-border dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-on-surface dark:text-white">
                    Configure Blueprint
                  </h2>
                  <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
                    {selectedTemplate.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-6 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                  <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4" /> About this Flow
                  </h3>
                  <p className="text-sm text-indigo-900/70 dark:text-indigo-200/70 leading-relaxed">
                    {selectedTemplate.description}
                  </p>
                </div>

                <h3 className="font-bold text-on-surface dark:text-white mb-4">
                  Included Steps
                </h3>
                <div className="space-y-3 mb-6">
                  {(selectedTemplate.steps || []).map(
                    (step: any, i: number) => (
                      <div
                        key={i}
                        className="flex gap-4 p-4 rounded-xl border border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900/50"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-on-surface dark:text-white flex items-center gap-2">
                            {step.name}
                            {step.isOptional && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold">
                                Optional
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                            {step.customerInstruction || "Internal stage"}
                          </div>
                        </div>
                      </div>
                    ),
                  )}
                </div>

                <div className="p-4 rounded-xl border border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-900/50">
                  <h3 className="font-bold text-sm text-on-surface dark:text-white mb-2">Target Service</h3>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-3">
                    Select which service this blueprint should be applied to. Existing flows on that service will be replaced.
                  </p>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  >
                    <option value="all" disabled>Select a service to apply to...</option>
                    {services.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    applyTemplateMutation.mutate(selectedTemplate.key)
                  }
                  disabled={applyTemplateMutation.isPending || selectedServiceId === "all"}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
                >
                  {applyTemplateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Apply Flow
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
