import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, getBackendUrl } from '../../lib/api';
import { getTenantUrl, slugify } from '../../lib/utils';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import {
  Star, Calendar, Building2, RefreshCw, Trash2, ExternalLink,
  CheckCircle2, AlertCircle, ChevronDown, Loader2, Globe, BookOpen,
  Copy, Check, Search, MousePointerClick, Link, Sparkles, Info,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GoogleIntegration {
  id: string;
  email: string;
  tokenExpiry: string | null;
  hasRefreshToken?: boolean;
  isRevoked?: boolean;
  isExpired?: boolean;
  createdAt: string;
}

interface LocationSetting {
  id: string;
  name: string;
  googleIntegrationId: string | null;
  googlePlaceId: string | null;
  googleCalendarId: string | null;
}

interface GBPLocation {
  name: string;
  title: string;
  address?: string;
}

interface GBPAccount {
  accountName: string;
  accountDisplayName: string;
  locations: GBPLocation[];
}

// ─── Copy Button ────────────────────────────────────────────────────────────────

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ─── Token Status Badge ─────────────────────────────────────────────────────────

function TokenStatusBadge({
  tokenExpiry,
  hasRefreshToken,
  isRevoked,
  isExpired,
}: {
  tokenExpiry: string | null;
  hasRefreshToken?: boolean;
  isRevoked?: boolean;
  isExpired?: boolean;
}) {
  if (isRevoked || (tokenExpiry && new Date(tokenExpiry).getTime() === 0)) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 font-medium">
        <AlertCircle className="w-3 h-3" /> Token Revoked — Re-authorize
      </span>
    );
  }
  if (isExpired) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 font-medium">
        <AlertCircle className="w-3 h-3" /> Token Expired — Re-authorize
      </span>
    );
  }
  if (hasRefreshToken || !tokenExpiry || new Date(tokenExpiry).getTime() > Date.now()) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        <CheckCircle2 className="w-3 h-3" /> Active
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 font-medium">
      <AlertCircle className="w-3 h-3" /> Token Expired — Re-authorize
    </span>
  );
}

// ─── Manual Setup Guide ─────────────────────────────────────────────────────────

const MANUAL_STEPS = [
  {
    icon: Search,
    title: 'Open Google Business Profile',
    desc: 'Go to business.google.com and sign into your business account.',
    link: { href: 'https://business.google.com', label: 'Open Google Business Profile →' },
  },
  {
    icon: MousePointerClick,
    title: 'Click "Edit profile"',
    desc: 'Select your business location, then click "Edit profile" at the top.',
  },
  {
    icon: Link,
    title: 'Find "Website" or "Appointment links"',
    desc: 'Under "Contact info", find the Website field. Paste your Qmova booking URL. Some business categories show a dedicated "Book an appointment" URL field instead.',
  },
  {
    icon: CheckCircle2,
    title: 'Save and you\'re done!',
    desc: 'Click Save. Within a few hours, your Google listing will show a booking button that takes customers directly to your booking page.',
  },
];

