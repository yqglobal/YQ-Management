import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import StaffSettings from './_components/staff';
import SecuritySettings from './_components/security';
import AuditLogsPage from './_components/audit';
import ComplianceSettings from './_components/compliance';
import PrivacySettings from './_components/privacy';

export default function TeamSettingsPage() {
  const [activeTab, setActiveTab] = useState<'staff' | 'devices' | 'audit' | 'policies'>('staff');

  return (
    <SettingsLayout pageTitle="Team & Security" pageSubtitle="Manage your staff, security policies, and access control.">
      <Head>
        <title>Team & Security | Settings</title>
      </Head>

      <div className="flex space-x-1 border-b border-border dark:border-dark-border mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'staff'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Staff Management
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'devices'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Devices & Sessions
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'policies'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Compliance & Privacy
        </button>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        {activeTab === 'staff' && <StaffSettings />}
        {activeTab === 'devices' && <SecuritySettings />}
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
