import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { fetchApi } from '../lib/api';

interface TrackingContextType {
  trackAction: (actionName: string, details?: Record<string, any>) => void;
}

const TrackingContext = createContext<TrackingContextType>({
  trackAction: () => {},
});

export const useTracking = () => useContext(TrackingContext);

export const TrackingProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  const trackAction = useCallback(async (actionName: string, details: Record<string, any> = {}) => {
    try {
      await fetchApi('/audit/log', {
        method: 'POST',
        body: JSON.stringify({
          action: actionName,
          resource: router.pathname,
          details: { ...details, url: window.location.href }
        })
      });
    } catch (e: any) {
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
