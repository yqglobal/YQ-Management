import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import SLASettings from '../../../components/settings/sla';

export default function slaSettingsPage() {
  return (
    <>
      <Head>
        <title>SLA Policies | Settings</title>
      </Head>

      <div className="flex flex-col gap-8 w-full mx-auto">
        <SLASettings />
      </div>
    </>
  );
}


slaSettingsPage.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <SettingsLayout pageTitle="SLA Policies" pageSubtitle="Manage Service Level Agreements and wait time thresholds.">
      {page}
    </SettingsLayout>
  );
};
