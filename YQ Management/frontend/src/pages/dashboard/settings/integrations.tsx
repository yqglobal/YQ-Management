import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import WhatsAppSettings from './_components/whatsapp';
import ChatbotSettings from './_components/chatbot';
import WebhooksSettings from './_components/webhooks';
import AnnouncementsSettings from './_components/announcements';

export default function IntegrationsSettingsPage() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'announcements' | 'webhooks'>('whatsapp');

  return (
    <SettingsLayout pageTitle="Integrations & Comms" pageSubtitle="Manage WhatsApp integration, webhooks, and AI announcements.">
      <Head>
        <title>Integrations & Comms | Settings</title>
      </Head>

      <div className="flex space-x-1 border-b border-border dark:border-dark-border mb-6">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'whatsapp'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          WhatsApp
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'announcements'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          AI Announcements
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'webhooks'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
          }`}
        >
          Webhooks
        </button>
      </div>

      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        {activeTab === 'whatsapp' && (
          <>
            <WhatsAppSettings />
            <ChatbotSettings />
          </>
        )}
        {activeTab === 'announcements' && <AnnouncementsSettings />}
        {activeTab === 'webhooks' && <WebhooksSettings />}
      </div>
    </SettingsLayout>
  );
}
