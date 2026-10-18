import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import ProfileSettingsPage from '../../../components/settings/profile';

export default function PersonalSettingsWrapper() {
  return (
    <>
      <Head>
        <title>Personal Settings | Qmova</title>
      </Head>

      <div className="flex flex-col gap-8 w-full mx-auto">
        <ProfileSettingsPage />
      </div>
    </>
  );
}

PersonalSettingsWrapper.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <SettingsLayout pageTitle="Personal Settings" pageSubtitle="Manage your personal profile and preferences.">
      {page}
    </SettingsLayout>
  );
};
