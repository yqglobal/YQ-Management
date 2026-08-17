import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { PremiumFeatureGate } from '../../../../components/PremiumFeatureGate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';
import { Bot, Save, Loader2, Sparkles, MessageSquare, Zap } from 'lucide-react';
import { Button } from '../../../../components/ui/button';

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
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#8b5cf6]"></div>

      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-[#8b5cf6]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">AI Assistant Chatbot</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Configure automated responses and conversational flows.</p>
        </div>
      </div>

      <PremiumFeatureGate 
        featureKey="whatsappChatbot" 
        featureName="AI WhatsApp Chatbot" 
        description="Automate your waiting room with a 2-way conversational bot that handles status checks, cancellations, and frequently asked questions."
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-12 text-outline">
            <Loader2 strokeWidth={1.5} className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${chatbotEnabled ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'bg-surface-container-low dark:bg-black/50 text-outline'}`}>
                  <Bot strokeWidth={1.5} className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white flex items-center gap-2 tracking-tight font-semibold">
                    Enable AI Chatbot
                  </h3>
                  <p className="font-body-sm text-on-surface-variant dark:text-outline mt-1">Allow the bot to respond to inbound WhatsApp messages.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={chatbotEnabled}
                  onChange={(e) => setChatbotEnabled(e.target.checked)}
                />
                <div className="w-14 h-7 bg-surface-container-highest dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-[#8b5cf6]"></div>
              </label>
            </div>

            <div className={`transition-opacity duration-300 ${!chatbotEnabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="space-y-8">
                {/* Chatbot Persona */}
                <section>
                  <div className="flex items-center gap-2 mb-4 border-b border-border dark:border-dark-border pb-2">
                    <Sparkles strokeWidth={1.5} className="w-5 h-5 text-on-surface-variant dark:text-outline" />
                    <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white tracking-tight font-semibold">Chatbot Persona</h3>
                  </div>
                  
                  <div className="bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border p-6 rounded-2xl shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider">Bot Name</label>
                        <input
                          type="text"
                          value={config.botName}
                          onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                          className="w-full h-[44px] px-4 bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-lg font-body-md text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6] shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider">Human Agent Name (Fallback)</label>
                        <input
                          type="text"
                          value={config.agentName}
                          onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                          className="w-full h-[44px] px-4 bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-lg font-body-md text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6] shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider">Welcome Message</label>
                      <textarea
                        value={config.welcomeMessage}
                        onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                        rows={3}
                        className="w-full p-4 bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-lg font-body-md text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-[#8b5cf6] focus:border-[#8b5cf6] shadow-sm resize-none"
                      />
                      <p className="font-body-sm text-outline mt-1">Sent when a customer initiates a new conversation without scanning a specific QR code.</p>
                    </div>
                  </div>
                </section>

                {/* Quick Replies */}
                <section>
                  <div className="flex items-center gap-2 mb-4 border-b border-border dark:border-dark-border pb-2">
                    <Zap strokeWidth={1.5} className="w-5 h-5 text-on-surface-variant dark:text-outline" />
                    <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white tracking-tight font-semibold">Quick Replies (Automated Actions)</h3>
                  </div>
                  
                  <div className="bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border p-6 rounded-2xl shadow-sm space-y-4">
                    <label className="flex items-start gap-4 p-4 bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-xl cursor-pointer hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors">
                      <div className="mt-1">
                        <input 
                          type="checkbox" 
                          checked={config.quickReplies.status} 
                          onChange={(e) => setConfig({ ...config, quickReplies: { ...config.quickReplies, status: e.target.checked } })}
                          className="w-5 h-5 text-[#8b5cf6] rounded border-gray-300 focus:ring-[#8b5cf6]"
                        />
                      </div>
                      <div>
                        <span className="font-body-md font-bold text-on-surface dark:text-white block">Queue Status Check</span>
                        <span className="font-body-sm text-on-surface-variant dark:text-outline block mt-0.5">Allows customers to reply with "Status" to get their live ETA.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-4 p-4 bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-xl cursor-pointer hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors">
                      <div className="mt-1">
                        <input 
                          type="checkbox" 
                          checked={config.quickReplies.cancel} 
                          onChange={(e) => setConfig({ ...config, quickReplies: { ...config.quickReplies, cancel: e.target.checked } })}
                          className="w-5 h-5 text-[#8b5cf6] rounded border-gray-300 focus:ring-[#8b5cf6]"
                        />
                      </div>
                      <div>
                        <span className="font-body-md font-bold text-on-surface dark:text-white block">Cancel Visit</span>
                        <span className="font-body-sm text-on-surface-variant dark:text-outline block mt-0.5">Allows customers to reply with "Cancel" to automatically leave the queue.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-4 p-4 bg-white dark:bg-black/50 border border-border dark:border-dark-border rounded-xl cursor-pointer hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors">
                      <div className="mt-1">
                        <input 
                          type="checkbox" 
                          checked={config.quickReplies.human} 
                          onChange={(e) => setConfig({ ...config, quickReplies: { ...config.quickReplies, human: e.target.checked } })}
                          className="w-5 h-5 text-[#8b5cf6] rounded border-gray-300 focus:ring-[#8b5cf6]"
                        />
                      </div>
                      <div>
                        <span className="font-body-md font-bold text-on-surface dark:text-white block">Speak to Human</span>
                        <span className="font-body-sm text-on-surface-variant dark:text-outline block mt-0.5">Routes the chat to the dashboard inbox for manual staff intervention.</span>
                      </div>
                    </label>
                  </div>
                </section>
              </div>

              <div className="flex justify-end pt-8 mt-8 border-t border-border dark:border-dark-border">
                <Button 
                  onClick={handleSave} 
                  disabled={updateMutation.isPending}
                  className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-body-md font-semibold h-[44px] px-8 rounded-lg flex items-center justify-center gap-2 shadow-sm"
                >
                  {updateMutation.isPending ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <Save strokeWidth={1.5} className="w-5 h-5" />}
                  Save Chatbot Settings
                </Button>
              </div>
            </div>
          </div>
        )}
      </PremiumFeatureGate>
    </div>
  );
}
