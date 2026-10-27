import { getTenantUrl, slugify } from "../../lib/utils";
import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import AdminLayout from "../../components/AdminLayout";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "../../lib/api";
import { CreateVisitModal } from "../../components/modals/CreateVisitModal";
import { ScannerModal } from "../../components/modals/ScannerModal";
import { WhatsAppChatPanel } from "../../components/WhatsAppChatPanel";
import { RecordPaymentModal, PaymentMethodType } from "../../components/modals/RecordPaymentModal";
import {
  MonitorPlay,
  ScanLine,
  StickyNote,
  Check,
  AlertTriangle,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Phone,
  MessageSquare,
  Play,
  Sparkles,
  Copy,
  Mail,
  Tag,
  XCircle,
  UserX,
  ShieldAlert,
  X,
  Maximize2,
  Minimize2,
  CreditCard,
  FileText,
} from "lucide-react";

const CANCELLATION_REASONS = [
  {
    id: "CUSTOMER_NO_SHOW",
    label: "Customer No-Show / Did Not Arrive",
    icon: "person_off",
  },
  {
    id: "CUSTOMER_REQUEST",
    label: "Customer Requested Cancellation",
    icon: "person_remove",
  },
  {
    id: "EMERGENCY_UNAVAILABLE",
    label: "Emergency / Provider Unavailable",
    icon: "medical_services",
  },
  {
    id: "DUPLICATE_BOOKING",
    label: "Duplicate Booking / Operational Error",
    icon: "content_copy",
  },
  {
    id: "FACILITY_ISSUE",
    label: "Facility / Technical / Equipment Issue",
    icon: "build",
  },
  { id: "OTHER", label: "Other Reason (Specify below)", icon: "more_horiz" },
];
import CompleteStageModal from "../../components/modals/CompleteStageModal";
import { usePlan } from "../../hooks/usePlan";
import Link from "next/link";
import { useLocation } from "../../components/LocationContext";
import { useIndustry } from "../../hooks/useIndustry";
import { DYNAMIC_CHIP_SENTINEL } from "../../lib/industryConfig";
import { toast } from "sonner";
import {
  CheckoutBillModal,
  VisitBill,
} from "../../components/modals/CheckoutBillModal";
import { InvoiceModal } from "../../components/modals/InvoiceModal";
import { ConfirmModal } from "../../components/modals/ConfirmModal";
// ── Inline Notes Component ───────────────────────────────────────────────────
function InlineNotes({
  visitId,
  initialNotes,
  placeholder,
}: {
  visitId: string;
  initialNotes: string | null;
  placeholder?: string;
}) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setNotes(initialNotes || "");
  }, [initialNotes, visitId]);

  const handleBlur = async () => {
    if (notes === (initialNotes || "")) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetchApi(`/visits/${visitId}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["visits-today"] });
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-outline text-xs">
        <span className="text-xs font-semibold text-outline uppercase tracking-wider">
          Notes:
        </span>
        {saving && (
          <span className="text-xs text-primary animate-pulse">Saving...</span>
        )}
        {saved && (
          <span className="text-xs text-emerald-500 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder || "Add private notes for staff..."}
        rows={2}
        className="bg-surface-container dark:bg-zinc-800 border border-border dark:border-dark-border rounded-xl text-sm py-2 px-3 w-full outline-none resize-none focus:border-primary transition-colors text-on-surface dark:text-white placeholder:text-outline/70 leading-relaxed"
      />
    </div>
  );
}

// ── Itinerary Progress Stepper ───────────────────────────────────────────────
function ItineraryProgress({
  itinerary,
  visitId,
  onSkip,
  onRevert,
}: {
  itinerary: any[];
  visitId?: string;
  onSkip?: (visitId: string, stepId: string) => void;
  onRevert?: (visitId: string, stepId: string) => void;
}) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return null;
  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {itinerary.map((stop: any, idx: number) => {
        const isCompleted =
          stop.status === "COMPLETED" || stop.status === "DONE";
        const isSkipped = stop.status === "SKIPPED";
        const isActive = stop.status === "ACTIVE";
        const isPending = stop.status === "PENDING";
        const isOptional = stop.templateStep?.isOptional;
        return (
          <React.Fragment key={idx}>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all
              ${isCompleted ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : ""}
              ${isSkipped ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" : ""}
              ${isActive ? "bg-primary/10 border-primary/40 text-primary animate-pulse" : ""}
              ${isPending ? "bg-surface-container border-border text-outline" : ""}
            `}
            >
              <span className="material-symbols-outlined text-[10px]">
                {isCompleted
                  ? "check_circle"
                  : isSkipped
                    ? "next_plan"
                    : isActive
                      ? "radio_button_checked"
                      : "radio_button_unchecked"}
              </span>
              {stop.name || stop.label || `Stop ${idx + 1}`}
              {isActive && isOptional && onSkip && visitId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip(visitId, stop.id);
                  }}
                  className="ml-1 opacity-60 hover:opacity-100 hover:text-amber-500 transition-colors"
                  title="Skip this optional step"
                >
                  <span className="material-symbols-outlined text-[12px] align-middle">
                    skip_next
                  </span>
                </button>
              )}
              {isSkipped && onRevert && visitId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevert(visitId, stop.id);
                  }}
                  className="ml-1 opacity-60 hover:opacity-100 hover:text-blue-500 transition-colors"
                  title="Undo skip — revert step to active"
                >
                  <span className="material-symbols-outlined text-[12px] align-middle">
                    undo
                  </span>
                </button>
              )}
            </div>
            {idx < itinerary.length - 1 && (
              <span className="text-outline text-[10px]">→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
import { useAuth } from "../../components/AuthContext";
import { useSocket } from "../../components/SocketProvider";
import InvoiceBuilder from "../../components/InvoiceBuilder";
import { useUI } from "../../components/UIContext";
export default function ServiceDeskToday() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeLocationId } = useLocation();
  const industry = useIndustry();
  const { isSidebarCollapsed, setSidebarCollapsed } = useUI();
  const autoCollapsedByDetailsRef = useRef(false);
  const isSidebarCollapsedRef = useRef(isSidebarCollapsed);
  const [selectedVisit, setSelectedVisit] = useState<AnyFixMe | null>(null);

  useEffect(() => {
    isSidebarCollapsedRef.current = isSidebarCollapsed;
  }, [isSidebarCollapsed]);

  // Automatically collapse the left main navigation sidebar when the right details sidebar opens to maximize space smoothly.
  // When the details sidebar is closed, restore the left sidebar state if it was automatically collapsed.
  useEffect(() => {
    if (selectedVisit) {
      if (!isSidebarCollapsedRef.current) {
        autoCollapsedByDetailsRef.current = true;
        setSidebarCollapsed(true, { persist: false });
      }
    } else {
      if (autoCollapsedByDetailsRef.current) {
        autoCollapsedByDetailsRef.current = false;
        setSidebarCollapsed(false, { persist: false });
      }
    }
  }, [selectedVisit, setSidebarCollapsed]);

  // Clean up on unmount if user navigates away while details panel was open
  useEffect(() => {
    return () => {
      if (autoCollapsedByDetailsRef.current) {
        setSidebarCollapsed(false, { persist: false });
      }
    };
  }, [setSidebarCollapsed]);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"pool" | "pipeline">("pool");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [showInvoiceForVisit, setShowInvoiceForVisit] = useState<string | null>(
    null,
  );
  const [recordPaymentModalState, setRecordPaymentModalState] = useState<{
    isOpen: boolean;
    initialMethod: PaymentMethodType;
    amount: number;
    currency: string;
    visit: AnyFixMe | null;
    pendingPaymentId?: string;
  }>({
    isOpen: false,
    initialMethod: "CARD_TERMINAL",
    amount: 0,
    currency: "ZAR",
    visit: null,
  });
  const [checkoutBill, setCheckoutBill] = useState<VisitBill | null>(null);
  const [checkoutVisit, setCheckoutVisit] = useState<{
    id: string;
    isToken?: boolean;
    name?: string;
    phone?: string;
  } | null>(null);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQueueId, setSelectedQueueId] = useState<"all" | string>("all");
  const [stageModalVisit, setStageModalVisit] = useState<AnyFixMe | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHeight, setChatHeight] = useState<number>(360);
  const [chatExpanded, setChatExpanded] = useState<boolean>(false);
  const [isDraggingChat, setIsDraggingChat] = useState<boolean>(false);
  const drawerRef = useRef<HTMLElement>(null);
  const [serviceDurationSeconds, setServiceDurationSeconds] = useState(0);
  // Live tick for active service card timers (updates every second)
  const [activeServiceTick, setActiveServiceTick] = useState(0);
  // Start Service modal state
  const [startServiceModal, setStartServiceModal] = useState<AnyFixMe | null>(
    null,
  );
  const [startServiceScanning, setStartServiceScanning] = useState(false);
  const [startServiceLoading, setStartServiceLoading] = useState(false);
  const [announceLoadingId, setAnnounceLoadingId] = useState<string | null>(
    null,
  );
  // Live waiting counters (seconds elapsed since waitingStart) keyed by visit id
  const [waitingCounters, setWaitingCounters] = useState<
    Record<string, number>
  >({});

  // Tick every second for active service card live timers
  useEffect(() => {
    const interval = setInterval(
      () => setActiveServiceTick((t) => t + 1),
      1000,
    );
    return () => clearInterval(interval);
  }, []);

  // Drag-to-resize listener for the chat area
  useEffect(() => {
    if (!isDraggingChat) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!drawerRef.current) return;
      const rect = drawerRef.current.getBoundingClientRect();
      const newHeight = rect.bottom - e.clientY;
      const minHeight = 200;
      const maxHeight = Math.max(minHeight, rect.height - 70);
      setChatHeight(Math.min(maxHeight, Math.max(minHeight, newHeight)));
    };
    const onMouseUp = () => setIsDraggingChat(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDraggingChat]);

  // Cancellation Modal State
  const [cancelModalVisit, setCancelModalVisit] = useState<AnyFixMe | null>(
    null,
  );
  const [cancelReasonCategory, setCancelReasonCategory] =
    useState<string>("CUSTOMER_REQUEST");
  const [cancelCustomNotes, setCancelCustomNotes] = useState<string>("");
  const [cancelRefundApplicable, setCancelRefundApplicable] =
    useState<boolean>(false);
  const [cancelConfirmText, setCancelConfirmText] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // No-Show Confirmation State
  const [noShowConfirmVisit, setNoShowConfirmVisit] = useState<AnyFixMe | null>(
    null,
  );
  const [isMarkingNoShow, setIsMarkingNoShow] = useState<boolean>(false);

  // Complete Visit Confirmation State
  const [completeConfirmData, setCompleteConfirmData] = useState<{
    id: string;
    isToken?: boolean;
    title: string;
    message: string;
    isEarly: boolean;
  } | null>(null);
  const [isCompletingVisit, setIsCompletingVisit] = useState<boolean>(false);

  const { socket } = useSocket();

  const plan = usePlan();

  // Live timer for active in-service customer — uses serviceStart (not waitingStart)
  useEffect(() => {
    if (
      !selectedVisit ||
      !["IN_SERVICE", "SERVING"].includes(selectedVisit.currentState)
    ) {
      setServiceDurationSeconds(0);
      return;
    }
    // Use serviceStart (set when service begins) — NOT waitingStart (set when they joined queue)
    const startTs = new Date(
      selectedVisit.serviceStart ||
        selectedVisit.servedAt ||
        selectedVisit.createdAt,
    ).getTime();
    const updateDuration = () => {
      const diffSecs = Math.max(0, Math.floor((Date.now() - startTs) / 1000));
      setServiceDurationSeconds(diffSecs);
    };
    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [
    selectedVisit?.id,
    selectedVisit?.currentState,
    selectedVisit?.serviceStart,
    selectedVisit?.servedAt,
  ]);

  const formatAppointmentDate = (dateStr?: string | Date | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dateFormatted = d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    if (diffDays === 0) return `Today (${dateFormatted})`;
    if (diffDays === 1) return `Tomorrow (${dateFormatted})`;
    if (diffDays === -1) return `Yesterday (${dateFormatted})`;
    return d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatAppointmentTime = (dateStr?: string | Date | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getSlotTimeRange = (visit: AnyFixMe) => {
    if (!visit) return null;
    const startRaw =
      visit.scheduledTime ||
      visit.appointment?.scheduledStart ||
      visit.appointment?.scheduledTime;
    if (!startRaw) return null;
    const startDate = new Date(startRaw);
    if (isNaN(startDate.getTime())) return null;

    let endDate: Date | null = null;
    if (visit.appointment?.scheduledEnd) {
      const endRaw = new Date(visit.appointment.scheduledEnd);
      if (!isNaN(endRaw.getTime())) endDate = endRaw;
    }

    const durationMins =
      visit.service?.expectedDuration || visit.service?.durationMins || 30;
    if (!endDate) {
      endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);
    }

    const startStr = startDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endStr = endDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const diffMins = Math.round(
      (endDate.getTime() - startDate.getTime()) / (60 * 1000),
    );

    return {
      startStr,
      endStr,
      rangeStr: `${startStr} – ${endStr}`,
      durationMins: diffMins > 0 ? diffMins : durationMins,
      startDate,
      endDate,
    };
  };

  const formatDateTime = (dateStr?: string | Date | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return (
      d.toLocaleDateString([], { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const getVisitTimeEstimates = (visit: AnyFixMe, peopleAheadCount: number) => {
    if (!visit)
      return { estWaitMins: null, estFinishTimeStr: null, estTotalMins: null };

    const isAppt = visit.source === "APPOINTMENT" || !!visit.scheduledTime;
    const isInService = ["IN_SERVICE", "SERVING"].includes(visit.currentState);
    const serviceDuration =
      visit.service?.expectedDuration || visit.service?.durationMins || 15;
    const nowMs = Date.now();

    if (isInService) {
      const svcStart = visit.serviceStart
        ? new Date(visit.serviceStart).getTime()
        : nowMs;
      const finishMs = svcStart + serviceDuration * 60000;
      const isPast = finishMs < nowMs;
      return {
        estWaitMins: 0,
        estFinishTimeStr: isPast
          ? "Finishing soon"
          : formatAppointmentTime(new Date(finishMs)),
        estTotalMins: serviceDuration,
      };
    }

    if (
      isAppt &&
      !visit.checkInTime &&
      !visit.actualArrival &&
      visit.currentState === "SCHEDULED" &&
      visit.scheduledTime
    ) {
      const schedMs = new Date(visit.scheduledTime).getTime();
      const waitMins = Math.max(0, Math.round((schedMs - nowMs) / 60000));
      const finishMs = schedMs + serviceDuration * 60000;
      return {
        estWaitMins: waitMins,
        estFinishTimeStr: formatAppointmentTime(new Date(finishMs)),
        estTotalMins: waitMins + serviceDuration,
      };
    }

    // Waiting queue
    const estWaitMins = Math.max(5, peopleAheadCount * serviceDuration);
    const finishMs = nowMs + (estWaitMins + serviceDuration) * 60000;
    return {
      estWaitMins,
      estFinishTimeStr: formatAppointmentTime(new Date(finishMs)),
      estTotalMins: estWaitMins + serviceDuration,
    };
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  const getStepProgression = (visit: AnyFixMe) => {
    if (!visit)
      return {
        current: null,
        next: null,
        activeIndex: 0,
        totalSteps: 0,
        isCompleted: false,
      };
    const steps = (visit.visitSteps || [])
      .slice()
      .sort((a: any, b: any) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
    if (steps.length === 0) {
      return {
        current: {
          name: visit.service?.name
            ? `${visit.service.name} Service`
            : visit.currentState || "In Service",
          status: "ACTIVE",
        },
        next: null,
        activeIndex: 0,
        totalSteps: 1,
        isCompleted: visit.currentState === "COMPLETED",
      };
    }
    const activeIndex = steps.findIndex(
      (s: any) => s.status === "ACTIVE" || s.status === "IN_PROGRESS",
    );
    if (activeIndex !== -1) {
      const current = steps[activeIndex];
      const next =
        steps
          .slice(activeIndex + 1)
          .find((s: any) => s.status === "PENDING" || s.status === "QUEUED") ||
        null;
      return {
        current,
        next,
        activeIndex,
        totalSteps: steps.length,
        isCompleted: false,
      };
    }
    const pendingIndex = steps.findIndex(
      (s: any) => s.status === "PENDING" || s.status === "QUEUED",
    );
    if (pendingIndex !== -1) {
      const current = steps[pendingIndex];
      const next =
        steps
          .slice(pendingIndex + 1)
          .find((s: any) => s.status === "PENDING" || s.status === "QUEUED") ||
        null;
      return {
        current,
        next,
        activeIndex: pendingIndex,
        totalSteps: steps.length,
        isCompleted: false,
      };
    }
    return {
      current: steps[steps.length - 1],
      next: null,
      activeIndex: steps.length - 1,
      totalSteps: steps.length,
      isCompleted: true,
    };
  };

  const handleAdvanceStep = async (
    visitId: string,
    stepId: string,
    outcome: string = "COMPLETED",
  ) => {
    try {
      await fetchApi(`/visit-steps/${stepId}/advance`, {
        method: "POST",
        body: JSON.stringify({ outcome }),
      });
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      await queryClient.invalidateQueries({
        queryKey: ["service-desk-visits"],
      });
      try {
        const fresh = await fetchApi(`/visits/${visitId}`);
        if (fresh) {
          if (selectedVisit?.id === visitId) setSelectedVisit(fresh);
          if (stageModalVisit?.id === visitId) setStageModalVisit(fresh);
        }
      } catch {}
      toast.success("Stage marked completed. Customer advanced to next stage!");
    } catch (err: any) {
      console.error("Failed to advance step", err);
      toast.error(err?.message || "Failed to advance stage");
      throw err;
    }
  };

  const locParam =
    activeLocationId && activeLocationId !== "all"
      ? `&locationId=${activeLocationId}`
      : "";
  const locParamPrefix =
    activeLocationId && activeLocationId !== "all"
      ? `?locationId=${activeLocationId}`
      : "";

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ["visits", "today", activeLocationId, tz],
    queryFn: () =>
      fetchApi(`/visits?scope=today${locParam}&tz=${encodeURIComponent(tz)}`)
        .then((res: any) => res.data || res)
        .catch(() => []),
  });

  // Keep selectedVisit synced with fresh data from visits query
  useEffect(() => {
    if (!selectedVisit?.id) return;
    const fresh = (visits || []).find(
      (v: AnyFixMe) => v.id === selectedVisit.id,
    );
    if (fresh) {
      setSelectedVisit(fresh);
    }
  }, [visits]);

  // Live waiting-since counters for pool cards (updates every 30s is enough)
  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const newCounters: Record<string, number> = {};
      [...(visits || [])].forEach((v: AnyFixMe) => {
        const start =
          v.waitingStart ||
          v.checkInTime ||
          v.checkedInAt ||
          v.actualArrival ||
          v.arrivalTime ||
          v.createdAt;
        if (
          start &&
          ["WAITING", "CHECKED_IN", "PENDING_PAYMENT"].includes(v.currentState)
        ) {
          newCounters[v.id] = Math.max(
            0,
            Math.floor((now - new Date(start).getTime()) / 1000),
          );
        }
      });
      setWaitingCounters(newCounters);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [visits]);

  const { data: tenant } = useQuery({
    queryKey: ["tenant", "me"],
    queryFn: () => fetchApi("/tenant/me").catch(() => null),
  });

  const [queueFilter, setQueueFilter] = useState<
    "all" | "walkin" | "appointment"
  >("all");

  useEffect(() => {
    if (tenant?.operatingMode === "APPOINTMENTS") {
      setQueueFilter("appointment");
    } else if (tenant?.operatingMode === "QUEUE_ONLY") {
      setQueueFilter("walkin");
    } else {
      setQueueFilter("all");
    }
  }, [tenant?.operatingMode]);

  useEffect(() => {
    if (!tenant || tenant.whatsappConnected) return;

    const initialTimer = setTimeout(() => {
      const toastEvent = new CustomEvent("admin-toast", {
        detail: {
          message:
            "WhatsApp is not connected. Automated messages to customers are disabled.",
          type: "error",
        },
      });
      window.dispatchEvent(toastEvent);
    }, 10000);

    const interval = setInterval(() => {
      const toastEvent = new CustomEvent("admin-toast", {
        detail: {
          message:
            "Reminder: WhatsApp is disconnected. Reconnect in Settings > Integrations.",
          type: "error",
        },
      });
      window.dispatchEvent(toastEvent);
    }, 180000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [tenant]);

  const { data: queues = [] } = useQuery({
    queryKey: ["queues", activeLocationId],
    queryFn: () => fetchApi(`/queue${locParamPrefix}`).catch(() => []),
  });

  const { data: pendingAppointments = [] } = useQuery({
    queryKey: ["appointments", "pending", activeLocationId],
    queryFn: () =>
      fetchApi(`/appointments?status=PENDING_APPROVAL${locParam}`).catch(
        () => [],
      ),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["resources"],
    queryFn: () => fetchApi("/resource").catch(() => []),
  });

  // Connect to Socket.io for real-time updates
  useEffect(() => {
    if (!socket || !tenant?.id) return;

    socket.emit("joinTenantRoom", tenant.id);

    const handleVisitEvent = (payload: AnyFixMe) => {
      queryClient.invalidateQueries({
        queryKey: ["visits", "today", activeLocationId],
      });
      queryClient.invalidateQueries({ queryKey: ["queues", activeLocationId] });
      queryClient.invalidateQueries({
        queryKey: ["appointments", "pending", activeLocationId],
      });
    };

    const events = [
      "VISIT_CREATED",
      "VISIT_CALLED",
      "VISIT_COMPLETED",
      "VISIT_CHECKED_IN",
      "VISIT_MISSED",
      "VISIT_CANCELLED",
      "APPOINTMENT_CREATED",
      "queue_status_changed",
      "QUEUE_EMERGENCY_PAUSED",
      "visit_updated",
      "visit_step_activated",
      "visit_step_completed",
      "VISIT_UPDATED",
      "visit_created",
      "visit_called",
      "visit_completed",
      "visit_checked_in",
      "visit_missed",
      "visit_cancelled",
    ];

    events.forEach((ev) => socket.on(ev, handleVisitEvent));

    return () => {
      events.forEach((ev) => socket.off(ev, handleVisitEvent));
    };
  }, [socket, tenant?.id, queryClient, activeLocationId]);

  const updateVisitMutation = useMutation({
    mutationFn: (data: { id: string; resourceId: string }) =>
      fetchApi(`/visits/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify({ resourceId: data.resourceId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visits"] }),
  });

  const pauseEmergencyMutation = useMutation({
    mutationFn: (queueId: string) =>
      fetchApi(`/queue/${queueId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PAUSED_FOR_EMERGENCY" }),
      }),
    onSuccess: () => {
      toast.warning(
        "Queue paused for emergency. All waiting customers will be notified.",
      );
      queryClient.invalidateQueries({ queryKey: ["queues"] });
    },
    onError: () => toast.error("Failed to pause queue"),
  });

  const filteredQueues = React.useMemo(() => {
    let q = queues || [];
    if (user && user.role === "MANAGER") {
      if (user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        q = q.filter((queue: AnyFixMe) => {
          if (queue.services && queue.services.length > 0) {
            return queue.services.some((svc: AnyFixMe) =>
              user.allowedServiceIds!.includes(svc.id),
            );
          }
          return false;
        });
      }
    }
    return q;
  }, [queues, user]);
  const filteredVisits = React.useMemo(() => {
    let v = visits || [];
    if (user && user.role === "MANAGER") {
      if (user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        v = v.filter((visit: AnyFixMe) =>
          user.allowedServiceIds!.includes(visit.serviceId),
        );
      }
    }

    // Defensive temporal check: in 'today' operational board, filter out any visit from previous days (>24h ago)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    v = v.filter((visit: AnyFixMe) => {
      if (visit.scheduledTime) {
        const schedTime = new Date(visit.scheduledTime).getTime();
        if (schedTime < oneDayAgo) return false;
        return true;
      }
      const createdTime = new Date(visit.createdAt).getTime();
      const checkIn = visit.checkInTime ? new Date(visit.checkInTime).getTime() : 0;
      const serviceStart = visit.serviceStart ? new Date(visit.serviceStart).getTime() : 0;
      if (createdTime < oneDayAgo && checkIn < oneDayAgo && serviceStart < oneDayAgo) {
        return false;
      }
      return true;
    });

    return v;
  }, [visits, user]);

  const fulfillmentMetrics = React.useMemo(() => {
    const isEventOrJourney =
      tenant?.businessType === "events_and_invitations" ||
      tenant?.operatingMode === "JOURNEY";

    let totalRegistered = 0;
    let checkedIn = 0;
    let totalAllocated = 0;
    let totalGiven = 0;
    let unitName = "Items";
    let hasCollection = false;

    (filteredVisits || []).forEach((v: AnyFixMe) => {
      // Exclude cancelled, missed, or no-show visits from active fulfillment counters
      if (
        v.currentState === "CANCELLED" ||
        v.currentState === "NO_SHOW" ||
        v.currentState === "MISSED"
      ) {
        return;
      }

      totalRegistered++;
      if (
        v.currentState === "CHECKED_IN" ||
        v.currentState === "IN_SERVICE" ||
        v.currentState === "COMPLETED" ||
        v.checkInTime !== null
      ) {
        checkedIn++;
      }
      const collectionStep = v.visitSteps?.find(
        (s: AnyFixMe) =>
          (s.templateStep?.type === "COLLECTION" || s.quantityAllocated) &&
          s.status !== "CANCELLED" &&
          s.status !== "SKIPPED",
      );
      if (collectionStep) {
        hasCollection = true;
        totalAllocated += collectionStep.quantityAllocated || 0;
        totalGiven += collectionStep.quantityRedeemed || 0;
        if (collectionStep.templateStep?.entitlementUnit) {
          unitName = collectionStep.templateStep.entitlementUnit;
        }
      }
    });

    if (!isEventOrJourney && !hasCollection) return null;
    if (totalRegistered === 0 && !isEventOrJourney) return null;

    return {
      totalRegistered,
      checkedIn,
      totalAllocated,
      totalGiven,
      outstanding: Math.max(0, totalAllocated - totalGiven),
      unitName,
    };
  }, [filteredVisits, tenant]);

  const filteredAppointments = React.useMemo(() => {
    let a = pendingAppointments || [];
    if (user && user.role === "MANAGER") {
      if (user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        a = a.filter((appt: AnyFixMe) =>
          user.allowedServiceIds!.includes(appt.serviceId),
        );
      }
    }
    return a;
  }, [pendingAppointments, user]);

  useEffect(() => {
    if (
      selectedVisit &&
      activeLocationId !== "all" &&
      selectedVisit.locationId !== activeLocationId
    ) {
      setSelectedVisit(null);
    }
  }, [activeLocationId, selectedVisit]);

  const queueTokens = filteredQueues.flatMap((q: AnyFixMe) =>
    (q.tokens || []).map((t: AnyFixMe) => ({
      ...t,
      isToken: true,
      customer: { name: t.customerName, phone: t.phone },
      waitingStart: t.joinedAt,
      service: q.services?.[0] || { name: q.name },
      location: q.location || { name: "Queue" },
      ticketNumber: `#TKT-${t.id.substring(0, 4)}`,
    })),
  );

  // ── UNIFIED DYNAMIC QUEUE POOL ─────────────────────────────────────────────
  // All waiting / checked-in / upcoming-scheduled visits in one list.
  // Sort key: appointments anchor to scheduledTime, walk-ins anchor to arrivalTime.
  // This naturally interleaves them: walk-ins fill the gaps between appointment slots.
  //
  // Visual sections:
  //  [ACTIVE NOW]  - WAITING / CHECKED_IN (have arrived)
  //  [UPCOMING]    - SCHEDULED (appointment confirmed but not yet arrived / checked in)

  const getEffectiveTime = (v: AnyFixMe): number => {
    const isAppt =
      v.source === "APPOINTMENT" || (v.scheduledTime && !v.waitingStart);
    if (isAppt && v.scheduledTime) {
      return new Date(v.scheduledTime).getTime();
    }
    // Walk-in: use waitingStart (when they joined the active queue)
    return new Date(v.waitingStart || v.createdAt).getTime();
  };

  // Active pool: people who have actually arrived (WAITING or CHECKED_IN)
  const arrivedVisits = filteredVisits.filter(
    (v: AnyFixMe) =>
      v.currentState === "WAITING" ||
      v.currentState === "CHECKED_IN" ||
      v.currentState === "PENDING_PAYMENT",
  );

  // Upcoming pool: SCHEDULED appointments for today that haven't arrived yet
  const upcomingVisits = filteredVisits.filter(
    (v: AnyFixMe) => v.currentState === "SCHEDULED",
  );

  // Merge queue tokens into arrived pool
  const arrivedPool = [...arrivedVisits, ...queueTokens].sort(
    (a, b) => getEffectiveTime(a) - getEffectiveTime(b),
  );

  const upcomingPool = upcomingVisits.sort(
    (a: AnyFixMe, b: AnyFixMe) => getEffectiveTime(a) - getEffectiveTime(b),
  );

  const inServiceVisitsUnsorted = [
    ...filteredVisits.filter((v: AnyFixMe) => v.currentState === "IN_SERVICE"),
    ...filteredQueues.flatMap((q: AnyFixMe) =>
      (q.tokens || [])
        .filter((t: AnyFixMe) => t.status === "SERVING")
        .map((t: AnyFixMe) => ({
          ...t,
          isToken: true,
          customer: { name: t.customerName, phone: t.phone },
          waitingStart: t.joinedAt,
          service: q.services?.[0] || { name: q.name },
          location: q.location || { name: "Queue" },
          ticketNumber: `#TKT-${t.id.substring(0, 4)}`,
          currentState: "IN_SERVICE",
        })),
    ),
  ];
  const inServiceVisits = inServiceVisitsUnsorted;

  const handleAnnounce = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAnnounceLoadingId(id);
    try {
      const result = await fetchApi(`/visits/${id}/announce`, {
        method: "POST",
      });
      const isWaConnected = Boolean(
        result?.whatsappConnected ?? tenant?.whatsappConnected,
      );
      const custLabel = result?.displayId
        ? `${result.customerName || "Customer"} (${result.displayId})`
        : "Customer";
      if (!isWaConnected) {
        toast.warning(
          `Announcing ${custLabel} on TV display. WhatsApp message not sent — WhatsApp not connected.`,
        );
      } else if (result?.hasCustomerPhone === false) {
        toast.info(
          `Announcing ${custLabel} on TV display. WhatsApp message not sent — no customer phone number on file.`,
        );
      } else {
        toast.success(
          `Announcing ${custLabel} — TV display & WhatsApp notified.`,
        );
      }
    } catch (err: any) {
      console.error("Failed to announce visit", err);
      toast.error(err?.message || "Failed to announce");
    } finally {
      setAnnounceLoadingId(null);
    }
  };

  const handleStart = async (
    id: string,
    e?: React.MouseEvent,
    isToken?: boolean,
  ) => {
    if (e) e.stopPropagation();
    if (isToken) {
      toast.info(
        "Tokens should be advanced from the queue on the left sidebar using Call Next.",
      );
      return;
    }
    try {
      await fetchApi(`/visits/${id}/start`, { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["visits"] });
      await queryClient.invalidateQueries({
        queryKey: ["service-desk-visits"],
      });
      try {
        const fresh = await fetchApi(`/visits/${id}`);
        if (fresh && selectedVisit?.id === id) setSelectedVisit(fresh);
      } catch {}
      toast.success("Service started");
    } catch (err: any) {
      console.error("Failed to start visit", err);
      toast.error(
        err?.message || "Failed to start. Please check your connection.",
      );
      throw err;
    }
  };

  const handleApproveAppointment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetchApi(`/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "SCHEDULED" }),
      });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    } catch (err) {
      console.error("Failed to approve appointment", err);
    }
  };

  const handleRejectAppointment = async (
    id: string,
    e: React.MouseEvent,
    reason: string = "Schedule conflict",
  ) => {
    e.stopPropagation();
    try {
      await fetchApi(`/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REJECTED", notes: reason }),
      });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    } catch (err) {
      console.error("Failed to reject appointment", err);
    }
  };

  const handleCallNextQueue = async (queueId: string) => {
    try {
      const result = await fetchApi(`/queue/${queueId}/announce-next`, {
        method: "POST",
      });
      if (result?.announced) {
        const isWaConnected = Boolean(
          result?.whatsappConnected ?? tenant?.whatsappConnected,
        );
        const custLabel = `${result.customerName || "Next customer"} (${result.displayId || ""})`;
        if (!isWaConnected) {
          toast.warning(
            `Announcing ${custLabel} on TV display. WhatsApp message not sent — WhatsApp not connected.`,
          );
        } else if (result?.hasCustomerPhone === false) {
          toast.info(
            `Announcing ${custLabel} on TV display. WhatsApp message not sent — no customer phone number on file.`,
          );
        } else {
          toast.success(
            `Announcing ${custLabel} — TV display & WhatsApp notified.`,
          );
        }
      } else {
        toast.info(result?.message || "No waiting customers in this queue.");
      }
      queryClient.invalidateQueries({ queryKey: ["visits"] });
    } catch (err) {
      console.error("Failed to announce next customer", err);
      toast.error(
        "Failed to announce. Ensure the queue has waiting customers.",
      );
    }
  };

  const finalizeComplete = async (
    id: string,
    isToken?: boolean,
    allowUnpaid = false,
  ) => {
    if (isToken) {
      await fetchApi(`/queue/tokens/${id}/complete`, { method: "POST" });
    } else {
      await fetchApi(`/visits/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ allowUnpaid, forceComplete: true }),
      });
    }
    queryClient.invalidateQueries({ queryKey: ["visits"] });
    queryClient.invalidateQueries({ queryKey: ["queues"] });
    queryClient.invalidateQueries({ queryKey: ["service-desk-visits"] });
    if (selectedVisit?.id === id) setSelectedVisit(null);
    setPaymentAmount("");
    setPaymentLink(null);
  };

  const handleComplete = (
    id: string,
    e: React.MouseEvent,
    isToken?: boolean,
  ) => {
    e.stopPropagation();
    const v: AnyFixMe =
      selectedVisit?.id === id
        ? selectedVisit
        : visits.find((item: AnyFixMe) => item.id === id) || null;
    const prog = v ? getStepProgression(v) : null;
    const isEarly = !!prog?.next;
    const confirmMsg = isEarly
      ? "Are you sure you want to complete this entire visit early? Remaining journey stages will be skipped."
      : "Are you sure you want to mark this visit as completed?";
    setCompleteConfirmData({
      id,
      isToken,
      title: isEarly ? "Complete Visit Early?" : "Complete Visit?",
      message: confirmMsg,
      isEarly,
    });
  };

  const executeFinalizeComplete = async () => {
    if (!completeConfirmData) return;
    const { id, isToken } = completeConfirmData;
    const v: AnyFixMe =
      selectedVisit?.id === id
        ? selectedVisit
        : visits.find((item: AnyFixMe) => item.id === id) || null;
    setIsCompletingVisit(true);
    try {
      await finalizeComplete(id, isToken);
      setCompleteConfirmData(null);
    } catch (err: any) {
      if (err?.status === 402) {
        // Backend enforced the payment gate — fetch the bill and show the modal.
        try {
          const bill = (await fetchApi(`/visits/${id}/bill`)) as VisitBill;
          setCheckoutBill(bill);
          setCheckoutVisit({
            id,
            isToken,
            name: v?.customer?.name,
            phone: v?.customer?.phone,
          });
          setCompleteConfirmData(null);
          return;
        } catch {
          /* fall through */
        }
      }
      console.error("Failed to complete visit/token", err);
      toast.error("Failed to complete. Please try again.");
    } finally {
      setIsCompletingVisit(false);
    }
  };

  const handleSkipStep = async (visitId: string, stepId: string) => {
    try {
      await fetchApi(`/visit-steps/${stepId}/skip`, {
        method: "POST",
        body: JSON.stringify({ visitId }),
      });
      queryClient.invalidateQueries({ queryKey: ["service-desk-visits"] });
      toast.success("Step skipped");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to skip step");
    }
  };

  const handleRevertStep = async (visitId: string, stepId: string) => {
    try {
      await fetchApi(`/visit-steps/${stepId}/revert`, {
        method: "POST",
        body: JSON.stringify({ visitId }),
      });
      queryClient.invalidateQueries({ queryKey: ["service-desk-visits"] });
      toast.success("Step reverted to active");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to revert step");
    }
  };

  const handleConfirmCancelVisit = async () => {
    if (!cancelModalVisit) return;
    if (!cancelCustomNotes.trim()) {
      toast.error("Please enter a cancellation explanation/reason.");
      return;
    }
    if (cancelConfirmText.trim().toUpperCase() !== "CANCEL") {
      toast.error('Please type "CANCEL" to confirm cancellation.');
      return;
    }

    try {
      setIsCancelling(true);
      const categoryObj = CANCELLATION_REASONS.find(
        (r) => r.id === cancelReasonCategory,
      );
      const categoryLabel = categoryObj
        ? categoryObj.label
        : cancelReasonCategory;
      const fullReason = `${categoryLabel}: ${cancelCustomNotes.trim()}`;

      await fetchApi(`/visits/${cancelModalVisit.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({
          cancelledBy: user?.name || "Receptionist",
          cancelReason: fullReason,
          reasonCategory: cancelReasonCategory,
          notes: cancelCustomNotes.trim(),
          refundApplicable: cancelRefundApplicable,
          customMessage: cancelCustomNotes.trim(),
        }),
      });

      toast.success(
        "Visit cancelled successfully. Notification dispatched to customer.",
      );
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["service-desk-visits"] });
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      if (selectedVisit?.id === cancelModalVisit.id) {
        setSelectedVisit(null);
      }
      setCancelModalVisit(null);
      setCancelCustomNotes("");
      setCancelConfirmText("");
      setCancelRefundApplicable(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel visit");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmNoShow = async (visit: AnyFixMe) => {
    if (!visit) return;
    try {
      setIsMarkingNoShow(true);
      await fetchApi(`/visits/${visit.id}/no-show`, {
        method: "POST",
        body: JSON.stringify({
          reason: "Customer did not arrive / QR was never scanned (No-Show)",
        }),
      });

      toast.success(
        `Ticket ${visit.displayId || visit.ticketNumber || visit.id} marked as No-Show. Slot released.`,
      );
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["service-desk-visits"] });
      queryClient.invalidateQueries({ queryKey: ["queues"] });
      if (selectedVisit?.id === visit.id) {
        setSelectedVisit(null);
      }
      setNoShowConfirmVisit(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as No-Show");
    } finally {
      setIsMarkingNoShow(false);
    }
  };

  const handleGeneratePaymentLink = async (
    visitId: string,
    visitStepId: string,
  ) => {
    if (
      !paymentAmount ||
      isNaN(Number(paymentAmount)) ||
      Number(paymentAmount) <= 0
    ) {
      toast.info("Please enter a valid amount.");
      return;
    }

    setIsGeneratingPayment(true);
    try {
      // Hit the intent generation API which creates BookingPayment DB record
      const res = await fetchApi("/tenant-payments/public/intent", {
        method: "POST",
        body: JSON.stringify({
          tenantId: tenant.id,
          amount: Number(paymentAmount) * 100, // cents
          visitId,
          visitStepId,
          description: "In-Person Service Payment",
        }),
      });

      const link = tenant?.subdomain
        ? getTenantUrl(tenant.subdomain, `/pay/${res.paymentId}`)
        : `/pay/${res.paymentId}`;
      setPaymentLink(link);
    } catch (e: any) {
      toast.error("Failed to generate payment link: " + e.message);
    } finally {
      setIsGeneratingPayment(false);
    }
  };

  // Apply search + type filter + desk filter
  const applyFilters = (pool: AnyFixMe[]) =>
    pool.filter((v: AnyFixMe) => {
      const activeQ =
        selectedQueueId !== "all"
          ? filteredQueues.find((q: AnyFixMe) => q.id === selectedQueueId)
          : null;
      const matchesQueue =
        selectedQueueId === "all" ||
        v.queueId === selectedQueueId ||
        (activeQ?.services &&
          activeQ.services.some((s: AnyFixMe) => s.id === v.serviceId));
      const matchesSearch =
        !searchQuery ||
        v.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.displayId?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        queueFilter === "all" ||
        (queueFilter === "appointment" &&
          (v.source === "APPOINTMENT" || v.scheduledTime)) ||
        (queueFilter === "walkin" &&
          v.source !== "APPOINTMENT" &&
          !v.scheduledTime);
      return matchesQueue && matchesSearch && matchesType;
    });

  const displayArrived = applyFilters(arrivedPool);
  const displayUpcoming = applyFilters(upcomingPool);
  const displayTimeline = [...displayArrived, ...displayUpcoming].sort(
    (a: AnyFixMe, b: AnyFixMe) => getEffectiveTime(a) - getEffectiveTime(b),
  );
  const totalPoolCount = arrivedPool.length + upcomingPool.length;

  // Determine active queue on the content area
  const activeQueueIdOnContent = (() => {
    if (selectedQueueId !== "all") return selectedQueueId;
    if (selectedVisit?.queueId) return selectedVisit.queueId;
    if (selectedVisit?.queue?.id) return selectedVisit.queue.id;
    if (displayTimeline.length > 0) {
      const firstQ = displayTimeline[0]?.queueId;
      if (
        firstQ &&
        displayTimeline.every((item: AnyFixMe) => item.queueId === firstQ)
      ) {
        return firstQ;
      }
    }
    return null;
  })();

  return (
    <AdminLayout pageTitle={industry.serviceDesk.pageTitle} noPadding={true}>
      <Head>
        <title>{industry.serviceDesk.pageTitle} | Qmova</title>
      </Head>

      <div className="w-full h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] flex flex-col md:flex-row overflow-hidden bg-canvas dark:bg-dark-canvas">
        {/* Mobile Tab Switcher */}
        <div className="md:hidden flex items-center p-3 bg-card dark:bg-dark-card border-b border-border dark:border-dark-border gap-2 shrink-0 z-20 shadow-sm">
          <button
            onClick={() => setMobileTab("pool")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${mobileTab === "pool" ? "bg-primary text-white shadow-md" : "text-on-surface-variant bg-surface-container hover:bg-surface-container-high dark:bg-dark-canvas dark:hover:bg-inverse-surface"}`}
          >
            {industry.serviceDesk.poolTitle} ({totalPoolCount})
          </button>
          <button
            onClick={() => setMobileTab("pipeline")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${mobileTab === "pipeline" ? "bg-primary text-white shadow-md" : "text-on-surface-variant bg-surface-container hover:bg-surface-container-high dark:bg-dark-canvas dark:hover:bg-inverse-surface"}`}
          >
            Pipeline
          </button>
        </div>

        {/* Column 1: Pipeline */}
        <section
          className={`${mobileTab === "pipeline" ? "flex" : "hidden"} md:flex flex-col w-full md:w-64 lg:w-72 xl:w-80 shrink-0 bg-zinc-50/50 dark:bg-dark-card border-r border-border dark:border-dark-border p-3 md:p-3.5 min-h-0 h-full overflow-y-auto`}
        >
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[19px] text-primary">
                {industry.industryIcon}
              </span>
              <h2 className="text-base font-bold text-on-surface dark:text-white tracking-tight">
                {industry.serviceDesk.pipelineTitle}
              </h2>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {filteredQueues.length}
              </span>
            </div>
          </div>

          {/* Pending Appointments Stack */}
          {filteredAppointments.length > 0 && (
            <div className="mb-6 relative z-10 space-y-3">
              <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
                {industry.serviceDesk.pendingApprovalsLabel}
              </h3>
              <div className="relative">
                {filteredAppointments.map((apt: AnyFixMe, index: number) => (
                  <div
                    key={apt.id}
                    className="p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-amber-200 dark:border-amber-900/50 flex flex-col gap-3 transition-all"
                    style={{
                      transform: `translateY(${index * 8}px) scale(${1 - index * 0.02})`,
                      zIndex: filteredAppointments.length - index,
                      position: index === 0 ? "relative" : "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      opacity: index > 2 ? 0 : 1 - index * 0.1,
                      pointerEvents: index === 0 ? "auto" : "none",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                            New Request
                          </span>
                        </div>
                        <h4 className="font-semibold text-on-surface dark:text-white">
                          {apt.customer?.name}
                        </h4>
                        <p className="text-sm text-outline">
                          {apt.service?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-on-surface dark:text-white">
                          {new Date(apt.scheduledStart).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-outline">
                          {new Date(apt.scheduledStart).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="flex gap-2 pt-2 border-t border-border dark:border-dark-border">
                        <button
                          onClick={(e) => handleApproveAppointment(apt.id, e)}
                          className="flex-1 bg-primary text-on-primary py-2 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={(e) => handleRejectAppointment(apt.id, e)}
                          className="flex-1 bg-error/10 text-error py-2 rounded-lg text-sm font-semibold hover:bg-error/20 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 mb-4">
            {filteredQueues.length > 0 ? (
              filteredQueues.map((q: AnyFixMe) => {
                const loc = tenant?.locations?.find(
                  (l: AnyFixMe) => l.id === q.locationId,
                );
                const isEmergencyPaused = q.status === "PAUSED_FOR_EMERGENCY";
                const isPaused = q.status === "PAUSED" || isEmergencyPaused;
                const isDirectlySelected = selectedQueueId === q.id;
                const isVisitQueue = Boolean(
                  selectedVisit &&
                  (selectedVisit.queueId === q.id ||
                    selectedVisit.queue?.id === q.id ||
                    (q.services &&
                      q.services.some(
                        (s: AnyFixMe) => s.id === selectedVisit.serviceId,
                      ))),
                );
                const isQueueActive =
                  q.id === activeQueueIdOnContent ||
                  isDirectlySelected ||
                  isVisitQueue;
                const waitingInQueueCount = arrivedPool.filter(
                  (v: AnyFixMe) =>
                    v.queueId === q.id ||
                    (q.services &&
                      q.services.some((s: AnyFixMe) => s.id === v.serviceId)),
                ).length;
                const hasWaiting = waitingInQueueCount > 0;

                return (
                  <div
                    key={q.id}
                    onClick={() =>
                      setSelectedQueueId(isDirectlySelected ? "all" : q.id)
                    }
                    className={`group relative p-2.5 rounded-xl border transition-all duration-150 cursor-pointer select-none overflow-hidden
                ${
                  isEmergencyPaused
                    ? "border-red-400/60 bg-red-50/50 dark:bg-red-950/20 shadow-xs"
                    : isQueueActive
                      ? "border-primary ring-2 ring-primary/40 bg-primary/10 dark:bg-primary/20 shadow-md pl-3.5"
                      : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs"
                }
              `}
                  >
                    {/* Active indicator accent bar */}
                    {isQueueActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary shadow-xs" />
                    )}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      {/* Top Line: Desk Name + Location & Status Chips */}
                      <div className="flex items-center justify-between gap-1.5 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span
                            className={`text-[13px] leading-tight truncate transition-colors ${isQueueActive ? "font-bold text-primary dark:text-sky-400" : "font-semibold text-zinc-900 dark:text-zinc-100"}`}
                            title={q.name}
                          >
                            {q.name}
                          </span>
                          {activeLocationId === "all" && loc && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium shrink-0 truncate max-w-[75px]"
                              title={loc.name}
                            >
                              {loc.name}
                            </span>
                          )}
                        </div>

                        {isEmergencyPaused && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-900/50 text-red-600 font-bold shrink-0 animate-pulse whitespace-nowrap">
                            PAUSED
                          </span>
                        )}
                        {isPaused && !isEmergencyPaused && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 font-bold shrink-0 whitespace-nowrap">
                            PAUSED
                          </span>
                        )}
                        {!isPaused && isQueueActive && (
                          <span
                            data-testid="active-queue-badge"
                            className="text-[9px] px-2 py-0.5 rounded-md bg-primary text-white font-bold shrink-0 whitespace-nowrap shadow-xs flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                            ACTIVE
                          </span>
                        )}
                      </div>

                      {/* Bottom Line: Live Queue Counter + Refined Micro-Actions */}
                      <div className="flex items-center justify-between gap-1.5 pt-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasWaiting ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-zinc-300 dark:bg-zinc-600"}`}
                          />
                          <span className="text-[11px] whitespace-nowrap">
                            <strong className="font-semibold text-zinc-900 dark:text-zinc-100 font-data-mono">
                              {waitingInQueueCount}
                            </strong>{" "}
                            waiting
                          </span>
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Emergency Pause button - subtle secondary action */}
                          {industry.uiFlags.showEmergencyPause && !isPaused && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toast("Pause for emergency?", {
                                  description: `All waiting customers in ${q.name} will be notified.`,
                                  action: {
                                    label: "Pause",
                                    onClick: () =>
                                      pauseEmergencyMutation.mutate(q.id),
                                  },
                                  cancel: {
                                    label: "Cancel",
                                    onClick: () => {},
                                  },
                                  duration: 10000,
                                });
                              }}
                              title="Emergency Pause"
                              className="px-1.5 py-1 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors flex items-center gap-1 text-[11px] font-medium shrink-0"
                            >
                              <AlertTriangle className="w-3 h-3 text-zinc-400 hover:text-red-500 transition-colors shrink-0" />
                              <span className="hidden min-[400px]:inline xl:inline">
                                Pause
                              </span>
                            </button>
                          )}

                          {!isPaused && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallNextQueue(q.id);
                              }}
                              title="Call next in queue"
                              className="bg-primary hover:bg-primary/90 active:scale-[0.98] text-white px-2 py-1 rounded-md text-xs font-semibold transition-all shadow-xs flex items-center gap-1 shrink-0"
                            >
                              <span className="material-symbols-outlined text-[14px] shrink-0">
                                campaign
                              </span>
                              <span className="text-[11px] font-medium leading-tight whitespace-nowrap">
                                Call Next
                              </span>
                            </button>
                          )}

                          {isPaused && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchApi(`/queue/${q.id}/status`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ status: "ACTIVE" }),
                                }).then(() =>
                                  queryClient.invalidateQueries({
                                    queryKey: ["queues"],
                                  }),
                                );
                              }}
                              title="Resume queue"
                              className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-2 py-1 rounded-md text-xs font-semibold transition-all shadow-xs flex items-center gap-1 shrink-0"
                            >
                              <span className="material-symbols-outlined text-[14px] shrink-0">
                                play_arrow
                              </span>
                              <span className="text-[11px] font-medium leading-tight whitespace-nowrap">
                                Resume
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-body-sm text-outline italic">
                No active queues.
              </p>
            )}
          </div>

          {/* Attendance & Fulfillment section temporarily disabled
          {fulfillmentMetrics && (
            <div className="mt-4 pt-4 border-t border-border dark:border-dark-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider text-[11px]">
                  Attendance & Fulfillment
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {fulfillmentMetrics.unitName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-container dark:bg-zinc-800/60 p-2.5 rounded-xl border border-border dark:border-zinc-700/60">
                  <div className="text-[10px] text-outline font-semibold mb-0.5">
                    Registered
                  </div>
                  <div className="text-base font-bold font-data-mono text-on-surface dark:text-white">
                    {fulfillmentMetrics.totalRegistered}
                  </div>
                </div>
                <div className="bg-surface-container dark:bg-zinc-800/60 p-2.5 rounded-xl border border-border dark:border-zinc-700/60">
                  <div className="text-[10px] text-outline font-semibold mb-0.5">
                    Checked In
                  </div>
                  <div className="text-base font-bold font-data-mono text-emerald-600 dark:text-emerald-400">
                    {fulfillmentMetrics.checkedIn}
                  </div>
                </div>
                <div className="bg-surface-container dark:bg-zinc-800/60 p-2.5 rounded-xl border border-border dark:border-zinc-700/60">
                  <div className="text-[10px] text-outline font-semibold mb-0.5">
                    Allocated
                  </div>
                  <div className="text-base font-bold font-data-mono text-on-surface dark:text-white">
                    {fulfillmentMetrics.totalAllocated}
                  </div>
                </div>
                <div className="bg-surface-container dark:bg-zinc-800/60 p-2.5 rounded-xl border border-border dark:border-zinc-700/60">
                  <div className="text-[10px] text-outline font-semibold mb-0.5">
                    Collected
                  </div>
                  <div className="text-base font-bold font-data-mono text-primary flex items-baseline gap-1">
                    <span>{fulfillmentMetrics.totalGiven}</span>
                    <span className="text-[10px] text-outline font-sans font-normal">
                      / {fulfillmentMetrics.totalAllocated}
                    </span>
                  </div>
                </div>
              </div>
              {fulfillmentMetrics.outstanding > 0 && (
                <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 font-medium px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex justify-between items-center">
                  <span>Outstanding:</span>
                  <span className="font-bold font-mono text-xs">
                    {fulfillmentMetrics.outstanding}{" "}
                    {fulfillmentMetrics.unitName}
                  </span>
                </div>
              )}
            </div>
          )}
          */}

          <div className="mt-3 pt-4 border-t border-border dark:border-dark-border">
            <div>
              <h3 className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-0.5">
                Active Services
              </h3>
              <p className="text-[10px] text-outline mb-2.5">
                Clients currently being served.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {inServiceVisits.map((v: AnyFixMe) => {
                const stepProg = getStepProgression(v);
                const serviceStartTs = v.serviceStart
                  ? new Date(v.serviceStart).getTime()
                  : Date.now();
                const nowMs = Date.now() + activeServiceTick * 0; // reference tick so React re-renders
                const totalSvcSecs = Math.max(
                  0,
                  Math.floor((nowMs - serviceStartTs) / 1000),
                );
                const stepStartTs = stepProg.current?.activatedAt
                  ? new Date(stepProg.current.activatedAt).getTime()
                  : serviceStartTs;
                const stageSecs = Math.max(
                  0,
                  Math.floor((nowMs - stepStartTs) / 1000),
                );
                const stepEstMins =
                  stepProg.current?.templateStep?.expectedDuration ||
                  stepProg.current?.expectedDuration ||
                  null;
                const stepOverdue = stepEstMins && stageSecs > stepEstMins * 60;
                const hasMoreSteps =
                  !!stepProg.next ||
                  (!stepProg.isCompleted &&
                    stepProg.current &&
                    stepProg.activeIndex < stepProg.totalSteps - 1);

                return (
                  <div
                    key={v.id}
                    data-testid={`visit-card-${v.id}`}
                    onClick={() => setSelectedVisit(v)}
                    className={`p-2.5 rounded-lg border cursor-pointer hover:border-primary transition-colors ${
                      stepOverdue
                        ? "bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                        : "bg-surface-container dark:bg-inverse-surface border-border dark:border-dark-border"
                    }`}
                  >
                    {/* Row 1: Name + Ticket + Service timer */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${stepOverdue ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`}
                        />
                        <p className="text-xs font-semibold text-on-surface dark:text-white truncate">
                          {v.customer?.name || industry.terminology.walkIn}
                        </p>
                        <span className="text-[10px] text-outline font-mono shrink-0">
                          {v.displayId ||
                            v.ticketNumber ||
                            `#TKT-${v.id.substring(0, 4)}`}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold shrink-0 ${
                          totalSvcSecs > 3600
                            ? "text-rose-600"
                            : totalSvcSecs > 1800
                              ? "text-amber-600"
                              : "text-emerald-600"
                        }`}
                      >
                        ⏱ {formatDuration(totalSvcSecs)}
                      </span>
                    </div>

                    {/* Row 2: Current stage + stage timer */}
                    {stepProg.current && (
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <span
                            className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border truncate ${
                              stepOverdue
                                ? "bg-rose-500/10 border-rose-400/40 text-rose-700 dark:text-rose-400"
                                : "bg-primary/10 border-primary/30 text-primary"
                            }`}
                          >
                            {stepProg.current.name ||
                              stepProg.current.label ||
                              "Stage"}
                          </span>
                          {stepOverdue && (
                            <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold shrink-0">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-mono shrink-0 ${
                            stepOverdue
                              ? "text-rose-600 font-bold"
                              : "text-outline"
                          }`}
                        >
                          {formatDuration(stageSecs)}
                          {stepEstMins ? `/${stepEstMins}m` : ""}
                        </span>
                      </div>
                    )}

                    {/* Row 3: Next stage chip + Action button */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        {stepProg.next && (
                          <span className="text-[9px] text-outline bg-surface-container-high dark:bg-dark-canvas px-1.5 py-0.5 rounded border border-border truncate">
                            Next:{" "}
                            {stepProg.next.name ||
                              stepProg.next.label ||
                              "Next Stage"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasMoreSteps && stepProg.current?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVisit(v);
                              setStageModalVisit(v);
                            }}
                            title="Advance to next stage"
                            className="flex items-center gap-1 py-1 px-2 text-[10px] font-semibold text-sky-700 bg-sky-100 hover:bg-sky-200 dark:text-sky-400 dark:bg-sky-900/30 dark:hover:bg-sky-800/50 rounded-md transition-colors border border-sky-200 dark:border-sky-800/50 cursor-pointer"
                          >
                            <ArrowRight className="w-3 h-3" />
                            Next Stage
                          </button>
                        )}
                        <button
                          onClick={(e) => handleComplete(v.id, e, v.isToken)}
                          title={`Complete — ${industry.terminology.actionVerbPast}`}
                          className="flex items-center gap-1 py-1 px-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 rounded-md transition-colors border border-emerald-200 dark:border-emerald-800/50 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {inServiceVisits.length === 0 && (
                <p className="text-body-sm text-outline italic">
                  No active services.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Column 2: Pool */}
        <section
          className={`${mobileTab === "pool" ? "flex" : "hidden"} md:flex flex-1 min-w-0 bg-canvas dark:bg-dark-canvas p-4 md:p-6 flex-col min-h-0 h-full overflow-hidden transition-all duration-300`}
        >
          <div className="flex flex-wrap xl:flex-nowrap items-start xl:items-center justify-between gap-4 mb-3 shrink-0">
            <div className="flex flex-col w-full xl:w-auto">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-headline-sm text-headline-sm text-on-surface dark:text-white">
                  {industry.serviceDesk.poolTitle}
                </h2>
                <span className="bg-primary/10 text-primary dark:bg-primary-fixed-dim/20 dark:text-primary-fixed-dim px-2.5 py-0.5 rounded-full font-data-mono text-body-sm font-semibold">
                  {totalPoolCount}
                </span>
                {activeQueueIdOnContent &&
                  (() => {
                    const activeQ = filteredQueues.find(
                      (q: AnyFixMe) => q.id === activeQueueIdOnContent,
                    );
                    if (!activeQ) return null;
                    return (
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-primary/10 border border-primary/30 rounded-lg text-xs font-semibold text-primary">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                        <span className="truncate max-w-[200px]">
                          Queue: {activeQ.name}
                        </span>
                        {selectedQueueId !== "all" && (
                          <button
                            onClick={() => setSelectedQueueId("all")}
                            className="hover:text-primary-focus ml-0.5 p-0.5 rounded hover:bg-primary/20 transition-colors cursor-pointer"
                            title="Show all queues"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })()}
              </div>
              <p className="text-xs text-outline mt-1">
                Appointments are pinned to their time slot. Walk-ins fill gaps
                between them — one unified queue.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto mt-4 xl:mt-0">
              <div className="relative flex-1 min-w-[150px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${industry.terminology.customers.toLowerCase()}...`}
                  className="w-full pl-9 pr-4 py-1.5 bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-lg text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="bg-surface-container hover:bg-surface-container-high text-on-surface px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-colors flex items-center gap-1 border border-border cursor-pointer"
              >
                <ScanLine className="w-[18px] h-[18px]" /> Scan QR
              </button>
              <button
                onClick={() => setIsVisitModalOpen(true)}
                className="bg-primary hover:bg-primary-container text-on-primary px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>{" "}
                Add {industry.terminology.customer}
              </button>
            </div>
          </div>

          {/* Category Filter Buttons: All, Walk-ins, Appointments */}
          <div className="flex items-center gap-2 mb-3.5 overflow-x-auto no-scrollbar shrink-0 py-0.5">
            {(["all", "walkin", "appointment"] as const).map((f) => {
              const label =
                f === "all"
                  ? "All"
                  : f === "walkin"
                    ? "Walk-ins"
                    : "Appointments";
              const count =
                f === "all"
                  ? totalPoolCount
                  : f === "walkin"
                    ? arrivedPool.filter(
                        (v: AnyFixMe) =>
                          v.source !== "APPOINTMENT" && !v.scheduledTime,
                      ).length
                    : arrivedPool.filter(
                        (v: AnyFixMe) =>
                          v.source === "APPOINTMENT" || v.scheduledTime,
                      ).length + upcomingPool.length;
              const isActive = queueFilter === f;

              return (
                <button
                  key={f}
                  type="button"
                  data-testid={`category-filter-${f}`}
                  onClick={() => setQueueFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                    isActive
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-card dark:bg-dark-card text-on-surface-variant dark:text-zinc-300 border-border dark:border-dark-border hover:border-primary/50 hover:bg-surface-container"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? "bg-white/20 text-white font-semibold"
                        : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto pb-8 space-y-3">
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 bg-surface-container/50 animate-pulse rounded-xl border border-border"
                  ></div>
                ))}
              </div>
            )}

            {totalPoolCount === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-outline animate-in fade-in duration-500 py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full"></div>
                  <div className="w-24 h-24 bg-surface-container/50 dark:bg-inverse-surface border border-border dark:border-dark-border rounded-full flex items-center justify-center relative z-10 shadow-xl">
                    <span className="material-symbols-outlined text-5xl text-primary opacity-80">
                      {industry.serviceDesk.emptyIcon}
                    </span>
                  </div>
                </div>
                <h3 className="font-headline-sm text-on-surface dark:text-white mb-2">
                  {industry.serviceDesk.emptyHeading}
                </h3>
                {queues.length === 0 ? (
                  <>
                    <p className="text-body-md text-outline text-center max-w-sm mb-8 leading-relaxed">
                      You haven&apos;t configured any queues yet. Set up a queue
                      to start receiving{" "}
                      {industry.terminology.customers.toLowerCase()}.
                    </p>
                    <Link
                      href="/dashboard/queues"
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold text-body-sm hover:bg-primary-container transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        list_alt
                      </span>
                      Configure Queues
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-body-md text-outline text-center max-w-sm mb-8 leading-relaxed">
                      {visits.length === 0
                        ? industry.serviceDesk.emptyBody
                        : `All ${industry.terminology.customers.toLowerCase()} have been successfully routed and served.`}
                    </p>
                    {visits.length === 0 && tenant?.subdomain && (
                      <a
                        href={(() => {
                          if (!tenant?.subdomain) return "#";
                          let path = "/booking";
                          if (activeLocationId && activeLocationId !== "all") {
                            const loc = tenant?.locations?.find(
                              (l: AnyFixMe) => l.id === activeLocationId,
                            );
                            if (loc) path = `/booking/${slugify(loc.name)}`;
                          }
                          return getTenantUrl(tenant.subdomain, path);
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-semibold text-body-sm hover:bg-primary-container transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                      >
                        <MonitorPlay className="w-5 h-5" />
                        Open Booking Page
                      </a>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── SECTION: UNIFIED TIMELINE (SQUEEZE) ──────────────────────────── */}
            {displayTimeline.length > 0 && (
              <AnimatePresence mode="popLayout">
                {displayTimeline.map((v: AnyFixMe) => {
                  const isAppt =
                    v.source === "APPOINTMENT" ||
                    (v.scheduledTime && !v.isToken);
                  const isUpcoming =
                    v.currentState === "SCHEDULED" && !v.checkInTime;
                  const arrivalTimestamp =
                    v.waitingStart ||
                    v.checkInTime ||
                    v.checkedInAt ||
                    v.actualArrival ||
                    v.arrivalTime ||
                    v.createdAt;
                  const waitTimeMs = arrivalTimestamp
                    ? Math.max(
                        0,
                        Date.now() - new Date(arrivalTimestamp).getTime(),
                      )
                    : 0;
                  const waitTimeMins = Math.floor(waitTimeMs / 60000);
                  const threshold = tenant?.reviewWaitThresholdMins || 15;
                  const isStale = !isUpcoming && waitTimeMins > 1440; // > 24 hours
                  const isUrgent = !isUpcoming && waitTimeMins > threshold && !isStale;
                  const slotTime = v.scheduledTime
                    ? new Date(v.scheduledTime)
                    : null;
                  const minsUntil = slotTime
                    ? Math.round((slotTime.getTime() - Date.now()) / 60000)
                    : null;

                  const customerName =
                    v.customer?.name || industry.terminology.walkIn;
                  const ticketNum =
                    v.ticketNumber ||
                    v.displayId ||
                    `#TKT-${v.id.substring(0, 4)}`;
                  const apptDate = formatAppointmentDate(
                    v.scheduledTime ||
                      v.appointment?.scheduledTime ||
                      v.createdAt,
                  );
                  const slotTimeFormatted = formatAppointmentTime(
                    v.scheduledTime || v.appointment?.scheduledTime,
                  );
                  const peopleBeforeThem = Math.max(
                    0,
                    displayTimeline.findIndex(
                      (item: AnyFixMe) => item.id === v.id,
                    ),
                  );
                  const cardEstimates = getVisitTimeEstimates(
                    v,
                    peopleBeforeThem,
                  );

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.98, y: 8 }}
                      animate={{
                        opacity: isUpcoming ? 0.85 : 1,
                        scale: 1,
                        y: 0,
                      }}
                      exit={{ opacity: 0, scale: 0.98, y: -8 }}
                      transition={{ duration: 0.2 }}
                      key={v.id}
                      data-testid={`visit-card-${v.id}`}
                      onClick={() => setSelectedVisit(v)}
                      className={`bg-card dark:bg-dark-card border ${
                        selectedVisit?.id === v.id
                          ? "border-primary ring-1 ring-primary/60 shadow-sm"
                          : isAppt
                            ? "border-sky-200/80 dark:border-sky-900/50 hover:border-sky-400 dark:hover:border-sky-700"
                            : "border-border dark:border-dark-border hover:border-primary/50"
                      } rounded-xl p-3.5 flex flex-col gap-2 relative overflow-hidden group cursor-pointer transition-all hover:shadow-sm`}
                    >
                      {/* Left accent indicator */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          isAppt
                            ? isUpcoming
                              ? "bg-sky-400/60"
                              : "bg-sky-500"
                            : isStale
                              ? "bg-zinc-400 dark:bg-zinc-600"
                              : isUrgent
                                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                                : "bg-emerald-500"
                        }`}
                      />

                      {/* Row 1: Name and Ticket Number */}
                      <div className="flex items-center justify-between pl-1.5">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <h3 className="font-semibold text-sm text-on-surface dark:text-white truncate">
                            {customerName}
                          </h3>
                          {v.priority > 0 && (
                            <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">
                              VIP
                            </span>
                          )}
                          {(() => {
                            const isPaid = v.bookingPayments?.some(
                              (p: any) => p.status === "SUCCEEDED",
                            );
                            const isDue =
                              v.currentState === "PENDING_PAYMENT" ||
                              v.bookingPayments?.some(
                                (p: any) => p.status === "PENDING",
                              );
                            const isCounter =
                              v.service?.serviceFlow?.checkinPayMode ===
                                "COUNTER_ONLY" ||
                              v.service?.serviceFlow?.paymentTiming ===
                                "CHECKOUT";

                            if (isPaid) {
                              return (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" /> Paid
                                </span>
                              );
                            }
                            if (isDue) {
                              return (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-0.5 shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{" "}
                                  Due
                                </span>
                              );
                            }
                            if (isCounter && (v.service?.basePrice || 0) > 0) {
                              return (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-0.5 shrink-0">
                                  Counter
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                          {ticketNum}
                        </span>
                      </div>

                      {/* Row 2: Date & Slot / Waiting Time */}
                      <div className="flex items-center justify-between text-xs pl-1.5 flex-wrap gap-y-1">
                        <div className="flex items-center gap-1.5 text-outline font-medium">
                          <Calendar className="w-3.5 h-3.5 text-outline shrink-0" />
                          <span className="text-on-surface/80 dark:text-zinc-300 font-medium">
                            {apptDate || "Today"}
                          </span>
                        </div>

                        {isAppt && isUpcoming ? (
                          <div className="flex items-center gap-1.5 font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200/60 dark:border-sky-800/40">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Slot: {slotTimeFormatted || "Scheduled"}
                            </span>
                            {cardEstimates.estFinishTimeStr && (
                              <span className="text-[11px] text-sky-700/80 dark:text-sky-300/80 font-normal">
                                • Finish: ~{cardEstimates.estFinishTimeStr}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`flex items-center gap-1.5 font-medium px-2 py-0.5 rounded border ${
                              isStale
                                ? "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700 font-semibold"
                                : isUrgent
                                  ? "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/40 font-bold"
                                  : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {isAppt
                                ? `Slot: ${slotTimeFormatted || "Scheduled"} • `
                                : ""}
                              Waiting: {isStale ? ">24h (Stale)" : `${waitTimeMins}m`}
                              {!isStale && cardEstimates.estWaitMins !== null
                                ? ` • Est. Wait: ~${cardEstimates.estWaitMins}m`
                                : ""}
                              {!isStale && cardEstimates.estFinishTimeStr
                                ? ` • Est. Finish: ~${cardEstimates.estFinishTimeStr}`
                                : ""}
                            </span>
                            {isStale ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNoShowConfirmVisit(v);
                                }}
                                className="text-[10px] px-1.5 py-0.5 bg-zinc-600 hover:bg-zinc-700 text-white rounded font-bold uppercase tracking-wider ml-1 cursor-pointer transition-colors"
                                title="Click to clear stale ticket as No-Show"
                              >
                                Mark No-Show
                              </button>
                            ) : isUrgent ? (
                              <span className="text-[10px] px-1 py-0.2 bg-rose-500 text-white rounded font-bold uppercase tracking-wider ml-0.5">
                                Overdue
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Row 3: People Before Them & Quick Action */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40 dark:border-dark-border/40 pl-1.5 gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-outline font-medium shrink-0">
                          <Users className="w-3.5 h-3.5 text-outline shrink-0" />
                          <span>
                            People before them:{" "}
                            <strong className="font-mono text-on-surface dark:text-white font-semibold">
                              {peopleBeforeThem}
                            </strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isUpcoming ? (
                            <span className="text-[11px] text-outline font-medium bg-surface-container px-2 py-0.5 rounded">
                              {minsUntil !== null && minsUntil > 0
                                ? `in ${minsUntil}m`
                                : "Scheduled"}
                            </span>
                          ) : v.currentState === "IN_SERVICE" ? (
                            <div className="flex items-center gap-1.5">
                              {getStepProgression(v).next && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVisit(v);
                                    setStageModalVisit(v);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-md text-white bg-sky-600 hover:bg-sky-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                  title="Advance to next stage"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                  Advance
                                </button>
                              )}
                              <button
                                onClick={(e) =>
                                  handleComplete(v.id, e, v.isToken)
                                }
                                className="px-2.5 py-1 text-xs font-semibold rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Complete visit"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Complete
                              </button>
                            </div>
                          ) : v.currentState === "PENDING_PAYMENT" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVisit(v);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-orange-600 hover:bg-orange-700 text-white transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              Pay
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={(e) => handleAnnounce(v.id, e)}
                                disabled={announceLoadingId === v.id}
                                title="Announce customer on TV display & WhatsApp"
                                className="px-2 py-1 text-xs font-medium rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  campaign
                                </span>
                                <span>
                                  {announceLoadingId === v.id
                                    ? "..."
                                    : "Announce"}
                                </span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (v.isToken) {
                                    handleStart(v.id, e, true);
                                  } else {
                                    setStartServiceModal(v);
                                  }
                                }}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md text-white transition-colors flex items-center gap-1 shadow-xs cursor-pointer ${
                                  v.isToken
                                    ? "bg-zinc-600 hover:bg-zinc-700"
                                    : isAppt
                                      ? "bg-sky-600 hover:bg-sky-700"
                                      : "bg-emerald-600 hover:bg-emerald-700"
                                }`}
                              >
                                <Play className="w-3 h-3" />
                                {v.isToken ? "Queued" : "Start Service"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>

        {/* Column 3: Visitor/Patient Context Panel */}
        {selectedVisit &&
          (() => {
            const isAppt =
              selectedVisit.source === "APPOINTMENT" ||
              !!selectedVisit.scheduledTime;
            const isInService = ["IN_SERVICE", "SERVING"].includes(
              selectedVisit.currentState,
            );
            const isWaiting = ["WAITING", "QUEUED", "CHECKED_IN"].includes(
              selectedVisit.currentState,
            );
            const apptDateStr = formatAppointmentDate(
              selectedVisit.scheduledTime ||
                selectedVisit.appointment?.scheduledStart ||
                selectedVisit.appointment?.scheduledTime,
            );
            const apptTimeStr = formatAppointmentTime(
              selectedVisit.scheduledTime ||
                selectedVisit.appointment?.scheduledStart ||
                selectedVisit.appointment?.scheduledTime,
            );
            const slotTimeRange = getSlotTimeRange(selectedVisit);
            const bookedAtStr = formatDateTime(selectedVisit.createdAt);
            const peopleAhead = Math.max(
              0,
              displayTimeline.findIndex(
                (item: AnyFixMe) => item.id === selectedVisit.id,
              ),
            );
            const detailsEstimates = getVisitTimeEstimates(
              selectedVisit,
              peopleAhead,
            );
            const stepProgression = getStepProgression(selectedVisit);

            const isLateOrNoShowEligible = (() => {
              if (!selectedVisit) return null;
              if (
                ["COMPLETED", "CANCELLED", "NO_SHOW", "IN_SERVICE"].includes(
                  selectedVisit.currentState,
                )
              ) {
                return null;
              }
              const now = new Date();

              // 1. Scheduled Appointment
              if (selectedVisit.scheduledTime) {
                const schedDate = new Date(selectedVisit.scheduledTime);
                const hasCheckedIn = !!(
                  selectedVisit.checkInTime ||
                  selectedVisit.actualArrival ||
                  selectedVisit.currentState === "CHECKED_IN"
                );
                if (!hasCheckedIn && now.getTime() > schedDate.getTime()) {
                  const minsOverdue = Math.max(
                    1,
                    Math.floor((now.getTime() - schedDate.getTime()) / 60000),
                  );
                  return {
                    isLate: true,
                    type: "APPOINTMENT" as const,
                    minsOverdue,
                    timeStr:
                      slotTimeRange?.startStr ||
                      apptTimeStr ||
                      "scheduled slot",
                  };
                }
              }

              // 2. Walk-in ticket created on site/online but QR was never scanned
              if (
                !selectedVisit.scheduledTime &&
                (selectedVisit.currentState === "CREATED" ||
                  selectedVisit.currentState === "SCHEDULED")
              ) {
                const createdDate = new Date(selectedVisit.createdAt);
                const minsSinceCreated = Math.floor(
                  (now.getTime() - createdDate.getTime()) / 60000,
                );
                if (minsSinceCreated >= 15 && !selectedVisit.checkInTime) {
                  return {
                    isLate: true,
                    type: "WALK_IN" as const,
                    minsOverdue: minsSinceCreated,
                    timeStr: "check-in window",
                  };
                }
              }

              return null;
            })();

            return (
              <section
                ref={drawerRef}
                className="hidden md:flex flex-col w-full md:w-80 lg:w-96 xl:w-[420px] shrink-0 bg-card dark:bg-dark-card border-l border-border dark:border-dark-border min-h-0 h-full relative animate-in slide-in-from-right-8 duration-300 ease-in-out overflow-hidden shadow-xl z-10"
              >
                {/* Top details area - streamlined line-by-line compact display */}
                <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-3">
                  {/* 1. Header Line: Name, Number, Ticket: XXXXX, Appointment in one line */}
                  <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-border/50">
                    <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                      <span className="font-bold text-[15px] text-on-surface dark:text-white truncate">
                        {selectedVisit.customer?.name ||
                          industry.terminology.walkIn}
                      </span>
                      {selectedVisit.customer?.phone && (
                        <span className="text-xs md:text-sm text-outline font-mono flex items-center gap-1.5">
                          <span>{selectedVisit.customer.phone}</span>
                          <a
                            href={`https://wa.me/${selectedVisit.customer.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-500 inline-flex items-center"
                            title="Open WhatsApp chat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </span>
                      )}
                      <button
                        onClick={() => {
                          const tkt =
                            selectedVisit.displayId ||
                            selectedVisit.ticketNumber ||
                            `#TKT-${selectedVisit.id.substring(0, 4)}`;
                          navigator.clipboard.writeText(tkt);
                          toast.success(`Copied ${tkt}`);
                        }}
                        title="Click to copy ticket number"
                        className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        <span>
                          Ticket:{" "}
                          {selectedVisit.displayId ||
                            selectedVisit.ticketNumber ||
                            `#TKT-${selectedVisit.id.substring(0, 4)}`}
                        </span>
                        <Copy className="w-3 h-3 opacity-70 hover:opacity-100" />
                      </button>
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          isAppt
                            ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        {isAppt ? "Appointment" : "Walk-in"}
                      </span>
                      {(selectedVisit.isVip ||
                        selectedVisit.customer?.isVip ||
                        selectedVisit.priority >= 3) && (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-bold uppercase">
                          <Sparkles className="w-3 h-3 text-purple-500" /> VIP
                        </span>
                      )}
                      {(!isAppt ||
                        selectedVisit.currentState !== "SCHEDULED") && (
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isInService
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              : isWaiting
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                : selectedVisit.currentState === "NO_SHOW" ||
                                    selectedVisit.currentState === "CANCELLED"
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                  : "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30"
                          }`}
                        >
                          {selectedVisit.currentState.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedVisit(null)}
                      className="p-1.5 text-outline hover:text-on-surface dark:hover:text-white hover:bg-surface-container rounded-lg transition-colors shrink-0"
                      title="Close details"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 2. Customer Overdue Alert - Small, compact, easy to understand */}
                  {isLateOrNoShowEligible && (
                    <div className="flex items-center justify-between gap-2.5 p-2.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs md:text-sm">
                      <div className="flex items-center gap-1.5 min-w-0 text-amber-800 dark:text-amber-200">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="font-semibold text-xs md:text-sm truncate">
                          Customer Overdue ({isLateOrNoShowEligible.minsOverdue}
                          m past slot) • QR Not Scanned
                        </span>
                      </div>
                      <button
                        onClick={() => setNoShowConfirmVisit(selectedVisit)}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Mark No-Show
                      </button>
                    </div>
                  )}

                  {/* 3. Schedule & People Ahead */}
                  <div className="text-sm text-on-surface dark:text-zinc-300 flex items-center justify-between gap-x-4 py-0.5">
                    <div>
                      <span className="text-outline">Schedule: </span>
                      <span className="font-semibold text-primary dark:text-sky-400 font-mono text-sm">
                        {isAppt
                          ? slotTimeRange
                            ? `${slotTimeRange.startStr} to ${slotTimeRange.endStr}`
                            : apptTimeStr || "N/A"
                          : formatDateTime(
                              selectedVisit.waitingStart ||
                                selectedVisit.createdAt,
                            )}
                      </span>
                    </div>
                    <div>
                      <span className="text-outline">People ahead: </span>
                      <span className="font-bold text-on-surface dark:text-white font-mono text-sm">
                        {peopleAhead}
                      </span>
                    </div>
                  </div>

                  {/* 4. Waiting time & Est. Finish Time (with separate title on side or below wait time) */}
                  <div className="text-sm text-on-surface dark:text-zinc-300 flex items-center gap-x-4 gap-y-1.5 flex-wrap py-0.5">
                    <div>
                      <span className="text-outline">
                        {isInService ? "Service duration: " : "Waiting time: "}
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-sm">
                        {isInService
                          ? `${formatDuration(serviceDurationSeconds)} (in service)`
                          : (() => {
                              const arrTs =
                                selectedVisit.waitingStart ||
                                selectedVisit.checkInTime ||
                                selectedVisit.checkedInAt ||
                                selectedVisit.actualArrival ||
                                selectedVisit.arrivalTime ||
                                selectedVisit.createdAt;
                              const wMins = arrTs
                                ? Math.floor(
                                    Math.max(
                                      0,
                                      Date.now() - new Date(arrTs).getTime(),
                                    ) / 60000,
                                  )
                                : 0;
                              return `${wMins}m`;
                            })()}
                      </span>
                    </div>
                    {!isInService && detailsEstimates.estWaitMins !== null && (
                      <div>
                        <span className="text-outline">Est. wait: </span>
                        <span className="font-bold text-sky-600 dark:text-sky-400 font-mono text-sm">
                          ~{detailsEstimates.estWaitMins}m
                        </span>
                      </div>
                    )}
                    {detailsEstimates.estFinishTimeStr && (
                      <div>
                        <span className="text-outline">Est. finish time: </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          ~{detailsEstimates.estFinishTimeStr}
                        </span>
                        {detailsEstimates.estTotalMins && !isInService && (
                          <span className="text-outline text-xs ml-1 font-mono">
                            (~{detailsEstimates.estTotalMins}m total)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Service Booked */}
                  <div className="text-sm text-on-surface dark:text-zinc-300 py-1">
                    <span className="text-outline">Service booked: </span>
                    <span className="font-semibold text-sm text-on-surface dark:text-white">
                      {selectedVisit.service?.name ||
                        industry.terminology.service}
                    </span>
                    {selectedVisit.service?.expectedDuration && (
                      <span className="text-outline font-mono text-xs ml-2">
                        ({selectedVisit.service.expectedDuration} mins)
                      </span>
                    )}
                  </div>

                  {/* 5. Current Stage, Next Stage in 1 line */}
                  <div className="text-sm text-on-surface dark:text-zinc-300 flex items-center gap-x-4 gap-y-1.5 flex-wrap py-1">
                    <div>
                      <span className="text-outline">Current stage: </span>
                      <span className="font-semibold text-primary dark:text-sky-400 text-sm">
                        {stepProgression.current?.name ||
                          (isInService
                            ? "In Service"
                            : isWaiting
                              ? "Waiting / Checked In"
                              : selectedVisit.currentState.replace(/_/g, " "))}
                      </span>
                      {stepProgression.totalSteps > 1 && (
                        <span className="text-outline text-xs ml-1">
                          ({(stepProgression.activeIndex ?? 0) + 1}/
                          {stepProgression.totalSteps})
                        </span>
                      )}
                    </div>
                    {stepProgression.next && (
                      <div>
                        <span className="text-outline">Next stage: </span>
                        <span className="font-semibold text-on-surface dark:text-zinc-200 text-sm">
                          {stepProgression.next.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 5b. Stage duration timer + overdue alert (IN_SERVICE only) */}
                  {isInService &&
                    stepProgression.current &&
                    (() => {
                      const svcStart = selectedVisit.serviceStart
                        ? new Date(selectedVisit.serviceStart).getTime()
                        : Date.now();
                      const stageStart = stepProgression.current.activatedAt
                        ? new Date(
                            stepProgression.current.activatedAt,
                          ).getTime()
                        : svcStart;
                      const stageSecs = Math.max(
                        0,
                        Math.floor(
                          (Date.now() +
                            serviceDurationSeconds * 0 -
                            stageStart) /
                            1000,
                        ),
                      );
                      const stageEstMins =
                        stepProgression.current.templateStep
                          ?.expectedDuration ||
                        stepProgression.current.expectedDuration ||
                        null;
                      const stageOverdue =
                        stageEstMins && stageSecs > stageEstMins * 60;
                      return (
                        <div
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${
                            stageOverdue
                              ? "bg-rose-500/10 border-rose-400/30 text-rose-700 dark:text-rose-400"
                              : "bg-surface-container dark:bg-inverse-surface border-border dark:border-dark-border text-outline"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Stage time:{" "}
                            <strong className="font-mono">
                              {formatDuration(stageSecs)}
                            </strong>
                            {stageEstMins && (
                              <span className="ml-1">
                                / {stageEstMins}m allowed
                              </span>
                            )}
                          </span>
                          {stageOverdue && (
                            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-white px-1.5 py-0.5 rounded animate-pulse">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      );
                    })()}

                  {/* 6. Cancel Visit, Announce, and Start / Complete Action Buttons */}
                  <div className="flex items-center gap-2.5 pt-1.5 flex-wrap">
                    {["COMPLETED", "CANCELLED", "NO_SHOW"].includes(
                      selectedVisit.currentState,
                    ) ? (
                      <div className="flex-1 text-center py-2 text-xs md:text-sm font-semibold text-outline">
                        {selectedVisit.currentState === "COMPLETED"
                          ? "✓ Visit completed"
                          : selectedVisit.currentState === "CANCELLED"
                            ? "✕ Visit cancelled"
                            : "✕ Marked as No-Show"}
                      </div>
                    ) : !isInService ? (
                      <>
                        <button
                          onClick={() => {
                            setCancelReasonCategory("CUSTOMER_REQUEST");
                            setCancelCustomNotes("");
                            setCancelRefundApplicable(false);
                            setCancelConfirmText("");
                            setCancelModalVisit(selectedVisit);
                          }}
                          className="px-3 py-2 rounded-xl font-bold text-xs md:text-sm border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.99] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                          title="Cancel this appointment / visit ticket"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel Visit
                        </button>

                        <button
                          onClick={() => handleAnnounce(selectedVisit.id)}
                          disabled={announceLoadingId === selectedVisit.id}
                          className="px-3.5 py-2 rounded-xl font-bold text-xs md:text-sm bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.99] cursor-pointer shrink-0"
                          title="Announce customer on TV display & WhatsApp"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            campaign
                          </span>
                          {announceLoadingId === selectedVisit.id
                            ? "Calling..."
                            : "Announce"}
                        </button>

                        <button
                          onClick={() => {
                            if (selectedVisit.isToken) {
                              handleStart(selectedVisit.id, undefined, true);
                            } else {
                              setStartServiceModal(selectedVisit);
                            }
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
                          title="Start service for customer"
                        >
                          <Play className="w-4 h-4" />
                          Start Service
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCancelReasonCategory("CUSTOMER_REQUEST");
                              setCancelCustomNotes("");
                              setCancelRefundApplicable(false);
                              setCancelConfirmText("");
                              setCancelModalVisit(selectedVisit);
                            }}
                            className="flex-1 px-3 py-2 rounded-xl font-bold text-xs md:text-sm border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.99] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            title="Cancel this visit"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel Visit
                          </button>

                          <button
                            onClick={() => handleAnnounce(selectedVisit.id)}
                            disabled={announceLoadingId === selectedVisit.id}
                            className="flex-1 px-3 py-2 rounded-xl font-bold text-xs md:text-sm bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.99] cursor-pointer"
                            title="Recall customer name on TV display"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              campaign
                            </span>
                            {announceLoadingId === selectedVisit.id
                              ? "Calling..."
                              : "Announce"}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {stepProgression.next && (
                            <button
                              onClick={() => setStageModalVisit(selectedVisit)}
                              className="flex-1 bg-sky-600 hover:bg-sky-500 text-white py-2.5 px-3 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
                              title="Advance to next journey stage"
                            >
                              <ArrowRight className="w-4 h-4" />
                              Advance Stage
                            </button>
                          )}

                          <button
                            onClick={(e) =>
                              handleComplete(
                                selectedVisit.id,
                                e,
                                selectedVisit.isToken,
                              )
                            }
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-3 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.99] cursor-pointer"
                            title={
                              stepProgression.next
                                ? "Complete entire visit now (skips remaining stages)"
                                : "Complete visit"
                            }
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Complete Visit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 7. Provider Assignment (Compact) */}
                  <div className="flex items-center gap-2.5 text-sm pt-1">
                    <span className="text-outline whitespace-nowrap text-sm font-medium">
                      {industry.providerView.providerAssignLabel}:
                    </span>
                    <select
                      value={selectedVisit.resourceId || ""}
                      onChange={(e) =>
                        updateVisitMutation.mutate({
                          id: selectedVisit.id,
                          resourceId: e.target.value,
                        })
                      }
                      className="bg-surface-container dark:bg-zinc-800 border border-border dark:border-dark-border rounded-lg text-sm py-1.5 px-2.5 flex-1 outline-none text-on-surface dark:text-white"
                    >
                      <option value="">
                        {industry.providerView.unassignedLabel}
                      </option>
                      {resources.map((r: AnyFixMe) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 8. Staff Private Notes */}
                  <div className="pt-1">
                    <InlineNotes
                      visitId={selectedVisit.id}
                      initialNotes={selectedVisit.notes}
                      placeholder={industry.terminology.notesPlaceholder}
                    />
                  </div>

                  {/* 9. Booking Form Responses (compact lines, if any) */}
                  {selectedVisit.formResponses &&
                    Object.keys(selectedVisit.formResponses).length > 0 && (
                      <div className="pt-1.5 text-sm border-t border-border/40">
                        <span className="text-xs font-semibold text-outline uppercase tracking-wider block mb-1.5">
                          Booking Questions:
                        </span>
                        <div className="space-y-1.5">
                          {Object.entries(selectedVisit.formResponses).map(
                            ([key, val]) => {
                              if (
                                val === null ||
                                val === undefined ||
                                String(val).trim() === ""
                              )
                                return null;
                              const label = key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (s: string) => s.toUpperCase())
                                .trim();
                              return (
                                <div
                                  key={key}
                                  className="flex items-baseline gap-2 text-sm leading-relaxed"
                                >
                                  <span className="text-outline">{label}:</span>
                                  <span className="font-medium text-on-surface dark:text-white truncate">
                                    {typeof val === "boolean"
                                      ? val
                                        ? "Yes"
                                        : "No"
                                      : String(val)}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}

                  {/* Active Payment Step Builder */}
                  {(() => {
                    const activePaymentStep = selectedVisit?.itinerary?.find(
                      (s: any) =>
                        (s.status === "IN_PROGRESS" || s.status === "QUEUED") &&
                        s.type === "PAYMENT",
                    );
                    if (!activePaymentStep) return null;

                    return (
                      <div className="p-3 border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/20 rounded-xl text-xs">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">
                            payments
                          </span>
                          Payment Required (Workflow Step)
                        </h4>

                        <InvoiceBuilder
                          visitId={selectedVisit.id}
                          visitStepId={activePaymentStep.id}
                          tenant={tenant}
                          onLinkGenerated={(link) => setPaymentLink(link)}
                          existingLink={paymentLink}
                        />

                        {paymentLink && (
                          <div className="flex flex-col items-center justify-center space-y-3 py-2 mt-3 border-t border-blue-200 dark:border-blue-800 pt-3">
                            <div className="bg-white p-2 rounded-lg shadow-xs">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(paymentLink)}`}
                                alt="Payment QR"
                                className="w-24 h-24"
                              />
                            </div>
                            <div className="flex gap-2 w-full">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(paymentLink);
                                  toast.success("Link copied to clipboard!");
                                }}
                                className="flex-1 bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-300 px-2 py-1.5 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold"
                              >
                                Copy Link
                              </button>
                              <a
                                href={`https://wa.me/${selectedVisit?.customer?.phone?.replace(/\D/g, "") || ""}?text=${encodeURIComponent(`Here is your secure payment link: ${paymentLink}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1.5 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1"
                              >
                                WhatsApp
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── Structured Payment Section ─ */}
                  {(() => {
                    const succeededPayment =
                      selectedVisit?.bookingPayments?.find(
                        (p: any) => p.status === "SUCCEEDED",
                      );
                    const pendingPayment = selectedVisit?.bookingPayments?.find(
                      (p: any) => p.status === "PENDING",
                    );
                    const isPendingPaymentState =
                      selectedVisit?.currentState === "PENDING_PAYMENT";
                    const basePrice = selectedVisit?.service?.basePrice || 0;
                    const priceCurrency =
                      selectedVisit?.service?.priceCurrency || "ZAR";
                    const flow = selectedVisit?.service?.serviceFlow;
                    const paymentTiming = flow?.paymentTiming || "NONE";
                    const checkinPayMode = flow?.checkinPayMode || "BOTH";

                    const hasPaymentObligation =
                      basePrice > 0 && paymentTiming !== "NONE";
                    if (
                      !succeededPayment &&
                      !pendingPayment &&
                      !isPendingPaymentState &&
                      !hasPaymentObligation
                    ) {
                      return null;
                    }

                    const amount = succeededPayment
                      ? succeededPayment.amount
                      : pendingPayment
                        ? pendingPayment.amount
                        : basePrice;
                    const currency = succeededPayment
                      ? succeededPayment.currency
                      : pendingPayment
                        ? pendingPayment.currency
                        : priceCurrency;

                    const markAsPaid = async (
                      method: "CASH" | "CARD_TERMINAL" | "EFT",
                    ) => {
                      try {
                        if (pendingPayment) {
                          await fetchApi(
                            `/tenant-payments/public/payment/${pendingPayment.id}/complete`,
                            {
                              method: "POST",
                              body: JSON.stringify({ method }),
                            },
                          );
                        } else {
                          await fetchApi(`/tenant-payments/manual`, {
                            method: "POST",
                            body: JSON.stringify({
                              visitId: selectedVisit.id,
                              amount,
                              method,
                            }),
                          });
                        }
                        queryClient.invalidateQueries({ queryKey: ["visits"] });
                        toast.success(
                          `Payment marked as paid (${method === "CASH" ? "Cash" : "Card/POS"})!`,
                        );
                        setSelectedVisit((prev: any) =>
                          prev
                            ? {
                                ...prev,
                                currentState:
                                  prev.currentState === "PENDING_PAYMENT"
                                    ? "WAITING"
                                    : prev.currentState,
                                bookingPayments: [
                                  ...(prev.bookingPayments || []).filter(
                                    (p: any) => p.status !== "PENDING",
                                  ),
                                  {
                                    id: "temp-" + Date.now(),
                                    status: "SUCCEEDED",
                                    amount,
                                    currency,
                                    method,
                                    createdAt: new Date().toISOString(),
                                  },
                                ],
                              }
                            : null,
                        );
                      } catch (e: any) {
                        toast.error(e.message || "Failed to update payment");
                      }
                    };

                    return (
                      <div className="p-3.5 border border-border/80 dark:border-white/10 bg-surface-container-low dark:bg-zinc-900/60 rounded-xl space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              payments
                            </span>
                            <span>Payment</span>
                          </div>
                          {succeededPayment ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                          ) : isPendingPaymentState || pendingPayment ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{" "}
                              Payment Due
                            </span>
                          ) : checkinPayMode === "COUNTER_ONLY" ||
                            paymentTiming === "CHECKOUT" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              Pay at Counter
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              Unpaid
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 py-2 border-y border-border/50 dark:border-white/5 text-[11px]">
                          <div>
                            <span className="text-zinc-400 block text-[10px] uppercase font-semibold">
                              Amount
                            </span>
                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                              {currency} {(amount / 100).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px] uppercase font-semibold">
                              Method
                            </span>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                              {succeededPayment
                                ? succeededPayment.method === "CARD_TERMINAL"
                                  ? "Card Machine (POS)"
                                  : succeededPayment.method === "CASH"
                                    ? "Cash"
                                    : succeededPayment.method === "EFT"
                                      ? "EFT / Bank"
                                      : succeededPayment.method ||
                                        succeededPayment.stripePaymentMethodType ||
                                        "Online"
                                : checkinPayMode === "COUNTER_ONLY"
                                  ? "Counter Only"
                                  : checkinPayMode === "STRIPE_ONLY"
                                    ? "Stripe Online"
                                    : "Stripe or Counter"}
                            </span>
                          </div>
                        </div>

                        {succeededPayment && (succeededPayment.proofUrl || (succeededPayment.description && succeededPayment.description !== "Manual Payment at Counter")) && (
                          <div className="py-1 px-2 rounded-lg bg-surface-container/60 dark:bg-zinc-800/40 border border-border/40 dark:border-white/5 text-[11px] space-y-0.5">
                            {succeededPayment.proofUrl && (
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-400 font-semibold uppercase">Ref / Slip:</span>
                                <span className="font-mono font-bold text-zinc-700 dark:text-zinc-200">{succeededPayment.proofUrl}</span>
                              </div>
                            )}
                            {succeededPayment.description && succeededPayment.description !== "Manual Payment at Counter" && (
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                {succeededPayment.description}
                              </div>
                            )}
                          </div>
                        )}

                        {succeededPayment ? (
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-zinc-500 text-[11px]">
                              Payment recorded successfully
                            </span>
                            <button
                              onClick={() =>
                                setShowInvoiceForVisit(selectedVisit.id)
                              }
                              className="bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border border-border dark:border-white/10 transition-colors shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-zinc-500" />{" "}
                              View Invoice
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5 pt-0.5">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  setRecordPaymentModalState({
                                    isOpen: true,
                                    initialMethod: "CASH",
                                    amount,
                                    currency,
                                    visit: selectedVisit,
                                    pendingPaymentId: pendingPayment?.id,
                                  })
                                }
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Cash
                              </button>
                              <button
                                onClick={() =>
                                  setRecordPaymentModalState({
                                    isOpen: true,
                                    initialMethod: "CARD_TERMINAL",
                                    amount,
                                    currency,
                                    visit: selectedVisit,
                                    pendingPaymentId: pendingPayment?.id,
                                  })
                                }
                                className="w-full bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1.5 rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> Card /
                                POS
                              </button>
                            </div>
                            <p className="text-[10px] text-zinc-400 text-center">
                              Confirm payment with slip/reference & send receipt on WhatsApp.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* ── Bottom Section: Height-Adjustable Collapsible WhatsApp Chat Area ─ */}
                {isChatOpen ? (
                  <div
                    style={{
                      height: chatExpanded
                        ? "calc(100% - 46px)"
                        : `${chatHeight}px`,
                      maxHeight: "100%",
                    }}
                    className="flex flex-col border-t border-border dark:border-dark-border bg-surface dark:bg-dark-card shrink-0 relative transition-[height] duration-150 ease-out z-10"
                  >
                    {/* Drag Resizer Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsDraggingChat(true);
                        if (chatExpanded) setChatExpanded(false);
                      }}
                      onDoubleClick={() => setChatExpanded(!chatExpanded)}
                      className="group absolute -top-1.5 left-0 right-0 h-3 cursor-row-resize flex items-center justify-center z-30 select-none hover:bg-emerald-500/10"
                      title="Drag up or down to resize chat (Double-click to maximize/restore)"
                    >
                      <div className="w-12 h-1 rounded-full bg-border/80 group-hover:bg-emerald-500 transition-colors" />
                    </div>

                    {/* Chat Sub-heading */}
                    <div className="px-3 py-2 bg-surface-container/80 dark:bg-zinc-900/80 border-b border-border dark:border-dark-border flex items-center justify-between text-xs select-none shrink-0">
                      <div className="flex items-center gap-2 font-semibold text-on-surface dark:text-white">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold tracking-tight text-xs">
                          Chat
                        </span>
                        {selectedVisit.customer?.phone && (
                          <span className="text-[10px] text-outline font-mono">
                            {selectedVisit.customer.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setChatExpanded(!chatExpanded)}
                          className="p-1 text-outline hover:text-on-surface dark:hover:text-white rounded hover:bg-surface-container transition-colors"
                          title={
                            chatExpanded
                              ? "Restore chat size"
                              : "Expand chat over details"
                          }
                        >
                          {chatExpanded ? (
                            <Minimize2 className="w-3.5 h-3.5" />
                          ) : (
                            <Maximize2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <Link
                          href={`/dashboard/inbox?phone=${encodeURIComponent(selectedVisit.customer?.phone || "")}`}
                          className="p-1 text-outline hover:text-primary rounded hover:bg-surface-container transition-colors flex items-center gap-1 text-[11px] font-medium"
                          title="Open in Full Inbox Page"
                        >
                          <span>Inbox</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setIsChatOpen(false)}
                          className="p-1 text-outline hover:text-on-surface dark:hover:text-white rounded hover:bg-surface-container transition-colors"
                          title="Collapse chat panel"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-hidden">
                      {plan.isFeatureEnabled("whatsappChat") ? (
                        tenant?.whatsappConnected ? (
                          <WhatsAppChatPanel
                            tokenId={selectedVisit.id}
                            customerName={selectedVisit.customer?.name}
                            customerPhone={selectedVisit.customer?.phone}
                            queueName={selectedVisit.service?.name}
                            hideHeader={true}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-2">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                            <h4 className="text-xs font-bold text-on-surface dark:text-white">
                              WhatsApp Disconnected
                            </h4>
                            <p className="text-[11px] text-outline">
                              Connect WhatsApp to chat with customers directly.
                            </p>
                            <Link
                              href="/dashboard/settings/integrations"
                              className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg font-bold"
                            >
                              Connect WhatsApp
                            </Link>
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-2">
                          <span className="material-symbols-outlined text-[24px] text-outline">
                            lock
                          </span>
                          <h4 className="text-xs font-bold text-on-surface dark:text-white">
                            Chat Locked
                          </h4>
                          <Link
                            href="/dashboard/settings/billing"
                            className="bg-surface-container-high text-xs px-3 py-1.5 rounded-lg font-bold border border-border"
                          >
                            Upgrade Plan
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 border-t border-border dark:border-dark-border bg-surface-container/40 dark:bg-zinc-900/40 flex items-center justify-between shrink-0">
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="flex items-center gap-2 text-xs font-semibold text-on-surface dark:text-white hover:text-primary transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Chat with{" "}
                        {selectedVisit.customer?.name?.split(" ")[0] ||
                          "Customer"}
                      </span>
                      <ChevronUp className="w-3.5 h-3.5 text-outline ml-0.5" />
                    </button>
                    <Link
                      href={`/dashboard/inbox?phone=${encodeURIComponent(selectedVisit.customer?.phone || "")}`}
                      className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Full Inbox</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </section>
            );
          })()}
      </div>

      <CreateVisitModal
        isOpen={isVisitModalOpen}
        onClose={() => setIsVisitModalOpen(false)}
      />
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={async (data) => {
          setIsScannerOpen(false);
          const found =
            visits.find((v: AnyFixMe) => v.id === data.tokenId) ||
            queueTokens.find((t: AnyFixMe) => t.id === data.tokenId);
          if (found) {
            setSelectedVisit(found);
            if (
              ["WAITING", "CHECKED_IN", "SCHEDULED"].includes(
                found.currentState,
              )
            ) {
              try {
                await handleStart(found.id, undefined, found.isToken);
                toast.success(
                  `QR verified! Service started for ${found.customer?.name || "Customer"}.`,
                );
              } catch {}
            }
          } else {
            setSelectedVisit({
              id: data.tokenId || "UNKNOWN",
              customer: { name: data.customerName, phone: data.phone },
              service: { name: data.queueName || data.serviceBooked },
              source: data.isAppointment ? "APPOINTMENT" : "WALK_IN",
              currentState: data.status,
              ticketNumber: data.tokenId
                ? `#TKT-${data.tokenId.substring(0, 4)}`
                : "",
            });
          }
        }}
      />
      <CheckoutBillModal
        isOpen={!!checkoutBill && !!checkoutVisit}
        bill={checkoutBill}
        customerName={checkoutVisit?.name}
        customerPhone={checkoutVisit?.phone}
        tenantId={tenant?.id}
        tenantSubdomain={tenant?.subdomain}
        onBillChange={setCheckoutBill}
        onClose={() => {
          setCheckoutBill(null);
          setCheckoutVisit(null);
        }}
        onSettled={async ({ allowUnpaid }) => {
          if (!checkoutVisit) return;
          try {
            await finalizeComplete(
              checkoutVisit.id,
              checkoutVisit.isToken,
              allowUnpaid,
            );
            toast.success("Service completed");
          } catch (err: any) {
            toast.error(err?.message || "Failed to complete");
          } finally {
            setCheckoutBill(null);
            setCheckoutVisit(null);
          }
        }}
      />
      <InvoiceModal
        isOpen={!!showInvoiceForVisit}
        visitId={showInvoiceForVisit}
        onClose={() => setShowInvoiceForVisit(null)}
      />
      <RecordPaymentModal
        isOpen={recordPaymentModalState.isOpen}
        onClose={() =>
          setRecordPaymentModalState((prev) => ({ ...prev, isOpen: false }))
        }
        visit={recordPaymentModalState.visit}
        amount={recordPaymentModalState.amount}
        currency={recordPaymentModalState.currency}
        initialMethod={recordPaymentModalState.initialMethod}
        onConfirm={async (data) => {
          const visitId = recordPaymentModalState.visit?.id;
          const pendingId = recordPaymentModalState.pendingPaymentId;
          if (pendingId) {
            await fetchApi(
              `/tenant-payments/public/payment/${pendingId}/complete`,
              {
                method: "POST",
                body: JSON.stringify({
                  method: data.method,
                  proofUrl: data.proofUrl,
                  description: data.description,
                  sendWhatsAppReceipt: data.sendReceipt,
                }),
              },
            );
          } else if (visitId) {
            await fetchApi(`/tenant-payments/manual`, {
              method: "POST",
              body: JSON.stringify({
                visitId,
                amount: recordPaymentModalState.amount,
                method: data.method,
                proofUrl: data.proofUrl,
                description: data.description,
                sendWhatsAppReceipt: data.sendReceipt,
              }),
            });
          }
          queryClient.invalidateQueries({ queryKey: ["visits"] });
          if (visitId) {
            queryClient.invalidateQueries({ queryKey: ["messages", visitId] });
          }
          const methodDisplay =
            data.method === "CASH"
              ? "Cash"
              : data.method === "CARD_TERMINAL"
                ? "Card/POS"
                : data.method;
          const phone = recordPaymentModalState.visit?.customer?.phone;
          toast.success(
            `Payment recorded (${methodDisplay})${data.sendReceipt && phone ? " & receipt sent on WhatsApp!" : "!"}`,
          );
          setSelectedVisit((prev: any) =>
            prev
              ? {
                  ...prev,
                  currentState:
                    prev.currentState === "PENDING_PAYMENT"
                      ? "WAITING"
                      : prev.currentState,
                  bookingPayments: [
                    ...(prev.bookingPayments || []).filter(
                      (p: any) => p.status !== "PENDING",
                    ),
                    {
                      id: "temp-" + Date.now(),
                      status: "SUCCEEDED",
                      amount: recordPaymentModalState.amount,
                      currency: recordPaymentModalState.currency,
                      method: data.method,
                      proofUrl: data.proofUrl,
                      description: data.description,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                }
              : null,
          );
        }}
      />
      <CompleteStageModal
        isOpen={!!stageModalVisit}
        onClose={() => setStageModalVisit(null)}
        visit={stageModalVisit}
        currentStep={
          stageModalVisit ? getStepProgression(stageModalVisit).current : null
        }
        nextStep={
          stageModalVisit ? getStepProgression(stageModalVisit).next : null
        }
        timeInService={formatDuration(serviceDurationSeconds)}
        onConfirmAdvance={async (outcome?: string) => {
          if (!stageModalVisit) return;
          const prog = getStepProgression(stageModalVisit);
          if (prog.current?.id) {
            await handleAdvanceStep(
              stageModalVisit.id,
              prog.current.id,
              outcome || "COMPLETED",
            );
          }
        }}
        onConfirmCompleteVisit={async () => {
          if (!stageModalVisit) return;
          await finalizeComplete(stageModalVisit.id, stageModalVisit.isToken);
        }}
      />

      {/* ── Cancel Booking / Visit Modal ─────────────────────────────── */}
      {cancelModalVisit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high dark:bg-zinc-800 border border-border dark:border-zinc-700 text-on-surface dark:text-zinc-200 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 text-outline" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface dark:text-white leading-tight">
                    Cancel Booking / Visit
                  </h3>
                  <p className="text-xs text-outline mt-0.5">
                    Customer:{" "}
                    <span className="font-semibold text-on-surface dark:text-zinc-200">
                      {cancelModalVisit.customer?.name || "Walk-in"}
                    </span>{" "}
                    • Ticket:{" "}
                    <span className="font-mono font-bold text-primary">
                      {cancelModalVisit.displayId ||
                        cancelModalVisit.ticketNumber ||
                        `#TKT-${cancelModalVisit.id.substring(0, 4)}`}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCancelModalVisit(null)}
                className="p-1.5 text-outline hover:text-on-surface dark:hover:text-white rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            {/* Select Reason Category */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface dark:text-zinc-300 uppercase tracking-wider">
                Select Cancellation Reason *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CANCELLATION_REASONS.map((reason) => {
                  const isSelected = cancelReasonCategory === reason.id;
                  return (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => setCancelReasonCategory(reason.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary dark:text-sky-400 font-semibold shadow-xs"
                          : "bg-surface-container/50 dark:bg-zinc-800/50 border-border/70 text-outline hover:border-border hover:text-on-surface dark:hover:text-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px] shrink-0">
                        {reason.icon}
                      </span>
                      <span className="leading-tight">{reason.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Required Explanation Textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface dark:text-zinc-300 flex items-center justify-between">
                <span>Cancellation Reason & Explanation *</span>
                <span className="text-[10px] font-medium text-outline">
                  Required
                </span>
              </label>
              <textarea
                value={cancelCustomNotes}
                onChange={(e) => setCancelCustomNotes(e.target.value)}
                placeholder="Enter detailed explanation. This note is recorded in audit logs and sent directly to the customer in their cancellation message."
                rows={3}
                className="w-full bg-surface-container/40 dark:bg-zinc-800/40 border border-border dark:border-zinc-700 rounded-xl p-3 text-xs text-on-surface dark:text-white outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            {/* Refund Applicable Checkbox */}
            <label className="flex items-start gap-3 p-3 bg-surface-container/40 dark:bg-zinc-800/40 border border-border/70 dark:border-zinc-800 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={cancelRefundApplicable}
                onChange={(e) => setCancelRefundApplicable(e.target.checked)}
                className="mt-0.5 rounded border-border dark:border-zinc-700 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <div className="flex flex-col text-xs">
                <span className="font-bold text-on-surface dark:text-white">
                  Payment Refund Applicable
                </span>
                <span className="text-outline text-[11px]">
                  Flags this booking for financial refund. Customer will be
                  notified that their refund is being processed.
                </span>
              </div>
            </label>

            {/* Confirm Type Section */}
            <div className="p-3 bg-surface-container-high/60 dark:bg-zinc-800/60 border border-border dark:border-zinc-700 rounded-xl flex flex-col gap-2">
              <div className="text-xs text-on-surface dark:text-zinc-200 font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-outline" />
                <span>
                  Type <strong>CANCEL</strong> below to confirm cancellation:
                </span>
              </div>
              <input
                type="text"
                value={cancelConfirmText}
                onChange={(e) => setCancelConfirmText(e.target.value)}
                placeholder="Type CANCEL"
                className="w-full bg-card dark:bg-zinc-900 border border-border dark:border-zinc-700 focus:border-primary rounded-lg p-2 text-xs font-mono font-bold text-on-surface dark:text-white outline-none uppercase"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setCancelModalVisit(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:text-on-surface dark:hover:text-white hover:bg-surface-container transition-colors cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={
                  isCancelling ||
                  !cancelCustomNotes.trim() ||
                  cancelConfirmText.trim().toUpperCase() !== "CANCEL"
                }
                onClick={handleConfirmCancelVisit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {isCancelling ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Confirm & Cancel Booking
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── No-Show Confirmation Dialog ─────────────────────────────── */}
      {noShowConfirmVisit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface dark:text-white">
                  Mark as No-Show?
                </h3>
                <p className="text-xs text-outline">
                  Ticket{" "}
                  <span className="font-mono font-bold text-primary">
                    {noShowConfirmVisit.displayId ||
                      noShowConfirmVisit.ticketNumber ||
                      `#TKT-${noShowConfirmVisit.id.substring(0, 4)}`}
                  </span>{" "}
                  • {noShowConfirmVisit.customer?.name || "Walk-in"}
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface/80 dark:text-zinc-300 leading-relaxed">
              This customer did not arrive and their ticket QR was never
              scanned. Marking as No-Show will close this ticket, release their
              queue slot, and record no-show metrics in analytics.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setNoShowConfirmVisit(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-surface-container transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={isMarkingNoShow}
                onClick={() => handleConfirmNoShow(noShowConfirmVisit)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {isMarkingNoShow ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4" />
                    Confirm No-Show
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Start Service Verification Modal ─────────────────────────────── */}
      {startServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Play className="w-5 h-5 fill-primary/20" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface dark:text-white leading-tight">
                    Start Service
                  </h3>
                  <p className="text-xs text-outline mt-0.5">
                    Ticket{" "}
                    <span className="font-mono font-bold text-primary">
                      {startServiceModal.displayId ||
                        startServiceModal.ticketNumber ||
                        `#TKT-${startServiceModal.id.substring(0, 4)}`}
                    </span>{" "}
                    • {startServiceModal.customer?.name || "Walk-in"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStartServiceModal(null)}
                className="p-1.5 text-outline hover:text-on-surface dark:hover:text-white rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Service & Details Info */}
            <div className="bg-surface-container/50 dark:bg-zinc-800/40 rounded-xl p-3 border border-border/70 dark:border-zinc-800 flex flex-col gap-1 text-xs">
              <div className="flex justify-between text-on-surface dark:text-zinc-200">
                <span className="text-outline">Service:</span>
                <span className="font-semibold">
                  {startServiceModal.service?.name || "Standard Service"}
                </span>
              </div>
              {startServiceModal.scheduledTime && (
                <div className="flex justify-between text-on-surface dark:text-zinc-200">
                  <span className="text-outline">Slot:</span>
                  <span className="font-semibold">
                    {formatAppointmentTime(startServiceModal.scheduledTime)}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-on-surface/80 dark:text-zinc-300 leading-relaxed">
              Choose how you would like to begin service for this customer.
              Scanning the customer ticket QR verifies physical presence.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setStartServiceModal(null);
                  setIsScannerOpen(true);
                }}
                className="w-full py-3 px-4 rounded-xl text-xs md:text-sm font-bold text-white bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <ScanLine className="w-4 h-4" />
                Scan QR to Verify & Start
              </button>

              <button
                type="button"
                disabled={startServiceLoading}
                onClick={async (e) => {
                  try {
                    setStartServiceLoading(true);
                    await handleStart(
                      startServiceModal.id,
                      e,
                      startServiceModal.isToken,
                    );
                    setStartServiceModal(null);
                  } catch (err: any) {
                    console.error("Failed to start service without scan:", err);
                  } finally {
                    setStartServiceLoading(false);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl text-xs md:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
              >
                {startServiceLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting Service...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Without Scan (Manual Override)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStartServiceModal(null)}
                className="w-full py-2 text-xs font-semibold text-outline hover:text-on-surface dark:hover:text-white transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!completeConfirmData}
        onClose={() => setCompleteConfirmData(null)}
        onConfirm={executeFinalizeComplete}
        title={completeConfirmData?.title || "Complete Visit"}
        description={completeConfirmData?.message || "Are you sure you want to complete this visit?"}
        confirmText={completeConfirmData?.isEarly ? "Complete Early" : "Complete Visit"}
        variant={completeConfirmData?.isEarly ? "warning" : "primary"}
        isLoading={isCompletingVisit}
      />
    </AdminLayout>
  );
}
