import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  service?: any; // If provided, modal is in EDIT mode
}

export function ServiceModal({ isOpen, onClose, locationId, service }: ServiceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('15');
  const [selectedLocId, setSelectedLocId] = useState(locationId || '');
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setDescription(service.description || '');
      setExpectedDuration(service.expectedDuration?.toString() || '15');
      setSelectedLocId(service.locationId || locationId || '');
      // If service includes queues, map them
      if (service.queues) {
        setSelectedQueueIds(service.queues.map((q: any) => q.id));
      }
    } else {
      setName('');
      setDescription('');
      setExpectedDuration('15');
      setSelectedLocId(locationId || '');
      setSelectedQueueIds([]);
    }
  }, [service, locationId, isOpen]);

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['location'],
    queryFn: () => fetchApi('/location'),
    enabled: isOpen,
  });

  const { data: queues = [], isLoading: queuesLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue'),
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (service) {
        return fetchApi(`/service/${service.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      } else {
        return fetchApi('/service', { method: 'POST', body: JSON.stringify(data) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      if (selectedLocId) {
        queryClient.invalidateQueries({ queryKey: ['location', selectedLocId, 'services'] });
      }
      toast.success(`Service ${service ? 'updated' : 'created'} successfully`);
      handleClose();
    },
    onError: () => toast.error(`Error ${service ? 'updating' : 'creating'} service`),
  });

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedLocId) return;
    
    saveMutation.mutate({ 
      name, 
      description, 
      expectedDuration: parseInt(expectedDuration, 10),
      locationId: selectedLocId,
      queueIds: selectedQueueIds
    });
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex justify-end animate-in fade-in duration-200">
      <div className="bg-surface dark:bg-dark-surface border-l border-border dark:border-dark-border w-full max-w-md shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-dark-card shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {service ? 'Edit Service' : 'Add New Service'}
          </h2>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-zinc-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {!locationsLoading && locations.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 rounded-xl text-sm border border-amber-200 dark:border-amber-500/20">
              <p className="font-semibold mb-1">No Locations Found</p>
              <p>You need to create a location before you can add services.</p>
              <a href="/dashboard/settings/operations" className="underline mt-2 inline-block">Go to Settings &gt; Operations to add a location</a>
            </div>
          )}

          {locations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Location <span className="text-red-500">*</span></label>
              <select
                value={selectedLocId}
                onChange={(e) => setSelectedLocId(e.target.value)}
                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              >
                <option value="" disabled>Select a location</option>
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Service Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. General Consultation"
              className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the service..."
              className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none h-24 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Expected Duration (mins)</label>
            <input
              type="number"
              min="1"
              value={expectedDuration}
              onChange={(e) => setExpectedDuration(e.target.value)}
              className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {service && queues.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Linked Queues</label>
              <div className="bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                {queues.map((q: any) => (
                  <label key={q.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedQueueIds.includes(q.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          setSelectedQueueIds([...selectedQueueIds, q.id]);
                        } else {
                          setSelectedQueueIds(selectedQueueIds.filter(id => id !== q.id));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-zinc-300">{q.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saveMutation.isPending || !name.trim() || !selectedLocId}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {service ? 'Save Changes' : 'Create Service'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
