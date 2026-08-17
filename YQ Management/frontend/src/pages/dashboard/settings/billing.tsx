import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import BillingSettings from './_components/billing';

export default function billingSettingsPage() {
  return (
    <SettingsLayout pageTitle="Billing & Usage" pageSubtitle="Manage your plan, payment methods, and monitor usage.">
      <Head>
        <title>Billing & Usage | Settings</title>
      </Head>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        <BillingSettings />
      </div>
    </SettingsLayout>
  );
}
