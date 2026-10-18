import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import PaymentsSettings from '../../../components/settings/payments';
import TaxSettings from '../../../components/settings/tax';

export default function paymentsSettingsPage() {
  return (
    <>
      <Head>
        <title>Payments & Tax | Settings</title>
      </Head>

      <div className="flex flex-col gap-8 w-full mx-auto">
        <PaymentsSettings />
        <TaxSettings />
      </div>
    </>
  );
}


paymentsSettingsPage.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <SettingsLayout pageTitle="Payments & Invoicing" pageSubtitle="Manage payment providers, accounts, and invoicing rules.">
      {page}
    </SettingsLayout>
  );
};
