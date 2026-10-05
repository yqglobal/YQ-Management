import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import TaxSettings from '../../../components/settings/tax';

export default function TaxSettingsPage() {
  return (
    <SettingsLayout pageTitle="Tax & Invoicing" pageSubtitle="Configure tax rates, compliance info, and invoice formatting.">
      <Head>
        <title>Tax & Invoicing | Settings</title>
      </Head>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        <TaxSettings />
      </div>
    </SettingsLayout>
  );
}
