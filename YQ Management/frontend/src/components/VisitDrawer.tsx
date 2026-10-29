import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  X,
  Play,
  CheckCircle2,
  Calendar,
  Hash,
  ExternalLink,
  Sparkles,
  Copy,
  Users,
  Clock,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  UserX,
  XCircle,
  ShieldAlert,
  Star,
} from 'lucide-react';
import { fetchApi } from '../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const CANCELLATION_REASONS = [
  { id: 'CUSTOMER_REQUEST', label: 'Customer Requested Cancellation', icon: 'person_remove' },
  { id: 'NO_SHOW', label: 'Customer No-Show / Did Not Arrive', icon: 'person_off' },
  { id: 'EMERGENCY', label: 'Staff Emergency / Unforeseen Closure', icon: 'warning' },
  { id: 'OVERBOOKED', label: 'Overbooked / Capacity Exceeded', icon: 'groups' },
  { id: 'SCHEDULE_CONFLICT', label: 'Scheduling Conflict', icon: 'event_busy' },
  { id: 'OTHER', label: 'Other Operational Reason', icon: 'info' },
];

interface VisitDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  visit: AnyFixMe | null;
}

const formatDateTime = (dateStr?: string | Date | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const datePart = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
};

export function VisitDrawer({ isOpen, onClose, visit }: VisitDrawerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Local state for tags & notes to ensure immediate optimistic UI updates
  const [renderTime] = useState(() => Date.now());
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [notesInput, setNotesInput] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReasonCategory, setCancelReasonCategory] = useState('CUSTOMER_REQUEST');
  const [cancelCustomNotes, setCancelCustomNotes] = useState('');
  const [cancelRefundApplicable, setCancelRefundApplicable] = useState(false);
  const [cancelConfirmText, setCancelConfirmText] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // No-Show Confirmation State
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [isMarkingNoShow, setIsMarkingNoShow] = useState(false);

  // Sync state whenever visit or open state changes
  useEffect(() => {
    if (visit) {
      setLocalTags(Array.isArray(visit.tags) ? visit.tags : []);
      setNotesInput(visit.notes || '');
    }
  }, [visit?.id, visit?.notes, visit?.tags, isOpen]);

  // Reset modal states when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditingTags(false);
      setIsCancelModalOpen(false);
      setIsNoShowModalOpen(false);
      setCancelCustomNotes('');
      setCancelConfirmText('');
      setCancelRefundApplicable(false);
    }
  }, [isOpen]);

  // Mutations
  const startMutation = useMutation({
    mutationFn: () => fetchApi(`/visits/${visit?.id}/start`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-view'] });
      toast.success('Service started');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to start service'),
  });

  const completeMutation = useMutation({
    mutationFn: () => fetchApi(`/visits/${visit?.id}/complete`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-view'] });
      toast.success('Visit completed');
      onClose();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to complete service'),
  });

  const updateTagsMutation = useMutation({
    mutationFn: (tags: string[]) => {
      const endpoint = visit?._type === 'Appointment' && !visit?.queueId
        ? `/appointments/${visit?.id}`
        : `/visits/${visit?.id}/tags`;
      const body = visit?._type === 'Appointment' && !visit?.queueId
        ? JSON.stringify({ tags })
        : JSON.stringify({ tags });
      return fetchApi(endpoint, { method: 'PATCH', body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-view'] });
      toast.success('Tags updated');
    },
    onError: (err: any) => {
      // Revert on error
      if (visit) setLocalTags(Array.isArray(visit.tags) ? visit.tags : []);
      toast.error(err?.message || 'Failed to update tags');
    },
  });

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (localTags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    const newTags = [...localTags, trimmed];
    setLocalTags(newTags);
    if (visit) visit.tags = newTags;
    setTagInput('');
    updateTagsMutation.mutate(newTags);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = localTags.filter((t) => t !== tagToRemove);
    setLocalTags(newTags);
    if (visit) visit.tags = newTags;
    updateTagsMutation.mutate(newTags);
  };

  const handleSaveNotes = async () => {
    if (!visit) return;
    const trimmed = notesInput.trim();
    if (trimmed === (visit.notes || '').trim()) return;

    setIsSavingNotes(true);
    setNotesSaved(false);
    try {
      if (visit._type === 'Appointment' && !visit.queueId) {
        await fetchApi(`/appointments/${visit.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ notes: trimmed }),
        });
      } else {
        await fetchApi(`/visits/${visit.id}/notes`, {
          method: 'PATCH',
          body: JSON.stringify({ notes: trimmed }),
        });
      }
      visit.notes = trimmed;
      setNotesSaved(true);
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-view'] });
      toast.success('Notes saved');
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelCustomNotes.trim()) {
      toast.error('Please enter a cancellation explanation/reason.');
      return;
    }
    if (cancelConfirmText.trim().toUpperCase() !== 'CANCEL') {
      toast.error('Please type "CANCEL" to confirm cancellation.');
      return;
    }

    try {
      setIsCancelling(true);
      const categoryObj = CANCELLATION_REASONS.find((r) => r.id === cancelReasonCategory);
      const categoryLabel = categoryObj ? categoryObj.label : cancelReasonCategory;
      const fullReason = `${categoryLabel}: ${cancelCustomNotes.trim()}`;

      // Check if we cancel via visits endpoint or appointments endpoint
      if (visit._type === 'Appointment' && !visit.queueId) {
        await fetchApi(`/appointments/${visit.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'CANCELLED',
            notes: cancelCustomNotes.trim(),
            cancelReason: fullReason,
            refundApplicable: cancelRefundApplicable,
          }),
        });
      } else {
        await fetchApi(`/visits/${visit.id}/cancel`, {
          method: 'POST',
          body: JSON.stringify({
            cancelledBy: 'Receptionist',
            cancelReason: fullReason,
            reasonCategory: cancelReasonCategory,
            notes: cancelCustomNotes.trim(),
            refundApplicable: cancelRefundApplicable,
            customMessage: cancelCustomNotes.trim(),
          }),
        });
      }

      toast.success('Visit cancelled successfully. Notification dispatched to customer.');
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-view'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      setIsCancelModalOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel visit');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmNoShow = async () => {
    try {
      setIsMarkingNoShow(true);
      const reason = `Customer did not arrive / QR was never scanned (overdue by ${minsOverdue}m)`;

      if (visit._type === 'Appointment' && !visit.queueId) {
        await fetchApi(`/appointments/${visit.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'NO_SHOW',
            notes: reason,
            cancelReason: reason,
          }),
        });
      } else {
        await fetchApi(`/visits/${visit.id}/no-show`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        });
      }

      toast.success(`Booking marked as No-Show. Slot released.`);
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-view'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      setIsNoShowModalOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mark as No-Show');
    } finally {
      setIsMarkingNoShow(false);
    }
  };

  if (!isOpen || !visit) return null;

  const isExplicitVip = Boolean(visit?.isVip || visit?.customer?.isVip || (visit?.priority && visit.priority >= 3));
  const ticketDisplay = visit?.displayId || visit?.ticketNumber || (visit?.id ? `#TKT-${visit.id.substring(0, 4)}` : '—');

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[80] transition-opacity animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-[90] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Top Header Area: Spaced breathing layout with direct Inbox navigation */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80 space-y-2.5">
          {/* Row 1: Name, Phone & WhatsApp, Close button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-bold text-base md:text-lg text-zinc-900 dark:text-white truncate">
                {visit.customer?.name || visit.customerName || 'Walk-in Customer'}
              </span>
              {(visit.customer?.phone || visit.phone) && (
                <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300 font-mono font-medium">
                    {visit.customer?.phone || visit.phone}
                  </span>
                  <button
                    onClick={() => {
                      const ph = (visit.customer?.phone || visit.phone)?.trim();
                      if (ph) {
                        router.push(`/dashboard/inbox?phone=${encodeURIComponent(ph)}`);
                      }
                    }}
                    className="text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 p-0.5 hover:bg-emerald-500/10 rounded transition-colors inline-flex items-center"
                    title="Open conversation in Inbox"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: Ticket chip, Appt/Walk-in badge, VIP, & Current State */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                navigator.clipboard.writeText(ticketDisplay);
                toast.success(`Copied ${ticketDisplay}`);
              }}
              title="Click to copy ticket number"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-2.5 py-1 rounded-md cursor-pointer transition-colors shadow-xs"
            >
              <span>Ticket: {ticketDisplay}</span>
              <Copy className="w-3 h-3 opacity-70 hover:opacity-100" />
            </button>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                isAppt
                  ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isAppt ? 'Appointment' : 'Walk-in'}
            </span>
            {isExplicitVip && (
              <span className="inline-flex items-center gap-1 text-xs bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 px-2 py-1 rounded-md font-bold uppercase">
                <Sparkles className="w-3 h-3 text-purple-500" /> VIP
              </span>
            )}
            {(!isAppt || visit.currentState !== 'SCHEDULED') && (
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30">
                {visit.currentState.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content Body - Line-by-line layout */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3.5 flex flex-col gap-2.5">
          {/* 1. Customer Overdue Alert - Small, compact banner */}
          {isOverdue && (
            <div className="flex items-center justify-between gap-2 p-2 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs">
              <div className="flex items-center gap-1.5 min-w-0 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="font-semibold text-xs truncate">
                  Customer Overdue ({minsOverdue}m past slot) • QR Not Scanned
                </span>
              </div>
              <button
                onClick={() => setIsNoShowModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <UserX className="w-3.5 h-3.5" />
                Mark No-Show
              </button>
            </div>
          )}

          {/* 2. Schedule, People Ahead, Est. Wait Time in 1 line */}
          <div className="text-xs text-zinc-800 dark:text-zinc-300 flex items-center gap-x-3 gap-y-1 flex-wrap py-0.5">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Schedule: </span>
              <span className="font-semibold text-indigo-600 dark:text-sky-400 font-mono">
                {scheduledTimeVal ? formatDateTime(scheduledTimeVal) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Est. wait time: </span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                {isInService
                  ? 'In Service'
                  : isOverdue
                  ? '0 mins'
                  : scheduledTimeVal
                  ? `${Math.max(0, Math.round((new Date(scheduledTimeVal).getTime() - renderTime) / 60000))} mins`
                  : visit.estimatedWaitTime !== undefined && visit.estimatedWaitTime !== null
                  ? `${visit.estimatedWaitTime} mins`
                  : '0 mins'}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Source: </span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                {(visit.source || visit.bookingSource || 'ONLINE').toLowerCase().replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* 3. Service Booked in 1 line */}
          <div className="text-xs text-zinc-800 dark:text-zinc-300 py-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-zinc-500 dark:text-zinc-400">Service booked: </span>
            <span className="font-semibold text-zinc-900 dark:text-white">
              {visit.service?.name || 'General Service'}
            </span>
            {visit.service?.expectedDuration && (
              <span className="text-zinc-500 font-mono text-[11px]">
                ({visit.service.expectedDuration} mins)
              </span>
            )}
          </div>

          {/* 4. Current Stage in 1 line */}
          <div className="text-xs text-zinc-800 dark:text-zinc-300 py-0.5">
            <span className="text-zinc-500 dark:text-zinc-400">Current stage: </span>
            <span className="font-semibold text-indigo-600 dark:text-sky-400">
              {visit.currentState.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Stage Progression & Timestamps */}
          {Array.isArray(visit.steps) && visit.steps.length > 0 && (
            <div className="pt-1.5 pb-1">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Service Stages ({visit.steps.filter((s: any) => s.status === 'DONE').length}/{visit.steps.length} Completed)
                </span>
              </div>
              <div className="space-y-2">
                {visit.steps.map((st: any, sIdx: number) => {
                  const isDone = st.status === 'DONE';
                  const isActive = st.status === 'ACTIVE';
                  const startTs = st.activatedAt || st.unlockedAt;
                  const endTs = st.completedAt;
                  let durationText = '—';
                  if (startTs && endTs) {
                    const diffSecs = Math.max(0, Math.floor((new Date(endTs).getTime() - new Date(startTs).getTime()) / 1000));
                    const diffM = Math.floor(diffSecs / 60);
                    const diffS = diffSecs % 60;
                    durationText = `${diffM}m ${diffS}s`;
                  } else if (isActive && startTs) {
                    const diffSecs = Math.max(0, Math.floor((renderTime - new Date(startTs).getTime()) / 1000));
                    const diffM = Math.floor(diffSecs / 60);
                    const diffS = diffSecs % 60;
                    durationText = `${diffM}m ${diffS}s in stage`;
                  }
                  const allowedM = st.templateStep?.expectedDuration;
                  const isOverdue = allowedM && startTs && endTs && (new Date(endTs).getTime() - new Date(startTs).getTime()) > allowedM * 60000;

                  return (
                    <div
                      key={st.id || sIdx}
                      className={`p-2.5 rounded-xl border text-xs transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-500/30 text-zinc-900 dark:text-white ring-1 ring-amber-500/20'
                          : isDone
                          ? 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                          : 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/40 dark:border-zinc-800/40 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold truncate">
                          {sIdx + 1}. {st.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            isDone
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : isActive
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                              : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {st.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        <div>
                          Start: <strong className="text-zinc-700 dark:text-zinc-300">{startTs ? new Date(startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</strong>
                        </div>
                        <div>
                          End: <strong className="text-zinc-700 dark:text-zinc-300">{endTs ? new Date(endTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : (isActive ? 'Active now' : '—')}</strong>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 mt-1 border-t border-zinc-200/40 dark:border-zinc-800/40 font-mono">
                        <span>Duration: <strong className={isOverdue ? 'text-rose-500 font-bold' : 'text-zinc-700 dark:text-zinc-300'}>{durationText}</strong></span>
                        {allowedM && <span>Allowed: {allowedM}m</span>}
                      </div>
                      {st.staffNotes && (
                        <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-300 italic bg-white/40 dark:bg-black/20 p-1.5 rounded">
                          &ldquo;{st.staffNotes}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Parallel Cancel Visit and Complete / Start Buttons */}
          <div className="flex items-center gap-2 pt-1">
            {!isCompleted && !isCancelled && !isNoShow && (
              <button
                onClick={() => {
                  setCancelReasonCategory('CUSTOMER_REQUEST');
                  setCancelCustomNotes('');
                  setCancelRefundApplicable(false);
                  setCancelConfirmText('');
                  setIsCancelModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl font-bold text-xs border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.99] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
                title="Cancel this appointment / visit ticket"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Visit
              </button>
            )}

            {isWaiting && (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="px-3.5 py-2 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.99] cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                Start Service
              </button>
            )}

            {isInService && (
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Complete Visit
              </button>
            )}

            {(isCompleted || isCancelled || isNoShow) && (
              <div className="flex-1 text-center py-1.5 text-xs font-semibold text-zinc-500">
                {isCompleted ? '✓ Visit completed' : isCancelled ? '✕ Visit cancelled' : '✕ Marked as No-Show'}
              </div>
            )}
          </div>

          {/* Customer Rating & Review */}
          {visit.rating !== null && visit.rating !== undefined && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Customer Rating: {visit.rating} / 5
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${
                        s <= visit.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {visit.feedbackText && (
                <p className="text-xs text-zinc-700 dark:text-zinc-300 italic pl-2 border-l-2 border-amber-400">
                  &ldquo;{visit.feedbackText}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* 6. Notes: Interactive Line-by-Line Editor */}
          <div className="pt-0.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Notes:
              </span>
              <div className="flex items-center gap-1.5 text-[11px]">
                {isSavingNotes && (
                  <span className="text-indigo-600 dark:text-indigo-400 animate-pulse font-medium">Saving...</span>
                )}
                {notesSaved && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                {!isSavingNotes && !notesSaved && notesInput.trim() !== (visit.notes || '').trim() && (
                  <button
                    onClick={handleSaveNotes}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold text-xs cursor-pointer"
                  >
                    Save Note
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Add private staff notes for this ticket (auto-saves on blur)..."
                rows={2}
                className="w-full bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y min-h-[50px]"
              />
            </div>
          </div>

          {/* Form Responses */}
          {visit.formResponses && Object.keys(visit.formResponses).length > 0 && (
            <div className="p-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Form Responses
              </h4>
              <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
                {Object.entries(visit.formResponses).map(([key, val]) => (
                  <div key={key} className="text-sm">
                    <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-0.5">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-white">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags Section */}
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Tags & Labels
              </h4>
              <button
                onClick={() => {
                  if (isEditingTags && tagInput.trim()) {
                    handleAddTag();
                  }
                  setIsEditingTags(!isEditingTags);
                }}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold cursor-pointer"
              >
                {isEditingTags ? 'Done' : 'Edit Tags'}
              </button>
            </div>

            {isEditingTags && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag..."
                  className="flex-1 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-900 dark:text-white outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || updateTagsMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Add
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {localTags && localTags.length > 0 ? (
                localTags.map((tag: string) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800"
                  >
                    {tag}
                    {isEditingTags && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-indigo-400 hover:text-indigo-600 ml-1 cursor-pointer"
                        title="Remove tag"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))
              ) : (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">No tags assigned</span>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="p-6 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Timeline
            </h4>
            <div className="space-y-4 relative pl-3 border-l-2 border-zinc-200 dark:border-zinc-800 ml-2">
              {visit.createdAt && (
                <div className="relative pl-3">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600 ring-4 ring-white dark:ring-zinc-950" />
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">Created / Booked</p>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(visit.createdAt)}
                  </p>
                </div>
              )}
              {(visit.waitingStart || visit.checkInTime) && (
                <div className="relative pl-3">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-white dark:ring-zinc-950" />
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">Checked In / Waiting</p>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(visit.waitingStart || visit.checkInTime)}
                  </p>
                </div>
              )}
              {(visit.serviceStart || (Array.isArray(visit.steps) && visit.steps.some((s: any) => s.activatedAt))) && (
                <div className="relative pl-3">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-zinc-950" />
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">Service In Progress</p>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(
                      visit.serviceStart ||
                      (Array.isArray(visit.steps)
                        ? visit.steps.find((s: any) => s.activatedAt)?.activatedAt
                        : null)
                    )}
                  </p>
                </div>
              )}
              {visit.completedAt && (
                <div className="relative pl-3">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-zinc-950" />
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">Completed</p>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(visit.completedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer: Parallel Cancel and Complete / Start */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 shrink-0 flex items-center gap-2.5">
          {/* Parallel Cancel Button */}
          {!isCompleted && !isCancelled && (
            <button
              onClick={() => {
                setCancelReasonCategory('CUSTOMER_REQUEST');
                setCancelCustomNotes('');
                setCancelRefundApplicable(false);
                setCancelConfirmText('');
                setIsCancelModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.99] flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-xs"
              title="Cancel this appointment / visit ticket"
            >
              <XCircle className="w-4 h-4" />
              Cancel Visit
            </button>
          )}

          {/* Start Service Action */}
          {isWaiting && (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Start Service
            </button>
          )}

          {/* Complete Service Action */}
          {isInService && (
            <button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete
            </button>
          )}

          {/* Finished status label */}
          {(isCompleted || isCancelled || isNoShow) && (
            <div className="flex-1 text-center py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {isCompleted ? 'Visit completed' : isCancelled ? 'Visit cancelled' : 'Marked as No-Show'}
            </div>
          )}
        </div>
      </div>

      {/* ── Cancel Booking / Visit Modal ─────────────────────────────── */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 text-zinc-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
                    Cancel Booking / Visit
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Customer:{' '}
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {visit.customer?.name || visit.customerName || 'Walk-in'}
                    </span>{' '}
                    • Ticket:{' '}
                    <span className="font-mono font-bold text-primary dark:text-sky-400">
                      {ticketDisplay}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Reason Category */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-300 uppercase tracking-wider">
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
                          ? 'bg-primary/10 border-primary text-primary dark:text-sky-400 font-semibold shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      {reason.icon && (
                        <span className="material-symbols-outlined text-[18px] shrink-0">
                          {reason.icon}
                        </span>
                      )}
                      <span className="leading-tight">{reason.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Required Explanation Textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-300 flex items-center justify-between">
                <span>Cancellation Reason & Explanation *</span>
                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">Required</span>
              </label>
              <textarea
                value={cancelCustomNotes}
                onChange={(e) => setCancelCustomNotes(e.target.value)}
                placeholder="Enter detailed explanation. This note is recorded in audit logs and sent directly to the customer in their cancellation message."
                rows={3}
                className="w-full bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-900 dark:text-white outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            {/* Refund Applicable Checkbox */}
            <label className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={cancelRefundApplicable}
                onChange={(e) => setCancelRefundApplicable(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <div className="flex flex-col text-xs">
                <span className="font-bold text-zinc-900 dark:text-white">
                  Payment Refund Applicable
                </span>
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  Flags this booking for financial refund. Customer will be notified that their refund is being processed.
                </span>
              </div>
            </label>

            {/* Confirm Type Section */}
            <div className="p-3 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl flex flex-col gap-2">
              <div className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>Type <strong>CANCEL</strong> below to confirm cancellation:</span>
              </div>
              <input
                type="text"
                value={cancelConfirmText}
                onChange={(e) => setCancelConfirmText(e.target.value)}
                placeholder="Type CANCEL"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-primary rounded-lg p-2 text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none uppercase"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={isCancelling || !cancelCustomNotes.trim() || cancelConfirmText.trim().toUpperCase() !== 'CANCEL'}
                onClick={handleConfirmCancel}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 active:scale-[0.99] disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── No-Show Confirmation Modal ─────────────────────────────── */}
      {isNoShowModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Mark as No-Show?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Release slot for {visit.customer?.name || 'Customer'}
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Ticket <strong className="font-mono text-indigo-600 dark:text-indigo-400">{ticketDisplay}</strong> will be marked as No-Show. This will release their appointment capacity, update real-time wait times, and be logged in analytics.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsNoShowModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={isMarkingNoShow}
                onClick={handleConfirmNoShow}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isMarkingNoShow ? 'Marking...' : 'Yes, Mark No-Show'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StateBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    WAITING: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    CHECKED_IN: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    IN_SERVICE: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    SERVING: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    IN_PROGRESS: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    COMPLETED: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
    CANCELLED: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    NO_SHOW: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
    MISSED: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
  };

  const style = colors[state] || colors.COMPLETED;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${style}`}
    >
      {state === 'CHECKED_IN' && <span>✅</span>}
      {state.replace(/_/g, ' ')}
    </span>
  );
}
