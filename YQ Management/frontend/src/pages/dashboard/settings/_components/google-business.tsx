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
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [enableSmartReviews, setEnableSmartReviews] = useState(false);
  const [reviewWaitThresholdMins, setReviewWaitThresholdMins] = useState(15);
  const [saving, setSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['google-business-settings'],
    queryFn: () => fetchApi('/integrations/google/business-profile'),
  });

  useEffect(() => {
    if (settings) {
      setGooglePlaceId(settings.googlePlaceId || '');
      setEnableSmartReviews(settings.enableSmartReviews || false);
      setReviewWaitThresholdMins(settings.reviewWaitThresholdMins || 15);
      setIsConnected(!!settings.googleAccessToken || !!settings.googleRefreshToken);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/integrations/google/business-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-business-settings'] });
      toast.success('Google Business Profile settings updated');
    },
    onError: () => {
      toast.error('Failed to update settings');
    }
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        googlePlaceId,
        enableSmartReviews,
        reviewWaitThresholdMins,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-surface dark:bg-dark-surface border-border dark:border-dark-border">
      <CardHeader>
        <CardTitle className="text-xl text-on-surface dark:text-zinc-100 flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" />
          </svg>
          Google Business Profile
        </CardTitle>
        <CardDescription className="text-on-surface-variant dark:text-zinc-400">
          Turn your Google Maps listing into an automated lead generator and 5-star review engine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          
          <div className="flex items-center justify-between p-4 bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border rounded-lg mb-6">
            <div>
              <h3 className="text-sm font-medium text-on-surface dark:text-white">Google Calendar Sync</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                {isConnected 
                  ? 'Your account is connected to Google. Appointments will be synced automatically.' 
                  : 'Connect your Google account to automatically sync your appointments to Google Calendar.'}
              </p>
            </div>
            {isConnected ? (
              <Button variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800 pointer-events-none">
                Connected
              </Button>
            ) : (
              <Button 
                onClick={() => {
                  window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/integrations/google/connect?tenantId=${user?.tenantId}`;
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Connect to Google
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="googlePlaceId" className="block text-sm font-medium text-on-surface dark:text-zinc-200">
              Google Place ID
            </label>
            <Input
              id="googlePlaceId"
              placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
              value={googlePlaceId}
              onChange={(e) => setGooglePlaceId(e.target.value)}
              className="bg-surface dark:bg-dark-surface-hover border-border dark:border-dark-border text-on-surface dark:text-zinc-100"
            />
            <p className="text-xs text-on-surface-variant dark:text-zinc-400">
              You can find your Place ID using the Google Maps Place ID Finder. This is required to generate direct review links.
            </p>
          </div>
          
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
        </div>
      </CardContent>
    </Card>
  );
}
