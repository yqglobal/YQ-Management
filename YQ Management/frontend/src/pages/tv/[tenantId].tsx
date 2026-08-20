import React, { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import { Volume2, VolumeX } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Logo } from '../../components/Logo';
import { getTenantUrl } from '../../lib/utils';

interface CalledToken {
  id: string;
  displayId?: string;
  customerName?: string;
  queueName?: string;
  resourceName?: string;
}

interface TTSConfig {
  enabled: boolean;
  language: string;
  voice: string;
  template: string;
}

export default function TVDisplay() {
  const router = useRouter();
  const { tenantId, queueId } = router.query;
  const [calledTokens, setCalledTokens] = useState<CalledToken[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [ttsConfig, setTtsConfig] = useState<TTSConfig>({
    enabled: true,
    language: 'en-US',
    voice: 'female',
    template: 'Ticket number {{token}}, please proceed to {{resource}}',
  });
  const [branding, setBranding] = useState<any>(null);
  const [tenantName, setTenantName] = useState<string>('Qmova');
  const [tenantSubdomain, setTenantSubdomain] = useState<string>('');
  const [queueInfo, setQueueInfo] = useState<{name: string, serviceName?: string} | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isMutedRef = useRef(isMuted);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch queue info if queueId provided
  useEffect(() => {
    if (!queueId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/queue/public/${queueId}`)
      .then(r => r.json())
      .then(data => {
        if (data) setQueueInfo({ name: data.name, serviceName: data.service?.name });
      })
      .catch(console.error);
  }, [queueId]);

  // Fetch tenant TTS config via public endpoint
  useEffect(() => {
    if (!tenantId) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/tenant/public/id/${tenantId}`)
      .then(r => r.json())
      .then(data => {
        const tts = data?.customerExperience?.ttsAnnouncements;
        if (tts) {
          setTtsConfig({
            enabled: tts.enabled ?? true,
            language: tts.language || 'en-US',
            voice: tts.voice || 'female',
            template: tts.template || 'Ticket number {{token}}, please proceed to {{resource}}',
          });
        }
        if (data?.branding) {
          setBranding(data.branding);
        }
        if (data?.name) {
          setTenantName(data.name);
        }
        if (data?.subdomain) {
          setTenantSubdomain(data.subdomain);
        }
      })
      .catch(() => {/* use defaults */});
  }, [tenantId]);

  const speakAnnouncement = useCallback((token: CalledToken) => {
    if (isMutedRef.current || !ttsConfig.enabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const tokenId = token.displayId || token.id?.substring(0, 4).toUpperCase() || '####';
    const resource = token.resourceName || 'the service desk';
    const text = ttsConfig.template
      .replace('{{token}}', tokenId)
      .replace('{{resource}}', resource)
      .replace('{{name}}', token.customerName || 'next customer');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ttsConfig.language;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    // Select voice
    const voices = window.speechSynthesis.getVoices();
    const langVoices = voices.filter(v => v.lang.startsWith(ttsConfig.language.split('-')[0]));
    if (langVoices.length > 0) {
      const femaleVoice = langVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('victoria'));
      utterance.voice = femaleVoice || langVoices[0];
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [ttsConfig]);

  useEffect(() => {
    if (!tenantId) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000');
    socket.emit('joinTenantRoom', tenantId);

    socket.on('token_serving', (data: any) => {
      const token: CalledToken = {
        id: data.token?.id || data.id || data,
        displayId: data.token?.displayId || data.displayId,
        customerName: data.token?.customerName || data.customerName,
        queueName: data.token?.queue?.name || data.queueName,
        resourceName: data.token?.assignedResource?.name || data.resourceName,
      };

      setCalledTokens(prev => [token, ...prev].slice(0, 8));

      // Play chime
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Two-tone chime
        [440, 550].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.25);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.25);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.25 + 0.8);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + i * 0.25);
          osc.stop(audioCtx.currentTime + i * 0.25 + 0.8);
        });
      } catch (e) {
        console.error('Audio play failed', e);
      }

      // TTS: small delay after chime
      setTimeout(() => speakAnnouncement(token), 800);
    });

    return () => { socket.disconnect(); };
  }, [tenantId, speakAnnouncement]);

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const { serviceId } = router.query;
  const joinUrl = tenantSubdomain ? `${getTenantUrl(tenantSubdomain, '/booking')}${(serviceId || queueId) ? `?${new URLSearchParams({
    ...(serviceId && { serviceId: serviceId as string }),
    ...(queueId && { queueId: queueId as string })
  }).toString()}` : ''}` : '';

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 p-6 text-white select-none" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Head>
        <title>Qmova Lobby Display</title>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
          body { margin: 0; background: #09090b; overflow: hidden; }
          .ticker-scroll { animation: ticker 30s linear infinite; }
          @keyframes ticker { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
          .wave-bar { animation: wave 1.2s ease-in-out infinite; }
          @keyframes wave { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
          .token-flash { animation: tokenFlash 0.6s ease-out; }
          .token-flash { animation: tokenFlash 0.6s ease-out; }
          @keyframes tokenFlash { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          :root { --primary-color: ${branding?.primaryColor || '#4f46e5'}; }
        `}</style>
      </Head>

      <div className="grid grid-cols-12 gap-6 h-full">
        {/* Left Panel — 8 cols */}
        <div className="col-span-8 flex flex-col gap-5 h-full">
          {/* Header bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-4">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="h-12 max-w-[200px] object-contain" />
              ) : (
                <Logo width={140} height={22} forceTheme="dark" />
              )}
              <div className="hidden lg:block ml-2 border-l border-zinc-700 pl-4">
                <p className="font-bold text-white text-lg leading-tight">{tenantName || 'Queue Display'}</p>
                {queueInfo ? (
                  <p className="text-zinc-400 text-sm font-medium">
                    {queueInfo.serviceName && <span className="text-primary-400">{queueInfo.serviceName}</span>}
                    {queueInfo.serviceName && queueInfo.name && <span className="mx-2 text-zinc-600">•</span>}
                    {queueInfo.name && <span>{queueInfo.name}</span>}
                  </p>
                ) : (
                  <p className="text-zinc-500 text-xs">Live Queue Display</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-2xl tabular-nums">{timeStr}</p>
              <p className="text-zinc-500 text-sm">{dateStr}</p>
            </div>
          </div>

          {/* Main content / media zone */}
          <div className="flex-grow bg-zinc-900 rounded-2xl border border-zinc-800 relative overflow-hidden flex flex-col justify-end">
            <div 
              className="absolute inset-0 z-0 opacity-10" 
              style={{
                background: branding?.primaryColor 
                  ? `linear-gradient(to bottom right, ${branding.primaryColor}, transparent)` 
                  : undefined,
              }}
            />
            {/* Fallback gradient if no custom color */}
            {!branding?.primaryColor && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-zinc-950/80 z-0" />
            )}
            
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                {joinUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-6 rounded-[2rem] inline-block shadow-2xl ring-4 ring-white/10 opacity-95 transition-transform hover:scale-105">
                      <QRCode value={joinUrl} size={400} fgColor="#09090b" bgColor="#ffffff" style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                    </div>
                    <div className="mt-8 text-white/50 font-bold tracking-[0.2em] uppercase text-sm bg-black/40 px-6 py-2 rounded-full backdrop-blur-sm border border-white/10">Scan to join queue</div>
                  </div>
                ) : (
                  <div className="text-8xl font-black text-white/5 leading-none uppercase tracking-widest select-none">WELCOME</div>
                )}
              </div>
            </div>
            <div className="relative z-20 p-8 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">Live Queue Active</span>
              </div>
              <p className="text-white/70 text-lg">Please take a ticket and wait for your number to be called.</p>
            </div>
          </div>

          {/* Ticker */}
          <div 
            className="h-14 border rounded-xl flex items-center overflow-hidden relative"
            style={{
              backgroundColor: branding?.primaryColor ? `${branding.primaryColor}1a` : undefined,
              borderColor: branding?.primaryColor ? `${branding.primaryColor}33` : undefined,
            }}
          >
            {/* Fallback styling for ticker if no custom color */}
            {!branding?.primaryColor && (
              <div className="absolute inset-0 bg-primary/10 border-primary/20 z-0" />
            )}
            
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-zinc-950 to-transparent z-10" />
            <div 
              className="flex items-center gap-3 whitespace-nowrap ticker-scroll font-semibold text-sm relative z-10"
              style={{ color: branding?.primaryColor || 'var(--primary)' }}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontFamily: 'Material Symbols Outlined' }}>info</span>
              Welcome — please have your ticket ready when your number is called.
              &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
              Proceed to the assigned desk when your number appears on screen.
              &nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
              Thank you for your patience.
            </div>
          </div>
        </div>

        {/* Right Panel — 4 cols */}
        <div className="col-span-4 flex flex-col gap-5 h-full">

          {/* NOW CALLING card */}
          <div className={`rounded-2xl border-2 flex flex-col gap-4 p-6 h-[48%] transition-all duration-500 ${
            calledTokens.length > 0
              ? 'bg-amber-950/30 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.2)]'
              : 'bg-zinc-900 border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${calledTokens.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-zinc-600'}`} />
                <span className={`text-xs font-bold uppercase tracking-widest ${calledTokens.length > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {calledTokens.length > 0 ? 'Now Calling' : 'Waiting...'}
                </span>
              </div>
              {/* TTS Voice Wave */}
              {isSpeaking && (
                <div className="flex items-center gap-0.5 h-5">
                  {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
                    <div
                      key={i}
                      className="wave-bar w-1 bg-amber-400 rounded-full"
                      style={{
                        height: `${h * 4}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {calledTokens.length > 0 ? (
              <div className="flex flex-col items-center justify-center flex-grow gap-3 token-flash">
                <div className="text-[72px] font-black text-amber-400 leading-none tabular-nums tracking-tight">
                  {calledTokens[0].displayId || calledTokens[0].id?.substring(0, 5).toUpperCase()}
                </div>
                {calledTokens[0].customerName && (
                  <p className="text-white/60 text-sm">{calledTokens[0].customerName}</p>
                )}
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 w-full justify-center mt-2">
                  <span className="text-amber-400">→</span>
                  <span className="text-amber-300 font-bold text-lg">
                    {calledTokens[0].resourceName || 'Service Desk'}
                  </span>
                </div>
                {calledTokens[0].queueName && (
                  <p className="text-zinc-500 text-xs">{calledTokens[0].queueName}</p>
                )}
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-zinc-600 text-center">No active calls at this time</p>
              </div>
            )}
          </div>

          {/* Recently Called */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col flex-grow overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Recently Called</h3>
              <span className="text-xs text-zinc-600">{calledTokens.length} total</span>
            </div>
            <div className="flex flex-col gap-2.5 overflow-y-auto flex-grow pr-1">
              {calledTokens.slice(1).map((t, idx) => (
                <div key={idx} className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-3 border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-zinc-700 rounded-full" />
                    <div>
                      <div className="font-bold text-white tabular-nums">
                        {t.displayId || t.id?.substring(0, 5).toUpperCase()}
                      </div>
                      <div className="text-zinc-500 text-xs">{t.queueName || 'General'}</div>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600 bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700">
                    Called
                  </span>
                </div>
              ))}
              {calledTokens.length <= 1 && (
                <div className="text-center py-8 text-zinc-600 text-sm">No recent calls yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mute toggle button — bottom right */}
      <button
        onClick={() => {
          setIsMuted(m => !m);
          if (!isMuted) window.speechSynthesis?.cancel();
        }}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-xl bg-zinc-800/90 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all backdrop-blur-sm shadow-lg"
        title={isMuted ? 'Unmute announcements' : 'Mute announcements'}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
}
