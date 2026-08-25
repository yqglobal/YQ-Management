import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

export default function QueueConfirmation() {
  const router = useRouter();
  const { tokenId } = router.query;

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['token', tokenId],
    queryFn: () => fetchApi(`/public-visit/${tokenId}`),
    enabled: !!tokenId,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex items-center justify-center">Loading...</div>;
  }

  if (!statusData) {
    return <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex items-center justify-center">Token not found</div>;
  }
  const { token, position, estimatedWaitTime } = statusData;
  let trackingUrl = '';
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/t/')) {
      const parts = window.location.pathname.split('/');
      const tenantId = parts[2];
      trackingUrl = `${window.location.origin}/t/${tenantId}/status/${token.accessToken || token.id}`;
    } else {
      trackingUrl = `${window.location.origin}/status/${token.accessToken || token.id}`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors">
      <Head>
        <title>You're in line! | Qmova</title>
      </Head>

      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none z-0"></div>

      <div className="w-full max-w-md z-10 text-center">
        
        <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-8 border border-emerald-200 dark:border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h1 className="text-4xl font-bold mb-4">You're in line!</h1>
        <p className="text-gray-500 dark:text-zinc-400 mb-8 text-lg">
          Hello {token.customerName}, your position is secured.
        </p>

        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 mb-8 shadow-xl dark:shadow-[0_0_40px_rgba(0,0,0,0.3)]">
          <div className="text-sm font-medium text-gray-500 dark:text-zinc-500 uppercase tracking-widest mb-2">Your Token</div>
          <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-8 font-mono">{token.displayId || token.id.substring(0, 5).toUpperCase()}</div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 dark:bg-black/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
              <div className="text-xs text-gray-500 dark:text-zinc-500 mb-1 font-medium">POSITION</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">#{position}</div>
            </div>
            <div className="bg-gray-50 dark:bg-black/50 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
              <div className="text-xs text-gray-500 dark:text-zinc-500 mb-1 font-medium">EST WAIT</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">~{estimatedWaitTime}m</div>
            </div>
          </div>

          <div className="flex justify-center mb-4 p-4 bg-white rounded-2xl border border-gray-200">
            <QRCodeSVG 
              value={trackingUrl}
              size={150}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-zinc-500">Scan to track your live status on another device</p>
        </div>

        <Link 
          href={trackingUrl.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || `/status/${token.accessToken || token.id}`}
          className="w-full inline-flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-[0_0_20px_rgba(79,70,229,0.3)]"
        >
          Track Live Status <ArrowRight className="w-5 h-5" />
        </Link>

      </div>
    </div>
  );
}
