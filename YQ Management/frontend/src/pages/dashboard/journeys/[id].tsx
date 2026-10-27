import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "../../../lib/api";
import { useRouter } from "next/router";
import AdminLayout from "../../../components/AdminLayout";
import {
  Workflow,
  Trash2,
  Plus,
  Loader2,
  Settings2,
  X,
  MessageCircle,
  QrCode,
  Users,
  Info,
  CreditCard,
  Package,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowLeft,
  Link2,
  AlertCircle,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FlowBuilder } from "../../../components/settings/FlowBuilder";
import { INDUSTRY_GROUPS } from "../../../lib/subIndustries";
import { ConfirmModal } from "../../../components/modals/ConfirmModal";

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

// ─── Journey Walkthrough Slider ─────────────────────────────────────────────

interface JourneyWalkthroughSliderProps {
  steps: any[];
  selectedStepId?: string | null;
  onStepClick: (step: any) => void;
}

function JourneyWalkthroughSlider({
  steps,
  selectedStepId,
  onStepClick,
}: JourneyWalkthroughSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0); // 0 to 1
  const [thumbRatio, setThumbRatio] = useState(1); // clientWidth / scrollWidth
  const [isDraggingTrack, setIsDraggingTrack] = useState(false);

  // Drag-to-scroll detection on stage cards
  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 1) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      setScrollProgress(0);
      setThumbRatio(1);
    } else {
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft < maxScroll - 2);
      setScrollProgress(Math.min(1, Math.max(0, el.scrollLeft / maxScroll)));
      setThumbRatio(
        Math.min(1, Math.max(0.08, el.clientWidth / el.scrollWidth)),
      );
    }
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateScrollState();
      });
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", onScroll);
      resizeObserver?.disconnect();
    };
  }, [steps, updateScrollState]);

  // Auto-scroll summary slider to selected stage chip
  useEffect(() => {
    if (!selectedStepId || !containerRef.current) return;
    const chip = containerRef.current.querySelector(
      `[data-step-id="${selectedStepId}"]`,
    ) as HTMLElement;
    if (chip) {
      chip.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedStepId]);

  // Horizontal wheel scroll handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      updateScrollState();
    }
  };

  // Drag-to-scroll on stage cards container
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;
    isPointerDownRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    startScrollLeftRef.current = el.scrollLeft;
    hasMovedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPointerDownRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(x - startXRef.current) > 5) {
      hasMovedRef.current = true;
    }
    el.scrollLeft = startScrollLeftRef.current - walk;
    updateScrollState();
  };

  const handleMouseUpOrLeave = () => {
    isPointerDownRef.current = false;
  };

  const scrollByAmount = (distance: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: distance, behavior: "smooth" });
  };

  // Track scrubber click / drag
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const el = containerRef.current;
    if (!track || !el) return;
    setIsDraggingTrack(true);

    const rect = track.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = clickX / rect.width;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: ratio * maxScroll, behavior: "smooth" });

    const onPointerMove = (moveEvent: PointerEvent) => {
      const curRect = track.getBoundingClientRect();
      const curX = Math.max(
        0,
        Math.min(curRect.width, moveEvent.clientX - curRect.left),
      );
      const curRatio = curX / curRect.width;
      const targetScroll = curRatio * (el.scrollWidth - el.clientWidth);
      el.scrollLeft = targetScroll;
      updateScrollState();
    };

    const onPointerUp = () => {
      setIsDraggingTrack(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  if (steps.length === 0) {
    return (
      <span className="text-xs text-zinc-400 py-1 block">
        No stages configured yet.
      </span>
    );
  }

  const hasOverflow = thumbRatio < 0.999;

  return (
    <div className="relative group/slider w-full flex flex-col gap-2 pt-0.5 select-none">
      {/* Scrollable Badges Container with Edge Overlays and Nav Buttons */}
      <div className="relative w-full flex items-center">
        {/* Left Arrow Button */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -6, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -6, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={() => scrollByAmount(-280)}
              className="absolute left-1 z-30 w-7 h-7 rounded-full bg-white/95 dark:bg-zinc-800/95 shadow-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-primary hover:scale-105 active:scale-95 transition-all backdrop-blur-sm cursor-pointer"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Left Edge Gradient Fade */}
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-white dark:from-zinc-900 to-transparent transition-opacity" />
        )}

        {/* Stages Badges Wrapper */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className="flex items-center gap-1.5 overflow-x-auto py-1.5 w-full no-scrollbar scrollbar-none cursor-grab active:cursor-grabbing"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {steps.map((step: any, idx: number) => {
            const isStart = step.type === "CHECK_IN";
            const isEnd = step.type === "CHECK_OUT";
            const isSelected = !!selectedStepId && step.id === selectedStepId;
            return (
              <React.Fragment key={step.id || idx}>
                <div
                  data-step-id={step.id}
                  onClick={() => {
                    if (hasMovedRef.current) return;
                    onStepClick(step);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs shrink-0 border cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/40 dark:ring-indigo-400/40 text-indigo-950 dark:text-indigo-200 shadow-sm scale-[1.03] -translate-y-0.5"
                      : isStart || isEnd
                        ? "bg-zinc-100 dark:bg-zinc-800/60 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:scale-[1.01]"
                        : "bg-surface-container-low dark:bg-zinc-900 border-border dark:border-zinc-800 text-on-surface dark:text-zinc-200 shadow-2xs hover:border-primary/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:scale-[0.98] hover:scale-[1.01]"
                  }`}
                  style={{
                    transition: "all 350ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 transition-colors ${
                      isSelected
                        ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs"
                        : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`text-xs whitespace-nowrap ${isSelected ? "font-bold text-indigo-950 dark:text-white" : "font-semibold"}`}
                  >
                    {step.name}
                  </span>
                  {step.isOptional && (
                    <span
                      className={`text-[9px] uppercase tracking-wider px-1 py-0.2 rounded font-medium ${
                        isSelected
                          ? "bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300"
                          : "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      opt
                    </span>
                  )}
                  {step.roomNumber && (
                    <span
                      className={`text-[10px] whitespace-nowrap ${
                        isSelected
                          ? "text-indigo-600 dark:text-indigo-300 font-medium"
                          : "text-zinc-400"
                      }`}
                    >
                      Rm {step.roomNumber}
                    </span>
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Edge Gradient Fade */}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-white dark:from-zinc-900 to-transparent transition-opacity" />
        )}

        {/* Right Arrow Button */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: 6, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 6, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={() => scrollByAmount(280)}
              className="absolute right-1 z-30 w-7 h-7 rounded-full bg-white/95 dark:bg-zinc-800/95 shadow-md border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 hover:text-primary dark:hover:text-primary hover:scale-105 active:scale-95 transition-all backdrop-blur-sm cursor-pointer"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Sleek Slider Track (replaces the ugly native GTK scrollbar) */}
      {hasOverflow && (
        <div className="flex items-center gap-2.5 px-0.5 pt-0.5">
          <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            className="group/track relative flex-1 h-1.5 hover:h-2 bg-zinc-200/70 dark:bg-zinc-800/90 rounded-full cursor-pointer transition-all duration-150 overflow-hidden"
            title="Drag or click to navigate stages"
          >
            {/* Draggable indicator thumb */}
            <div
              className={`absolute top-0 bottom-0 rounded-full transition-all duration-75 ${
                isDraggingTrack
                  ? "bg-primary shadow-sm ring-1 ring-primary/40"
                  : "bg-zinc-400/90 dark:bg-zinc-500 group-hover/track:bg-primary"
              }`}
              style={{
                width: `${Math.max(10, thumbRatio * 100)}%`,
                left: `${scrollProgress * (100 - Math.max(10, thumbRatio * 100))}%`,
              }}
            />
          </div>

          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium shrink-0 tabular-nums">
            {Math.round(scrollProgress * 100)}%
          </span>
        </div>
      )}
    </div>
  );
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
  expectedDuration: "",
  bufferDuration: "",
  concurrentSlots: "",
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
  formConfig: "",
  cvTitle: "",
  cvMessage: "",
  cvShowEta: true,
  cvShowQueuePosition: true,
  cvShowLocationHint: false,
  cvLocationHint: "",
  cvShowStaffName: false,
  cvCtaLabel: "",
  cvCtaUrl: "",
  cvIcon: "",
};

// ─── WhatsApp message presets ─────────────────────────────────────────────────
const WA_PRESETS: { label: string; value: string }[] = [
  {
    label: "Stage activated",
    value:
      "Hi {{customer_name}}, you have been moved to *{{step_name}}* at {{business_name}}. Please proceed.",
  },
  {
    label: "Reminder",
    value:
      "Hi {{customer_name}}, this is a reminder that your *{{step_name}}* at {{business_name}} is coming up soon. Ticket: #{{ticket_number}}.",
  },
  {
    label: "Stage complete",
    value:
      "Hi {{customer_name}}, you have completed *{{step_name}}*. Please proceed to the next step.",
  },
  {
    label: "Awaiting payment",
    value:
      "Hi {{customer_name}}, please proceed to the payment counter to complete your *{{step_name}}* at {{business_name}}.",
  },
  { label: "Custom (blank)", value: "" },
];

const WA_VARS = [
  "{{customer_name}}",
  "{{step_name}}",
  "{{business_name}}",
  "{{ticket_number}}",
  "{{eta_minutes}}",
  "{{location}}",
];

// ─── Stage type labels ────────────────────────────────────────────────────────

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
  {
    value: "FORM",
    label: "📋 Form",
    info: "Customer must fill out a dynamic form at this stage (e.g. intake, triage).",
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

export default function JourneyBuilder() {
  const router = useRouter();
  const flowId = router.query.id as string;
  const queryClient = useQueryClient();
  const [editingStep, setEditingStep] = useState<any>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [localSteps, setLocalSteps] = useState<any[]>([]);
  const [editingEdge, setEditingEdge] = useState<any>(null);
  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const [edgeForm, setEdgeForm] = useState({
    label: "",
    isDefault: false,
    conditionOutcome: "",
  });
  const [stepForm, setStepForm] = useState({ ...defaultForm });
  const [outcomeInput, setOutcomeInput] = useState("");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    name: "",
    description: "",
    serviceId: "",
  });
  const [showPaySettings, setShowPaySettings] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [selectedSubType, setSelectedSubType] = useState<string>("");
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>("");
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => fetchApi("/service"),
  });

  const { data: flow, isLoading: flowLoading } = useQuery({
    queryKey: ["service-flow", flowId],
    queryFn: () => fetchApi(`/service-flows/${flowId}`),
    enabled: !!flowId,
    retry: false,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["service-flow-templates"],
    queryFn: () => fetchApi("/service-flows/templates/list"),
  });

  const { data: businessCatalog = [] } = useQuery({
    queryKey: ["business-catalog"],
    queryFn: () => fetchApi("/onboarding/business-catalog"),
  });

  const { data: tenant } = useQuery({
    queryKey: ["tenant-me"],
    queryFn: () => fetchApi("/tenant/me").catch(() => null),
  });

  const { data: paymentStatus } = useQuery({
    queryKey: ["tenant-payment-status"],
    queryFn: () => fetchApi("/tenant-payments/status").catch(() => null),
  });
  const stripeConnected = !!(
    paymentStatus?.chargesEnabled && paymentStatus?.payoutsEnabled
  );

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

  const customSteps = localSteps.filter((s) => !s.isSystem);
  const linkedService = services.find((s: any) => s.id === flow?.serviceId);

  // ── Mutations ────────────────────────────────────────────────────────────

  const applyBlueprintMutation = useMutation({
    mutationFn: (templateKey: string) => {
      const url = flow?.serviceId
        ? `/service-flows/templates/${templateKey}/apply?serviceId=${flow.serviceId}`
        : `/service-flows/templates/${templateKey}/apply`;
      return fetchApi(url, { method: "POST" });
    },
    onSuccess: (data) => {
      if (data.id === flowId) {
        queryClient.invalidateQueries({ queryKey: ["service-flow", flowId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["service-flows"] });
      }
      setShowTemplateModal(false);
      toast.success("Template applied successfully!");
      if (data.id !== flowId) router.push(`/dashboard/journeys/${data.id}`);
    },
    onError: (err: any) =>
      toast.error(err.message || "Failed to apply template"),
  });

  const buildStepDto = (form: typeof defaultForm, stepOrder?: number) => {
    const dto: any = {
      name: form.name,
      description: form.description || undefined,
      type: form.type || undefined,
      trigger: form.trigger || undefined,
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
      stepPrice: form.stepPrice
        ? Math.round(parseFloat(form.stepPrice) * 100)
        : undefined,
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
      expectedDuration: form.expectedDuration
        ? parseInt(form.expectedDuration, 10)
        : undefined,
      bufferDuration: form.bufferDuration
        ? parseInt(form.bufferDuration, 10)
        : undefined,
      concurrentSlots: form.concurrentSlots
        ? parseInt(form.concurrentSlots, 10)
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
      formConfig:
        form.type === "FORM" && form.formConfig
          ? JSON.parse(form.formConfig)
          : undefined,
      customerView: (() => {
        const cv: any = {};
        if (form.cvTitle) cv.title = form.cvTitle;
        if (form.cvMessage) cv.message = form.cvMessage;
        cv.showEta = form.cvShowEta;
        cv.showQueuePosition = form.cvShowQueuePosition;
        cv.showLocationHint = form.cvShowLocationHint;
        if (form.cvLocationHint) cv.locationHint = form.cvLocationHint;
        cv.showStaffName = form.cvShowStaffName;
        if (form.cvCtaLabel) cv.ctaLabel = form.cvCtaLabel;
        if (form.cvCtaUrl) cv.ctaUrl = form.cvCtaUrl;
        if (form.cvIcon) cv.icon = form.cvIcon;
        return Object.keys(cv).length > 0 ? cv : undefined;
      })(),
    };
    if (stepOrder !== undefined) dto.stepOrder = stepOrder;
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
      queryClient.invalidateQueries({ queryKey: ["service-flow", flowId] });
      toast.success("Stage added");
      setIsAddingStep(false);
    },
    onError: (err: any) =>
      toast.error(err?.message || "Failed to create stage"),
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, dto }: { stepId: string; dto: any }) =>
      fetchApi(`/service-flows/${flow.id}/steps/${stepId}`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-flow", flowId] });
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
      queryClient.invalidateQueries({ queryKey: ["service-flow", flowId] });
      toast.success("Stage removed");
      setEditingStep(null);
    },
  });

  const updateFlowMutation = useMutation({
    mutationFn: (dto: any) =>
      fetchApi(`/service-flows/${flowId}`, {
        method: "PATCH",
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-flow", flowId] });
      queryClient.invalidateQueries({ queryKey: ["service-flows"] });
      toast.success("Journey updated");
      setIsEditingDetails(false);
    },
    onError: (err: any) =>
      toast.error(err?.message || "Failed to update journey"),
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
      stepPrice: step.stepPrice ? (step.stepPrice / 100).toString() : "",
      stepPriceCurrency: step.stepPriceCurrency || "ZAR",
      isPriceVariable: step.isPriceVariable || false,
      expiresAfterDays: step.expiresAfterDays?.toString() || "",
      expiresAfterHours: step.expiresAfterHours?.toString() || "",
      deferredByDays: step.deferredByDays?.toString() || "",
      deferredByHours: step.deferredByHours?.toString() || "",
      expectedDuration: step.expectedDuration?.toString() || "",
      bufferDuration: step.bufferDuration?.toString() || "",
      concurrentSlots: step.concurrentSlots?.toString() || "",
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
      formConfig: step.formConfig
        ? JSON.stringify(step.formConfig, null, 2)
        : "",
      cvTitle: step.customerView?.title || "",
      cvMessage: step.customerView?.message || "",
      cvShowEta: step.customerView?.showEta ?? true,
      cvShowQueuePosition: step.customerView?.showQueuePosition ?? true,
      cvShowLocationHint: step.customerView?.showLocationHint ?? false,
      cvLocationHint:
        step.customerView?.locationHint || step.locationDescription || "",
      cvShowStaffName: step.customerView?.showStaffName ?? false,
      cvCtaLabel: step.customerView?.ctaLabel || "",
      cvCtaUrl: step.customerView?.ctaUrl || "",
      cvIcon: step.customerView?.icon || "",
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
    const updatedTransitions = (parentStep.transitions || []).map((t: any) => {
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

  const handleSaveDetails = () => {
    if (!detailsForm.name.trim())
      return toast.error("Journey name is required");
    updateFlowMutation.mutate({
      name: detailsForm.name,
      description: detailsForm.description,
      serviceId: detailsForm.serviceId || null,
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AdminLayout
      pageTitle={flow?.name || "Journey Builder"}
      pageSubtitle={flow?.description || "Build a step-by-step journey"}
      noPadding
    >
      <div className="flex flex-col gap-0 min-h-[calc(100vh-80px)]">
        {/* ─── Header ─── */}
        <div className="px-4 sm:px-6 pt-4 pb-4 border-b border-border dark:border-dark-border bg-surface dark:bg-dark-card">
          <div className="flex items-center justify-between">
            {/* Left: back + title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => router.push("/dashboard/journeys")}
                className="flex items-center gap-1.5 text-sm text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-white transition-colors shrink-0 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Journeys</span>
              </button>
              <div className="w-px h-5 bg-border dark:bg-zinc-700 shrink-0" />
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg shrink-0">
                <Workflow className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-base text-on-surface dark:text-white tracking-tight truncate">
                    {flow?.name || "Journey Builder"}
                  </h2>
                  {linkedService && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      <Link2 className="w-2.5 h-2.5" />
                      {linkedService.name}
                    </span>
                  )}
                  {!flow?.serviceId && !flowLoading && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      <AlertCircle className="w-2.5 h-2.5" />
                      Unlinked
                    </span>
                  )}
                </div>
                {flow?.description && (
                  <p className="text-xs text-on-surface-variant dark:text-zinc-500 truncate max-w-xs">
                    {flow.description}
                  </p>
                )}
              </div>
            </div>

            {/* Right: actions */}
            {!flowLoading && flow && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setDetailsForm({
                      name: flow.name,
                      description: flow.description || "",
                      serviceId: flow.serviceId || "",
                    });
                    setIsEditingDetails(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-on-surface-variant dark:text-zinc-300 hover:text-on-surface dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-on-surface-variant dark:text-zinc-300 hover:text-on-surface dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Templates</span>
                </button>
                <button
                  onClick={openAdd}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Stage
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── Body ─── */}
        {flowLoading || !flow ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div
            className="flex flex-col lg:flex-row"
            style={{ height: "calc(100vh - 136px)" }}
          >
            {/* ── Canvas ── */}
            <div className="flex-1 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950/50 flex flex-col">
              {/* Canvas sub-header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border-b border-border dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant dark:text-zinc-400">
                    <span className="font-semibold text-on-surface dark:text-white">
                      {customSteps.length}
                    </span>
                    custom stage{customSteps.length !== 1 ? "s" : ""}
                    <span className="text-zinc-300 dark:text-zinc-600 mx-1">
                      ·
                    </span>
                    <span className="font-semibold text-on-surface dark:text-white">
                      {localSteps.length}
                    </span>
                    total
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Fit View smooth zoom-out button */}
                  <button
                    type="button"
                    onClick={() => setFitViewTrigger((v) => v + 1)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700/80 shadow-2xs transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer"
                    title="Fit all stages into view with smooth zoom-out"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>Fit View</span>
                  </button>

                  {/* Journey Summary dropdown toggle */}
                  <button
                    onClick={() => {
                      setShowSummary((v) => !v);
                      if (!showSummary) setShowPaySettings(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                      showSummary
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-700 shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border-transparent"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Summary
                    {showSummary ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {/* Payment timing quick toggle - clean site colors */}
                  <button
                    onClick={() => {
                      setShowPaySettings((v) => !v);
                      if (!showPaySettings) setShowSummary(false);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                      showPaySettings
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-700 shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 border-transparent"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Payment
                    {showPaySettings ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Journey Summary panel (collapsible, positioned under sub-header) */}
              <AnimatePresence>
                {showSummary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden border-b border-border dark:border-zinc-800 shrink-0"
                  >
                    <div className="px-5 py-3.5 bg-white dark:bg-zinc-900 shadow-sm">
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-on-surface dark:text-white flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-primary dark:text-indigo-400" />
                              Journey Summary & Customer Walkthrough
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              (Sequential progression experienced by customers)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-border dark:border-zinc-700">
                              {customSteps.length} Custom Stages ·{" "}
                              {localSteps.length} Total
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-border dark:border-zinc-700">
                              Payment:{" "}
                              {(flow?.paymentTiming || "CHECKIN") === "NONE"
                                ? "No Payment"
                                : `${(flow?.paymentTiming || "CHECKIN") === "CHECKIN" ? "Check-in" : "Check-out"} · ${
                                    (flow?.checkinPayMode || "BOTH") ===
                                    "COUNTER_ONLY"
                                      ? "Counter Only"
                                      : (flow?.checkinPayMode || "BOTH") ===
                                          "STRIPE_ONLY"
                                        ? "Stripe Online"
                                        : "Stripe or Counter"
                                  }`}
                            </span>
                            {linkedService && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary dark:text-indigo-400 border border-primary/20">
                                Service: {linkedService.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Step-by-step sequential walkthrough slider */}
                        <JourneyWalkthroughSlider
                          steps={localSteps}
                          selectedStepId={editingStep?.id}
                          onStepClick={openEdit}
                        />

                        {/* Context sentence */}
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between border-t border-border/50 dark:border-zinc-800/60 pt-2">
                          <span>
                            <strong className="text-zinc-700 dark:text-zinc-300">
                              Customer Flow:{" "}
                            </strong>
                            Customer joins via QR check-in → progresses through{" "}
                            {customSteps.length} custom stages in sequence →
                            reception or operator completes check-out.
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Payment settings panel (collapsible, positioned under sub-header) */}
              <AnimatePresence>
                {showPaySettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden border-b border-border dark:border-zinc-800 shrink-0"
                  >
                    <div className="px-5 py-3.5 bg-white dark:bg-zinc-900 shadow-sm space-y-3">
                      {/* Row 1: When to collect */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 w-28 shrink-0">
                          When to collect:
                        </span>
                        <div className="flex items-center gap-1.5">
                          {[
                            { v: "CHECKIN", l: "At check-in (booking)" },
                            { v: "CHECKOUT", l: "At check-out (counter)" },
                            { v: "NONE", l: "No payment" },
                          ].map((o) => (
                            <button
                              key={o.v}
                              onClick={() =>
                                updateFlowMutation.mutate({
                                  paymentTiming: o.v,
                                })
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                (flow.paymentTiming || "CHECKIN") === o.v
                                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm"
                                  : "bg-surface-container-low dark:bg-zinc-800 border-border dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                              }`}
                            >
                              {o.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Row 2: How to collect (only if paymentTiming !== 'NONE') */}
                      {(flow.paymentTiming || "CHECKIN") !== "NONE" && (
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50 dark:border-zinc-800">
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 w-28 shrink-0">
                            How to collect:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() =>
                                updateFlowMutation.mutate({
                                  checkinPayMode: "COUNTER_ONLY",
                                })
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                (flow.checkinPayMode || "BOTH") ===
                                "COUNTER_ONLY"
                                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm"
                                  : "bg-surface-container-low dark:bg-zinc-800 border-border dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                              }`}
                            >
                              Pay at Counter
                            </button>

                            <button
                              disabled={!stripeConnected}
                              onClick={() => {
                                if (stripeConnected) {
                                  updateFlowMutation.mutate({
                                    checkinPayMode: "STRIPE_ONLY",
                                  });
                                }
                              }}
                              title={
                                !stripeConnected
                                  ? "Connect Stripe in Settings to enable online payments"
                                  : undefined
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                !stripeConnected
                                  ? "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
                                  : (flow.checkinPayMode || "BOTH") ===
                                      "STRIPE_ONLY"
                                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm"
                                    : "bg-surface-container-low dark:bg-zinc-800 border-border dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                              }`}
                            >
                              Pay via Stripe Online
                            </button>

                            <button
                              disabled={!stripeConnected}
                              onClick={() => {
                                if (stripeConnected) {
                                  updateFlowMutation.mutate({
                                    checkinPayMode: "BOTH",
                                  });
                                }
                              }}
                              title={
                                !stripeConnected
                                  ? "Connect Stripe in Settings to enable online payments"
                                  : undefined
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                !stripeConnected
                                  ? "opacity-50 cursor-not-allowed bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
                                  : (flow.checkinPayMode || "BOTH") === "BOTH"
                                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm"
                                    : "bg-surface-container-low dark:bg-zinc-800 border-border dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                              }`}
                            >
                              Both (Customer Chooses)
                            </button>
                          </div>

                          {/* Extra options */}
                          <div className="flex items-center gap-4 ml-auto">
                            {flow.paymentTiming === "CHECKOUT" && (
                              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!flow.allowUnpaidCheckout}
                                  onChange={(e) =>
                                    updateFlowMutation.mutate({
                                      allowUnpaidCheckout: e.target.checked,
                                    })
                                  }
                                  className="rounded text-primary focus:ring-primary dark:bg-zinc-800 dark:border-zinc-700"
                                />
                                Allow checkout without payment
                              </label>
                            )}

                            <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!flow.autoSendInvoice}
                                onChange={(e) =>
                                  updateFlowMutation.mutate({
                                    autoSendInvoice: e.target.checked,
                                  })
                                }
                                className="rounded text-primary focus:ring-primary dark:bg-zinc-800 dark:border-zinc-700"
                              />
                              Auto-send invoice
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Amber banner when Stripe is not connected */}
                      {!stripeConnected &&
                        (flow.paymentTiming || "CHECKIN") !== "NONE" && (
                          <div className="flex items-center justify-between text-xs px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                              <span>
                                Stripe is not connected. Online payment options
                                are disabled and customers will pay at counter.
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                router.push(
                                  "/dashboard/settings?tab=integrations",
                                )
                              }
                              className="underline font-semibold hover:text-amber-800 dark:hover:text-amber-300 shrink-0 ml-4"
                            >
                              Connect Stripe →
                            </button>
                          </div>
                        )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Canvas area — fills all remaining vertical space */}
              <div className="flex-1 overflow-hidden">
                <FlowBuilder
                  flow={flow}
                  selectedStepId={editingStep?.id}
                  fitViewTrigger={fitViewTrigger}
                  onEditStep={openEdit}
                  onSaveTransitions={handleSaveTransitions}
                  onEditEdge={openEditEdge}
                  onAddStage={openAdd}
                />
              </div>
            </div>

            {/* ── Side Panel ── */}
            <AnimatePresence mode="wait">
              {(editingStep || isAddingStep || editingEdge) && (
                <motion.div
                  initial={{ opacity: 0, x: 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 28 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full lg:w-[420px] shrink-0 flex flex-col bg-surface dark:bg-zinc-900 border-l border-border dark:border-zinc-800 overflow-y-auto"
                >
                  {/* Panel header */}
                  <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-surface dark:bg-zinc-900 border-b border-border dark:border-zinc-800">
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
                        <p className="text-[11px] text-zinc-500">
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
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-on-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
                          info="If the previous stage records this exact outcome, this path is taken."
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
                          className="w-5 h-5 rounded text-indigo-600"
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
                      {/* System step banner */}
                      {editingStep?.isSystem && (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            🔒 <strong>Locked system stage.</strong> Check-in
                            and Check-out are automatically managed. You can
                            only edit display text and customer notifications.
                          </p>
                        </div>
                      )}

                      {/* Mode Toggle (only for non-system) */}
                      {!editingStep?.isSystem && (
                        <div className="flex justify-center bg-gray-100/50 dark:bg-black/20 p-1 rounded-lg w-max mx-auto border border-gray-200/50 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => setIsAdvancedMode(false)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                              !isAdvancedMode
                                ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                          >
                            Simple
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAdvancedMode(true)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                              isAdvancedMode
                                ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            }`}
                          >
                            Advanced
                          </button>
                        </div>
                      )}

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
                            placeholder="e.g. Gate Check-In, Doctor Consultation"
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

                      {/* Stage Type & Trigger — skip for system steps */}
                      {!editingStep?.isSystem && (
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
                                setStepForm({
                                  ...stepForm,
                                  type: e.target.value,
                                })
                              }
                              className="w-full h-11 px-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              {STAGE_TYPES.filter(
                                (t) =>
                                  t.value !== "PAYMENT" ||
                                  stepForm.type === "PAYMENT",
                              ).map((t) => (
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
                                <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
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
                                <p className="text-[11px] text-zinc-500 mt-1.5">
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
                                Can be skipped — customer doesn't have to go
                                through here.
                              </div>
                            </div>
                          </label>
                        </section>
                      )}

                      {/* Timings & Capacity */}
                      {!editingStep?.isSystem && (
                        <section className="space-y-3">
                          <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                            ⏳ Timings & Capacity
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <FieldLabel
                                label="Expected Duration (mins)"
                                info="How long this stage typically takes."
                              />
                              <input
                                type="number"
                                min="0"
                                value={stepForm.expectedDuration}
                                onChange={(e) =>
                                  setStepForm({
                                    ...stepForm,
                                    expectedDuration: e.target.value,
                                  })
                                }
                                className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="e.g. 15"
                              />
                            </div>
                            <div>
                              <FieldLabel
                                label="Buffer Duration (mins)"
                                info="Extra time added after this stage."
                              />
                              <input
                                type="number"
                                min="0"
                                value={stepForm.bufferDuration}
                                onChange={(e) =>
                                  setStepForm({
                                    ...stepForm,
                                    bufferDuration: e.target.value,
                                  })
                                }
                                className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="e.g. 5"
                              />
                            </div>
                          </div>
                          <div>
                            <FieldLabel
                              label="Concurrent Slots"
                              info="How many customers can be at this stage at the same time."
                            />
                            <input
                              type="number"
                              min="1"
                              value={stepForm.concurrentSlots}
                              onChange={(e) =>
                                setStepForm({
                                  ...stepForm,
                                  concurrentSlots: e.target.value,
                                })
                              }
                              className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              placeholder="e.g. 3"
                            />
                          </div>
                        </section>
                      )}

                      {/* Customer Instruction */}
                      <section className="space-y-3">
                        <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                          📱 Customer Instructions
                        </h4>
                        <div>
                          <FieldLabel
                            label="What should the customer do here?"
                            info="Shown on the customer's phone screen when they are at this stage."
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
                            placeholder="e.g. Please proceed to Room 3 and wait for the nurse to call you."
                          />
                        </div>
                      </section>

                      {/* Advanced sections — only shown in advanced mode */}
                      {isAdvancedMode && !editingStep?.isSystem && (
                        <>
                          {/* Location */}
                          <section className="space-y-3">
                            <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                              📍 Location
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <FieldLabel label="Floor Number" />
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
                                <FieldLabel label="Room / Bay" />
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
                                  placeholder="e.g. Room 4B"
                                />
                              </div>
                            </div>
                          </section>

                          {/* Staff Instructions */}
                          <section className="space-y-3">
                            <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                              👷 Staff Instructions
                            </h4>
                            <div>
                              <FieldLabel
                                label="Staff Note"
                                info="Internal instructions visible only to staff on the dashboard."
                              />
                              <textarea
                                value={stepForm.staffInstruction}
                                onChange={(e) =>
                                  setStepForm({
                                    ...stepForm,
                                    staffInstruction: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white min-h-[64px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="e.g. Check passport before stamping"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              {[
                                {
                                  key: "requiresQrScan",
                                  label: "Requires QR Scan",
                                  desc: "Staff must scan the customer's QR to advance.",
                                },
                                {
                                  key: "requiresStaffAction",
                                  label: "Requires Staff Action",
                                  desc: "Staff must explicitly mark this stage complete.",
                                },
                              ].map(({ key, label, desc }) => (
                                <label
                                  key={key}
                                  className="flex items-center gap-3 cursor-pointer p-3 border border-border dark:border-zinc-700 rounded-xl hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(stepForm as any)[key]}
                                    onChange={(e) =>
                                      setStepForm({
                                        ...stepForm,
                                        [key]: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 rounded text-indigo-600"
                                  />
                                  <div>
                                    <div className="font-semibold text-xs text-on-surface dark:text-white">
                                      {label}
                                    </div>
                                    <div className="text-[10px] text-zinc-500">
                                      {desc}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </section>

                          {/* Outcomes */}
                          <section className="space-y-3">
                            <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                              🎯 Outcome Options
                            </h4>
                            <p className="text-[11px] text-zinc-500 leading-relaxed">
                              Define the possible outcomes for this stage. Staff
                              will pick one when completing it. Used to drive
                              conditional routing.
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={outcomeInput}
                                onChange={(e) =>
                                  setOutcomeInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addOutcome();
                                  }
                                }}
                                className="flex-1 h-9 px-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-lg text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. Pass, Fail, Veg, Non-Veg"
                              />
                              <button
                                onClick={addOutcome}
                                className="px-3 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                              >
                                Add
                              </button>
                            </div>
                            {stepForm.outcomeOptions.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {stepForm.outcomeOptions.map((o) => (
                                  <span
                                    key={o}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg"
                                  >
                                    {o}
                                    <button
                                      onClick={() =>
                                        setStepForm({
                                          ...stepForm,
                                          outcomeOptions:
                                            stepForm.outcomeOptions.filter(
                                              (x) => x !== o,
                                            ),
                                        })
                                      }
                                      className="ml-0.5 text-indigo-400 hover:text-indigo-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </section>

                          {/* WhatsApp Notification */}
                          <section className="space-y-3">
                            <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                              💬 Notifications
                            </h4>
                            <label className="flex items-center gap-3 cursor-pointer p-3 border border-border dark:border-zinc-700 rounded-xl">
                              <input
                                type="checkbox"
                                checked={stepForm.notifyCustomerOnActivation}
                                onChange={(e) =>
                                  setStepForm({
                                    ...stepForm,
                                    notifyCustomerOnActivation:
                                      e.target.checked,
                                  })
                                }
                                className="w-4 h-4 rounded text-indigo-600"
                              />
                              <div>
                                <div className="font-semibold text-xs text-on-surface dark:text-white">
                                  Notify customer via WhatsApp
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  Send a message when this stage activates.
                                </div>
                              </div>
                            </label>
                            {stepForm.notifyCustomerOnActivation && (
                              <div className="space-y-2">
                                <div className="flex gap-2 flex-wrap">
                                  {WA_PRESETS.map((p) => (
                                    <button
                                      key={p.label}
                                      onClick={() =>
                                        setStepForm({
                                          ...stepForm,
                                          notificationTemplate: p.value,
                                        })
                                      }
                                      className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors font-medium"
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  value={stepForm.notificationTemplate}
                                  onChange={(e) =>
                                    setStepForm({
                                      ...stepForm,
                                      notificationTemplate: e.target.value,
                                    })
                                  }
                                  className="w-full px-4 py-3 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-xs text-on-surface dark:text-white min-h-[80px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                  placeholder="WhatsApp message template..."
                                />
                                <div className="flex flex-wrap gap-1">
                                  {WA_VARS.map((v) => (
                                    <button
                                      key={v}
                                      onClick={() =>
                                        setStepForm({
                                          ...stepForm,
                                          notificationTemplate:
                                            (stepForm.notificationTemplate ||
                                              "") + v,
                                        })
                                      }
                                      className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors font-mono"
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <label className="flex items-center gap-3 cursor-pointer p-3 border border-border dark:border-zinc-700 rounded-xl">
                              <input
                                type="checkbox"
                                checked={stepForm.notifyStaffOnActivation}
                                onChange={(e) =>
                                  setStepForm({
                                    ...stepForm,
                                    notifyStaffOnActivation: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 rounded text-indigo-600"
                              />
                              <div>
                                <div className="font-semibold text-xs text-on-surface dark:text-white">
                                  Alert staff when customer arrives
                                </div>
                                <div className="text-[10px] text-zinc-500">
                                  Staff dashboard will show an alert
                                  notification.
                                </div>
                              </div>
                            </label>
                          </section>

                          {/* Collection entitlement */}
                          {stepForm.type === "COLLECTION" && (
                            <section className="space-y-3">
                              <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                                📦 Collection Rules
                              </h4>
                              <div>
                                <FieldLabel
                                  label="Item / Unit Name"
                                  info="What the customer is collecting, e.g. 'Meal', 'Medication', 'Kit'"
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
                                  className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                  placeholder="e.g. Meal, Medication"
                                />
                              </div>
                              <div>
                                <FieldLabel
                                  label="Allocation Rule"
                                  info="How many items each customer is entitled to receive."
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 mb-3">
                                  {[
                                    {
                                      id: "fixed",
                                      label: "Fixed Quantity",
                                      desc: "Identical count for all visits",
                                      active:
                                        !stepForm.entitlementFormula ||
                                        stepForm.entitlementFormula === "",
                                    },
                                    {
                                      id: "party",
                                      label: "Party Size",
                                      desc: "1 + Accompanying guests",
                                      active:
                                        stepForm.entitlementFormula ===
                                        "accompanyingGuests + 1",
                                    },
                                    {
                                      id: "custom",
                                      label: "Custom Intake",
                                      desc: "From registration form",
                                      active:
                                        stepForm.entitlementFormula ===
                                          "custom_quantity" ||
                                        stepForm.entitlementFormula?.startsWith(
                                          "metadata.",
                                        ),
                                    },
                                  ].map((opt) => (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => {
                                        if (opt.id === "fixed") {
                                          setStepForm({
                                            ...stepForm,
                                            entitlementFormula: "",
                                            entitlementFixed:
                                              stepForm.entitlementFixed || "1",
                                          });
                                        } else if (opt.id === "party") {
                                          setStepForm({
                                            ...stepForm,
                                            entitlementFormula:
                                              "accompanyingGuests + 1",
                                          });
                                        } else {
                                          setStepForm({
                                            ...stepForm,
                                            entitlementFormula:
                                              "custom_quantity",
                                            entitlementFixed:
                                              stepForm.entitlementFixed || "1",
                                          });
                                        }
                                      }}
                                      className={`p-3 text-left rounded-xl border transition-all ${
                                        opt.active
                                          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500"
                                          : "border-border dark:border-zinc-700 bg-surface-container-lowest dark:bg-zinc-800/60 text-on-surface dark:text-zinc-300 hover:border-zinc-400"
                                      }`}
                                    >
                                      <div className="font-semibold text-xs flex items-center justify-between">
                                        <span>{opt.label}</span>
                                        {opt.active && (
                                          <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                        )}
                                      </div>
                                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        {opt.desc}
                                      </div>
                                    </button>
                                  ))}
                                </div>

                                {(!stepForm.entitlementFormula ||
                                  stepForm.entitlementFormula === "") && (
                                  <div>
                                    <FieldLabel
                                      label="Units Per Visit"
                                      info="Fixed number of items given to each attendee/customer."
                                    />
                                    <input
                                      type="number"
                                      min="1"
                                      value={stepForm.entitlementFixed || "1"}
                                      onChange={(e) =>
                                        setStepForm({
                                          ...stepForm,
                                          entitlementFixed: e.target.value,
                                        })
                                      }
                                      className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                      placeholder="e.g. 1"
                                    />
                                  </div>
                                )}

                                {stepForm.entitlementFormula ===
                                  "accompanyingGuests + 1" && (
                                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs text-indigo-900 dark:text-indigo-200">
                                    💡 Each family/group automatically receives{" "}
                                    <span className="font-semibold">
                                      1 base + accompanying guests
                                    </span>{" "}
                                    items (e.g. 1 parent + 3 guests = 4 plates).
                                  </div>
                                )}

                                {(stepForm.entitlementFormula ===
                                  "custom_quantity" ||
                                  stepForm.entitlementFormula?.startsWith(
                                    "metadata.",
                                  )) && (
                                  <div className="space-y-2">
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                                      📋 Quantity is dynamically captured from
                                      the registration intake form or booking
                                      payment metadata.
                                    </div>
                                    <div>
                                      <FieldLabel
                                        label="Fallback Default Quantity"
                                        info="Used if custom registration quantity is missing or zero."
                                      />
                                      <input
                                        type="number"
                                        min="1"
                                        value={stepForm.entitlementFixed || "1"}
                                        onChange={(e) =>
                                          setStepForm({
                                            ...stepForm,
                                            entitlementFixed: e.target.value,
                                          })
                                        }
                                        className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Default 1"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                {[
                                  {
                                    key: "allowPartialRedemption",
                                    label: "Allow partial redemption",
                                    desc: "Customer can collect less than their full entitlement.",
                                  },
                                  {
                                    key: "preventDoubleRedemption",
                                    label: "Prevent double collection",
                                    desc: "Block the same ticket from collecting twice.",
                                  },
                                ].map(({ key, label, desc }) => (
                                  <label
                                    key={key}
                                    className="flex items-center gap-3 cursor-pointer p-3 border border-border dark:border-zinc-700 rounded-xl"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={(stepForm as any)[key]}
                                      onChange={(e) =>
                                        setStepForm({
                                          ...stepForm,
                                          [key]: e.target.checked,
                                        })
                                      }
                                      className="w-4 h-4 rounded text-indigo-600"
                                    />
                                    <div>
                                      <div className="font-semibold text-xs text-on-surface dark:text-white">
                                        {label}
                                      </div>
                                      <div className="text-[10px] text-zinc-500">
                                        {desc}
                                      </div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </section>
                          )}

                          {/* Scheduling / Deferral */}
                          <section className="space-y-3">
                            <h4 className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                              ⏰ Scheduling
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <FieldLabel label="Defer by (days)" />
                                <input
                                  type="number"
                                  min="0"
                                  value={stepForm.deferredByDays}
                                  onChange={(e) =>
                                    setStepForm({
                                      ...stepForm,
                                      deferredByDays: e.target.value,
                                    })
                                  }
                                  className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                  placeholder="e.g. 1"
                                />
                              </div>
                              <div>
                                <FieldLabel label="Defer by (hours)" />
                                <input
                                  type="number"
                                  min="0"
                                  value={stepForm.deferredByHours}
                                  onChange={(e) =>
                                    setStepForm({
                                      ...stepForm,
                                      deferredByHours: e.target.value,
                                    })
                                  }
                                  className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                  placeholder="e.g. 24"
                                />
                              </div>
                              <div>
                                <FieldLabel label="Expires after (days)" />
                                <input
                                  type="number"
                                  min="0"
                                  value={stepForm.expiresAfterDays}
                                  onChange={(e) =>
                                    setStepForm({
                                      ...stepForm,
                                      expiresAfterDays: e.target.value,
                                    })
                                  }
                                  className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                  placeholder="e.g. 7"
                                />
                              </div>
                              <div>
                                <FieldLabel label="Expires after (hours)" />
                                <input
                                  type="number"
                                  min="0"
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
                        </>
                      )}

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
                        {editingStep && !editingStep.isSystem && (
                          <button
                            onClick={() => setStepToDelete(editingStep.id)}
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
        )}

        {/* Edit Details Modal */}
        {isEditingDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-surface dark:bg-dark-card rounded-3xl shadow-xl overflow-hidden border border-border dark:border-dark-border"
            >
              <div className="px-6 py-4 border-b border-border dark:border-dark-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-on-surface dark:text-white">
                    Journey Settings
                  </h3>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">
                    Edit name, description and service link
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingDetails(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <FieldLabel label="Journey Name" />
                  <input
                    type="text"
                    value={detailsForm.name}
                    onChange={(e) =>
                      setDetailsForm({ ...detailsForm, name: e.target.value })
                    }
                    className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Standard Check-up"
                  />
                </div>
                <div>
                  <FieldLabel label="Description (Optional)" />
                  <textarea
                    value={detailsForm.description}
                    onChange={(e) =>
                      setDetailsForm({
                        ...detailsForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full p-4 bg-surface-container-lowest dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Briefly describe what this flow is for..."
                    rows={3}
                  />
                </div>
                <div>
                  <FieldLabel
                    label="Linked Service"
                    info="Which service should this journey belong to? Required for customers to use it."
                  />
                  <select
                    value={detailsForm.serviceId}
                    onChange={(e) =>
                      setDetailsForm({
                        ...detailsForm,
                        serviceId: e.target.value,
                      })
                    }
                    className="w-full h-11 px-4 bg-surface-container-lowest dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl text-sm text-on-surface dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    <option value="">-- No Service (Draft) --</option>
                    {services.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {!detailsForm.serviceId && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      An unlinked journey won't be triggered for any customers.
                    </p>
                  )}
                </div>
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setIsEditingDetails(false)}
                  className="flex-1 h-11 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-on-surface dark:text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDetails}
                  disabled={updateFlowMutation.isPending}
                  className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-60"
                >
                  {updateFlowMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-surface dark:bg-dark-card rounded-3xl shadow-xl overflow-hidden border border-border dark:border-dark-border flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-4 border-b border-border dark:border-dark-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-on-surface dark:text-white">
                    Apply Industry Template
                  </h3>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                    ⚠️ This will replace your current journey stages.
                  </p>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-50/50 dark:bg-black/20">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search for your business type (e.g. Dental, Cafe, Salon)..."
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow outline-none text-on-surface dark:text-white"
                  />
                </div>

                {businessCatalog
                  .filter(
                    (ind: any) =>
                      ind.name
                        .toLowerCase()
                        .includes(templateSearchQuery.toLowerCase()) ||
                      ind.subTypes.some((sub: any) =>
                        sub.name
                          .toLowerCase()
                          .includes(templateSearchQuery.toLowerCase()),
                      ),
                  )
                  .map((industry: any) => {
                    const filteredSubTypes = industry.subTypes.filter(
                      (sub: any) =>
                        sub.name
                          .toLowerCase()
                          .includes(templateSearchQuery.toLowerCase()) ||
                        industry.name
                          .toLowerCase()
                          .includes(templateSearchQuery.toLowerCase()),
                    );

                    if (filteredSubTypes.length === 0) return null;

                    return (
                      <div key={industry.key} className="space-y-3">
                        <h4 className="font-bold text-sm text-zinc-500 uppercase tracking-wider">
                          {industry.name}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredSubTypes.map((subType: any) => (
                            <label
                              key={subType.key}
                              className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                                selectedSubType === subType.key
                                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                  : "border-border bg-white dark:bg-zinc-800 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                              }`}
                            >
                              <input
                                type="radio"
                                name="template"
                                value={subType.key}
                                checked={selectedSubType === subType.key}
                                onChange={() => {
                                  setSelectedSubType(subType.key);
                                  setSelectedTemplateKey(
                                    subType.flowTemplateKey,
                                  );
                                }}
                                className="mt-1 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <div className="flex flex-col mb-1 gap-1">
                                  <span className="font-bold text-sm text-on-surface dark:text-white leading-tight">
                                    {subType.name}
                                  </span>
                                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                                    Uses{" "}
                                    {templates.find(
                                      (t: any) =>
                                        t.key === subType.flowTemplateKey,
                                    )?.name || subType.flowTemplateKey}{" "}
                                    Template
                                  </span>
                                </div>
                                <p className="text-xs text-on-surface-variant dark:text-zinc-400 line-clamp-2 mt-1">
                                  {subType.description}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="p-6 border-t border-border dark:border-dark-border flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-900/50">
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="px-6 h-11 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-border dark:border-zinc-700 text-on-surface dark:text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    applyBlueprintMutation.mutate(selectedTemplateKey)
                  }
                  disabled={
                    !selectedTemplateKey || applyBlueprintMutation.isPending
                  }
                  className="px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {applyBlueprintMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {applyBlueprintMutation.isPending
                    ? "Applying..."
                    : "Apply Template"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!stepToDelete}
        onClose={() => setStepToDelete(null)}
        onConfirm={async () => {
          if (!stepToDelete) return;
          await deleteStepMutation.mutateAsync(stepToDelete);
          setStepToDelete(null);
        }}
        title="Remove Stage"
        description="Are you sure you want to remove this stage from the flow?"
        confirmText="Remove Stage"
        variant="danger"
        isLoading={deleteStepMutation.isPending}
      />
    </AdminLayout>
  );
}
