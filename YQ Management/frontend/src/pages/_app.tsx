import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '../components/AuthContext';
import { ThemeProvider } from '../components/ThemeProvider';
import { TrackingProvider } from '../components/TrackingProvider';
import { setApiRouter } from '../lib/api';
import { useRouter } from 'next/router';

import CookieConsent from '../components/CookieConsent';

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
          <TrackingProvider>
            <AppRouterSetter />
            <Component {...pageProps} />
            <CookieConsent />
          </TrackingProvider>
        </AuthProvider>

      </ThemeProvider>

    </QueryClientProvider>
  );
}
