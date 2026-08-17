import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import ProfileSettingsPage from './_components/profile';
import PrivacySettings from './_components/privacy';

export default function UserProfileSettingsPage() {
  return (
    <SettingsLayout pageTitle="My Profile" pageSubtitle="Manage your personal account settings and preferences.">
      <Head>
        <title>My Profile | Settings</title>
      </Head>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        <ProfileSettingsPage />
        <PrivacySettings />
      </div>
    </SettingsLayout>
  );
}
