import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import {
  Star, Calendar, Building2, RefreshCw, Trash2, ExternalLink,
  CheckCircle2, AlertCircle, ChevronDown, Loader2, Globe, BookOpen,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GoogleIntegration {
  id: string;
  email: string;
  tokenExpiry: string | null;
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
  name: string; // e.g. "accounts/123/locations/456"
  title: string;
  address?: string;
}

interface GBPAccount {
  accountName: string;
  accountDisplayName: string;
  locations: GBPLocation[];
}

// ─── Token Status Badge ─────────────────────────────────────────────────────────

function TokenStatusBadge({ tokenExpiry }: { tokenExpiry: string | null }) {
  if (!tokenExpiry) return (
    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
      <AlertCircle className="w-3 h-3" /> Unknown
    </span>
  );

  const isExpired = new Date(tokenExpiry).getTime() < Date.now();
  return isExpired ? (
    <span className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 font-medium">
      <AlertCircle className="w-3 h-3" /> Token Expired — Re-authorize
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
      <CheckCircle2 className="w-3 h-3" /> Active
    </span>
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
  const { data: calendars, isLoading } = useQuery({
    queryKey: ['google-calendars', integrationId],
    queryFn: () => fetchApi(`/integrations/google/calendars/${integrationId}`),
    enabled: !!integrationId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading calendars…
      </div>
    );
  }

  return (
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
  );
}

// ─── GBP Section per Location ───────────────────────────────────────────────────

function GBPLocationRow({
  location,
  integrationId,
  tenantSubdomain,
}: {
  location: LocationSetting;
  integrationId: string;
  tenantSubdomain: string;
}) {
  const [open, setOpen] = useState(false);
  const [gbpAccounts, setGbpAccounts] = useState<GBPAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedGbpLocation, setSelectedGbpLocation] = useState('');
  const [settingBooking, setSettingBooking] = useState(false);
  const [bookingSet, setBookingSet] = useState(false);

  const bookingUrl = tenantSubdomain
    ? `https://${tenantSubdomain}.qmova.yqbuddy.com/booking`
    : '';

  const loadAccounts = async () => {
    if (!integrationId) return;
    setLoadingAccounts(true);
    try {
      const data = await fetchApi(`/integrations/google/business-accounts/${integrationId}`);
      setGbpAccounts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch Google Business listings');
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
      toast.success('Book Now button added to your Google Business Profile!');
      setBookingSet(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set booking URL');
    } finally {
      setSettingBooking(false);
    }
  };

  if (!integrationId) return null;

  return (
    <div className="border border-blue-100 dark:border-blue-900/40 rounded-xl overflow-hidden">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && gbpAccounts.length === 0) loadAccounts();
        }}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Add "Book Now" to Google Business — <span className="font-normal opacity-70">{location.name}</span>
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 py-4 bg-white dark:bg-zinc-900 space-y-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Select your Google Business Profile listing for this location. We'll add a <strong>Book Now</strong> button 
            that links directly to your Qmova booking page:{' '}
            <span className="font-mono text-blue-600 dark:text-blue-400 break-all">{bookingUrl || 'Configure subdomain first'}</span>
          </p>

          {loadingAccounts ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your Google Business listings…
            </div>
          ) : gbpAccounts.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-zinc-500 italic">No Google Business listings found, or API access not yet approved by Google.</p>
              <button
                onClick={loadAccounts}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : (
            <>
              <select
                value={selectedGbpLocation}
                onChange={(e) => {
                  setSelectedGbpLocation(e.target.value);
                  setBookingSet(false);
                }}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select a GBP Location —</option>
                {gbpAccounts.flatMap(acct =>
                  acct.locations.map(loc => (
                    <option key={loc.name} value={loc.name}>
                      {acct.accountDisplayName} › {loc.title}{loc.address ? ` (${loc.address})` : ''}
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={handleSetBookingUrl}
                disabled={!selectedGbpLocation || !bookingUrl || settingBooking || bookingSet}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                {settingBooking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : bookingSet ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                {bookingSet ? 'Book Now button added!' : settingBooking ? 'Setting…' : 'Add Book Now Button'}
              </button>
            </>
          )}
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
    // If integration changes, reset calendar selection
    if (field === 'googleIntegrationId') {
      updated[index].googleCalendarId = null;
    }
    setLocations(updated);
  };

  const integrations: GoogleIntegration[] = settings?.googleIntegrations || [];
  const tenantSubdomain: string = settings?.tenant?.subdomain || '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Section 1: Connected Accounts ────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M21.35 11.1H12.18v2.73h5.96c-.59 3.4-3.56 5.14-5.96 5.14C8.37 19 5 15.97 5 12S8.2 4.73 12.2 4.73c2.31 0 3.69 1.02 4.59 1.97L18.91 4.6C17.25 2.92 15 2 12.2 2 6.42 2 2 6.8 2 12s4.16 10 10.25 10C17.6 22 22 18.33 22 12.91c0-1.15-.15-1.81-.65-1.81z" fill="#4285F4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Connected Google Accounts</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Connect accounts to sync calendars and access Business Profile features.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?intent=link_tenant`;
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
              <p className="text-sm">No Google accounts connected yet.</p>
              <p className="text-xs mt-1">Connect an account to enable calendar sync and Google Reviews.</p>
            </div>
          ) : (
            integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                    {integration.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{integration.email}</div>
                    <TokenStatusBadge tokenExpiry={integration.tokenExpiry} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {integration.tokenExpiry && new Date(integration.tokenExpiry).getTime() < Date.now() && (
                    <button
                      onClick={() => {
                        window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?intent=link_tenant`;
                      }}
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

      {/* ── Section 2: Location Mapping ─────────────────────────────────── */}
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
                    {/* Google Account */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        Google Account
                      </label>
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

                    {/* Calendar Picker */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                        Sync to Calendar
                      </label>
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

                    {/* Place ID */}
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
                          href={`https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors whitespace-nowrap"
                        >
                          <ExternalLink className="w-3 h-3" /> Find Place ID
                        </a>
                      </div>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        Required for the WhatsApp Smart Review flow. When a customer rates 4+ stars, they'll receive a direct link to leave a Google Review.
                      </p>
                    </div>
                  </div>

                  {/* GBP Booking Button */}
                  {hasIntegration && (
                    <GBPLocationRow
                      location={loc}
                      integrationId={loc.googleIntegrationId!}
                      tenantSubdomain={tenantSubdomain}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 3: Smart Reviews ─────────────────────────────────────── */}
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
          {/* How it works */}
          <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
            <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
              <p className="font-medium">How it works:</p>
              <p>1. Operator marks visit as <strong>Complete</strong></p>
              <p>2. Customer receives a WhatsApp message: <em>"How did we do? Reply 1–5 ⭐"</em></p>
              <p>3. If they rate <strong>4 or 5 stars</strong> → they receive your Google Review link</p>
              <p>4. If they rate <strong>1–3 stars</strong> → your team is notified privately</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="smartReviews" className="text-sm font-medium text-zinc-900 dark:text-white">
                Enable Smart Review Harvesting
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Requires a Google Place ID configured for each location above.
              </p>
            </div>
            <button
              id="smartReviews"
              role="switch"
              aria-checked={enableSmartReviews}
              onClick={() => setEnableSmartReviews(!enableSmartReviews)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                enableSmartReviews ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  enableSmartReviews ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Threshold input */}
          {enableSmartReviews && (
            <div className="space-y-2 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <label htmlFor="threshold" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
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
                  className="w-24 h-10 px-3 text-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">minutes</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Only ask for a review if the customer's total wait was under {reviewWaitThresholdMins} minutes.
                Customers who waited longer are excluded to protect your rating.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Save Button ──────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
