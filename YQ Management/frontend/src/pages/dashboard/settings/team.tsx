import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import StaffSettingsPage from '../../../components/settings/staff';
import { RolesTable as RolesSettingsPage } from '../../../components/settings/RolesTable';
import SecuritySettingsPage from '../../../components/settings/security';
import ProvidersSettings from '../../../components/settings/providers';

type Tab = 'staff' | 'on-ground' | 'roles' | 'security';

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'staff',      label: 'Platform Users',    desc: 'People who log into Qmova' },
  { id: 'on-ground',  label: 'On-Ground Staff',   desc: 'Bookable workers, doctors, waiters, etc.' },
  { id: 'roles',      label: 'Roles & Permissions', desc: '' },
  { id: 'security',   label: 'Security & Access',  desc: '' },
];

export default function TeamSettingsWrapper() {
  const [activeTab, setActiveTab] = useState<Tab>('staff');

  return (
    <>
      <Head>
        <title>Team & Security | Settings | Qmova</title>
      </Head>

      {/* Tab bar */}
      <div className="flex items-end gap-0.5 border-b border-border dark:border-dark-border mb-6 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-start px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300 hover:border-border'
            }`}
          >
            <span>{tab.label}</span>
            {tab.desc && (
              <span className="text-[10px] font-normal text-zinc-400 mt-0.5 hidden sm:block">{tab.desc}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-8 w-full mx-auto">
        {activeTab === 'staff'      && <StaffSettingsPage />}
        {activeTab === 'on-ground'  && (
          <div className="space-y-2">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                <strong>On-Ground Staff</strong> are bookable workers (doctors, nurses, cooks, waiters, etc.) who don&apos;t log into Qmova but are assigned to services and appear in the booking flow. They are the same as what was previously called &ldquo;Providers&rdquo;.
              </p>
            </div>
            <ProvidersSettings />
          </div>
        )}
        {activeTab === 'roles'      && <RolesSettingsPage />}
        {activeTab === 'security'   && <SecuritySettingsPage />}
      </div>
    </>
  );
}


TeamSettingsWrapper.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <SettingsLayout pageTitle="Team & Staff" pageSubtitle="Manage platform users, on-ground staff, roles, and security settings.">
      {page}
    </SettingsLayout>
  );
};
