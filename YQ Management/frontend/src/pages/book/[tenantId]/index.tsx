import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchApi } from '../../../lib/api';
import { Loader2 } from 'lucide-react';

export default function PublicBookingPage() {
  const router = useRouter();
  const { tenantId } = router.query;

  useEffect(() => {
    if (tenantId && typeof tenantId === 'string') {
      fetchApi(`/tenant/public/${tenantId}`)
        .then((t: any) => {
          if (t?.subdomain) {
            router.replace(`/_tenant/${t.subdomain}/booking`);
          } else {
            router.replace(`/_tenant/${tenantId}/booking`);
          }
        })
        .catch(() => {
          router.replace(`/_tenant/${tenantId}/booking`);
        });
    }
  }, [tenantId, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center p-4">
      <Head>
        <title>Loading Booking Portal...</title>
      </Head>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Opening secure booking portal...</p>
      </div>
    </div>
  );
}
