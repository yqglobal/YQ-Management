import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Home, Sun, Maximize, Scan, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { io } from 'socket.io-client';
import QRCode from 'react-qr-code';

export default function QueueDisplay() {
  const router = useRouter();
  const { id } = router.query;
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [previousServingId, setPreviousServingId] = useState<string | null>(null);

  const { data: queue } = useQuery({
    queryKey: ['queue', id],
    queryFn: () => fetchApi(`/queue/${id}`),
    enabled: !!id,
  });

  const queueName = queue?.name || 'Loading...';
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/customer/join/${id}` : '';

  const displayConfig = (queue?.tokenDisplayConfig as any) || {};
  const showName = displayConfig.showName !== false;
  const showTokenNumber = displayConfig.showTokenNumber !== false;

  const { data: tokens = [], refetch } = useQuery({
    queryKey: ['queueTokens', id],
    queryFn: () => fetchApi(`/queue/${id}/tokens`),
    enabled: !!id,
  });

  const serving = tokens.find((t: any) => t.status === 'SERVING');
  const waiting = tokens.filter((t: any) => t.status === 'WAITING');

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Natural')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (serving && serving.id !== previousServingId) {
      if (audioEnabled) {
        const displayCode = serving.displayId || serving.id.split('-')[0].toUpperCase();
        const namePart = showName ? serving.customerName : '';
        
        let announcement = '';
        if (displayConfig.ttsTemplate) {
          announcement = displayConfig.ttsTemplate
            .replace(/{token}/g, displayCode)
            .replace(/{name}/g, namePart)
            .replace(/{queueName}/g, queueName)
            .replace(/ ,/g, ','); // Cleanup if name is empty
        } else {
          announcement = namePart
            ? `Ticket number ${displayCode}, ${namePart}, kindly proceed to ${queueName}.`
            : `Ticket number ${displayCode}, kindly proceed to ${queueName}.`;
        }
        
        speak(announcement);
      }
      setPreviousServingId(serving.id);
    }
  }, [serving, previousServingId, audioEnabled, queueName, showName]);

  useEffect(() => {
    if (!id) return;
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
      transports: ['websocket']
    });
    socket.emit('joinQueueRoom', id);

    socket.on('token_joined', () => refetch());
    socket.on('token_serving', () => refetch());
    socket.on('token_completed', () => refetch());
    socket.on('token_missed', () => refetch());

    return () => {
      socket.disconnect();
    };
  }, [id, refetch]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white flex overflow-hidden font-sans">
      <Head>
        <title>{queueName} - Display</title>
      </Head>

      {/* Floating Action Buttons */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
        <Link href={`/dashboard/queues/${id}`} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors">
          <Home className="w-5 h-5 text-zinc-400" />
        </Link>
        <button 
          onClick={() => {
            if (!audioEnabled) {
              // Unlock audio context on user interaction by speaking an empty string
              const u = new SpeechSynthesisUtterance('');
              u.volume = 0;
              window.speechSynthesis.speak(u);
            }
            setAudioEnabled(!audioEnabled);
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-colors ${audioEnabled ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400'}`}
        >
          {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors">
          <Sun className="w-5 h-5 text-zinc-400" />
        </button>
        <button onClick={toggleFullScreen} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors">
          <Maximize className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* LEFT PANEL - QR Code */}
      <div className="w-[45%] flex flex-col items-center justify-center relative p-12 border-r border-white/5 bg-gradient-to-b from-[#0A0F1C] to-[#050811]">
        
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-emerald-400 text-sm font-bold tracking-[0.2em] uppercase">Live Virtual Queue</span>
          </div>

          <h1 className="text-5xl font-extrabold mb-12 tracking-tight">{queueName}</h1>

          <div className="bg-white p-6 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-8">
            <div className="w-64 h-64 flex items-center justify-center">
              {joinUrl && (
                <QRCode
                  value={joinUrl}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xl font-bold text-indigo-300 mb-2">
            <Scan className="w-6 h-6" />
            Scan to Join
          </div>
          <p className="text-zinc-400 mb-12">Use your smartphone camera</p>

          <div className="flex items-center gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 px-8 text-center backdrop-blur-md">
              <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-1">Waiting</p>
              <p className="text-3xl font-bold text-white">{waiting.length}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 px-8 text-center backdrop-blur-md">
              <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase mb-1">Est. Wait</p>
              <p className="text-3xl font-bold text-indigo-400">~{waiting.length * 5}m</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Serving & Waiting */}
      <div className="flex-1 flex flex-col bg-[#050811]">
        
        {/* Top Half: Now Serving */}
        <div className="flex-1 p-12 flex flex-col border-b border-white/5 relative">
          
          <div className="flex items-center gap-4 mb-16">
            <h2 className="text-lg font-bold tracking-[0.2em] text-indigo-400 uppercase">Now Serving</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent"></div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {serving ? (
              <div className="text-center animate-in zoom-in duration-500">
                {showTokenNumber && (
                  <p className="text-8xl font-black text-white tracking-tight mb-4">
                    {serving.displayId || serving.id.split('-')[0].toUpperCase()}
                  </p>
                )}
                {showName && (
                  <p className="text-3xl text-zinc-400 font-medium">{serving.customerName}</p>
                )}
                {!showTokenNumber && !showName && (
                  <p className="text-3xl text-zinc-400 font-medium">Now Serving</p>
                )}
              </div>
            ) : (
              <div className="text-center text-zinc-600">
                <div className="w-16 h-16 rounded-full border-2 border-zinc-700/50 flex items-center justify-center mx-auto mb-6">
                  <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                </div>
                <p className="text-xl font-bold tracking-widest uppercase">Waiting for next customer</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Half: Please Wait */}
        <div className="h-[40%] p-12 flex flex-col relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-sm font-bold tracking-[0.2em] text-zinc-500 uppercase">Please Wait</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-zinc-700/50 to-transparent"></div>
          </div>

          <div className="flex-1 overflow-y-auto pr-4">
            {waiting.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 font-medium">
                No upcoming tickets.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                 {waiting.map((ticket: any, i: number) => (
                   <div key={ticket.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                         {i + 1}
                       </div>
                       <div>
                         {showTokenNumber && (
                           <p className="text-2xl font-bold text-white">{ticket.displayId || ticket.id.split('-')[0].toUpperCase()}</p>
                         )}
                         {showName && (
                           <p className="text-zinc-400">{ticket.customerName}</p>
                         )}
                         {!showTokenNumber && !showName && (
                           <p className="text-2xl font-bold text-white">{i + 1}</p>
                         )}
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
