import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Clock, User, X, Stethoscope, Pill } from 'lucide-react';

interface CompleteStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: any;
  currentStep: any;
  nextStep: any;
  timeInService: string;
  onConfirmAdvance: (outcome?: string) => Promise<void>;
  onConfirmCompleteVisit: () => Promise<void>;
}

export default function CompleteStageModal({
  isOpen,
  onClose,
  visit,
  currentStep,
  nextStep,
  timeInService,
  onConfirmAdvance,
  onConfirmCompleteVisit,
}: CompleteStageModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isOpen || !visit) return null;

  const isFinalStage = !nextStep;
  const customerName = visit.customer?.name || 'Walk-in Customer';
  const ticketNumber = visit.ticketNumber || visit.displayId || `#${visit.id?.substring(0, 6)}`;
  const serviceName = visit.service?.name || 'Service';
  const isAppt = visit.source === 'APPOINTMENT' || !!visit.scheduledTime;
  const slotTime = visit.scheduledTime
    ? new Date(visit.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const hasClinicalNotes = Array.isArray(visit.clinicalNotes) && visit.clinicalNotes.length > 0;
  const hasPrescriptions = Array.isArray(visit.prescriptions) && visit.prescriptions.length > 0;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      if (currentStep && nextStep) {
        await onConfirmAdvance('COMPLETED');
      } else {
        await onConfirmCompleteVisit();
      }
      onClose();
    } catch (e) {
      console.error('Error advancing stage:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border dark:border-dark-border flex items-center justify-between bg-surface-container/40 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isFinalStage 
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface dark:text-white">
                  {isFinalStage ? 'Complete Customer Visit' : 'Complete Stage & Advance'}
                </h3>
                <p className="text-xs text-outline">
                  {isFinalStage 
                    ? 'Mark final checkout and complete the entire journey' 
                    : 'Advance customer to the next stage in their flow'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 rounded-lg text-outline hover:text-on-surface dark:hover:text-white hover:bg-surface-container transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Customer Summary Banner */}
            <div className="bg-surface-container/50 dark:bg-zinc-900/50 rounded-xl p-4 border border-border/60 dark:border-dark-border/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm text-on-surface dark:text-white">{customerName}</span>
                </div>
                <span className="font-data-mono font-bold text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {ticketNumber}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-outline pt-2 border-t border-border/40">
                <div>
                  <span className="font-medium text-on-surface dark:text-zinc-200">Service: </span>
                  <span className="truncate block">{serviceName}</span>
                </div>
                <div>
                  <span className="font-medium text-on-surface dark:text-zinc-200">Type / Slot: </span>
                  <span>{isAppt ? (slotTime ? `APT • ${slotTime}` : 'Appointment') : 'Walk-in'}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2 mt-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-on-surface dark:text-zinc-200 font-semibold">Total Time in Service:</span>
                  <span className="font-data-mono font-bold text-emerald-600 dark:text-emerald-400">{timeInService || '< 1 min'}</span>
                </div>
              </div>
            </div>

            {/* Stage Transition Comparison */}
            <div className="grid grid-cols-2 gap-3">
              {/* Current Stage */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Current Stage (Completing)
                </div>
                <div className="font-semibold text-xs text-on-surface dark:text-white">
                  {currentStep?.name || 'In-Service Consultation'}
                </div>
              </div>

              {/* Next Stage */}
              <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Next Stage (Pending)
                </div>
                <div className="font-semibold text-xs text-on-surface dark:text-white">
                  {nextStep?.name || 'Final Discharge / Completed'}
                </div>
              </div>
            </div>

            {/* Clinical & Extra Records Badge (if applicable) */}
            {(hasClinicalNotes || hasPrescriptions) && (
              <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1">
                {hasClinicalNotes && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 font-medium">
                    <Stethoscope className="w-3 h-3" /> Clinical notes attached
                  </span>
                )}
                {hasPrescriptions && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40 font-medium">
                    <Pill className="w-3 h-3" /> Prescription attached
                  </span>
                )}
              </div>
            )}

            {/* Informational Guidance */}
            <p className="text-xs text-outline leading-relaxed bg-surface-container/30 rounded-lg p-2.5">
              {isFinalStage
                ? 'Confirming will officially conclude this visit. Feedback requests will be triggered if enabled.'
                : 'Confirming will advance the customer to the next station in their journey. Their mobile boarding pass screen will immediately update.'}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border dark:border-dark-border bg-surface-container/40 dark:bg-zinc-900/40 flex items-center justify-between gap-3">
            <div>
              {!isFinalStage && (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to complete this entire visit early? Remaining journey stages will be marked as skipped.')) {
                      setIsSubmitting(true);
                      try {
                        await onConfirmCompleteVisit();
                        onClose();
                      } finally {
                        setIsSubmitting(false);
                      }
                    }
                  }}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-colors flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800/60 cursor-pointer"
                  title="Conclude and complete the entire visit now"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete Visit Now
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-outline hover:text-on-surface dark:hover:text-white rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  isFinalStage
                    ? 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </>
                ) : isFinalStage ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm & Complete Visit
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Confirm & Move to Next Stage
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
