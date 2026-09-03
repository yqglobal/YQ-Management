import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { useAuth } from '../../../../components/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { toast } from 'sonner';

export default function GoogleBusinessSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [enableSmartReviews, setEnableSmartReviews] = useState(false);
  const [reviewWaitThresholdMins, setReviewWaitThresholdMins] = useState(15);
  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['google-business-settings'],
    queryFn: () => fetchApi('/integrations/google/business-profile'),
  });

  useEffect(() => {
    if (settings) {
      setEnableSmartReviews(settings.tenant?.enableSmartReviews || false);
      setReviewWaitThresholdMins(settings.tenant?.reviewWaitThresholdMins || 15);
      // Create a deep copy for local state editing
      setLocations(JSON.parse(JSON.stringify(settings.locations || [])));
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/integrations/google/business-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-business-settings'] });
      toast.success('Google settings updated successfully');
    },
    onError: () => {
      toast.error('Failed to update settings');
    }
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
          googleCalendarId: l.googleCalendarId || null
        }))
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLocationChange = (index: number, field: string, value: string) => {
    const updated = [...locations];
    updated[index][field] = value;
    setLocations(updated);
  };

  const integrations = settings?.googleIntegrations || [];

  if (isLoading) return <div>Loading...</div>;

  return (
    <Card className="bg-surface dark:bg-dark-surface border-border dark:border-dark-border">
      <CardHeader>
        <CardTitle className="text-xl text-on-surface dark:text-zinc-100 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" />
          </svg>
          Google Integrations
        </CardTitle>
        <CardDescription className="text-on-surface-variant dark:text-zinc-400">
          Connect your Google Accounts to sync Calendar appointments and harvest Business Profile reviews.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        
        {/* Connected Accounts Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-on-surface dark:text-white">Connected Google Accounts</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                You can connect multiple accounts if you manage locations under different Google profiles.
              </p>
            </div>
            <Button 
              onClick={() => {
                window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?intent=link_tenant`;
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              + Connect Account
            </Button>
          </div>
          
          <div className="space-y-2">
            {integrations.length === 0 ? (
              <div className="p-4 bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg text-center text-sm text-zinc-500">
                No Google accounts connected yet.
              </div>
            ) : (
              integrations.map((integration: any) => (
                <div key={integration.id} className="flex items-center justify-between p-3 bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                      {integration.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm dark:text-zinc-200">{integration.email}</div>
                      <div className="text-xs text-zinc-500">Connected</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Location Mapping Section */}
        {locations.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border dark:border-dark-border">
            <div>
              <h3 className="text-sm font-medium text-on-surface dark:text-white">Location Mapping</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                Assign a connected Google Account and a Google Business Profile Place ID to each of your locations.
              </p>
            </div>
            
            <div className="space-y-4">
              {locations.map((loc, index) => (
                <div key={loc.id} className="p-4 bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg space-y-4">
                  <div className="font-medium text-sm dark:text-zinc-200">{loc.name}</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">Google Account (For Calendar Sync)</label>
                      <select 
                        value={loc.googleIntegrationId || ''}
                        onChange={(e) => handleLocationChange(index, 'googleIntegrationId', e.target.value)}
                        className="w-full h-10 px-3 py-2 rounded-md bg-surface dark:bg-dark-surface-hover border border-border dark:border-dark-border text-sm dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Do not sync calendar --</option>
                        {integrations.map((int: any) => (
                          <option key={int.id} value={int.id}>{int.email}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-500">Place ID (For Reviews)</label>
                      <Input
                        placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                        value={loc.googlePlaceId || ''}
                        onChange={(e) => handleLocationChange(index, 'googlePlaceId', e.target.value)}
                        className="bg-surface dark:bg-dark-surface-hover border-border dark:border-dark-border text-on-surface dark:text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Smart Reviews Section */}
        <div className="pt-4 border-t border-border dark:border-dark-border flex items-center justify-between">
          <div className="space-y-1">
            <label htmlFor="smartReviews" className="block text-sm font-medium text-on-surface dark:text-zinc-200">
              Smart 5-Star Review Harvesting
            </label>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400">
              Automatically send an SMS asking for a Google Review if the customer's wait time was short.
            </p>
          </div>
          <input
            type="checkbox"
            id="smartReviews"
            checked={enableSmartReviews}
            onChange={(e) => setEnableSmartReviews(e.target.checked)}
            className="w-5 h-5 rounded border-border dark:border-dark-border text-emerald-600 focus:ring-emerald-500"
          />
        </div>

        {enableSmartReviews && (
          <div className="space-y-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-100 dark:border-emerald-800/30">
            <label htmlFor="threshold" className="block text-sm font-medium text-on-surface dark:text-zinc-200">
              Wait Time Threshold (Minutes)
            </label>
            <Input
              id="threshold"
              type="number"
              value={reviewWaitThresholdMins}
              onChange={(e) => setReviewWaitThresholdMins(parseInt(e.target.value) || 15)}
              className="bg-surface dark:bg-dark-surface-hover border-border dark:border-dark-border text-on-surface dark:text-zinc-100 max-w-[120px]"
            />
            <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
              We will only ask for a review if the customer waited less than {reviewWaitThresholdMins} minutes.
            </p>
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
        
      </CardContent>
    </Card>
  );
}
