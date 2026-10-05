import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Download, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface InvoiceModalProps {
  isOpen: boolean;
  visitId: string | null;
  onClose: () => void;
}

export function InvoiceModal({ isOpen, visitId, onClose }: InvoiceModalProps) {
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    if (!isOpen || !visitId) {
      setInvoice(null);
      return;
    }
    const loadInvoice = async () => {
      setLoading(true);
      try {
        const data = await fetchApi(`/invoice/visit/${visitId}`);
        setInvoice(data);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    loadInvoice();
  }, [isOpen, visitId]);

  if (!isOpen) return null;

  const money = (n: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: invoice?.currency || 'ZAR' }).format(n);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-card dark:bg-dark-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-border dark:border-dark-border bg-surface-container-lowest dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-white">Tax Invoice</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline mt-0.5">
                  {invoice?.invoiceNumber || 'Loading...'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-container-low dark:hover:bg-zinc-800 rounded-full transition-colors text-on-surface-variant dark:text-outline">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : invoice ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-on-surface dark:text-white mb-2">Billed To:</h3>
                    <p className="text-on-surface-variant dark:text-outline text-sm">
                      {invoice.customer?.name || 'Customer'}<br />
                      {invoice.customer?.phone || ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      invoice.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                      'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                    }`}>
                      {invoice.status === 'PAID' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      {invoice.status}
                    </div>
                    <p className="text-on-surface-variant dark:text-outline text-sm mt-2">
                      Date: {new Date(invoice.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="border border-border dark:border-dark-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-lowest dark:bg-zinc-900/50 text-on-surface dark:text-zinc-400 uppercase text-[11px] font-semibold tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-dark-border">
                      {invoice.lineItemsSnap?.map((item: any, i: number) => (
                        <tr key={i} className="text-on-surface dark:text-zinc-200">
                          <td className="px-4 py-3 font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-center">{item.qty}</td>
                          <td className="px-4 py-3 text-right">{money(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-right">{money(item.unitPrice * item.qty)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-3 text-sm">
                    <div className="flex justify-between text-on-surface-variant dark:text-outline">
                      <span>Subtotal</span>
                      <span>{money(invoice.subtotal)}</span>
                    </div>
                    {invoice.taxLines?.map((tax: any, i: number) => (
                      <div key={i} className="flex justify-between text-on-surface-variant dark:text-outline">
                        <span>{tax.label}</span>
                        <span>{money(tax.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-on-surface dark:text-white font-semibold text-base pt-3 border-t border-border dark:border-dark-border">
                      <span>Total</span>
                      <span>{money(invoice.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-on-surface-variant dark:text-zinc-500">
                Invoice could not be loaded.
              </div>
            )}
          </div>

          <div className="p-6 border-t border-border dark:border-dark-border bg-surface-container-lowest dark:bg-zinc-900/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full font-label-lg text-label-lg font-semibold border border-border dark:border-dark-border text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
            <button
              disabled={!invoice}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded-full font-label-lg text-label-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
