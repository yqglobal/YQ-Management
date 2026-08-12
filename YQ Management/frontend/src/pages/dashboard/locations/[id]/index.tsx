import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';
import { Settings, Users, ArrowLeft, Plus, MapPin, Loader2, Store, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';
import { CreateServiceModal } from '../../../../components/modals/CreateServiceModal';

export default function LocationDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState<'services' | 'resources' | 'settings'>('services');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: location = null, isLoading: isLocationLoading } = useQuery({
    queryKey: ['location', id],
    queryFn: () => fetchApi(`/location/${id}`),
    enabled: !!id,
  });

  const { data: services = [], isLoading: isServicesLoading } = useQuery({
    queryKey: ['location', id, 'services'],
    queryFn: async () => {
      const allServices = await fetchApi('/service');
      return allServices.filter((s: any) => s.locationId === id || !s.locationId);
    },
    enabled: !!id,
  });

  if (isLocationLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </AdminLayout>
    );
  }

  if (!location) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-red-500">Location not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={location.name} pageSubtitle="Manage location details and services">
      <Head>
        <title>{location.name} | Qmova Locations</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/locations" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Store className="w-8 h-8 text-indigo-500" />
              {location.name}
            </h1>
            {location.address && (
              <p className="text-gray-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {location.address}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-white/10 gap-6">
          <TabButton 
            active={activeTab === 'services'} 
            onClick={() => setActiveTab('services')}
            icon={<CalendarClock className="w-4 h-4" />}
            label="Services" 
          />
          <TabButton 
            active={activeTab === 'resources'} 
            onClick={() => setActiveTab('resources')}
            icon={<Users className="w-4 h-4" />}
            label="Resources" 
          />
          <TabButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<Settings className="w-4 h-4" />}
            label="Settings" 
          />
        </div>

        {/* Tab Content */}
        <div className="pt-4">
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Services</h2>
                  <p className="text-sm text-gray-500">Manage services offered at this location.</p>
                </div>
                <button 
                  onClick={() => setIsServiceModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add Service
                </button>
              </div>

              <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-white/5">
                {isServicesLoading ? (
                  <div className="p-8 text-center text-gray-500">Loading services...</div>
                ) : services.length > 0 ? (
                  services.map((service: any) => (
                    <div key={service.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{service.name}</h3>
                        {service.description && <p className="text-sm text-gray-500 mt-1">{service.description}</p>}
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-2">{service.expectedDuration} mins</p>
                      </div>
                      <button className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 rounded-lg transition-colors">
                        Edit
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <p className="mb-4">No services configured for this location yet.</p>
                    <button 
                      onClick={() => setIsServiceModalOpen(true)}
                      className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                    >
                      Add your first service
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Resources</h2>
                  <p className="text-sm text-gray-500">Manage rooms, equipment, or staff at this location.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                  <Plus className="w-4 h-4" /> Add Resource
                </button>
              </div>
              <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-2xl p-12 text-center text-gray-500">
                Resource management coming soon.
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Location Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Location Name</label>
                  <input type="text" defaultValue={location.name} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Address</label>
                  <input type="text" defaultValue={location.address} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="pt-4 flex justify-end">
                  <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateServiceModal 
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        locationId={id as string}
      />
    </AdminLayout>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 pb-3 px-2 border-b-2 font-medium text-sm transition-colors ${
        active 
          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' 
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
      }`}
    >
      {icon} {label}
    </button>
  );
}