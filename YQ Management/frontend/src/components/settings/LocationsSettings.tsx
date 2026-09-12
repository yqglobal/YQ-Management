import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { MapPin, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LocationModal } from '../modals/LocationModal';
import { QuotaFreezeGuard } from '../QuotaFreezeGuard';
import { QuotaWarningBanner } from '../QuotaWarningBanner';
import { usePlan } from '../../hooks/usePlan';

export function LocationsSettings() {
  const queryClient = useQueryClient();
  const plan = usePlan();
  
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedLocationForEdit, setSelectedLocationForEdit] = useState<unknown>(null);

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
  });

  const deleteLocationMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/location/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      toast.success('Location deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete location')
  });

  return (
    <>
      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-500" />

        <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <MapPin className="w-5 h-5 text-emerald-500" />
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-white">Business Locations</h2>
            </div>
            <p className="text-on-surface-variant dark:text-zinc-400 font-body-sm text-body-sm">
              Add each physical branch your business operates from. Queues and services are linked to a location.
            </p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-sm font-semibold text-on-surface dark:text-white mb-1">{locations.length} of 5 Locations Used</span>
            <div className="w-32 h-2 bg-surface-container-low dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((locations.length / 5) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <QuotaWarningBanner 
          resourceType="locations" 
          frozenCount={plan.frozenCounts?.locations || 0} 
          limit={typeof plan.limits === 'string' ? JSON.parse(plan.limits).maxLocations : plan.limits?.maxLocations} 
        />

        {locationsLoading ? (
          <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-outline" /></div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => { setSelectedLocationForEdit(null); setIsLocationModalOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                Create Location
              </button>
            </div>
            {locations.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-border dark:border-dark-border rounded-xl">
                <MapPin className="w-8 h-8 text-outline mx-auto mb-2 opacity-50" />
                <p className="text-on-surface-variant text-sm font-medium">No locations added yet</p>
                <p className="text-xs text-outline mt-1">Add your first business location above to complete setup.</p>
              </div>
            ) : (
              locations.map((loc: any) => (
                <QuotaFreezeGuard key={loc.id} isFrozen={loc.frozenByQuota} resourceName="location">
                <div className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-zinc-900/50 border border-border dark:border-zinc-800 rounded-xl gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-on-surface dark:text-white">{loc.name}</p>
                      {(loc.address || loc.city) && (
                        <p className="text-xs text-on-surface-variant dark:text-zinc-500 truncate">{[loc.address, loc.city].filter(Boolean).join(', ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => { setSelectedLocationForEdit(loc); setIsLocationModalOpen(true); }} className="p-2 text-on-surface-variant hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium" title="Edit Location">
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => { if (confirm(`Delete "${loc.name}"? Queues linked to this location will be unlinked.`)) deleteLocationMutation.mutate(loc.id); }}
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

      {isLocationModalOpen && (
        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={() => {
            setIsLocationModalOpen(false);
            setSelectedLocationForEdit(null);
          }}
          location={selectedLocationForEdit}
        />
      )}
    </>
  );
}
