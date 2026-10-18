import React, { useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import SettingsLayout from '../../../components/SettingsLayout';
import ProvidersSettings from '../../../components/settings/providers';
import { LocationsSettings } from '../../../components/settings/LocationsSettings';
import { ServicesSettings } from '../../../components/settings/ServicesSettings';
import { ResourcesSettings } from '../../../components/settings/ResourcesSettings';


export default function ResourcesSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'locations' | 'services' | 'resources' | 'providers'>('locations');

  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab as any);
    }
  }, [router.query.tab]);
  
  return (
    <>
      <Head>
        <title>Operations | Settings | Qmova</title>
      </Head>

      <div className="flex space-x-1 border-b border-border dark:border-dark-border mb-6">
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'locations'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Locations
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'services'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Services
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'resources'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Resources
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'providers'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Providers
        </button>
      </div>

      {activeTab === 'locations' && <LocationsSettings />}
      {activeTab === 'services' && <ServicesSettings />}
      {activeTab === 'resources' && <ResourcesSettings />}
      {activeTab === 'providers' && <ProvidersSettings />}
    </>
  );
}


ResourcesSettingsPage.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <SettingsLayout pageTitle="Operations" pageSubtitle="Manage your business locations, services, and operational resources.">
      {page}
    </SettingsLayout>
  );
};
