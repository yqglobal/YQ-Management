import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { PremiumFeatureGate } from '../../../components/PremiumFeatureGate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { Volume2, Save, Loader2, PlayCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function AnnouncementsSettings() {
  const queryClient = useQueryClient();
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me'),
  });

  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState({
    language: 'en-US',
    voice: 'female',
    template: 'Ticket number {{token}}, please proceed to {{resource}}',
  });

  useEffect(() => {
    if (tenant?.customerExperience?.ttsAnnouncements) {
      const tts = tenant.customerExperience.ttsAnnouncements;
      setEnabled(tts.enabled ?? false);
      setConfig({
        language: tts.language || 'en-US',
        voice: tts.voice || 'female',
        template: tts.template || 'Ticket number {{token}}, please proceed to {{resource}}',
      });
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => fetchApi(`/tenant/${tenant?.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      toast.success('Announcement settings saved successfully');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = () => {
    updateMutation.mutate({
      customerExperience: {
        ...(tenant?.customerExperience || {}),
        ttsAnnouncements: {
          enabled,
          ...config
        }
      }
    });
  };

  const handleTestAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const text = config.template.replace('{{token}}', 'A 1 2').replace('{{resource}}', 'Counter 4');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = config.language;
      
      const voices = window.speechSynthesis.getVoices();
      // Simple heuristic for voice gender (API doesn't strictly define gender, but we can try to match name)
      const targetVoices = voices.filter(v => v.lang.startsWith(config.language.split('-')[0]));
      if (targetVoices.length > 0) {
        // Fallback to first available matching language if we can't reliably determine gender
        utterance.voice = targetVoices[0];
      }

      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-Speech is not supported in this browser.');
    }
  };

  return (
    <SettingsLayout pageTitle="Audio Announcements" pageSubtitle="Manage text-to-speech for your waiting room displays">
      <Head>
        <title>Announcements | Qmova</title>
      </Head>

      <PremiumFeatureGate 
        featureKey="textToSpeech" 
        featureName="Audio Announcements" 
        description="Enhance your waiting room displays with automated Text-to-Speech callouts when it's a customer's turn."
      >
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading settings...</div>
        ) : (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-6 rounded-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-indigo-500" /> Enable Audio Callouts
                </h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Play an audio announcement on the public Queue Display screen when a token is called.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-6 rounded-2xl space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-white/10 pb-4">Voice Configuration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Language & Accent</label>
                  <select
                    value={config.language}
                    onChange={(e) => setConfig({ ...config, language: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500"
                  >
                    <option value="en-US">English (United States)</option>
                    <option value="en-GB">English (United Kingdom)</option>
                    <option value="en-ZA">English (South Africa)</option>
                    <option value="es-ES">Spanish (Spain)</option>
                    <option value="fr-FR">French (France)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Voice Type</label>
                  <select
                    value={config.voice}
                    onChange={(e) => setConfig({ ...config, voice: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Announcement Template</label>
                <textarea
                  value={config.template}
                  onChange={(e) => setConfig({ ...config, template: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 resize-none font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">Available variables: <code>{'{{token}}'}</code>, <code>{'{{resource}}'}</code></p>
              </div>

              <div className="pt-2">
                <Button onClick={handleTestAudio} variant="outline" className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4" /> Preview Audio
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave} 
                disabled={updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Announcement Settings
              </Button>
            </div>
          </div>
        )}
      </PremiumFeatureGate>
    </SettingsLayout>
  );
}
