import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { Box, Plus, Trash2, Loader2, MapPin, Pencil, Check, X, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { CreateServiceModal } from '../../../components/modals/CreateServiceModal';

export default function ResourcesSettingsPage() {
  const queryClient = useQueryClient();

  // --- Resources state ---
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceType, setNewResourceType] = useState('Counter');
  const [newResourceServiceIds, setNewResourceServiceIds] = useState<string[]>([]);
  
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editResourceName, setEditResourceName] = useState('');
  const [editResourceType, setEditResourceType] = useState('Counter');
  const [editResourceServiceIds, setEditResourceServiceIds] = useState<string[]>([]);

  // --- Locations state ---
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocCity, setNewLocCity] = useState('');
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editLocName, setEditLocName] = useState('');
  const [editLocAddress, setEditLocAddress] = useState('');
  const [editLocCity, setEditLocCity] = useState('');

  // --- Services state ---
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceDesc, setEditServiceDesc] = useState('');

  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['resources'],
    queryFn: () => fetchApi('/resource'),
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
  });

  // Resource mutations
  const createResourceMutation = useMutation({
    mutationFn: (data: { name: string; type: string; serviceIds?: string[] }) => fetchApi('/resource', {
      method: 'POST', body: JSON.stringify(data)
    }),
    onSuccess: () => {
      setNewResourceName('');
      setNewResourceServiceIds([]);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource added');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add resource')
  });

  const updateResourceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fetchApi(`/resource/${id}`, {
      method: 'PATCH', body: JSON.stringify(data)
    }),
    onSuccess: () => {
      setEditingResourceId(null);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update resource')
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/resource/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource deleted');
    }
  });

  // Location mutations
  const createLocationMutation = useMutation({
    mutationFn: (data: { name: string; address?: string; city?: string }) => fetchApi('/location', {
      method: 'POST', body: JSON.stringify(data)
    }),
    onSuccess: () => {
      setNewLocName(''); setNewLocAddress(''); setNewLocCity('');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      toast.success('Location added');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add location')
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; address?: string; city?: string } }) =>
      fetchApi(`/location/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      setEditingLocId(null);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      toast.success('Location updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update location')
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

  // Service mutations
  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) =>
      fetchApi(`/service/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      setEditingServiceId(null);
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update service')
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/service/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete service')
  });

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResourceName.trim()) return;
    createResourceMutation.mutate({ name: newResourceName, type: newResourceType, serviceIds: newResourceServiceIds });
  };

  const startEditResource = (res: any) => {
    setEditingResourceId(res.id);
    setEditResourceName(res.name || '');
    setEditResourceType(res.type || 'Counter');
    setEditResourceServiceIds(res.services?.map((s: any) => s.id) || []);
  };

  const handleUpdateResource = (id: string) => {
    if (!editResourceName.trim()) return;
    updateResourceMutation.mutate({ id, data: { name: editResourceName, type: editResourceType, serviceIds: editResourceServiceIds } });
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    createLocationMutation.mutate({ name: newLocName, address: newLocAddress || undefined, city: newLocCity || undefined });
  };

  const startEditLocation = (loc: any) => {
    setEditingLocId(loc.id);
    setEditLocName(loc.name || '');
    setEditLocAddress(loc.address || '');
    setEditLocCity(loc.city || '');
  };

  const handleUpdateLocation = (id: string) => {
    if (!editLocName.trim()) return;
    updateLocationMutation.mutate({ id, data: { name: editLocName, address: editLocAddress || undefined, city: editLocCity || undefined } });
  };

  const startEditService = (service: any) => {
    setEditingServiceId(service.id);
    setEditServiceName(service.name || '');
    setEditServiceDesc(service.description || '');
  };

  const handleUpdateService = (id: string) => {
    if (!editServiceName.trim()) return;
    updateServiceMutation.mutate({ id, data: { name: editServiceName, description: editServiceDesc || undefined } });
  };

  return (
    <SettingsLayout pageTitle="Resources & Locations" pageSubtitle="Manage your business locations, desks, rooms, counters, and equipment.">
      <Head>
        <title>Resources & Locations | Settings | Qmova</title>
      </Head>

      {/* ── Locations Section ── */}
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
        </div>

        {/* Add Location Form */}
        <form onSubmit={handleCreateLocation} className="mb-8 bg-surface-container-low dark:bg-zinc-900/40 border border-dashed border-border dark:border-zinc-700 rounded-2xl p-5">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">Add New Location</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Name *</label>
              <input
                type="text"
                value={newLocName}
                onChange={e => setNewLocName(e.target.value)}
                className="w-full bg-canvas dark:bg-zinc-950 border border-border dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-medium"
                placeholder="e.g. Main Branch"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Address</label>
              <input
                type="text"
                value={newLocAddress}
                onChange={e => setNewLocAddress(e.target.value)}
                className="w-full bg-canvas dark:bg-zinc-950 border border-border dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                placeholder="123 Main Street"
              />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">City</label>
                <input
                  type="text"
                  value={newLocCity}
                  onChange={e => setNewLocCity(e.target.value)}
                  className="w-full bg-canvas dark:bg-zinc-950 border border-border dark:border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                  placeholder="Johannesburg"
                />
              </div>
              <button
                type="submit"
                disabled={!newLocName.trim() || createLocationMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50 h-[38px] shrink-0"
              >
                {createLocationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </div>
          </div>
        </form>

        {locationsLoading ? (
          <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-outline" /></div>
        ) : (
          <div className="space-y-3">
            {(locations as any[]).length === 0 ? (
              <div className="text-center p-8 border border-dashed border-border dark:border-dark-border rounded-xl">
                <MapPin className="w-8 h-8 text-outline mx-auto mb-2 opacity-50" />
                <p className="text-on-surface-variant text-sm font-medium">No locations added yet</p>
                <p className="text-xs text-outline mt-1">Add your first business location above to complete setup.</p>
              </div>
            ) : (
              (locations as any[]).map((loc: any) => (
                <div key={loc.id} className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-zinc-900/50 border border-border dark:border-zinc-800 rounded-xl gap-3">
                  {editingLocId === loc.id ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input type="text" value={editLocName} onChange={e => setEditLocName(e.target.value)}
                        className="bg-canvas dark:bg-zinc-900 border border-emerald-500 rounded-lg px-3 py-1.5 text-sm font-medium outline-none" placeholder="Name" autoFocus />
                      <input type="text" value={editLocAddress} onChange={e => setEditLocAddress(e.target.value)}
                        className="bg-canvas dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none" placeholder="Address" />
                      <input type="text" value={editLocCity} onChange={e => setEditLocCity(e.target.value)}
                        className="bg-canvas dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none" placeholder="City" />
                    </div>
                  ) : (
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
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {editingLocId === loc.id ? (
                      <>
                        <button onClick={() => handleUpdateLocation(loc.id)} disabled={updateLocationMutation.isPending}
                          className="p-2 text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Save">
                          {updateLocationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingLocId(null)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditLocation(loc)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete "${loc.name}"? Queues linked to this location will be unlinked.`)) deleteLocationMutation.mutate(loc.id); }}
                          className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Services Section ── */}
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
          <button
            type="button"
            onClick={() => setIsServiceModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Create Service
          </button>
        </div>

        {servicesLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 text-on-surface-variant animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.length === 0 ? (
              <p className="text-sm text-on-surface-variant dark:text-zinc-500 p-4 bg-surface-container-low dark:bg-white/5 rounded-xl border border-dashed border-border dark:border-zinc-700 col-span-full">
                No services added yet. Click "Create Service" to get started.
              </p>
            ) : (
              (services as any[]).map((service: any) => (
                <div key={service.id} className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-zinc-900/50 border border-border dark:border-zinc-800 rounded-xl gap-3">
                  {editingServiceId === service.id ? (
                    <div className="flex-1 grid grid-cols-1 gap-2">
                      <input type="text" value={editServiceName} onChange={e => setEditServiceName(e.target.value)}
                        className="bg-canvas dark:bg-zinc-900 border border-blue-500 rounded-lg px-3 py-1.5 text-sm font-medium outline-none" placeholder="Service Name" autoFocus />
                      <input type="text" value={editServiceDesc} onChange={e => setEditServiceDesc(e.target.value)}
                        className="bg-canvas dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none" placeholder="Description" />
                    </div>
                  ) : (
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
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {editingServiceId === service.id ? (
                      <>
                        <button onClick={() => handleUpdateService(service.id)} disabled={updateServiceMutation.isPending}
                          className="p-2 text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors" title="Save">
                          {updateServiceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingServiceId(null)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEditService(service)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete "${service.name}"? Queues linked to this service may be affected.`)) deleteServiceMutation.mutate(service.id); }}
                          className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Resources Section ── */}
      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-500" />
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Box className="w-5 h-5 text-indigo-500" />
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface dark:text-white">Facility Resources</h2>
            </div>
            <p className="text-on-surface-variant dark:text-zinc-400 font-body-sm text-body-sm">
              Resources can be assigned to customers during service.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateResource} className="flex gap-3 items-end mb-8">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Resource Name</label>
            <input type="text" value={newResourceName} onChange={e => setNewResourceName(e.target.value)}
              className="w-full bg-canvas dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-lg px-4 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm font-medium"
              placeholder="e.g. Counter 3, Exam Room A" />
          </div>
          <div className="w-48">
            <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Type</label>
            <select value={newResourceType} onChange={e => setNewResourceType(e.target.value)}
              className="w-full bg-canvas dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-lg px-4 py-2 outline-none focus:border-primary text-sm font-medium">
              <option value="Counter">Counter / Desk</option>
              <option value="Room">Room</option>
              <option value="Equipment">Equipment</option>
              <option value="Staff">Staff Member</option>
            </select>
          </div>
          <div className="w-64 relative">
             <label className="block text-xs font-semibold text-on-surface-variant mb-1 uppercase tracking-wider">Link Services</label>
             <select 
               className="w-full bg-canvas dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-lg px-4 py-2 outline-none focus:border-primary text-sm font-medium"
               onChange={(e) => {
                 if (e.target.value && !newResourceServiceIds.includes(e.target.value)) {
                   setNewResourceServiceIds([...newResourceServiceIds, e.target.value]);
                 }
                 e.target.value = '';
               }}
             >
               <option value="">+ Add Service</option>
               {services.map((s: any) => (
                 <option key={s.id} value={s.id} disabled={newResourceServiceIds.includes(s.id)}>{s.name}</option>
               ))}
             </select>
             {newResourceServiceIds.length > 0 && (
               <div className="flex flex-wrap gap-1 mt-2 absolute -bottom-8 left-0">
                 {newResourceServiceIds.map(sid => {
                   const srv = services.find((s: any) => s.id === sid);
                   return srv ? (
                     <span key={sid} className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                       {srv.name} <X className="w-3 h-3 cursor-pointer hover:text-blue-800" onClick={() => setNewResourceServiceIds(newResourceServiceIds.filter(id => id !== sid))} />
                     </span>
                   ) : null;
                 })}
               </div>
             )}
          </div>
          <button type="submit" disabled={!newResourceName.trim() || createResourceMutation.isPending}
            className="bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50 h-[38px]">
            {createResourceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>

        {resourcesLoading ? (
          <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-outline" /></div>
        ) : (
          <div className="space-y-3">
            {(resources as any[]).length === 0 ? (
              <div className="text-center p-8 border border-dashed border-border dark:border-dark-border rounded-xl">
                <Box className="w-8 h-8 text-outline mx-auto mb-2 opacity-50" />
                <p className="text-on-surface-variant text-sm font-medium">No resources found</p>
                <p className="text-xs text-outline mt-1">Add counters, rooms, or equipment above.</p>
              </div>
            ) : (
              (resources as any[]).map((res: any) => (
                <div key={res.id} className="flex items-center justify-between p-4 bg-surface-container-low dark:bg-zinc-900/50 border border-border dark:border-zinc-800 rounded-xl gap-3">
                  {editingResourceId === res.id ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input type="text" value={editResourceName} onChange={e => setEditResourceName(e.target.value)}
                        className="bg-canvas dark:bg-zinc-900 border border-indigo-500 rounded-lg px-3 py-1.5 text-sm font-medium outline-none" placeholder="Name" autoFocus />
                      <select value={editResourceType} onChange={e => setEditResourceType(e.target.value)}
                        className="bg-canvas dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none">
                        <option value="Counter">Counter / Desk</option>
                        <option value="Room">Room</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Staff">Staff Member</option>
                      </select>
                      <div className="relative">
                        <select 
                          className="w-full bg-canvas dark:bg-zinc-900 border border-border dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none"
                          onChange={(e) => {
                            if (e.target.value && !editResourceServiceIds.includes(e.target.value)) {
                              setEditResourceServiceIds([...editResourceServiceIds, e.target.value]);
                            }
                            e.target.value = '';
                          }}
                        >
                          <option value="">+ Link Service</option>
                          {services.map((s: any) => (
                            <option key={s.id} value={s.id} disabled={editResourceServiceIds.includes(s.id)}>{s.name}</option>
                          ))}
                        </select>
                        {editResourceServiceIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {editResourceServiceIds.map(sid => {
                              const srv = services.find((s: any) => s.id === sid);
                              return srv ? (
                                <span key={sid} className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  {srv.name} <X className="w-3 h-3 cursor-pointer hover:text-blue-800" onClick={() => setEditResourceServiceIds(editResourceServiceIds.filter(id => id !== sid))} />
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-surface dark:bg-zinc-800 flex items-center justify-center border border-border dark:border-zinc-700">
                        <Box className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-on-surface dark:text-white">{res.name}</p>
                        <div className="flex items-center gap-2">
                           <p className="text-xs text-on-surface-variant dark:text-zinc-500">{res.type || 'Resource'}</p>
                           {res.services && res.services.length > 0 && (
                             <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                               {res.services.length} Linked Service{res.services.length !== 1 ? 's' : ''}
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {editingResourceId === res.id ? (
                      <>
                        <button onClick={() => handleUpdateResource(res.id)} disabled={updateResourceMutation.isPending}
                          className="p-2 text-indigo-600 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Save">
                          {updateResourceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setEditingResourceId(null)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Cancel">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md mr-2 ${res.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                          {res.status || 'AVAILABLE'}
                        </span>
                        <button onClick={() => startEditResource(res)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if (confirm(`Delete ${res.name}?`)) deleteResourceMutation.mutate(res.id); }}
                          className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete resource">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      <CreateServiceModal 
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
      />
    </SettingsLayout>
  );
}