function ManualSetupGuide({
  bookingUrl,
  locations = [],
  tenantSubdomain = '',
}: {
  bookingUrl: string;
  locations?: LocationSetting[];
  tenantSubdomain?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
            <BookOpen className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Manual setup guide</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Do it yourself in 2 minutes — no special permissions needed</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 py-4 space-y-5 border-t border-zinc-100 dark:border-zinc-800">
          {MANUAL_STEPS.map((step, i) => (
            <div key={i} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                {i < MANUAL_STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1.5 mb-0.5" />
                )}
              </div>
              <div className="pb-4 flex-1">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">{step.title}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{step.desc}</div>
                {step.link && (
                  <a
                    href={step.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1.5"
                  >
                    {step.link.label} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {i === 2 && bookingUrl && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center gap-2 p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                      <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 flex-1 break-all">{bookingUrl}</span>
                      <CopyButton value={bookingUrl} />
                    </div>
                    {locations.length > 1 && tenantSubdomain && (
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/60 space-y-1.5">
                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          Or copy location-specific links for separate Google listings:
                        </p>
                        {locations.map((loc) => {
                          const locUrl = getTenantUrl(tenantSubdomain, `/booking/${slugify(loc.name)}`);
                          return (
                            <div key={loc.id} className="flex items-center justify-between gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200/60 dark:border-zinc-700/40 text-xs">
                              <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[140px]">{loc.name}</span>
                              <span className="font-mono text-zinc-500 dark:text-zinc-400 text-[11px] truncate flex-1">{locUrl}</span>
                              <CopyButton value={locUrl} label="Copy" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Calendar Picker ────────────────────────────────────────────────────────────

function CalendarPicker({
  integrationId,
  value,
  onChange,
}: {
  integrationId: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const { data: calendars, isLoading, error } = useQuery({
    queryKey: ['google-calendars', integrationId],
    queryFn: () => fetchApi(`/integrations/google/calendars/${integrationId}`),
    enabled: !!integrationId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading calendars…
      </div>
    );
  }

  const warningItem = (calendars || []).find((c: any) => c.warning);
  const warningMsg = warningItem?.warning || (error as any)?.message;
  const activationUrl = warningItem?.activationUrl;

  return (
    <div className="space-y-1.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <option value="">— Sync to Primary Calendar —</option>
        {(calendars || []).map((cal: any) => (
          <option key={cal.id} value={cal.id}>
            {cal.primary ? '⭐ Primary — ' : ''}{cal.summary}
          </option>
        ))}
      </select>

      {warningMsg && (
        <div className="flex items-start gap-1.5 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 leading-relaxed">
            <span>{warningMsg}</span>
            {activationUrl && (
              <a
                href={activationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Enable Calendar API in Google Cloud Console <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GBP API Section (Auto method) ─────────────────────────────────────────────

function GBPAutoSetup({
  location,
  integrationId,
  bookingUrl,
}: {
  location: LocationSetting;
  integrationId: string;
  bookingUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [gbpAccounts, setGbpAccounts] = useState<GBPAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedGbpLocation, setSelectedGbpLocation] = useState('');
  const [settingBooking, setSettingBooking] = useState(false);
  const [bookingSet, setBookingSet] = useState(false);
  const [apiError, setApiError] = useState('');

  const loadAccounts = async () => {
    if (!integrationId) return;
    setLoadingAccounts(true);
    setApiError('');
    try {
      const data: any = await fetchApi(`/integrations/google/business-accounts/${integrationId}`);
      if (data && data.unapproved) {
        setGbpAccounts([]);
        setApiError(data.message || 'Google Business Profile API requires project approval from Google. Use the manual guide above.');
        return;
      }
      setGbpAccounts(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) {
        setApiError('No Google Business listings found for this account.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch Google Business listings';
      setApiError(msg);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleSetBookingUrl = async () => {
    if (!selectedGbpLocation || !bookingUrl) return;
    setSettingBooking(true);
    try {
      await fetchApi('/integrations/google/booking-button', {
        method: 'POST',
        body: JSON.stringify({
          integrationId,
          gbpLocationName: selectedGbpLocation,
          bookingUrl,
        }),
      });
      toast.success('Booking button added to your Google Business Profile!');
      setBookingSet(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set booking URL');
    } finally {
      setSettingBooking(false);
    }
  };

  return (
    <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 overflow-hidden">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && gbpAccounts.length === 0 && !apiError) loadAccounts();
        }}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Auto-connect via API
              <span className="ml-2 text-xs font-normal px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded">Beta</span>
            </div>
            <div className="text-xs text-blue-700/70 dark:text-blue-400/70">
              Let Qmova set it automatically from your connected Google account
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-blue-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 py-4 bg-white dark:bg-zinc-900 space-y-4 border-t border-blue-100 dark:border-blue-900/30">
          {loadingAccounts ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your Google Business listings…
            </div>
          ) : apiError ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <p className="font-medium mb-1">API access note</p>
                  <p>{apiError}</p>
                  <p className="mt-1.5">The Google Business Profile API requires approval for production use. Use the manual guide above in the meantime — it works just as well.</p>
                </div>
              </div>
              <button
                onClick={loadAccounts}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : gbpAccounts.length > 0 ? (
            <>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select which Google Business listing to update for <strong>{location.name}</strong>.
              </p>
              <select
                value={selectedGbpLocation}
                onChange={(e) => {
                  setSelectedGbpLocation(e.target.value);
                  setBookingSet(false);
                }}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select a listing —</option>
                {gbpAccounts.flatMap(acct =>
                  acct.locations.map(loc => (
                    <option key={loc.name} value={loc.name}>
                      {acct.accountDisplayName} › {loc.title}{loc.address ? ` (${loc.address})` : ''}
                    </option>
                  ))
                )}
              </select>

              <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 flex-wrap">
                <span>URL to apply:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 break-all">{bookingUrl}</span>
              </div>

              <button
                onClick={handleSetBookingUrl}
                disabled={!selectedGbpLocation || !bookingUrl || settingBooking || bookingSet}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {settingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 bookingSet ? <CheckCircle2 className="w-4 h-4" /> :
                 <Globe className="w-4 h-4" />}
                {bookingSet ? 'Booking button applied!' : settingBooking ? 'Applying…' : 'Apply to my Google Business listing'}
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function GoogleBusinessSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [enableSmartReviews, setEnableSmartReviews] = useState(false);
  const [reviewWaitThresholdMins, setReviewWaitThresholdMins] = useState(15);
  const [locations, setLocations] = useState<LocationSetting[]>([]);
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedLocationSlug, setSelectedLocationSlug] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['google-business-settings'],
    queryFn: () => fetchApi('/integrations/google/business-profile'),
  });

  useEffect(() => {
    if (settings) {
      setEnableSmartReviews(settings.tenant?.enableSmartReviews || false);
      setReviewWaitThresholdMins(settings.tenant?.reviewWaitThresholdMins || 15);
      setLocations(JSON.parse(JSON.stringify(settings.locations || [])));
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi('/integrations/google/business-profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-business-settings'] });
      toast.success('Google settings saved.');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const disconnectMutation = useMutation({
    mutationFn: (integrationId: string) =>
      fetchApi(`/integrations/google/${integrationId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-business-settings'] });
      toast.success('Google account disconnected.');
      setDisconnectConfirm(null);
    },
    onError: () => toast.error('Failed to disconnect account'),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        enableSmartReviews,
        reviewWaitThresholdMins,
        locations: locations.map(l => ({
          id: l.id,
          googleIntegrationId: l.googleIntegrationId || null,
          googlePlaceId: l.googlePlaceId || null,
          googleCalendarId: l.googleCalendarId || null,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLocationChange = (index: number, field: string, value: string) => {
    const updated = [...locations];
    (updated[index] as any)[field] = value;
    if (field === 'googleIntegrationId') {
      updated[index].googleCalendarId = null;
    }
    setLocations(updated);
  };

  const integrations: GoogleIntegration[] = settings?.googleIntegrations || [];
  const tenantSubdomain: string = settings?.tenant?.subdomain || user?.tenant?.subdomain || '';

  const getBookingUrlForSlug = (slug?: string) => {
    if (!mounted || !tenantSubdomain) return '';
    if (!slug || slug === 'all') {
      return getTenantUrl(tenantSubdomain, '/booking');
    }
    return getTenantUrl(tenantSubdomain, `/booking/${slug}`);
  };

  const bookingUrl = getBookingUrlForSlug(selectedLocationSlug);
  const globalBookingUrl = mounted && tenantSubdomain ? getTenantUrl(tenantSubdomain, '/booking') : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Hero: Booking URL ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-8 -translate-x-8" />

        <div className="relative space-y-3">
          <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5" />
            Your Qmova Booking Page
          </div>

          <h2 className="text-xl font-bold leading-tight">
            Let customers book directly from Google Search
          </h2>
          <p className="text-sm text-blue-100 leading-relaxed max-w-xl">
            When someone finds your business on Google Maps or Search, they'll see a <strong>"Book an appointment"</strong> button 
            that takes them straight to your Qmova booking page — no calls, no friction.
          </p>

          {locations.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-blue-200 font-medium">Booking link for:</span>
              <button
                type="button"
                onClick={() => setSelectedLocationSlug('all')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  selectedLocationSlug === 'all'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                All Locations (Global)
              </button>
              {locations.map((loc) => {
                const slug = slugify(loc.name);
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setSelectedLocationSlug(slug)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      selectedLocationSlug === slug
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {loc.name}
                  </button>
                );
              })}
            </div>
          )}

          {bookingUrl ? (
            <div className="mt-4 flex items-center gap-2 p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
              <span className="text-sm font-mono text-blue-100 flex-1 break-all">{bookingUrl}</span>
              <CopyButton value={bookingUrl} label="Copy URL" />
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/90 border border-white/30 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Preview
              </a>
            </div>
          ) : (
            <div className="mt-3 text-sm text-blue-200 bg-white/10 rounded-lg px-4 py-2.5">
              ⚠️ Set up your subdomain in Profile settings to generate your booking URL.
            </div>
          )}
        </div>
      </div>

      {/* ── "Add to Google Business" — Main CTA Section ──────────────────── */}
      {bookingUrl && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M21.35 11.1H12.18v2.73h5.96c-.59 3.4-3.56 5.14-5.96 5.14C8.37 19 5 15.97 5 12S8.2 4.73 12.2 4.73c2.31 0 3.69 1.02 4.59 1.97L18.91 4.6C17.25 2.92 15 2 12.2 2 6.42 2 2 6.8 2 12s4.16 10 10.25 10C17.6 22 22 18.33 22 12.91c0-1.15-.15-1.81-.65-1.81z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Add Booking Button to Google Business Profile
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Choose the method that works best for you
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* What the customer sees */}
            <div className="flex gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                <p className="font-semibold mb-1">What your customers will see:</p>
                <p>On Google Search and Google Maps, your listing will show a <strong>"Book an appointment"</strong> or <strong>"Book online"</strong> button. 
                Tapping it opens your Qmova booking page where they can pick a service, date, and time — all without calling you.</p>
              </div>
            </div>

            {/* Method 1: Manual */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Method 1 — Recommended</div>
                <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Works for everyone ✓</span>
              </div>
              <ManualSetupGuide
                bookingUrl={bookingUrl}
                locations={locations}
                tenantSubdomain={tenantSubdomain}
              />
            </div>

            {/* Method 2: Auto API */}
            {integrations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Method 2 — Automatic</div>
                  <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Requires Google account linked ↓</span>
                </div>
                {locations.filter(l => l.googleIntegrationId).map(loc => {
                  const locBookingUrl = locations.length > 1 && loc.name
                    ? getTenantUrl(tenantSubdomain, `/booking/${slugify(loc.name)}`)
                    : (globalBookingUrl || bookingUrl);

                  return (
                    <div key={loc.id} className="mb-3 last:mb-0">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 pl-1">
                        For location: <span className="font-medium text-zinc-700 dark:text-zinc-300">{loc.name}</span>
                      </div>
                      <GBPAutoSetup
                        location={loc}
                        integrationId={loc.googleIntegrationId!}
                        bookingUrl={locBookingUrl}
                      />
                    </div>
                  );
                })}
                {locations.every(l => !l.googleIntegrationId) && (
                  <div className="text-xs text-zinc-400 dark:text-zinc-600 italic p-3 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg">
                    Connect a Google account and map it to a location below to use the automatic method.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section: Connected Google Accounts ───────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none">
                <path d="M21.35 11.1H12.18v2.73h5.96c-.59 3.4-3.56 5.14-5.96 5.14C8.37 19 5 15.97 5 12S8.2 4.73 12.2 4.73c2.31 0 3.69 1.02 4.59 1.97L18.91 4.6C17.25 2.92 15 2 12.2 2 6.42 2 2 6.8 2 12s4.16 10 10.25 10C17.6 22 22 18.33 22 12.91c0-1.15-.15-1.81-.65-1.81z" fill="#4285F4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Connected Google Accounts</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">For calendar sync and auto-connect features</p>
            </div>
          </div>
          <button
            onClick={() => {
              window.location.href = `${getBackendUrl()}/auth/google?intent=link_tenant`;
            }}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Connect Account
          </button>
        </div>

        <div className="p-6 space-y-3">
          {integrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-400 dark:text-zinc-600">
              <Building2 className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No Google accounts connected.</p>
              <p className="text-xs mt-1">Required for calendar sync and auto-connect features. Not needed for manual setup.</p>
            </div>
          ) : (
            integrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                    {integration.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{integration.email}</div>
                    <TokenStatusBadge
                      tokenExpiry={integration.tokenExpiry}
                      hasRefreshToken={integration.hasRefreshToken}
                      isRevoked={integration.isRevoked}
                      isExpired={integration.isExpired}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(integration.isRevoked || integration.isExpired) && (
                    <button
                      onClick={() => { window.location.href = `${getBackendUrl()}/auth/google?intent=link_tenant`; }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-authorize
                    </button>
                  )}
                  {disconnectConfirm === integration.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Remove?</span>
                      <button
                        onClick={() => disconnectMutation.mutate(integration.id)}
                        disabled={disconnectMutation.isPending}
                        className="px-2.5 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {disconnectMutation.isPending ? 'Removing…' : 'Yes, Remove'}
                      </button>
                      <button
                        onClick={() => setDisconnectConfirm(null)}
                        className="px-2.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDisconnectConfirm(integration.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Disconnect"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Section: Location Mapping ─────────────────────────────────────── */}
      {locations.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Location Settings</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Map each location to a Google Account, Calendar, and Business Place ID.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {locations.map((loc, index) => {
              const hasIntegration = !!loc.googleIntegrationId;
              return (
                <div key={loc.id} className="space-y-4 pb-6 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">{loc.name}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Google Account</label>
                      <select
                        value={loc.googleIntegrationId || ''}
                        onChange={(e) => handleLocationChange(index, 'googleIntegrationId', e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                      >
                        <option value="">— No calendar sync —</option>
                        {integrations.map((int) => (
                          <option key={int.id} value={int.id}>{int.email}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Sync to Calendar</label>
                      {hasIntegration ? (
                        <CalendarPicker
                          integrationId={loc.googleIntegrationId!}
                          value={loc.googleCalendarId || ''}
                          onChange={(val) => handleLocationChange(index, 'googleCalendarId', val)}
                        />
                      ) : (
                        <div className="h-10 flex items-center px-3 bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-zinc-400">
                          Connect an account first
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        Google Place ID <span className="font-normal normal-case">(for Review Harvesting)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                          value={loc.googlePlaceId || ''}
                          onChange={(e) => handleLocationChange(index, 'googlePlaceId', e.target.value)}
                          className="flex-1 h-10 px-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono transition-colors"
                        />
                        <a
                          href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors whitespace-nowrap"
                        >
                          <ExternalLink className="w-3 h-3" /> Find Place ID
                        </a>
                      </div>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        Required for Smart Reviews. When a customer rates 4+ stars after their visit, they receive a direct link to leave a Google Review.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section: Smart Reviews ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Smart Review Harvesting</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Automatically ask happy customers for a Google Review via WhatsApp after each visit.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
              <p className="font-semibold">How it works:</p>
              <p>1. Operator marks visit as <strong>Complete</strong></p>
              <p>2. Customer gets a WhatsApp message: <em>"How did we do? Reply 1–5 ⭐"</em></p>
              <p>3. <strong>4 or 5 stars →</strong> they receive your Google Review link</p>
              <p>4. <strong>1–3 stars →</strong> your team is notified privately (protects your rating)</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="smartReviews" className="text-sm font-medium text-zinc-900 dark:text-white">
                Enable Smart Review Harvesting
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Requires a Google Place ID set for each location above.
              </p>
            </div>
            <button
              id="smartReviews"
              role="switch"
              aria-checked={enableSmartReviews}
              onClick={() => setEnableSmartReviews(!enableSmartReviews)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                enableSmartReviews ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enableSmartReviews ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {enableSmartReviews && (
            <div className="space-y-2 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <label htmlFor="threshold" className="text-sm font-medium text-on-surface dark:text-zinc-100">
                Wait Time Threshold
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="threshold"
                  type="number"
                  min={1}
                  max={120}
                  value={reviewWaitThresholdMins}
                  onChange={(e) => setReviewWaitThresholdMins(parseInt(e.target.value) || 15)}
                  className="w-24 h-10 px-3 text-center rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card text-sm font-semibold text-on-surface dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-on-surface-variant dark:text-zinc-400">minutes</span>
              </div>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400">
                Only send a review request if the customer waited less than {reviewWaitThresholdMins} min. Longer waits are excluded to protect your rating.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Save ──────────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

    </div>
  );
}
