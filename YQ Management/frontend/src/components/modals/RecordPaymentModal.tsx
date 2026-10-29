import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CreditCard,
  Banknote,
  Landmark,
  Receipt,
  Loader2,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  User,
  Hash,
  Upload,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import { fetchApi, getBackendUrl } from '../../lib/api';
import { toast } from 'sonner';

export type PaymentMethodType = 'CARD_TERMINAL' | 'CASH' | 'EFT' | 'OTHER';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: {
    id: string;
    ticketNumber?: string;
    displayId?: string;
    customer?: {
      name?: string;
      phone?: string;
    };
    service?: {
      name?: string;
    };
  } | null;
  amount: number; // in minor units (e.g. cents)
  currency: string;
  initialMethod?: PaymentMethodType;
  onConfirm: (data: {
    method: PaymentMethodType;
    amount?: number; // allow passing custom amount in cents
    proofUrl?: string;
    description?: string;
    sendReceipt: boolean;
  }) => Promise<void>;
}

const METHODS: { id: PaymentMethodType; label: string; icon: React.ElementType; helper: string }[] = [
  {
    id: 'CARD_TERMINAL',
    label: 'Card / POS',
    icon: CreditCard,
    helper: 'Card machine transaction approval code or terminal slip #',
  },
  {
    id: 'CASH',
    label: 'Cash',
    icon: Banknote,
    helper: 'Cash received at counter / cash drawer receipt ref',
  },
  {
    id: 'EFT',
    label: 'EFT / Bank',
    icon: Landmark,
    helper: 'Bank transfer confirmation or reference code',
  },
  {
    id: 'OTHER',
    label: 'Other',
    icon: Receipt,
    helper: 'Other payment method or voucher reference',
  },
];

export function RecordPaymentModal({
  isOpen,
  onClose,
  visit,
  amount,
  currency,
  initialMethod = 'CARD_TERMINAL',
  onConfirm,
}: RecordPaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethodType>(initialMethod);
  const [customAmountStr, setCustomAmountStr] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [description, setDescription] = useState('');
  const [sendReceipt, setSendReceipt] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMethod(initialMethod);
      setCustomAmountStr(amount > 0 ? (amount / 100).toFixed(2) : '');
      setProofUrl('');
      setDescription('');
      setSendReceipt(!!visit?.customer?.phone);
      setBusy(false);
      setUploadingProof(false);
    }
  }, [isOpen, initialMethod, amount, visit?.customer?.phone]);

  if (!isOpen || !visit) return null;

  const currentAmountMinor = Math.round((parseFloat(customAmountStr) || 0) * 100);
  const customerName = visit.customer?.name || 'Customer';
  const customerPhone = visit.customer?.phone;
  const ticketRef = visit.displayId || visit.ticketNumber || `#TKT-${visit.id.substring(0, 4)}`;
  const currentMethodConfig = METHODS.find((m) => m.id === method) || METHODS[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5MB limit. Please upload a smaller receipt image.');
      return;
    }

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res: any = await fetchApi('/upload', {
        method: 'POST',
        body: formData,
      });

      if (res?.url) {
        setProofUrl(res.url);
        toast.success('Proof receipt uploaded successfully!');
      } else {
        toast.error('Upload succeeded but no URL returned');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload proof slip');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const parsedCents = Math.round((parseFloat(customAmountStr) || 0) * 100);
    if (parsedCents < 0) {
      toast.error('Payment amount cannot be negative');
      return;
    }

    setBusy(true);
    try {
      await onConfirm({
        method,
        amount: parsedCents > 0 ? parsedCents : amount,
        proofUrl: proofUrl.trim() || undefined,
        description: description.trim() || undefined,
        sendReceipt,
      });
      onClose();
    } catch {
      // Error handling is handled in the caller toast
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          onClick={() => !busy && onClose()}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-surface dark:bg-zinc-900 border border-border dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 dark:border-white/10 bg-surface-container-low dark:bg-zinc-900/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface dark:text-zinc-100">
                  Confirm Payment Receipt
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Record counter transaction & issue receipt
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            {/* Customer & Ticket Summary Card */}
            <div className="p-3.5 rounded-xl border border-border/80 dark:border-white/10 bg-surface-container-lowest dark:bg-zinc-950/60 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {ticketRef}
                  </span>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                    <User className="w-3 h-3 text-zinc-400" />
                    {customerName}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {visit.service?.name || 'Service booking'}
                </div>
              </div>
              <div className="text-right">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Total Amount
                </span>
                <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {currency} {(currentAmountMinor / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                  Amount to Collect ({currency})
                </label>
                {amount > 0 && (
                  <button
                    type="button"
                    onClick={() => setCustomAmountStr((amount / 100).toFixed(2))}
                    className="text-[10px] text-primary hover:underline font-semibold"
                  >
                    Reset to base ({currency} {(amount / 100).toFixed(2)})
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-xs text-zinc-400">
                  {currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customAmountStr}
                  onChange={(e) => setCustomAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-3 py-2 text-sm font-mono font-bold rounded-xl border border-border dark:border-zinc-800 bg-surface dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
              <p className="text-[10px] text-zinc-400">
                Enter the amount charged at the counter. Set to 0 if this service is complimentary/free.
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary shadow-xs ring-1 ring-primary'
                          : 'border-border dark:border-zinc-800 bg-surface-container-low dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proof / Reference Entry with File Upload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {method === 'CARD_TERMINAL'
                      ? 'Card Slip / POS Auth Code'
                      : method === 'EFT'
                        ? 'Bank Transfer Reference'
                        : 'Receipt / Cash Slip Number'}
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingProof}
                    className="text-[10px] text-primary hover:text-primary/80 font-semibold flex items-center gap-1 bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-md hover:bg-primary/20 transition-colors"
                  >
                    {uploadingProof ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" />
                        Attach Slip / Photo
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder={
                    method === 'CARD_TERMINAL'
                      ? 'e.g. POS-98241 or Auth 584920'
                      : method === 'EFT'
                        ? 'e.g. FNB-TXN-089234'
                        : 'e.g. Slip #0492 or Cash Drawer #1'
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-border dark:border-zinc-800 bg-surface dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
                />
              </div>

              {/* Preview attached proof URL if uploaded */}
              {proofUrl && proofUrl.startsWith('/uploads/') && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5 truncate">
                    <FileCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">Slip image attached ({proofUrl})</span>
                  </span>
                  <a
                    href={`${getBackendUrl()}${proofUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 flex items-center gap-1 text-[10px] font-bold underline shrink-0"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <p className="text-[10px] text-zinc-400">
                {currentMethodConfig.helper}
              </p>
            </div>

            {/* Staff Notes Entry */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                Staff Notes (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Terminal 2, card ending in 4111, customer paid in full"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border dark:border-zinc-800 bg-surface dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>

            {/* WhatsApp Receipt Toggle */}
            <div className="p-3 rounded-xl border border-border/80 dark:border-white/10 bg-surface-container-low dark:bg-zinc-950/40">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendReceipt && !!customerPhone}
                  disabled={!customerPhone}
                  onChange={(e) => setSendReceipt(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Send payment receipt to customer on WhatsApp</span>
                  </div>
                  {customerPhone ? (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Instant receipt & breakdown will be sent to <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{customerPhone}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-0.5">
                      No phone number recorded for this customer. Receipt cannot be sent via WhatsApp.
                    </p>
                  )}
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm & Record Payment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
