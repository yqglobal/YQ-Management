import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';
import { getTenantUrl } from '../lib/utils';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceBuilderProps {
  visitId: string;
  visitStepId: string;
  tenant: any;
  onLinkGenerated: (link: string) => void;
  existingLink: string | null;
}

export default function InvoiceBuilder({ visitId, visitStepId, tenant, onLinkGenerated, existingLink }: InvoiceBuilderProps) {
  const queryClient = useQueryClient();
  const [lineItems, setLineItems] = useState<{ name: string; quantity: number; unitPrice: number }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch current bill/invoice
  const { data: bill, isLoading } = useQuery({
    queryKey: ['visit-bill', visitId],
    queryFn: () => fetchApi(`/visits/${visitId}/bill`),
  });

  useEffect(() => {
    if (bill && bill.items) {
      setLineItems(bill.items);
    }
  }, [bill]);

  const updateInvoiceMutation = useMutation({
    mutationFn: (items: any[]) => fetchApi(`/invoice/visit/${visitId}`, {
      method: 'POST',
      body: JSON.stringify({ lineItems: items.map(i => ({ name: i.name, qty: i.quantity, unitPrice: i.unitPrice })) }),
    }),
    onSuccess: () => {
      toast.success('Invoice updated');
      queryClient.invalidateQueries({ queryKey: ['visit-bill', visitId] });
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to update invoice');
    }
  });

  const handleAddItem = () => {
    setLineItems([...lineItems, { name: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: string, value: string | number) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const handleSave = async () => {
    await updateInvoiceMutation.mutateAsync(lineItems);
  };

  const handleGenerateLink = async () => {
    // First save
    let updatedInvoice;
    try {
      updatedInvoice = await updateInvoiceMutation.mutateAsync(lineItems);
    } catch (e: any) {
      // toast error already handled in onError
      return;
    }
    
    if (updatedInvoice.total <= 0) {
      toast.error('Total must be greater than 0');
      return;
    }

    try {
      setIsGenerating(true);
      const res = await fetchApi('/tenant-payments/public/intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: updatedInvoice.total * 100, // Cents
          visitId,
          visitStepId,
          description: `Invoice ${updatedInvoice.invoiceNumber || 'Payment'}`
        })
      });
      
      const link = tenant?.subdomain ? getTenantUrl(tenant.subdomain, `/pay/${res.paymentId}`) : `/pay/${res.paymentId}`;
      onLinkGenerated(link);
      toast.success('Payment link generated!');
    } catch (e: any) {
      toast.error('Failed to generate payment link: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  const subtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const taxRate = tenant?.taxConfig?.defaultTaxRatePercent || 0;
  const totalTax = subtotal * (taxRate / 100);
  const total = subtotal + totalTax;

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-2">
        {lineItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Item name"
              value={item.name}
              onChange={(e) => handleChange(index, 'name', e.target.value)}
              className="flex-1 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-1.5 text-sm"
              disabled={!!existingLink}
            />
            <input 
              type="number" 
              min="1"
              value={item.quantity}
              onChange={(e) => handleChange(index, 'quantity', parseInt(e.target.value) || 1)}
              className="w-16 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-1.5 text-sm"
              disabled={!!existingLink}
            />
            <input 
              type="number" 
              min="0"
              value={(item.unitPrice / 100).toString()}
              onChange={(e) => handleChange(index, 'unitPrice', Math.round((parseFloat(e.target.value) || 0) * 100))}
              className="w-24 bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-1.5 text-sm"
              disabled={!!existingLink}
            />
            {!existingLink && (
              <button onClick={() => handleRemoveItem(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      
      {!existingLink && (
        <button onClick={handleAddItem} className="text-sm font-semibold text-blue-600 self-start flex items-center gap-1 hover:underline mt-1">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      )}

      <div className="border-t border-blue-200 dark:border-blue-800 pt-3 mt-2 flex flex-col gap-1 text-sm">
        <div className="flex justify-between text-on-surface-variant dark:text-zinc-400">
          <span>Subtotal</span>
          <span>{(subtotal / 100).toFixed(2)}</span>
        </div>
        {taxRate > 0 && (
          <div className="flex justify-between text-on-surface-variant dark:text-zinc-400">
            <span>Tax ({taxRate}%)</span>
            <span>{(totalTax / 100).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-on-surface dark:text-white pt-1">
          <span>Total</span>
          <span>{(total / 100).toFixed(2)}</span>
        </div>
      </div>

      {!existingLink && (
        <div className="flex gap-2 mt-2">
          <button 
            disabled={updateInvoiceMutation.isPending || isGenerating}
            onClick={handleSave}
            className="flex-1 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateInvoiceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Invoice'}
          </button>
          <button 
            disabled={updateInvoiceMutation.isPending || isGenerating}
            onClick={handleGenerateLink}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate Link'}
          </button>
        </div>
      )}
    </div>
  );
}
