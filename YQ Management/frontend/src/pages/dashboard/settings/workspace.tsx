import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import WorkspaceSettingsPage from './_components/workspace';
import CustomerExperienceSettings from './_components/experience';
import AnnouncementsSettings from './_components/announcements';

export default function workspaceSettingsPage() {
  return (
    <SettingsLayout pageTitle="Workspace & Identity" pageSubtitle="Manage your organization's core settings and branding.">
      <Head>
        <title>Workspace & Identity | Settings</title>
      </Head>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        <WorkspaceSettingsPage />
        <CustomerExperienceSettings />
        <AnnouncementsSettings />
      </div>
    </SettingsLayout>
  );
}
