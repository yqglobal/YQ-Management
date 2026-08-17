import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../../../components/AuthContext';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';

export default function ProfileSettingsPage() {
  const { user, refetch } = useAuth();
  const [language, setLanguage] = useState('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user?.personalSettings?.language) {
      setLanguage(user.personalSettings.language);
    }
    if (user?.personalSettings?.notificationsEnabled !== undefined) {
      setNotificationsEnabled(user.personalSettings.notificationsEnabled);
    }
    if (user?.personalSettings?.fullName) {
      setFullName(user.personalSettings.fullName);
    }
    if (user?.personalSettings?.phone) {
      setPhone(user.personalSettings.phone);
    }
    if (user?.personalSettings?.location) {
      setLocation(user.personalSettings.location);
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const savePersonalSettings = async () => {
    setSavingPersonal(true);
    try {
      await fetchApi('/auth/personal-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          language,
          notificationsEnabled,
          fullName,
          phone,
          location
        }),
      });

      await refetch();
      toast.success('Profile settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingPersonal(false);
    }
  };

  return (
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-secondary"></div>
      
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Personal Profile</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Update your contact details and application preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow text-on-surface dark:text-white"
              placeholder="Jane Doe"
            />
          </div>
          
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Email Address</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full h-[44px] bg-surface-container-low dark:bg-zinc-800/50 border border-border dark:border-white/5 rounded-lg px-4 font-body-md text-body-md text-outline cursor-not-allowed"
            />
            <p className="text-[12px] text-outline mt-2">Email cannot be changed.</p>
          </div>
          
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow text-on-surface dark:text-white"
              placeholder="+1 555-0000"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Location / City</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow text-on-surface dark:text-white"
              placeholder="New York, NY"
            />
          </div>

          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Interface Language</label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-[44px] bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow text-on-surface dark:text-white appearance-none"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="ar">العربية</option>
                <option value="hi">हिन्दी</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
            </div>
          </div>

          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Preferences</label>
            <label className="flex items-center gap-3 cursor-pointer p-4 bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-xl hover:border-outline transition-colors h-[72px]">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="w-5 h-5 text-primary border-border rounded focus:ring-primary bg-surface-container-low dark:bg-black/50"
              />
              <div className="flex flex-col justify-center">
                <span className="font-body-md text-on-surface dark:text-white font-medium leading-none">In-App Notifications</span>
                <span className="text-[12px] text-outline mt-1 leading-none">Alerts when queues update.</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border dark:border-dark-border flex justify-end">
        <button
          onClick={savePersonalSettings}
          disabled={savingPersonal}
          className="h-[44px] px-6 bg-primary hover:bg-primary-container text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {savingPersonal ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <Save strokeWidth={1.5} className="w-5 h-5" />}
          Save Profile
        </button>
      </div>
    </div>
  );
}
