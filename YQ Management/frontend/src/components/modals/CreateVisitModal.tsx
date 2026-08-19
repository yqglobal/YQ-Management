import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, QrCode } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/router';
import { useAuth } from '../AuthContext';

interface CreateVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocationId?: string;
}

export function CreateVisitModal({ isOpen, onClose, defaultLocationId }: CreateVisitModalProps) {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  const [locationId, setLocationId] = useState(defaultLocationId && defaultLocationId !== 'all' ? defaultLocationId : '');
  const [serviceId, setServiceId] = useState('');
  
  const queryClient = useQueryClient();

  const { data: allLocations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
    enabled: isOpen,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
    enabled: isOpen,
  });

  const { user } = useAuth();
  
  const locations = (user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'ADMIN')
    ? allLocations
    : allLocations.filter((l: any) => user?.allowedLocationIds?.includes(l.id));

  const services = (user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN' || user?.role === 'ADMIN')
    ? allServices
    : allServices.filter((s: any) => user?.allowedServiceIds?.includes(s.id));

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/customer', { method: 'POST', body: JSON.stringify(data) })
  });

  const createVisitMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/visits', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('Walk-in visit created successfully');
      handleClose();
    },
    onError: () => toast.error('Error creating visit'),
  });

  const handleClose = () => {
    setName('');
    setAge('');
    setPhone('');
    setEmail('');
    setLocationId(defaultLocationId && defaultLocationId !== 'all' ? defaultLocationId : '');
    setServiceId('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !locationId || !serviceId) return;
    
    try {
      // 1. Create or find customer
      const customer = await createCustomerMutation.mutateAsync({
        name,
        phone: phone || undefined,
        email: email || undefined,
      });

      // 2. Create visit
      await createVisitMutation.mutateAsync({
        customerId: customer.id,
        locationId,
        serviceId,
        source: 'WALK_IN',
        metadata: age ? { age } : undefined
      });
    } catch (error) {
      toast.error('Failed to create walk-in. Please try again.');
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface dark:bg-dark-card border border-border dark:border-dark-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border dark:border-dark-border bg-surface-container-low dark:bg-black/20">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-on-surface dark:text-white">New Walk-in Visit</h2>
                <button
                  onClick={() => {
                    handleClose();
                    router.push('/dashboard/check-in');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold rounded-lg transition-all"
                >
                  <QrCode className="w-4 h-4" /> Scan QR
                </button>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full bg-surface-container-low dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-2.5 text-on-surface dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Age <span className="text-outline text-[10px]">(Optional)</span></label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    className="w-full bg-surface-container-low dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-2.5 text-on-surface dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    placeholder="e.g. 30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Phone <span className="text-outline text-[10px]">(Optional)</span></label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-surface-container-low dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-2.5 text-on-surface dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Email <span className="text-outline text-[10px]">(Optional)</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-surface-container-low dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-2.5 text-on-surface dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/50"></div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Location <span className="text-red-500">*</span></label>
                  <select 
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full bg-surface-container-low dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-2.5 text-on-surface dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none text-sm cursor-pointer"
                    required
                  >
                    <option value="">Select location...</option>
                    {locations.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Service <span className="text-red-500">*</span></label>
                  <select 
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full bg-surface-container-low dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-2.5 text-on-surface dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none text-sm cursor-pointer disabled:opacity-50"
                    required
                    disabled={!locationId}
                  >
                    <option value="">Select service...</option>
                    {services
                      .filter((s: any) => !s.locationId || s.locationId === locationId)
                      .map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.expectedDuration} min)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-xl font-medium transition-colors text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createCustomerMutation.isPending || createVisitMutation.isPending || !name || !locationId || !serviceId}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 text-sm min-w-[120px]"
                >
                  {(createCustomerMutation.isPending || createVisitMutation.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : 'Create Walk-in'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
