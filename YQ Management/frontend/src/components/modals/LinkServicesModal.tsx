import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Check } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface LinkServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: any;
}

export function LinkServicesModal({ isOpen, onClose, queue }: LinkServicesModalProps) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (queue && queue.services) {
      setSelectedServiceIds(queue.services.map((s: any) => s.id));
    }
  }, [queue, isOpen]);

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => fetchApi(`/queue/${queue.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      toast.success('Services linked to queue');
      onClose();
    },
    onError: () => toast.error('Error linking services'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServiceIds.length === 0) {
      toast.error('Please select at least one service');
      return;
    }
    saveMutation.mutate({ serviceIds: selectedServiceIds });
  };

  const handleToggle = (id: string) => {
    setSelectedServiceIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border">
          <h2 className="text-xl font-bold text-on-surface dark:text-white">Link Services to Queue</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-low dark:hover:bg-white/10 rounded-full transition-colors text-on-surface-variant">
            <X strokeWidth={1.5} className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-on-surface-variant mb-4">
            Queue <strong>{queue?.name}</strong> is not linked to any services. Please link at least one service to activate it.
          </p>

          <div className="bg-surface-container-low dark:bg-black/30 border border-border dark:border-dark-border rounded-xl p-3 max-h-64 overflow-y-auto space-y-1">
            {services.length === 0 ? (
              <p className="text-sm text-center p-4 text-on-surface-variant">No services found. Create a service first.</p>
            ) : (
              services.map((service: any) => (
                <label key={service.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedServiceIds.includes(service.id) ? 'bg-primary/10 border-primary/20' : 'hover:bg-surface-container dark:hover:bg-white/5'}`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${selectedServiceIds.includes(service.id) ? 'bg-primary border-primary text-on-primary' : 'border-border dark:border-dark-border bg-transparent'}`}>
                    {selectedServiceIds.includes(service.id) && <Check strokeWidth={2.5} className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-on-surface dark:text-white block">{service.name}</span>
                    {service.description && <span className="text-xs text-on-surface-variant block mt-0.5">{service.description}</span>}
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending || selectedServiceIds.length === 0}
              className="px-5 py-2.5 bg-primary text-on-primary hover:bg-primary-container font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Link Services
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
