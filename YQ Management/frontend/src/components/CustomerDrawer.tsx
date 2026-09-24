import React from 'react';
import { X, Phone, Mail, Calendar, Hash, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';

interface CustomerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
}

export function CustomerDrawer({ isOpen, onClose, customerId }: CustomerDrawerProps) {
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => {
      if (!customerId) return null;
      return fetchApi(`/customer/${customerId}`);
    },
    enabled: !!customerId && isOpen,
  });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[80] transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-zinc-950 border-l border-gray-200 dark:border-white/10 shadow-2xl z-[90] transform transition-transform duration-300 ease-in-out flex flex-col translate-x-0"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 shrink-0 bg-gray-50/50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customer Details</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading || !customer ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Header Card */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary text-2xl font-bold shrink-0">
                    {customer.name?.charAt(0).toUpperCase() || <User />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{customer.name || 'Unknown Customer'}</h3>
                    {customer.phone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Phone className="w-3.5 h-3.5" /> {customer.phone}
                      </p>
                    )}
                    {customer.email && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Mail className="w-3.5 h-3.5" /> {customer.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                    <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Total Visits</div>
                    <div className="font-bold text-xl text-gray-900 dark:text-white">{customer.visits?.length || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                    <div className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Member Since</div>
                    <div className="font-bold text-xl text-gray-900 dark:text-white">
                      {new Date(customer.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* History Section */}
              <div className="p-6">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Recent Visits
                </h3>
                
                <div className="space-y-4">
                  {!customer.visits || customer.visits.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No visits found</p>
                  ) : (
                    customer.visits.map((v: any) => (
                      <div key={v.id} className="p-4 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-sm relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${
                          v.currentState === 'COMPLETED' ? 'bg-emerald-500' :
                          v.currentState === 'MISSED' ? 'bg-amber-500' :
                          v.currentState === 'CANCELLED' ? 'bg-red-500' :
                          'bg-primary'
                        }`} />
                        <div className="flex justify-between items-start mb-2 pl-2">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">{v.service?.name || 'General Service'}</div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            v.currentState === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600' :
                            v.currentState === 'MISSED' ? 'bg-amber-500/10 text-amber-600' :
                            v.currentState === 'CANCELLED' ? 'bg-red-500/10 text-red-600' :
                            'bg-primary/10 text-primary'
                          }`}>
                            {v.currentState}
                          </span>
                        </div>
                        <div className="pl-2 space-y-1">
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> 
                            {new Date(v.createdAt).toLocaleDateString()} at {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Hash className="w-3.5 h-3.5" /> 
                            Queue: {v.queue?.name || 'Unknown'} {v.queue?.location?.name ? `(${v.queue.location.name})` : ''}
                          </div>
                          {v.completedAt && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                              Completed on {new Date(v.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
