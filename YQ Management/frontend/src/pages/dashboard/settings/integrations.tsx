import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import WhatsAppSettings from './_components/whatsapp';
import ChatbotSettings from './_components/chatbot';
import WebhooksSettings from './_components/webhooks';
import QRCodesSettings from './_components/qr-codes';

export default function integrationsSettingsPage() {
  return (
    <SettingsLayout pageTitle="Integrations & Comms" pageSubtitle="Manage WhatsApp integration, webhooks, and QR code settings.">
      <Head>
        <title>Integrations & Comms | Settings</title>
      </Head>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        <WhatsAppSettings />
        <ChatbotSettings />
        <WebhooksSettings />
        <QRCodesSettings />
      </div>
    </SettingsLayout>
  );
}
