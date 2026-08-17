import React, { useState, useEffect } from 'react';
import { PremiumFeatureGate } from '../../../../components/PremiumFeatureGate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';
import { Volume2, Save, Loader2, PlayCircle } from 'lucide-react';

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
      const targetVoices = voices.filter(v => v.lang.startsWith(config.language.split('-')[0]));
      if (targetVoices.length > 0) {
        utterance.voice = targetVoices[0];
      }

      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Text-to-Speech is not supported in this browser.');
    }
  };

  return (
    <PremiumFeatureGate 
      featureKey="textToSpeech" 
      featureName="Audio Announcements" 
      description="Enhance your waiting room displays with automated Text-to-Speech callouts when it's a customer's turn."
    >
      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
        {/* Decorative left edge accent */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#059669]"></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined text-[#059669]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Public Announcements</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Configure automated audio callouts for display screens.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="font-body-sm font-medium text-on-surface-variant dark:text-outline">Enable TTS</span>
              <div className="relative inline-flex items-center">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#059669]"></div>
              </div>
            </label>
            <button 
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="h-[44px] px-6 bg-[#059669] hover:bg-[#047857] text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <Save strokeWidth={1.5} className="w-5 h-5" />}
              Save
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-outline">Loading...</div>
        ) : (
          <div className={`transition-opacity ${enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Language & Accent</label>
                  <div className="relative">
                    <select
                      value={config.language}
                      onChange={(e) => setConfig({ ...config, language: e.target.value })}
                      className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-[#059669] focus:border-[#059669] outline-none text-on-surface dark:text-white appearance-none"
                    >
                      <option value="en-US">English (United States)</option>
                      <option value="en-GB">English (United Kingdom)</option>
                      <option value="en-ZA">English (South Africa)</option>
                      <option value="es-ES">Spanish (Spain)</option>
                      <option value="fr-FR">French (France)</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                  </div>
                </div>
                
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Voice Type</label>
                  <div className="relative">
                    <select
                      value={config.voice}
                      onChange={(e) => setConfig({ ...config, voice: e.target.value })}
                      className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-[#059669] focus:border-[#059669] outline-none text-on-surface dark:text-white appearance-none"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Announcement Template</label>
                  <textarea
                    value={config.template}
                    onChange={(e) => setConfig({ ...config, template: e.target.value })}
                    rows={2}
                    className="w-full h-[104px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg p-4 font-data-mono text-[14px] leading-relaxed focus:ring-1 focus:ring-[#059669] focus:border-[#059669] outline-none text-on-surface dark:text-white resize-none"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-[12px] text-outline font-data-mono">Vars: {'{{token}}'}, {'{{resource}}'}</p>
                    <button 
                      onClick={handleTestAudio} 
                      className="text-[#059669] hover:text-[#047857] font-body-sm font-semibold flex items-center gap-1"
                    >
                      <PlayCircle strokeWidth={1.5} className="w-4 h-4" /> Preview
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PremiumFeatureGate>
  );
}
