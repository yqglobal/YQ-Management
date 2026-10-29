import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import SettingsLayout from '../../../components/SettingsLayout';
import StaffSettingsPage from '../../../components/settings/staff';
import { RolesTable as RolesSettingsPage } from '../../../components/settings/RolesTable';
import SecuritySettingsPage from '../../../components/settings/security';
import ProvidersSettings from '../../../components/settings/providers';
import StaffViewBuilder from '../../../components/settings/StaffViewBuilder';

type Tab = 'staff' | 'on-ground' | 'staff-view' | 'roles' | 'security';

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'staff',      label: 'Platform Users',     desc: 'People who log into Qmova' },
  { id: 'on-ground',  label: 'On-Ground Staff',    desc: 'Bookable workers, doctors, waiters, etc.' },
  { id: 'staff-view', label: 'Staff View Builder', desc: 'Design desk layouts & widget templates' },
  { id: 'roles',      label: 'Roles & Permissions', desc: '' },
  { id: 'security',   label: 'Security & Access',   desc: '' },
];

export default function TeamSettingsWrapper() {
  const router = useRouter();
  
  // Derive activeTab directly from URL query param if present
  const queryTab = (typeof router.query.tab === 'string' && TABS.some(t => t.id === router.query.tab))
    ? (router.query.tab as Tab)
    : null;

  const [localTab, setLocalTab] = useState<Tab>('staff');
  const activeTab = queryTab || localTab;

  const handleTabChange = (tabId: Tab) => {
    setLocalTab(tabId);
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, tab: tabId },
      },
      undefined,
      { shallow: true }
    );
  };

  return (
    <>
      <Head>
        <title>Team & Staff | Settings | Qmova</title>
      </Head>

      {/* Tab bar */}
      <div className="flex items-end gap-0.5 border-b border-border dark:border-dark-border mb-6 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
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
        {activeTab === 'on-ground'  && <ProvidersSettings />}
        {activeTab === 'staff-view' && <StaffViewBuilder />}
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
