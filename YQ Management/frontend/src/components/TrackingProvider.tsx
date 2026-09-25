import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { fetchApi } from '../lib/api';

interface TrackingContextType {
  trackAction: (actionName: string, details?: Record<string, AnyFixMe>) => void;
}

const TrackingContext = createContext<TrackingContextType>({
  trackAction: () => {},
});

export const useTracking = () => useContext(TrackingContext);

export const TrackingProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const lastTrackRef = React.useRef<Record<string, number>>({});

  const trackAction = useCallback(async (actionName: string, details: Record<string, AnyFixMe> = {}) => {
    const now = Date.now();
    const key = `${actionName}:${JSON.stringify(details)}`;
    if (lastTrackRef.current[key] && now - lastTrackRef.current[key] < 5000) {
      return; // Throttle identical events within 5 seconds
    }
    lastTrackRef.current[key] = now;

    try {
      await fetchApi('/audit/log', {
        method: 'POST',
        body: JSON.stringify({
          action: actionName,
          resource: router.pathname,
          details: { ...details, url: window.location.href }
        })
      });
    } catch (e: AnyFixMe) {
      // Silently fail so tracing doesn't block the UI or spam console on network errors
    }
  }, [router.pathname]);

  // Track page views
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackAction('Page View', { url });
    };

    // Track initial load
    trackAction('Page View', { url: window.location.href });

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, trackAction]);

  return (
    <TrackingContext.Provider value={{ trackAction }}>
      {children}
    </TrackingContext.Provider>
  );
};
