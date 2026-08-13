import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { PremiumFeatureGate } from '../../../components/PremiumFeatureGate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { Bot, Save, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function ChatbotSettings() {
  const queryClient = useQueryClient();
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me'),
  });

  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [config, setConfig] = useState({
    botName: 'Qmova Assistant',
    agentName: 'Support Team',
    welcomeMessage: 'Hi there! I am your automated assistant. How can I help you today?',
    quickReplies: {
      status: true,
      cancel: true,
      human: true,
    }
  });

  useEffect(() => {
    if (tenant) {
      setChatbotEnabled(tenant.chatbotEnabled ?? false);
      if (tenant.chatbotConfig) {
        setConfig((prev) => ({ ...prev, ...tenant.chatbotConfig }));
      }
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => fetchApi(`/tenant/${tenant?.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      toast.success('Chatbot settings saved successfully');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = () => {
    updateMutation.mutate({
      chatbotEnabled,
      chatbotConfig: config,
    });
  };

  return (
    <SettingsLayout pageTitle="WhatsApp Chatbot" pageSubtitle="Automate customer interactions via WhatsApp">
      <Head>
        <title>WhatsApp Chatbot | Qmova</title>
      </Head>

      <PremiumFeatureGate 
        featureKey="whatsappChatbot" 
        featureName="AI WhatsApp Chatbot" 
        description="Automate your waiting room with a 2-way conversational bot that handles status checks, cancellations, and frequently asked questions."
      >
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading settings...</div>
        ) : (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-6 rounded-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-500" /> Enable AI Chatbot
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Allow the bot to respond to inbound WhatsApp messages.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={chatbotEnabled}
                  onChange={(e) => setChatbotEnabled(e.target.checked)}
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-6 rounded-2xl space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-white/10 pb-4">Chatbot Persona</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Bot Name</label>
                  <input
                    type="text"
                    value={config.botName}
                    onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Human Agent Name (Fallback)</label>
                  <input
                    type="text"
                    value={config.agentName}
                    onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Welcome Message</label>
                <textarea
                  value={config.welcomeMessage}
                  onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">Sent when a customer initiates a new conversation without scanning a specific QR code.</p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-6 rounded-2xl space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-white/10 pb-4">Quick Replies (Automated Actions)</h3>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.quickReplies.status} 
                    onChange={(e) => setConfig({ ...config, quickReplies: { ...config.quickReplies, status: e.target.checked } })}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300"
                  />
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white block">Queue Status Check</span>
                    <span className="text-sm text-gray-500 block">Allows customers to reply with "Status" to get their live ETA.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.quickReplies.cancel} 
                    onChange={(e) => setConfig({ ...config, quickReplies: { ...config.quickReplies, cancel: e.target.checked } })}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300"
                  />
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white block">Cancel Visit</span>
                    <span className="text-sm text-gray-500 block">Allows customers to reply with "Cancel" to automatically leave the queue.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.quickReplies.human} 
                    onChange={(e) => setConfig({ ...config, quickReplies: { ...config.quickReplies, human: e.target.checked } })}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300"
                  />
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white block">Speak to Human</span>
                    <span className="text-sm text-gray-500 block">Routes the chat to the dashboard inbox for manual staff intervention.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave} 
                disabled={updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Chatbot Settings
              </Button>
            </div>
          </div>
        )}
      </PremiumFeatureGate>
    </SettingsLayout>
  );
}
