import React, { useState } from 'react';
import { X, AlertTriangle, MessageSquareWarning } from 'lucide-react';

const CANCEL_REASONS = [
  { value: 'OVERBOOKED', label: 'Service Overbooked' },
  { value: 'CUSTOMER_REQUEST', label: 'Customer Request' },
  { value: 'NO_SHOW', label: 'No Show / Did Not Arrive' },
  { value: 'STAFF_UNAVAILABLE', label: 'Staff Unavailable' },
  { value: 'EMERGENCY_CLOSURE', label: 'Emergency / Closure' },
  { value: 'OTHER', label: 'Other' },
];

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, notes: string) => void;
  isPending?: boolean;
  customerName?: string;
  serviceName?: string;
  scheduledTime?: string;
}

export function CancelBookingModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  customerName,
  serviceName,
  scheduledTime,
}: CancelBookingModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) {
      setError('Please select a reason for cancellation.');
      return;
    }
    setError('');
    onConfirm(selectedReason, notes);
  };

  const handleClose = () => {
    setSelectedReason('');
    setNotes('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-zinc-800 bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-base">Cancel Booking</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">This action will notify the customer.</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Booking Info */}
          {(customerName || serviceName || scheduledTime) && (
            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-1.5 border border-gray-100 dark:border-zinc-700">
              {customerName && (
                <p className="text-sm text-gray-700 dark:text-zinc-300">
                  <span className="font-semibold">Customer:</span> {customerName}
                </p>
              )}
              {serviceName && (
                <p className="text-sm text-gray-700 dark:text-zinc-300">
                  <span className="font-semibold">Service:</span> {serviceName}
                </p>
              )}
              {scheduledTime && (
                <p className="text-sm text-gray-700 dark:text-zinc-300">
                  <span className="font-semibold">Scheduled:</span> {scheduledTime}
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider text-xs">
              Reason for Cancellation <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => { setSelectedReason(r.value); setError(''); }}
                  className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    selectedReason === r.value
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                      : 'border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:border-gray-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/40'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider text-xs">
              Additional Notes <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Staff member called in sick, customer was contacted..."
              rows={2}
              className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-800 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-500 outline-none focus:border-red-400 dark:focus:border-red-500 resize-none transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </p>
          )}

          {/* WhatsApp notification warning */}
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
            <MessageSquareWarning className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              The customer will be notified of this cancellation via WhatsApp and/or SMS. This action is logged and visible in Analytics.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Keep Booking
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || !selectedReason}
            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
