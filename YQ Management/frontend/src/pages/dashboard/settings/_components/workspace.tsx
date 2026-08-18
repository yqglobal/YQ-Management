import { getTenantUrl } from "../../../../lib/utils";
import React, { useState, useEffect } from 'react';
import { Save, Loader2, Building2, Copy, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../../components/AuthContext';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export default function WorkspaceSettingsPage() {
  const { user, refetch } = useAuth();
  const [saving, setSaving] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState('');
  const [subdomainError, setSubdomainError] = useState('');
  const [tenantPrimaryColor, setTenantPrimaryColor] = useState('#4f46e5');
  const [tenantLogo, setTenantLogo] = useState('');
  const [tenantId, setTenantId] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  const { data: queues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue').catch(() => []),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (user?.tenantId && isAdmin) {
      fetchApi('/tenant').then((res) => {
        if (res && res.length > 0) {
          const currentTenant = res.find((t: any) => t.id === user.tenantId) || res[0];
          setTenantName(currentTenant.name || '');
          setTenantSubdomain(currentTenant.subdomain || '');
          setTenantPrimaryColor(currentTenant.branding?.primaryColor || '#4f46e5');
          setTenantLogo(currentTenant.branding?.logoUrl || '');
          setTenantId(currentTenant.id);
        }
      }).catch(err => console.warn("Failed to fetch tenant details:", err));
    }
  }, [user, isAdmin]);

  const saveWorkspaceSettings = async () => {
    setSaving(true);
    setSubdomainError('');
    try {
      if (user?.tenantId) {
        await fetchApi(`/tenant/${user.tenantId}`, { 
          method: 'PATCH', 
          body: JSON.stringify({ 
            name: tenantName,
            subdomain: tenantSubdomain,
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
      if (err?.status === 409 || err?.message?.includes('taken')) {
        setSubdomainError(err.message || 'This subdomain is already taken. Please choose another.');
      } else {
        toast.error(err.message || 'Failed to save settings');
      }
    } finally {
      setSaving(false);
    }
  };

  const copyLink = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    toast.success(`${label} copied!`);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-outline">
        You do not have permission to view workspace settings.
      </div>
    );
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentTenantId = tenantId || user?.tenantId || '';
  const isLocal = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'));
  const portalUrl = tenantSubdomain ? getTenantUrl(tenantSubdomain) : '';

  return (
    <div className="space-y-8">
      {/* Workspace config card */}
      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden">
        {/* Decorative left edge accent */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary"></div>
        
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Workspace Configuration</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Manage your organization's core details and branding.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Workspace Name</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full h-[44px] bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow text-on-surface dark:text-white"
                placeholder="E.g. Acme Corp"
              />
              <p className="text-[12px] text-outline mt-2">This is the name your customers will see on the queue portal.</p>
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Customer Portal URL</label>
              <div className="flex items-center h-[44px] bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 gap-0 overflow-hidden">
                <span className="text-on-surface-variant dark:text-zinc-500 text-sm font-data-mono whitespace-nowrap shrink-0">{isLocal ? '' : 'https://'}</span>
                <input
                  type="text"
                  value={tenantSubdomain}
                  onChange={(e) => { setTenantSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); setSubdomainError(''); }}
                  className="flex-1 h-full bg-transparent font-data-mono text-body-md outline-none text-on-surface dark:text-white"
                  placeholder="your-company"
                />
                <span className="text-on-surface-variant dark:text-zinc-500 text-sm font-data-mono whitespace-nowrap shrink-0"></span>
              </div>
              {subdomainError ? (
                <p className="text-[12px] text-red-500 mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{subdomainError}</p>
              ) : tenantSubdomain ? (
                <p className="text-[12px] text-emerald-500 mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">link</span>Customers visit: {portalUrl}</p>
              ) : (
                <p className="text-[12px] text-outline mt-2">Used in the customer-facing booking page URL.</p>
              )}
            </div>

            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Brand Color</label>
              <div className="flex items-center gap-3 p-1.5 h-[44px] bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg">
                <input
                  type="color"
                  value={tenantPrimaryColor}
                  onChange={(e) => setTenantPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-body-md font-data-mono text-on-surface-variant dark:text-outline">{tenantPrimaryColor}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-2 uppercase tracking-wide">Logo URL</label>
              <input
                type="url"
                value={tenantLogo}
                onChange={(e) => setTenantLogo(e.target.value)}
                className="w-full h-[44px] bg-surface-container-low dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg px-4 font-body-md text-body-md focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-shadow text-on-surface dark:text-white"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border dark:border-dark-border flex justify-end">
          <button
            onClick={saveWorkspaceSettings}
            disabled={saving}
            className="h-[44px] px-6 bg-primary hover:bg-primary-container text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <Save strokeWidth={1.5} className="w-5 h-5" />}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Customer-Facing Links */}
      <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-500" />
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>link</span>
          <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Customer-Facing Pages</h2>
        </div>
        <p className="font-body-md text-on-surface-variant dark:text-outline mb-6">Share these links with customers or display them on screens.</p>

        <div className="space-y-3">
          {/* TV Display */}
          <LinkRow
            icon="monitor"
            title="TV Lobby Display"
            description="Paste into a browser on your lobby TV or screen share to show a live calling board."
            url={`${baseUrl}/tv/${currentTenantId}`}
            onCopy={() => copyLink(`${baseUrl}/tv/${currentTenantId}`, 'TV display link')}
          />

          {/* Customer portal */}
          {portalUrl && (
            <LinkRow
              icon="smartphone"
              title="Customer Booking Portal"
              description="Customers scan a QR or visit this URL to select a service and join the queue."
              url={portalUrl}
              onCopy={() => copyLink(portalUrl, 'Customer portal link')}
            />
          )}

        </div>
      </div>
    </div>
  );
}

function LinkRow({ icon, title, description, url, onCopy }: {
  icon: string;
  title: string;
  description: string;
  url: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-surface-container-low dark:bg-white/[0.02] border border-border dark:border-dark-border rounded-xl">
      <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-on-surface dark:text-white">{title}</p>
        <p className="text-xs text-on-surface-variant dark:text-zinc-400 mb-1">{description}</p>
        <code className="text-[11px] font-mono text-on-surface-variant dark:text-zinc-400 truncate block">{url}</code>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onCopy}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container dark:bg-white/5 hover:bg-surface-container-high dark:hover:bg-white/10 border border-border dark:border-dark-border transition-colors text-on-surface-variant"
          title="Copy"
        >
          <Copy strokeWidth={1.5} className="w-4 h-4" />
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 dark:hover:bg-primary/30 border border-primary/20 transition-colors text-primary"
          title="Open"
        >
          <ExternalLink strokeWidth={1.5} className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
