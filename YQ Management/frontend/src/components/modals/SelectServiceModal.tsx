import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';

interface SelectServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSelect: (url: string) => void;
  baseUrl: string;
  portalUrl: string;
  isCustomDomain: boolean;
  onCopy?: (url: string) => void;
}

export function SelectServiceModal({ isOpen, onClose, tenantId, onSelect, baseUrl, portalUrl, isCustomDomain, onCopy }: SelectServiceModalProps) {
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && tenantId) {
      setIsLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/service/tenant/${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`,
        }
      })
        .then(res => res.json())
        .then(data => {
          setServices(Array.isArray(data) ? data : []);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Failed to load services', err);
          setIsLoading(false);
        });
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const selectedService = services.find(s => s.id === selectedServiceId);
  const queues = selectedService?.queues || [];

  const handleGenerate = () => {
    const base = isCustomDomain ? `${portalUrl}/tv/${tenantId}` : `${baseUrl}/tv/${tenantId}`;
    const params = new URLSearchParams();
    if (selectedServiceId) params.append('serviceId', selectedServiceId);
    if (selectedQueueId) params.append('queueId', selectedQueueId);
    
    const finalUrl = params.toString() ? `${base}?${params.toString()}` : base;
    return finalUrl;
  };

  const handleOpen = () => {
    onSelect(handleGenerate());
  };

  const handleCopy = () => {
    if (onCopy) {
      onCopy(handleGenerate());
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">TV Lobby Display</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Service (Optional)</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    setSelectedQueueId('');
                  }}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                >
                  <option value="">All Services (Global Display)</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Choose whether to display all active tickets or restrict it to a specific service.</p>
              </div>

              {selectedServiceId && queues.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Queue (Optional)</label>
                  <select
                    value={selectedQueueId}
                    onChange={(e) => setSelectedQueueId(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                  >
                    <option value="">All Queues in Service</option>
                    {queues.map((q: any) => (
                      <option key={q.id} value={q.id}>{q.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
          <button
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {onCopy && (
              <button
                onClick={handleCopy}
                disabled={isLoading}
                className="px-5 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                Copy Link
              </button>
            )}
            <button
              onClick={handleOpen}
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              Open TV Display
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
