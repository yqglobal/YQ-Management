import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { Save, Briefcase, Loader2 } from 'lucide-react';
import { useAuth } from '../../../components/AuthContext';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';

export default function WorkspaceSettingsPage() {
  const { user, refetch } = useAuth();
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantPrimaryColor, setTenantPrimaryColor] = useState('#4f46e5');
  const [tenantLogo, setTenantLogo] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  useEffect(() => {
    if (user?.tenantId && isAdmin) {
      fetchApi('/tenant').then((res) => {
        if (res && res.length > 0) {
          const currentTenant = res.find((t: any) => t.id === user.tenantId) || res[0];
          setTenantName(currentTenant.name || '');
          setTenantPrimaryColor(currentTenant.branding?.primaryColor || '#4f46e5');
          setTenantLogo(currentTenant.branding?.logoUrl || '');
        }
      }).catch(err => console.error("Failed to fetch tenant details:", err));
    }
  }, [user, isAdmin]);

  const saveWorkspaceSettings = async () => {
    setSaving(true);
    try {
      if (user?.tenantId) {
        await fetchApi(`/tenant/${user.tenantId}`, { 
          method: 'PATCH', 
          body: JSON.stringify({ 
            name: tenantName, 
            branding: { 
              primaryColor: tenantPrimaryColor,
              logoUrl: tenantLogo
            } 
          }) 
        });
        await refetch();
        toast.success('Workspace settings saved successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <SettingsLayout pageTitle="Workspace General" pageSubtitle="Manage your company details">
        <div className="p-8 text-center text-gray-500">
          You do not have permission to view workspace settings.
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout pageTitle="Workspace General" pageSubtitle="Manage your company details and branding">
      <Head>
        <title>Workspace Settings | Qmova</title>
      </Head>

      <div className="space-y-8 max-w-3xl p-6 md:p-8">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workspace Configuration</h2>
          </div>

          <div className="space-y-6">
            <div className="grid gap-6 p-6 border border-gray-200 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/20">
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Workspace / Company Name</label>
                  <input
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    placeholder="E.g. Acme Corp"
                  />
                  <p className="text-sm text-gray-500 dark:text-zinc-500 mt-2">This is the name your customers will see on the queue portal.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Brand Color</label>
                    <div className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-white/10 rounded-xl">
                      <input
                        type="color"
                        value={tenantPrimaryColor}
                        onChange={(e) => setTenantPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <span className="text-sm font-mono text-gray-600 dark:text-zinc-400">{tenantPrimaryColor}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Logo URL (Optional)</label>
                    <input
                      type="url"
                      value={tenantLogo}
                      onChange={(e) => setTenantLogo(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow h-[58px]"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={saveWorkspaceSettings}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Workspace
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
