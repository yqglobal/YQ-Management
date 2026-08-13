import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { Save, Loader2, User } from 'lucide-react';
import { useAuth } from '../../../components/AuthContext';
import { fetchApi } from '../../../lib/api';
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
    <SettingsLayout pageTitle="Personal Profile" pageSubtitle="Manage your personal details and display preferences">
      <Head>
        <title>Personal Profile | Qmova</title>
      </Head>

      <div className="space-y-8 max-w-3xl p-6 md:p-8">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
          </div>

          <div className="space-y-6">
            <div className="grid gap-6 p-6 border border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/20">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-200 dark:border-white/10 pb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/5 rounded-xl bg-gray-100 dark:bg-zinc-800/50 text-gray-500 dark:text-zinc-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2">Email cannot be changed.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    placeholder="+1 555-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Location / City</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    placeholder="New York, NY"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Interface Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="ar">العربية</option>
                  <option value="hi">हिन्दी</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 rounded-xl hover:border-gray-300 dark:hover:border-white/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 bg-white dark:bg-black/50"
                  />
                  <div>
                    <span className="block text-sm font-medium text-gray-900 dark:text-zinc-100">In-App Notifications</span>
                    <span className="block text-sm text-gray-500 dark:text-zinc-500 mt-1">Receive alerts when someone joins your queue or sends a message.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={savePersonalSettings}
            disabled={savingPersonal}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {savingPersonal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Profile
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
