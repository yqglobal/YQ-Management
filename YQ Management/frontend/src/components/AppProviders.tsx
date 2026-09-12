import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { toast, Toaster } from 'sonner';

import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeProvider';
import { TrackingProvider } from './TrackingProvider';
import { SocketProvider } from './SocketProvider';
import { LocationProvider } from './LocationContext';
import { MaintenanceOverlay } from './MaintenanceOverlay';
import { ErrorBoundary } from './ErrorBoundary';
import { setApiRouter } from '../lib/api';
import CookieConsent from './CookieConsent';
import dynamic from 'next/dynamic';

const GlobalCommandPalette = dynamic(() => import('./GlobalCommandPalette').then(mod => mod.GlobalCommandPalette), { ssr: false });

function AppRouterSetter() {
  const router = useRouter();
  setApiRouter(router);

  useEffect(() => {
    const handleRouteChangeError = (err: Error & { cancelled?: boolean }, url: string) => {
      if (err.cancelled) return;
      const isChunkLoadError = 
        err.name === 'ChunkLoadError' || 
        err.message?.includes('Failed to fetch dynamically imported module') ||
        err.message?.includes('Loading chunk');

      if (isChunkLoadError) {
        window.location.href = url;
      }
    };
    router.events.on('routeChangeError', handleRouteChangeError);
    return () => {
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router]);
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && ('workbox' in window) && (window as unknown as { workbox: unknown }).workbox !== undefined) {
      const wb = (window as unknown as { workbox: unknown }).workbox as { messageSkipWaiting: () => void, addEventListener: (event: string, cb: () => void) => void };
      const handleUpdate = () => {
        toast('A new version of the app is available.', {
          duration: Infinity,
          action: {
            label: 'Update Now',
            onClick: () => {
              wb.messageSkipWaiting();
              wb.addEventListener('controlling', () => {
                window.location.reload();
              });
            }
          }
        });
      };
      wb.addEventListener('waiting', handleUpdate);
      return () => {
        wb.removeEventListener('waiting', handleUpdate);
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <LocationProvider>
              <SocketProvider>
                <TrackingProvider>
                  <AppRouterSetter />
                  {children}
                  <CookieConsent />
                  <GlobalCommandPalette />
                </TrackingProvider>
              </SocketProvider>
            </LocationProvider>
          </AuthProvider>
          <Toaster position="bottom-right" richColors closeButton />
          <MaintenanceOverlay />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
