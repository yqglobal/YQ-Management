import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import { Logo } from '../../components/Logo';

export default function CustomerWaitScreen() {
  const router = useRouter();
  const { id } = router.query;
  const tokenId = (router.query.tokenId as string) || "DEMO-123";

  const [position, setPosition] = useState(5);
  const [ewt, setEwt] = useState(25);
  const [status, setStatus] = useState('WAITING');

  useEffect(() => {
    if (!id) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000');
    socket.emit('joinQueueRoom', id as string);

    socket.on('token_serving', (data) => {
      const token = data.token || data;
      if (token.id === tokenId) {
        setStatus('SERVING');
      } else {
        // Decrease position logically
        setPosition(prev => Math.max(1, prev - 1));
        setEwt(prev => Math.max(0, prev - 5)); // Assuming 5 min avg
      }
    });

    socket.on('token_completed', (data) => {
      if (data.tokenId === tokenId) {
        setStatus('COMPLETED');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id, tokenId]);

  if (status === 'COMPLETED') {
    return (
      <div className="bg-surface text-on-surface flex items-center justify-center min-h-screen p-4 sm:p-8 font-body-md text-body-md antialiased">
        <div className="w-full max-w-md mx-auto bg-zinc-950 min-h-screen sm:min-h-[850px] sm:h-[850px] sm:rounded-[2.5rem] sm:border-[8px] border-zinc-800 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center p-8">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-5xl">done_all</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-zinc-50 mb-2 text-center tracking-tight font-semibold">Service Complete</h1>
          <p className="font-body-md text-body-md text-zinc-400 text-center mb-8">Thank you for visiting. Please leave us a review.</p>
          <button className="w-full h-[56px] bg-primary hover:bg-primary-container text-white rounded-2xl font-headline-sm transition-colors">
            Leave Feedback
          </button>
        </div>
      </div>
    );
  }

  if (status === 'SERVING') {
    return (
      <div className="bg-surface text-on-surface flex items-center justify-center min-h-screen p-4 sm:p-8 font-body-md text-body-md antialiased">
        <div className="w-full max-w-md mx-auto bg-zinc-950 min-h-screen sm:min-h-[850px] sm:h-[850px] sm:rounded-[2.5rem] sm:border-[8px] border-zinc-800 relative overflow-hidden shadow-2xl flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mb-6 animate-pulse">
               <span className="material-symbols-outlined text-5xl">notifications_active</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-zinc-50 mb-2 tracking-tight font-semibold">It's your turn!</h1>
            <p className="font-body-lg text-body-lg text-sky-400 mb-8">Please proceed to Counter 3</p>
            <div className="bg-white p-6 rounded-2xl shadow-xl">
               <QRCodeSVG value={tokenId} size={200} />
            </div>
            <p className="font-body-sm text-body-sm text-zinc-400 mt-6 max-w-[200px]">Show this QR to the operator at the desk.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface flex items-center justify-center min-h-screen p-4 sm:p-8 font-body-md text-body-md antialiased">
      <Head>
        <title>Your Digital Pass - Qmova</title>
        <style>{`
          .pulse-ring {
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            70%, 100% { transform: scale(2); opacity: 0; }
          }
        `}</style>
      </Head>

      {/* Simulated Smartphone Container */}
      <div className="w-full max-w-md mx-auto min-h-screen sm:min-h-[850px] sm:h-[850px] sm:rounded-[2.5rem] sm:border-[8px] border-zinc-800 relative overflow-hidden shadow-2xl bg-zinc-950 text-zinc-50 flex flex-col">
        
        {/* TopAppBar (Simulated Mobile Nav) */}
        <header className="fixed sm:absolute top-0 w-full z-50 flex items-center justify-between px-margin-mobile h-header-h bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <button className="hover:opacity-80 transition-opacity flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_back</span>
            </button>
            <Logo width={120} height={19} forceTheme="dark" />
          </div>
          <button className="text-zinc-400 hover:text-zinc-100 transition-colors w-10 h-10 flex items-center justify-center">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </header>

        {/* Main Scrollable Canvas */}
        <main className="flex-1 overflow-y-auto pt-header-h pb-24 px-4 scroll-smooth">
          {/* Active Digital Pass */}
          <div className="flex flex-col items-center justify-center h-full min-h-[600px] transition-opacity duration-500">
            <div className="w-full max-w-sm bg-white text-zinc-900 rounded-[2rem] p-8 flex flex-col items-center relative overflow-hidden shadow-xl border border-zinc-200 mt-8">
              
              {/* Top accent line */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-500 to-sky-400"></div>
              
              {/* Status Indicator */}
              <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-emerald-500 pulse-ring"></div>
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center z-10">
                  <span className="material-symbols-outlined text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
              </div>
              
              <h2 className="font-headline-md text-headline-md text-center mb-1 text-zinc-900 tracking-tight font-semibold">
                You are {position}{position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} in line
              </h2>
              <p className="font-body-sm text-body-sm text-zinc-500 text-center mb-8">Estimated wait: {ewt} min</p>
              
              {/* ID Block */}
              <div className="text-center mb-8 w-full border-y border-zinc-100 py-6">
                <span className="block font-label-caps text-label-caps text-zinc-400 tracking-widest uppercase mb-2">Ticket ID</span>
                <div className="font-data-mono-lg text-data-mono-lg text-zinc-950 tracking-tight">#{tokenId.substring(0,6).toUpperCase()}</div>
              </div>
              
              {/* QR Code Placeholder */}
              <div className="w-[160px] h-[160px] rounded-2xl flex items-center justify-center bg-white mb-8 relative">
                 <QRCodeSVG value={tokenId} size={160} />
              </div>
              
              <p className="font-body-sm text-body-sm text-zinc-400 text-center max-w-[200px]">Present this QR code or ID at the front desk when called.</p>
            </div>
            
            {/* Secondary Actions */}
            <div className="flex gap-4 mt-8 w-full max-w-sm px-4">
              <button className="flex-1 h-[44px] bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl font-body-md text-body-md transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">directions_run</span> Running Late
              </button>
              <button className="flex-1 h-[44px] bg-transparent border border-rose-900/50 hover:bg-rose-900/20 text-rose-400 rounded-xl font-body-md text-body-md transition-colors flex items-center justify-center">
                Cancel Visit
              </button>
            </div>
          </div>
        </main>
        
        {/* Subtle bottom gradient */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}
