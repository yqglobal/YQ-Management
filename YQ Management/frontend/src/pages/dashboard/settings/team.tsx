import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import StaffSettings from './_components/staff';
import SecuritySettings from './_components/security';
import AuditLogsPage from './_components/audit';
import ComplianceSettings from './_components/compliance';
import PrivacySettings from './_components/privacy';

export default function teamSettingsPage() {
  return (
    <SettingsLayout pageTitle="Team & Security" pageSubtitle="Manage your staff, security policies, and access control.">
      <Head>
        <title>Team & Security | Settings</title>
      </Head>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        <StaffSettings />
        <SecuritySettings />
        <AuditLogsPage />
        <ComplianceSettings />
        <PrivacySettings />
      </div>
    </SettingsLayout>
  );
}
