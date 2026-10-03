import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import StaffSettingsPage from '../../../components/settings/staff';
import RolesSettingsPage from '../../../components/settings/RolesTable';
import SecuritySettingsPage from '../../../components/settings/security';

export default function TeamSettingsWrapper() {
  const [activeTab, setActiveTab] = useState<'staff' | 'roles' | 'security'>('staff');

  return (
    <SettingsLayout pageTitle="Team & Security" pageSubtitle="Manage your staff, roles, and workspace security.">
      <Head>
        <title>Team & Security | Settings | Qmova</title>
      </Head>

      <div className="flex space-x-1 border-b border-border dark:border-dark-border mb-6">
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'staff'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Staff Directory
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'roles'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Security & Access
        </button>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        {activeTab === 'staff' && <StaffSettingsPage />}
        {activeTab === 'roles' && <RolesSettingsPage />}
        {activeTab === 'security' && <SecuritySettingsPage />}
      </div>
    </SettingsLayout>
  );
}
