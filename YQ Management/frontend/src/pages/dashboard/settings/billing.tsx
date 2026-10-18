import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import BillingSettings from '../../../components/settings/billing';

export default function billingSettingsPage() {
  return (
    <>
      <Head>
        <title>Billing & Usage | Settings</title>
      </Head>

      <div className="flex flex-col gap-8 w-full mx-auto">
        <BillingSettings />
      </div>
    </>
  );
}


billingSettingsPage.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <SettingsLayout pageTitle="Billing & Usage" pageSubtitle="Manage your plan, payment methods, and monitor usage.">
      {page}
    </SettingsLayout>
  );
};
