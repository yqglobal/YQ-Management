import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '../components/AuthContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { TrackingProvider } from '../components/TrackingProvider';
import { SocketProvider } from '../components/SocketProvider';
import { setApiRouter } from '../lib/api';
import { useRouter } from 'next/router';

import CookieConsent from '../components/CookieConsent';
import { GlobalCommandPalette } from '../components/GlobalCommandPalette';
import { Toaster } from 'sonner';

import { LocationProvider } from '../components/LocationContext';

function AppRouterSetter() {
  const router = useRouter();
  setApiRouter(router);
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
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
      </ThemeProvider>
    </QueryClientProvider>
  );
}
