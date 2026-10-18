import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import SettingsLayout from '../../../components/SettingsLayout';
import WhatsAppSettings from '../../../components/settings/whatsapp';
import ChatbotSettings from '../../../components/settings/chatbot';
import WebhooksSettings from '../../../components/settings/webhooks';
import AnnouncementsSettings from '../../../components/settings/announcements';
import GoogleBusinessSettings from '../../../components/settings/google-business';
import MessageTemplatesSettings from '../../../components/settings/message-templates';

type TabId = 'whatsapp' | 'templates' | 'announcements' | 'webhooks' | 'google';

const TABS: { id: TabId; label: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'templates', label: 'Messaging Templates' },
  { id: 'announcements', label: 'AI Announcements' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'google', label: 'Google' },
];

export default function IntegrationsSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('whatsapp');

  useEffect(() => {
    if (router.query.googleAuth === 'success') {
      setActiveTab('google');
      toast.success('Successfully connected to Google!');
      router.replace('/dashboard/settings/integrations', undefined, { shallow: true });
    } else if (router.query.googleAuth === 'error') {
      setActiveTab('google');
      toast.error('Failed to connect to Google. Please try again.');
      router.replace('/dashboard/settings/integrations', undefined, { shallow: true });
    } else if (router.query.tab) {
      setActiveTab(router.query.tab as TabId);
    }
  }, [router.query]);

  return (
    <>
      <Head>
        <title>Integrations & Comms | Settings</title>
      </Head>

      <div className="flex space-x-1 border-b border-border dark:border-dark-border mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant dark:text-zinc-400 hover:text-on-surface dark:hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-8 w-full mx-auto">
        {activeTab === 'whatsapp' && (
          <>
            <WhatsAppSettings />
            <ChatbotSettings />
          </>
        )}
        {activeTab === 'templates' && <MessageTemplatesSettings />}
        {activeTab === 'announcements' && <AnnouncementsSettings />}
        {activeTab === 'webhooks' && <WebhooksSettings />}
        {activeTab === 'google' && <GoogleBusinessSettings />}
      </div>
    </>
  );
}


IntegrationsSettingsPage.getLayout = function getLayout(page: React.ReactElement) {
  return (
    <SettingsLayout pageTitle="Integrations & Comms" pageSubtitle="Manage WhatsApp, webhooks, AI announcements, and Google integrations.">
      {page}
    </SettingsLayout>
  );
};
