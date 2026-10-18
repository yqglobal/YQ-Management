import React from 'react';
import {
  X,
  Phone,
  Mail,
  Calendar,
  Hash,
  User,
  MessageSquare,
  ShieldAlert,
  FileText,
  Loader2,
  Clock,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { VisitDrawer } from './VisitDrawer';

interface CustomerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
}

export function CustomerDrawer({ isOpen, onClose, customerId }: CustomerDrawerProps) {
  const [selectedVisit, setSelectedVisit] = React.useState<any>(null);
  const [renderTime] = React.useState(() => Date.now());
  const queryClient = useQueryClient();
  const [notes, setNotes] = React.useState('');

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => {
      if (!customerId) return null;
      return fetchApi(`/customer/${customerId}`);
    },
    enabled: !!customerId && isOpen,
  });

  React.useEffect(() => {
    if (customer?.notes) setNotes(customer.notes);
    else setNotes('');
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi(`/customer/${customerId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer profile updated');
    },
    onError: () => toast.error('Failed to update customer'),
  });

  const toggleBlock = () => updateMutation.mutate({ isBlocked: !customer?.isBlocked });
  const saveNotes = () => {
    if (notes !== (customer?.notes || '')) {
      updateMutation.mutate({ notes });
    }
  };

  if (!isOpen) return null;

  const latestVisit = customer?.visits?.[0];
  const age =
    customer?.age ||
    latestVisit?.metadata?.age ||
    latestVisit?.formResponses?.age ||
    '—';
  const gender =
    customer?.gender ||
    latestVisit?.metadata?.gender ||
    latestVisit?.formResponses?.gender ||
    '—';
  const preferredLocation =
    latestVisit?.queue?.location?.name ||
    latestVisit?.location?.name ||
    '—';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[80] transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-[90] transform transition-transform duration-300 ease-in-out flex flex-col translate-x-0">
        
        {/* Top Header Bar matching VisitDrawer */}
        <div className="flex items-center justify-between gap-2 p-3.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/80 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h2 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
              Customer Details
            </h2>
            {customer?.phone && (
              <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                <span>{customer.phone}</span>
                <a
                  href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 hover:text-emerald-500 inline-flex items-center"
                  title="Open WhatsApp chat"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </a>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg transition-colors shrink-0"
            title="Close customer details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading || !customer ? (
            <div className="p-8 text-center text-sm text-zinc-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              <span>Loading customer profile...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-4">
              {/* Blocked Alert Banner if applicable */}
              {customer.isBlocked && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 uppercase tracking-wide">
                  <ShieldAlert className="w-4 h-4" /> Blocked from booking
                </div>
              )}

              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-14 h-14 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xl font-bold shrink-0 border border-indigo-500/20">
                    {customer.name?.charAt(0).toUpperCase() || <User className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">
                      {customer.name || 'Unknown Customer'}
                    </h3>
                    {customer.phone && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{customer.phone}</span>
                      </p>
                    )}
                    {customer.email && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Actions (Mark VIP removed) */}
                <div className="flex gap-2">
                  {customer.phone && (
                    <a
                      href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-semibold transition-colors text-xs border border-emerald-500/20"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  )}
                  <button
                    onClick={toggleBlock}
                    disabled={updateMutation.isPending}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-semibold transition-colors text-xs border ${
                      customer.isBlocked
                        ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {customer.isBlocked ? 'Unblock Customer' : 'Block Customer'}
                  </button>
                </div>

                {/* Customer Details Metrics (Age, Gender, Total Visits, Location) */}
                <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                  <div className="bg-white dark:bg-zinc-900/80 p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">
                      Age
                    </div>
                    <div className="font-bold text-sm text-zinc-900 dark:text-white capitalize">
                      {age !== '—' ? `${age} yrs` : '—'}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900/80 p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">
                      Gender
                    </div>
                    <div className="font-bold text-sm text-zinc-900 dark:text-white capitalize">
                      {gender}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900/80 p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5">
                      Total Visits
                    </div>
                    <div className="font-bold text-sm text-zinc-900 dark:text-white">
                      {customer.visits?.length || 0}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900/80 p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800/80">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-400" /> Location
                    </div>
                    <div className="font-bold text-xs text-zinc-900 dark:text-white truncate" title={preferredLocation}>
                      {preferredLocation}
                    </div>
                  </div>
                </div>
              </div>

              {/* Past Visits Section (renamed from Recent Visits) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    Past Visits
                  </h3>
                  <span className="text-[11px] font-medium text-zinc-500">
                    {customer.visits?.length || 0} total
                  </span>
                </div>

                <div className="space-y-2.5">
                  {!customer.visits || customer.visits.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      No visits recorded for this customer.
                    </div>
                  ) : (
                    customer.visits.map((v: any) => {
                      const startTime = v.serviceStart || v.waitingStart || v.checkInTime || v.createdAt;
                      const endTime = v.completedAt || v.serviceEnd;
                      
                      let durationDisplay = '—';
                      if (v.completedAt && (v.serviceStart || v.waitingStart)) {
                        const startMs = new Date(v.serviceStart || v.waitingStart).getTime();
                        const endMs = new Date(v.completedAt).getTime();
                        const mins = Math.max(1, Math.round((endMs - startMs) / 60000));
                        durationDisplay = `${mins} mins`;
                      } else if (v.currentState === 'IN_SERVICE' && v.serviceStart) {
                        const elapsed = Math.max(1, Math.round((Date.now() - new Date(v.serviceStart).getTime()) / 60000));
                        durationDisplay = `${elapsed}m (in service)`;
                      } else if (v.service?.expectedDuration) {
                        durationDisplay = `~${v.service.expectedDuration} mins (est.)`;
                      }

                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVisit(v)}
                          className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs relative overflow-hidden cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors group"
                        >
                          {/* Status Color Bar */}
                          <div
                            className={`absolute top-0 left-0 w-1.5 h-full ${
                              v.currentState === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : v.currentState === 'MISSED' || v.currentState === 'NO_SHOW'
                                ? 'bg-amber-500'
                                : v.currentState === 'CANCELLED'
                                ? 'bg-red-500'
                                : v.currentState === 'IN_SERVICE'
                                ? 'bg-sky-500'
                                : 'bg-indigo-500'
                            }`}
                          />

                          <div className="pl-2">
                            {/* Title & Badges */}
                            <div className="flex justify-between items-start gap-2 mb-1.5">
                              <span className="font-semibold text-xs text-zinc-900 dark:text-white truncate">
                                {v.service?.name || 'General Service'}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {(() => {
                                  const paid = v.bookingPayments?.find((p: any) => p.status === 'SUCCEEDED');
                                  const due =
                                    v.currentState === 'PENDING_PAYMENT' ||
                                    v.bookingPayments?.some((p: any) => p.status === 'PENDING');
                                  const currency = paid?.currency || v.service?.priceCurrency || 'ZAR';

                                  if (paid) {
                                    return (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        Paid {currency} {(paid.amount / 100).toFixed(2)}
                                      </span>
                                    );
                                  }
                                  if (due) {
                                    return (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        Payment Due
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                                    v.currentState === 'COMPLETED'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : v.currentState === 'MISSED' || v.currentState === 'NO_SHOW'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                      : v.currentState === 'CANCELLED'
                                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                  }`}
                                >
                                  {v.currentState.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>

                            {/* Queue & Location info */}
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 truncate mb-2">
                              <Hash className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="truncate">
                                Queue: {v.queue?.name || 'General'}
                                {(v.queue?.location?.name || v.location?.name)
                                  ? ` (${v.queue?.location?.name || v.location?.name})`
                                  : ''}
                              </span>
                            </div>

                            {/* Service Duration, Start Time & End Time Breakdown */}
                            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 text-[11px] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-zinc-400" /> Duration:
                                </span>
                                <span className="font-semibold text-zinc-900 dark:text-white font-mono">
                                  {durationDisplay}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 pt-0.5 border-t border-zinc-200/40 dark:border-zinc-700/40">
                                <span>
                                  Start:{' '}
                                  <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                                    {startTime
                                      ? new Date(startTime).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : '—'}
                                  </strong>
                                </span>
                                <span>
                                  End:{' '}
                                  <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                                    {endTime
                                      ? new Date(endTime).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : v.currentState === 'IN_SERVICE'
                                      ? 'Active'
                                      : '—'}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            {/* Booking Date */}
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {v.scheduledTime
                                ? `Booked for ${new Date(v.scheduledTime).toLocaleDateString()} at ${new Date(v.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : `Created on ${new Date(v.createdAt).toLocaleDateString()} at ${new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </div>

                            {/* Stage Timestamps & Details */}
                            {Array.isArray(v.steps) && v.steps.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                                    Stage Details ({v.steps.filter((s: any) => s.status === 'DONE').length}/{v.steps.length} completed)
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  {v.steps.map((st: any, sIdx: number) => {
                                    const isDone = st.status === 'DONE';
                                    const isActive = st.status === 'ACTIVE';
                                    const startTs = st.activatedAt || st.unlockedAt;
                                    const endTs = st.completedAt;
                                    let durationText = '—';
                                    if (startTs && endTs) {
                                      const diffM = Math.max(1, Math.round((new Date(endTs).getTime() - new Date(startTs).getTime()) / 60000));
                                      durationText = `${diffM}m`;
                                    } else if (isActive && startTs) {
                                      const diffM = Math.max(1, Math.round((renderTime - new Date(startTs).getTime()) / 60000));
                                      durationText = `${diffM}m elapsed`;
                                    }
                                    const allowedM = st.templateStep?.expectedDuration;
                                    const isOverdue = allowedM && startTs && endTs && (new Date(endTs).getTime() - new Date(startTs).getTime()) > allowedM * 60000;

                                    return (
                                      <div key={st.id || sIdx} className="p-1.5 rounded-lg bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/40 dark:border-zinc-700/40 text-[10px]">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                            {sIdx + 1}. {st.name}
                                          </span>
                                          <span className={`px-1.5 py-0.5 rounded uppercase font-bold tracking-wider text-[9px] ${
                                            isDone ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                            isActive ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse' :
                                            'bg-zinc-200/50 text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-400'
                                          }`}>
                                            {st.status}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono text-[9px]">
                                          <span>
                                            {startTs ? `Started: ${new Date(startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting'}
                                            {endTs ? ` → Done: ${new Date(endTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                          </span>
                                          <span className={`font-semibold ${isOverdue ? 'text-rose-500 font-bold' : ''}`}>
                                            {durationText} {allowedM ? `(${allowedM}m allowed)` : ''}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Private Notes Section - Placed at the very bottom as requested */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 mt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Private Notes
                  </h3>
                  {updateMutation.isPending && (
                    <span className="text-[10px] text-amber-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={saveNotes}
                    placeholder="Add internal notes about this customer (allergies, special requirements, history)..."
                    rows={3}
                    className="w-full bg-white dark:bg-zinc-900 border border-amber-500/20 rounded-xl p-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-500/50 outline-none transition-all resize-y"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Notes are private to staff and auto-save on blur.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Render VisitDrawer for drill-down */}
      <VisitDrawer
        isOpen={!!selectedVisit}
        onClose={() => setSelectedVisit(null)}
        visit={selectedVisit}
      />
    </>
  );
}
