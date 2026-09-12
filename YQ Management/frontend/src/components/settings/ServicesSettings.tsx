import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { Layers, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceModal } from '../modals/ServiceModal';
import { QuotaFreezeGuard } from '../QuotaFreezeGuard';
import { QuotaWarningBanner } from '../QuotaWarningBanner';
import { usePlan } from '../../hooks/usePlan';

export function ServicesSettings() {
  const queryClient = useQueryClient();
  const plan = usePlan();
  
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedServiceForEdit, setSelectedServiceForEdit] = useState<any>(null);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [selectedServiceLocationId, setSelectedServiceLocationId] = useState('all');
  const [serviceSort, setServiceSort] = useState('name-asc');

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/service/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete service')
  });

  const filteredServices = React.useMemo(() => {
    return services.filter((s: any) => {
      const matchLoc = selectedServiceLocationId === 'all' || s.locationId === selectedServiceLocationId;
      const matchSearch = !serviceSearchQuery || s.name.toLowerCase().includes(serviceSearchQuery.toLowerCase());
      return matchLoc && matchSearch;
    }).sort((a: any, b: any) => {
      if (serviceSort === 'name-asc') return a.name.localeCompare(b.name);
      if (serviceSort === 'name-desc') return b.name.localeCompare(a.name);
      return 0;
    });
  }, [services, selectedServiceLocationId, serviceSearchQuery, serviceSort]);

  return (
    <>
      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500" />

        <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Layers className="w-5 h-5 text-blue-500" />
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-white">Services</h2>
            </div>
            <p className="text-on-surface-variant dark:text-zinc-400 font-body-sm text-body-sm">
              Manage the services your business offers.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end shrink-0 mr-2">
              <span className="text-sm font-semibold text-on-surface dark:text-white mb-1">{services.length} of 5 Services Used</span>
              <div className="w-32 h-2 bg-surface-container-low dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((services.length / 5) * 100, 100)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedServiceForEdit(null); setIsServiceModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Create Service
            </button>
          </div>
        </div>

        <QuotaWarningBanner 
          resourceType="services" 
          frozenCount={plan.frozenCounts?.services || 0} 
          limit={typeof plan.limits === 'string' ? JSON.parse(plan.limits).maxServices : plan.limits?.maxServices} 
        />

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-6">
           <div className="relative flex-1 w-full sm:max-w-xs">
             <input 
               type="text" 
               placeholder="Search services..." 
               value={serviceSearchQuery}
               onChange={(e) => setServiceSearchQuery(e.target.value)}
               className="w-full bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-lg pl-3 pr-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
             />
           </div>
           <div className="flex items-center gap-2 w-full sm:w-auto">
             <select 
               value={selectedServiceLocationId}
               onChange={(e) => setSelectedServiceLocationId(e.target.value)}
               className="bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
             >
               <option value="all">All Locations</option>
               {locations.map((loc: any) => (
                 <option key={loc.id} value={loc.id}>{loc.name}</option>
               ))}
             </select>
             <select 
               value={serviceSort}
               onChange={(e) => setServiceSort(e.target.value)}
               className="bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none"
             >
               <option value="name-asc">A to Z</option>
               <option value="name-desc">Z to A</option>
             </select>
           </div>
        </div>

        {servicesLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 text-on-surface-variant animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredServices.length === 0 ? (
              <p className="text-sm text-on-surface-variant dark:text-zinc-500 p-4 bg-surface-container-low dark:bg-white/5 rounded-xl border border-dashed border-border dark:border-zinc-700 col-span-full">
                No services found.
              </p>
            ) : (
              filteredServices.map((service: any) => (
                <QuotaFreezeGuard key={service.id} isFrozen={service.frozenByQuota} resourceName="service">
                <div className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-zinc-900/50 border border-border dark:border-zinc-800 rounded-xl gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                      <Layers className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-on-surface dark:text-white">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-on-surface-variant dark:text-zinc-500 truncate">{service.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setSelectedServiceForEdit(service); setIsServiceModalOpen(true); }} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if (confirm(`Delete "${service.name}"? Queues linked to this service may be affected.`)) deleteServiceMutation.mutate(service.id); }}
                      className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                </QuotaFreezeGuard>
              ))
            )}
          </div>
        )}
      </div>

      {isServiceModalOpen && (
        <ServiceModal 
          isOpen={isServiceModalOpen} 
          onClose={() => setIsServiceModalOpen(false)} 
          service={selectedServiceForEdit} 
          locationId={selectedServiceLocationId !== 'all' ? selectedServiceLocationId : undefined}
        />
      )}
    </>
  );
}
