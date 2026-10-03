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
  const { tenant } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'locations' | 'services' | 'resources' | 'providers'>('locations');

  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab as any);
    }
  }, [router.query.tab]);
  
  const isJourneyMode = tenant?.operatingMode === 'JOURNEY';

  return (
    <SettingsLayout pageTitle="Operations" pageSubtitle="Manage your business locations, services, and operational resources.">
      <Head>
        <title>Operations | Settings | Qmova</title>
      </Head>

      <div className="flex space-x-1 border-b border-border dark:border-dark-border mb-6">
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'locations'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Locations
        </button>
        {!isJourneyMode && (
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'services'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
            }`}
          >
            Services
          </button>
        )}
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'resources'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Resources
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'providers'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Providers
        </button>
      </div>

      {activeTab === 'locations' && <LocationsSettings />}
      {!isJourneyMode && activeTab === 'services' && <ServicesSettings />}
      {activeTab === 'resources' && <ResourcesSettings />}
      {activeTab === 'providers' && <ProvidersSettings />}
    </SettingsLayout>
  );
}
