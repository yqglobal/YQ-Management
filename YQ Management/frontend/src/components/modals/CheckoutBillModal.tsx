import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Receipt, QrCode, Banknote, CreditCard, Landmark, CheckCircle2, Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '../../lib/api';
import { InvoiceModal } from './InvoiceModal';

export interface VisitBill {
  visitId: string;
  currency: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  total: number;
  paid: number;
  balanceDue: number;
  paymentTiming: 'CHECKIN' | 'CHECKOUT' | 'NONE' | null;
  autoSendInvoice: boolean;
  allowUnpaidCheckout: boolean;
}

interface CheckoutBillModalProps {
  isOpen: boolean;
  bill: VisitBill | null;
  customerName?: string;
  customerPhone?: string;
  tenantId: string;
  tenantSubdomain: string;
  onClose: () => void;
  /** Called once the bill is settled (or unpaid completion was chosen). */
  onSettled: (opts: { allowUnpaid: boolean }) => Promise<void> | void;
  onBillChange: (bill: VisitBill) => void;
}

const METHODS = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'CARD_TERMINAL', label: 'Card machine', icon: CreditCard },
  { id: 'EFT', label: 'EFT / Transfer', icon: Landmark },
  { id: 'OTHER', label: 'Other', icon: Receipt },
] as const;

const money = (n: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'ZAR' }).format(n);

export function CheckoutBillModal({
  isOpen, bill, customerName, customerPhone, tenantId, tenantSubdomain,
  onClose, onSettled, onBillChange,
}: CheckoutBillModalProps) {
  const [method, setMethod] = useState<string>('CASH');
  const [proofUrl, setProofUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    if (!isOpen) { setPayLink(null); setProofUrl(''); setMethod('CASH'); }
  }, [isOpen]);

  // While a Stripe link/QR is outstanding, poll the bill until the webhook marks it paid.
  useEffect(() => {
    if (!isOpen || !payLink || !bill) return;
    const t = setInterval(async () => {
      try {
        const fresh = (await fetchApi(`/visits/${bill.visitId}/bill`)) as VisitBill;
        if (fresh.balanceDue <= 0) {
          clearInterval(t);
          onBillChange(fresh);
          toast.success('Payment received');
          await onSettled({ allowUnpaid: false });
        }
      } catch { /* keep polling */ }
    }, 4000);
    return () => clearInterval(t);
  }, [isOpen, payLink, bill, onBillChange, onSettled]);

  if (!bill) return null;

  const markPaid = async () => {
    setBusy(true);
    try {
      await fetchApi('/tenant-payments/manual', {
        method: 'POST',
        body: JSON.stringify({
          visitId: bill.visitId,
          amount: bill.balanceDue,
          method,
          source: 'CHECKOUT',
          proofUrl: proofUrl || undefined,
          description: 'Payment at check-out',
        }),
      });
      toast.success('Payment recorded');
      await onSettled({ allowUnpaid: false });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record payment');
    } finally {
      setBusy(false);
    }
  };

  const createLink = async () => {
    setBusy(true);
    try {
      const res = await fetchApi('/tenant-payments/public/intent', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          amount: Math.round(bill.balanceDue * 100),
          visitId: bill.visitId,
          description: 'Payment at check-out',
        }),
      });
      setPayLink(`https://${tenantSubdomain}.qmova.yqbuddy.com/pay/${res.paymentId}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create payment link');
    } finally {
      setBusy(false);
    }
  };

  const waHref = payLink && customerPhone
    ? `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Please complete your payment of ${money(bill.balanceDue, bill.currency)}: ${payLink}`,
      )}`
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            id="checkout-bill-modal"
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white leading-tight">Payment pending</h3>
                  {customerName && <p className="text-xs text-zinc-500">{customerName}</p>}
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                {bill.items.length === 0 && (
                  <p className="p-3 text-sm text-zinc-500">No priced items on this booking.</p>
                )}
                {bill.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between gap-3 p-3 text-sm">
                    <span className="text-zinc-800 dark:text-zinc-200">{i.quantity}× {i.name}</span>
                    <span className="font-medium">{money(i.quantity * i.unitPrice, bill.currency)}</span>
                  </div>
                ))}
                <div className="p-3 text-sm space-y-1 bg-zinc-50 dark:bg-zinc-800/40">
                  <div className="flex justify-between"><span>Total</span><span>{money(bill.total, bill.currency)}</span></div>
                  {bill.paid > 0 && (
                    <div className="flex justify-between text-emerald-600"><span>Already paid</span><span>− {money(bill.paid, bill.currency)}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1">
                    <span>Balance due</span><span>{money(bill.balanceDue, bill.currency)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInvoice(true)}
                  className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1 hover:underline"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  View Tax Invoice
                </button>
              </div>

              {!payLink ? (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">Payment method used</p>
                    <div className="grid grid-cols-2 gap-2">
                      {METHODS.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setMethod(id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            method === id
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                              : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Icon className="w-4 h-4" /> {label}
                        </button>
                      ))}
                    </div>
                    <input
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="Proof / reference (optional)"
                      className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
                    />
                  </div>

                  <button
                    id="checkout-mark-paid"
                    disabled={busy}
                    onClick={markPaid}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Mark paid &amp; complete
                  </button>
                  <button
                    id="checkout-stripe-link"
                    disabled={busy}
                    onClick={createLink}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-60"
                  >
                    <QrCode className="w-4 h-4" /> Customer pays by card (QR / link)
                  </button>
                  {bill.allowUnpaidCheckout && (
                    <button
                      onClick={() => onSettled({ allowUnpaid: true })}
                      className="w-full text-xs text-zinc-500 hover:text-zinc-700 underline"
                    >
                      Complete without payment (balance stays due)
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center space-y-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(payLink)}`}
                    alt="Payment QR"
                    className="w-40 h-40 mx-auto rounded-lg border"
                  />
                  <p className="text-xs text-zinc-500 flex items-center justify-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Waiting for payment…
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(payLink); toast.success('Link copied'); }}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg border py-2 text-sm"
                    >
                      <Copy className="w-4 h-4" /> Copy link
                    </button>
                    {waHref && (
                      <a href={waHref} target="_blank" rel="noreferrer"
                         className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-600 text-white py-2 text-sm">
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </a>
                    )}
                  </div>
                  <button onClick={() => setPayLink(null)} className="text-xs text-zinc-500 underline">Back</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      <InvoiceModal
        isOpen={showInvoice}
        visitId={bill?.visitId || null}
        onClose={() => setShowInvoice(false)}
      />
    </AnimatePresence>
  );
}
