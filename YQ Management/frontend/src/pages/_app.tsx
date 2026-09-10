import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { AuthProvider } from '../components/AuthContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { TrackingProvider } from '../components/TrackingProvider';
import { SocketProvider } from '../components/SocketProvider';
import { setApiRouter } from '../lib/api';
import { useRouter } from 'next/router';

import CookieConsent from '../components/CookieConsent';
import dynamic from 'next/dynamic';
const GlobalCommandPalette = dynamic(() => import('../components/GlobalCommandPalette').then(mod => mod.GlobalCommandPalette), { ssr: false });
import { Toaster, toast } from 'sonner';

import { LocationProvider } from '../components/LocationContext';
import { MaintenanceOverlay } from '../components/MaintenanceOverlay';
import { ErrorBoundary } from '../components/ErrorBoundary';

function AppRouterSetter() {
  const router = useRouter();
  setApiRouter(router);

  useEffect(() => {
    // Intercept Next.js ChunkLoadErrors during client-side navigation
    const handleRouteChangeError = (err: Error & { cancelled?: boolean }, url: string) => {
      if (err.cancelled) {
        return;
      }
      
      const isChunkLoadError = 
        err.name === 'ChunkLoadError' || 
        err.message?.includes('Failed to fetch dynamically imported module') ||
        err.message?.includes('Loading chunk');

      if (isChunkLoadError) {
        // Hard reload to bypass the chunk load error and get the fresh HTML/chunks from the new deployment
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

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    // Listen for PWA Service Worker updates
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
                  <Component {...pageProps} />
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
