import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import WorkspaceSettingsPage from './_components/workspace';
import QRCodesSettings from './_components/qr-codes';
import CustomerExperienceSettings from './_components/experience';

export default function WorkspaceSettingsWrapper() {
  const [activeTab, setActiveTab] = useState<'identity' | 'customer' | 'info'>('identity');

  return (
    <SettingsLayout pageTitle="Workspace & Identity" pageSubtitle="Manage your organization's core settings and branding.">
      <Head>
        <title>Workspace & Identity | Settings</title>
      </Head>

      <div className="flex space-x-1 border-b border-border dark:border-dark-border mb-6">
        <button
          onClick={() => setActiveTab('identity')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'identity'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Identity
        </button>
        <button
          onClick={() => setActiveTab('customer')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'customer'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Customer View
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'info'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Info
        </button>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        {activeTab === 'identity' && <WorkspaceSettingsPage />}
        {activeTab === 'customer' && <CustomerExperienceSettings />}
        {activeTab === 'info' && <QRCodesSettings />}
      </div>
    </SettingsLayout>
  );
}
