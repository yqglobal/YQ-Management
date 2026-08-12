import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, UserPlus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { CreateCustomerModal } from './CreateCustomerModal';

interface CreateVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateVisitModal({ isOpen, onClose }: CreateVisitModalProps) {
  const [customerId, setCustomerId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchApi('/customer'),
    enabled: isOpen,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
    enabled: isOpen,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi('/visits', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Visit created successfully');
      handleClose();
    },
    onError: () => toast.error('Error creating visit'),
  });

  const handleClose = () => {
    setCustomerId('');
    setLocationId('');
    setServiceId('');
    setNotes('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !locationId || !serviceId) return;
    
    createMutation.mutate({
      customerId,
      locationId,
      serviceId,
      notes,
      source: 'WALK_IN',
    });
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Walk-in Visit</h2>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Customer <span className="text-red-500">*</span></label>
                  <button 
                    type="button" 
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" /> New Customer
                  </button>
                </div>
                <select 
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Location <span className="text-red-500">*</span></label>
                <select 
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  required
                >
                  <option value="">Select a location</option>
                  {locations.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Service <span className="text-red-500">*</span></label>
                <select 
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  required
                  disabled={!locationId}
                >
                  <option value="">Select a service</option>
                  {services
                    .filter((s: any) => !s.locationId || s.locationId === locationId)
                    .map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.expectedDuration} min)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[80px]"
                  placeholder="Optional notes for this visit..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-white/10">
                <button 
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createMutation.isPending || !customerId || !locationId || !serviceId}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50"
                >
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {createMutation.isPending ? 'Creating...' : 'Create Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <CreateCustomerModal 
        isOpen={isCustomerModalOpen} 
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={(customer) => {
          setCustomerId(customer.id);
        }}
      />
    </>
  );
}
