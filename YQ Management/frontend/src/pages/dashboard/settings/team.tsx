import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import StaffSettings from './_components/staff';
import SecuritySettings from './_components/security';
import AuditLogsPage from './_components/audit';
import ComplianceSettings from './_components/compliance';
import PrivacySettings from './_components/privacy';
import { RolesTable } from '../../../components/settings/RolesTable';

export default function TeamSettingsPage() {
  const [activeTab, setActiveTab] = useState<'team' | 'roles' | 'security' | 'audit' | 'policies'>('team');

  return (
    <SettingsLayout pageTitle="Team & Access" pageSubtitle="Manage your members, providers, roles, and security policies.">
      <Head>
        <title>Team & Access | Settings</title>
      </Head>

      <div className="flex space-x-1 border-b border-border dark:border-dark-border mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'team'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Team & Providers
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'roles'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Devices & Security
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Activity Logs
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'policies'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Compliance
        </button>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        {activeTab === 'team' && <StaffSettings />}
        {activeTab === 'roles' && <RolesTable />}
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'audit' && <AuditLogsPage />}
        {activeTab === 'policies' && (
          <>
            <ComplianceSettings />
            <PrivacySettings />
          </>
        )}
      </div>
    </SettingsLayout>
  );
}
