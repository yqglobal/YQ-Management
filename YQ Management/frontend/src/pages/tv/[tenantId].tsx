import React, { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import { Volume2, VolumeX, ArrowRight, Clock, Users, CheckCircle2, PauseCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Logo } from '../../components/Logo';
import { getTenantUrl } from '../../lib/utils';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface CalledToken {
  id: string;
  displayId?: string;
  customerName?: string;
  queueName?: string;
  resourceName?: string;
  serviceName?: string;
  currentState?: string;
  calledAt?: number;
}

interface UpcomingToken {
  id: string;
  displayId?: string;
  customerName?: string;
  queueName?: string;
  serviceName?: string;
  priority?: number;
  currentState?: string;
  createdAt?: string;
  scheduledTime?: string;
}

interface TTSConfig {
  enabled: boolean;
  language: string;
  voice: string;
  template: string;
}

export default function TVDisplay() {
  const router = useRouter();
  const { tenantId, queueId, serviceId } = router.query;

  // State
  const [nowCallingTickets, setNowCallingTickets] = useState<CalledToken[]>([]);
  const [callingIndex, setCallingIndex] = useState(0);
  const [upcomingTokens, setUpcomingTokens] = useState<UpcomingToken[]>([]);
  const [recentlyServed, setRecentlyServed] = useState<CalledToken[]>([]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [announcementQueue, setAnnouncementQueue] = useState<CalledToken[]>([]);

  const [ttsConfig, setTtsConfig] = useState<TTSConfig>({
    enabled: true,
    language: 'en-US',
    voice: 'female',
    template: 'Attention customers, this announcement is for service {{service}}, calling customer {{name}}, ticket {{token}}, at {{resource}}, please proceed.',
  });

  const [branding, setBranding] = useState<AnyFixMe>(null);
  const [tenantName, setTenantName] = useState<string>('Qmova');
  const [tenantSubdomain, setTenantSubdomain] = useState<string>('');
  const [selfServeModeEnabled, setSelfServeModeEnabled] = useState(false);
  const [queueInfo, setQueueInfo] = useState<{ name: string; serviceName?: string; status?: string } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const isMutedRef = useRef(isMuted);
  const audioEnabledRef = useRef(audioEnabled);
  const isSpeakingRef = useRef(false);
  const announcedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);

  // Live Clock (ticking every second)
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Chime sound generator (Audio element with web audio oscillator fallback)
  const playChime = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const audio = new Audio('/audio/chime.mp3');
        audio.volume = 0.85;
        audio.onended = () => resolve();
        audio.onerror = () => {
          fallbackBeep();
          setTimeout(resolve, 600);
        };
        audio.play().catch(() => {
          fallbackBeep();
          setTimeout(resolve, 600);
        });
      } catch {
        fallbackBeep();
        setTimeout(resolve, 600);
      }
    });

    function fallbackBeep() {
      try {
        const audioCtx = new (window.AudioContext || (window as AnyFixMe).webkitAudioContext)();
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.18);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.18);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.18 + 0.6);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + i * 0.18);
          osc.stop(audioCtx.currentTime + i * 0.18 + 0.6);
        });
      } catch {}
    }
  }, []);

  // Speech announcement executor
  const speakAnnouncement = useCallback((token: CalledToken): Promise<void> => {
    return new Promise((resolve) => {
      if (isMutedRef.current || !ttsConfig.enabled || !audioEnabledRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      const tokenId = token.displayId || token.id?.substring(0, 4).toUpperCase() || '####';
      const resource = token.resourceName || 'the service desk';
      const serviceName = token.serviceName || token.queueName || resource;
      const customerName = token.customerName || 'next customer';

      const text = ttsConfig.template
        .replace(/\{\{token\}\}/g, tokenId)
        .replace(/\{\{resource\}\}/g, resource)
        .replace(/\{\{service\}\}/g, serviceName)
        .replace(/\{\{name\}\}/g, customerName);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = ttsConfig.language;
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const langVoices = voices.filter(v => v.lang.startsWith(ttsConfig.language.split('-')[0]));
      if (langVoices.length > 0) {
        const preferred = langVoices.find(v =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('victoria') ||
          v.name.toLowerCase().includes('google')
        );
        utterance.voice = preferred || langVoices[0];
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
      };

      utterance.onend = () => {
        // Repeat once after 1.2s gap for clarity
        setTimeout(() => {
          if (!isMutedRef.current && audioEnabledRef.current) {
            const repeat = new SpeechSynthesisUtterance(text);
            repeat.lang = utterance.lang;
            repeat.rate = utterance.rate;
            repeat.pitch = utterance.pitch;
            if (utterance.voice) repeat.voice = utterance.voice;
            repeat.onstart = () => {
              setIsSpeaking(true);
              isSpeakingRef.current = true;
            };
            repeat.onend = () => {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              resolve();
            };
            repeat.onerror = () => {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              resolve();
            };
            window.speechSynthesis.speak(repeat);
          } else {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
            resolve();
          }
        }, 1200);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [ttsConfig]);

  // Serial Speech Announcement Queue Processor
  useEffect(() => {
    if (announcementQueue.length === 0 || isSpeakingRef.current || !audioEnabled) return;

    const nextToken = announcementQueue[0];
    isSpeakingRef.current = true;

    playChime()
      .then(() => new Promise((r) => setTimeout(r, 400)))
      .then(() => speakAnnouncement(nextToken))
      .finally(() => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        setAnnouncementQueue((prev) => prev.slice(1));
      });
  }, [announcementQueue, audioEnabled, playChime, speakAnnouncement]);

  // Periodic rotation between multiple active "Now Calling" tickets
  useEffect(() => {
    if (nowCallingTickets.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCallingIndex((prev) => (prev + 1) % nowCallingTickets.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [nowCallingTickets.length]);

  // Fetch upcoming tokens (Next Up in Queue)
  const fetchUpcomingTokens = useCallback(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const url = queueId
      ? `${apiBase}/queue/public/${queueId}/tokens`
      : `${apiBase}/tenant/public/${tenantId}/upcoming-tokens`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const list: UpcomingToken[] = data
            .filter((d: AnyFixMe) =>
              ['WAITING', 'CHECKED_IN', 'SCHEDULED', 'CREATED', 'PENDING_PAYMENT'].includes(d.currentState)
            )
            .map((d: AnyFixMe) => ({
              id: d.id,
              displayId: d.displayId || d.ticketNumber || `#${d.id?.substring(0, 5)}`,
              customerName: d.customer?.name || 'Customer',
              queueName: d.queue?.name,
              serviceName: d.service?.name,
              priority: d.priority,
              currentState: d.currentState,
              createdAt: d.createdAt,
              scheduledTime: d.scheduledTime,
            }))
            .sort((a, b) => {
              const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : new Date(a.createdAt || 0).getTime();
              const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : new Date(b.createdAt || 0).getTime();
              if ((b.priority || 0) !== (a.priority || 0)) {
                return (b.priority || 0) - (a.priority || 0);
              }
              return timeA - timeB;
            });
          setUpcomingTokens(list);
        }
      })
      .catch(() => {});
  }, [queueId, tenantId]);

  // Fetch recently called tokens (history)
  const fetchRecentlyCalled = useCallback(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const url = queueId
      ? `${apiBase}/queue/public/${queueId}/recently-called`
      : `${apiBase}/tenant/public/${tenantId}/recently-called`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const tokens: CalledToken[] = data.map((d: AnyFixMe) => ({
            id: d.id,
            displayId: d.displayId || `#${d.id?.substring(0, 5)}`,
            customerName: d.customer?.name,
            queueName: d.queue?.name,
            resourceName: d.service?.name || d.resourceName || 'Service Desk',
            serviceName: d.service?.name,
            currentState: d.currentState,
          }));
          setRecentlyServed(tokens);

          // Remove any tickets from nowCallingTickets that have already started service or completed
          const inServiceOrDoneIds = new Set(
            tokens
              .filter((t) => t.currentState === 'IN_SERVICE' || t.currentState === 'COMPLETED')
              .map((t) => t.id)
          );
          setNowCallingTickets((prev) => prev.filter((t) => !inServiceOrDoneIds.has(t.id)));
        }
      })
      .catch(() => {});
  }, [queueId, tenantId]);

  // Initial Load & Tenant Metadata
  useEffect(() => {
    if (!tenantId) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Fetch tenant details
    fetch(`${apiBase}/tenant/public/id/${tenantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.customerExperience?.ttsAnnouncements) {
          const tts = data.customerExperience.ttsAnnouncements;
          setTtsConfig({
            enabled: tts.enabled ?? true,
            language: tts.language || 'en-US',
            voice: tts.voice || 'female',
            template: tts.template || 'Attention customers, this announcement is for service {{service}}, calling customer {{name}}, ticket {{token}}, at {{resource}}, please proceed.',
          });
        }
        if (data?.branding) setBranding(data.branding);
        if (data?.name) setTenantName(data.name);
        if (data?.subdomain) setTenantSubdomain(data.subdomain);
        if (data?.selfServeModeEnabled) setSelfServeModeEnabled(true);
        if (data?.isPaused) setIsPaused(true);
      })
      .catch(() => {});

    // Fetch queue info if queueId provided
    if (queueId) {
      fetch(`${apiBase}/queue/public/${queueId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data) {
            setQueueInfo({ name: data.name, serviceName: data.service?.name, status: data.status });
            setIsPaused(data.status === 'PAUSED' || data.status === 'PAUSED_FOR_EMERGENCY');
          }
        })
        .catch(() => {});
    }

    fetchUpcomingTokens();
    fetchRecentlyCalled();
  }, [tenantId, queueId, fetchUpcomingTokens, fetchRecentlyCalled]);

  // WebSocket Live Listeners
  useEffect(() => {
    if (!tenantId) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const socket = io(socketUrl, {
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const joinRooms = () => {
      socket.emit('joinTenantRoom', tenantId);
      if (queueId) {
        socket.emit('joinQueueRoom', queueId);
      }
    };
    socket.on('connect', joinRooms);

    // Queue paused status
    socket.on('queue_status_changed', (data: AnyFixMe) => {
      if (!queueId || data.queueId === queueId) {
        setIsPaused(data.status === 'PAUSED' || data.status === 'PAUSED_FOR_EMERGENCY');
        if (queueInfo) setQueueInfo((prev) => prev ? { ...prev, status: data.status } : null);
      }
    });

    // When a visit is called: Add to nowCallingTickets and queue audio
    const handleVisitCalled = (payload: AnyFixMe) => {
      if (!payload?.visitId) return;

      const calledToken: CalledToken = {
        id: payload.visitId,
        displayId: payload.displayId || `#${payload.visitId.substring(0, 5).toUpperCase()}`,
        customerName: payload.customerName || 'Customer',
        queueName: payload.queueName,
        resourceName: payload.resourceName || payload.serviceName || 'Service Desk',
        serviceName: payload.serviceName,
        currentState: 'CALLED',
        calledAt: Date.now(),
      };

      announcedIdsRef.current.add(payload.visitId);

      setNowCallingTickets((prev) => {
        const filtered = prev.filter((t) => t.id !== calledToken.id);
        return [calledToken, ...filtered].slice(0, 5); // Up to 5 active rotating calls
      });

      // Queue announcement
      if (audioEnabledRef.current && !isMutedRef.current) {
        setAnnouncementQueue((prev) => [...prev, calledToken]);
      }

      // Refresh queues
      fetchUpcomingTokens();
      fetchRecentlyCalled();
    };

    // When service starts: REMOVE TICKET FROM NOW CALLING!
    const handleVisitStarted = (payload: AnyFixMe) => {
      const visitId = payload?.visitId || payload?.id;
      if (visitId) {
        setNowCallingTickets((prev) => prev.filter((t) => t.id !== visitId));
        setAnnouncementQueue((prev) => prev.filter((t) => t.id !== visitId));
      }
      fetchUpcomingTokens();
      fetchRecentlyCalled();
    };

    // When visit completes, cancels, or is missed: REMOVE from calling
    const handleVisitRemoved = (payload: AnyFixMe) => {
      const visitId = payload?.visitId || payload?.id;
      if (visitId) {
        setNowCallingTickets((prev) => prev.filter((t) => t.id !== visitId));
        setAnnouncementQueue((prev) => prev.filter((t) => t.id !== visitId));
      }
      fetchUpcomingTokens();
      fetchRecentlyCalled();
    };

    socket.on('visit_called', handleVisitCalled);
    socket.on('VISIT_CALLED', handleVisitCalled);
    socket.on('visit_started', handleVisitStarted);
    socket.on('VISIT_STARTED', handleVisitStarted);
    socket.on('visit_completed', handleVisitRemoved);
    socket.on('visit_cancelled', handleVisitRemoved);
    socket.on('visit_missed', handleVisitRemoved);
    socket.on('visit_created', fetchUpcomingTokens);
    socket.on('visit_checked_in', fetchUpcomingTokens);
    socket.on('visit_updated', () => {
      fetchUpcomingTokens();
      fetchRecentlyCalled();
    });
    socket.on('visit_step_activated', () => {
      fetchUpcomingTokens();
      fetchRecentlyCalled();
    });

    // Fallback polling every 12 seconds to ensure screen is always accurate
    const pollInterval = setInterval(() => {
      fetchUpcomingTokens();
      fetchRecentlyCalled();
    }, 12000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, [tenantId, queueId, queueInfo, fetchUpcomingTokens, fetchRecentlyCalled]);

  const activeCallingIndex = nowCallingTickets.length > 0
    ? callingIndex % nowCallingTickets.length
    : 0;

  // Derived current calling ticket based on rotation index
  const activeSpotlightToken = nowCallingTickets.length > 0
    ? nowCallingTickets[activeCallingIndex]
    : null;

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Self-serve QR link
  const bookingPath = selfServeModeEnabled ? '/checkin' : '/booking';
  const joinUrl = tenantSubdomain
    ? `${getTenantUrl(tenantSubdomain, bookingPath)}${(serviceId || queueId) ? `?${new URLSearchParams({
        ...(serviceId && { serviceId: serviceId as string }),
        ...(queueId && { queueId: queueId as string })
      }).toString()}` : ''}`
    : '';

  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-950 text-white select-none flex flex-col justify-between p-5 lg:p-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Head>
        <title>{tenantName} | Live Queue Display</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          body { margin: 0; background: #09090b; overflow: hidden; }
          .ticker-scroll { animation: ticker 35s linear infinite; }
          @keyframes ticker { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
          .wave-bar { animation: wave 1.2s ease-in-out infinite; }
          @keyframes wave { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
          :root { --primary-color: ${branding?.primaryColor || '#4f46e5'}; }
        `}</style>
      </Head>

      {/* Audio Activation Overlay */}
      {!audioEnabled && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center cursor-pointer backdrop-blur-md transition-all"
          onClick={() => {
            setAudioEnabled(true);
            playChime().catch(() => {});
            if ('speechSynthesis' in window) {
              const u = new SpeechSynthesisUtterance('');
              u.volume = 0;
              window.speechSynthesis.speak(u);
            }
          }}
        >
          <div className="bg-zinc-900 border border-zinc-700/80 p-8 rounded-3xl flex flex-col items-center shadow-2xl max-w-md text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 animate-pulse">
              <Volume2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-2">Enable Lobby Audio</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Click anywhere to activate high-fidelity chime notifications and spoken queue call announcements.
            </p>
            <button className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg text-sm uppercase tracking-wider">
              Start Lobby Display
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-xl backdrop-blur-md shrink-0 mb-4">
        <div className="flex items-center gap-5">
          {branding?.logoUrl ? (
            <Image src={branding.logoUrl} alt="Logo" width={220} height={46} className="h-11 w-auto object-contain" unoptimized />
          ) : (
            <Logo width={150} height={26} forceTheme="dark" />
          )}

          <div className="h-8 w-px bg-zinc-800" />

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-extrabold text-white text-lg tracking-tight">{tenantName}</h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Display
              </span>
            </div>
            <p className="text-zinc-400 text-xs font-medium">
              {queueInfo?.serviceName ? (
                <>
                  <span className="text-amber-400 font-semibold">{queueInfo.serviceName}</span>
                  {queueInfo.name && <span className="mx-2 text-zinc-600">•</span>}
                  <span>{queueInfo.name}</span>
                </>
              ) : queueInfo?.name ? (
                <span>{queueInfo.name}</span>
              ) : (
                'Central Lobby Queue Management'
              )}
            </p>
          </div>
        </div>

        {/* Center: Paused Banner indicator */}
        {isPaused && (
          <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/40 text-amber-300 px-4 py-1.5 rounded-xl animate-pulse">
            <PauseCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Service Temporarily Paused</span>
          </div>
        )}

        {/* Right: Clock & Sound status */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-white font-mono font-black text-2xl tracking-tight tabular-nums">{timeStr}</p>
            <p className="text-zinc-400 text-xs font-medium">{dateStr}</p>
          </div>

          <button
            onClick={() => {
              setIsMuted((m) => !m);
              if (!isMuted) window.speechSynthesis?.cancel();
            }}
            className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer shadow-md"
            title={isMuted ? 'Unmute announcements' : 'Mute announcements'}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Paused Reassurance Banner (if queue is paused) */}
      {isPaused && (
        <div className="mb-4 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border border-amber-500/40 rounded-xl px-6 py-2.5 flex items-center justify-between text-amber-200 text-xs font-medium shadow-lg backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold text-amber-300 uppercase tracking-wider">Notice to Customers:</span>
            <span>Services are currently on a short operational break. All ticket positions are safely preserved. Calling will resume shortly.</span>
          </div>
          <span className="text-amber-400/80 font-mono text-[11px] font-semibold uppercase">Tickets On Hold</span>
        </div>
      )}

      {/* Main Grid: 7 cols (Hero Now Calling & Self Check-in) | 5 cols (Next Up & Recent) */}
      <main className="grid grid-cols-12 gap-5 flex-1 min-h-0">

        {/* ─── LEFT COLUMN: 7 Columns ──────────────────────────── */}
        <section className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-h-0 h-full">

          {/* 1. NOW CALLING SPOTLIGHT CARD */}
          <div className={`rounded-3xl border-2 flex flex-col p-6 transition-all duration-500 relative overflow-hidden shrink-0 ${
            activeSpotlightToken
              ? 'bg-gradient-to-br from-amber-950/40 via-zinc-900/90 to-zinc-950 border-amber-500/80 shadow-[0_0_60px_rgba(245,158,11,0.22)]'
              : 'bg-zinc-900/90 border-zinc-800 shadow-xl'
          }`} style={{ minHeight: activeSpotlightToken ? '340px' : '220px' }}>

            {/* Subtle radial glow */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header: Title + Soundwave + Multi-call pager */}
            <div className="flex items-center justify-between mb-2 z-10">
              <div className="flex items-center gap-2.5">
                <span className={`w-3.5 h-3.5 rounded-full ${activeSpotlightToken ? 'bg-amber-400 animate-ping' : 'bg-zinc-600'}`} />
                <h2 className={`text-sm font-black uppercase tracking-[0.2em] ${activeSpotlightToken ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {activeSpotlightToken ? 'Now Calling' : 'Lobby Status'}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {/* Voice soundwave animation when speaking */}
                {isSpeaking && (
                  <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mr-1">Announcing</span>
                    {[2, 4, 6, 8, 5, 3, 7, 4].map((h, i) => (
                      <div
                        key={i}
                        className="wave-bar w-1 bg-amber-400 rounded-full"
                        style={{ height: `${h * 2.2}px`, animationDelay: `${i * 0.12}s` }}
                      />
                    ))}
                  </div>
                )}

                {/* Multiple active calls indicator */}
                {nowCallingTickets.length > 1 && (
                  <div className="flex items-center gap-2 bg-zinc-800/90 border border-zinc-700 px-3 py-1 rounded-full">
                    <span className="text-xs text-amber-300 font-bold">
                      Call {activeCallingIndex + 1} of {nowCallingTickets.length}
                    </span>
                    <div className="flex items-center gap-1">
                      {nowCallingTickets.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            i === activeCallingIndex
                              ? 'w-4 bg-amber-400'
                              : 'bg-zinc-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Spotlight Content */}
            <div className="flex-1 flex flex-col justify-center items-center py-2 z-10">
              <AnimatePresence mode="wait">
                {activeSpotlightToken ? (
                  <motion.div
                    key={activeSpotlightToken.id}
                    initial={{ opacity: 0, scale: 0.92, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -15 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    className="flex flex-col items-center text-center w-full"
                  >
                    {/* Ticket Number (Massive & High Contrast) */}
                    <div className="text-7xl sm:text-8xl lg:text-9xl font-black font-mono tracking-tight text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.4)] leading-none my-1">
                      {activeSpotlightToken.displayId}
                    </div>

                    {/* Customer Name (LARGE, CLEAR, PROMINENT) */}
                    <div className="mt-2 mb-4 max-w-full px-4">
                      <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-wide truncate drop-shadow-sm">
                        {activeSpotlightToken.customerName}
                      </p>
                    </div>

                    {/* Destination Desk / Counter Card */}
                    <div className="inline-flex items-center gap-3 bg-amber-500/15 border-2 border-amber-500/40 rounded-2xl px-8 py-3.5 shadow-lg shadow-amber-950/40">
                      <ArrowRight className="w-6 h-6 text-amber-400 shrink-0" strokeWidth={3} />
                      <span className="text-xl sm:text-2xl font-black text-amber-300 tracking-wide">
                        {activeSpotlightToken.resourceName || 'Service Desk'}
                      </span>
                    </div>

                    {/* Queue / Service tag */}
                    {activeSpotlightToken.serviceName && (
                      <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mt-3">
                        Service: <span className="text-zinc-200">{activeSpotlightToken.serviceName}</span>
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center py-6"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-400 mb-3">
                      <Clock className="w-8 h-8 text-amber-400/80" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">Queue Calling Ready</h3>
                    <p className="text-zinc-400 text-sm max-w-sm">
                      Please have your ticket ready. When your ticket number is called, proceed to the designated desk.
                    </p>
                    <div className="mt-4 flex items-center gap-4 text-xs font-mono text-zinc-500">
                      <span>Waiting: <strong className="text-white">{upcomingTokens.length}</strong></span>
                      <span>•</span>
                      <span>Desks: <strong className="text-emerald-400">Active</strong></span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active Calls Dock: Shows other calling tickets if multiple desks called */}
            {nowCallingTickets.length > 1 && (
              <div className="pt-3 border-t border-zinc-800/80 z-10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Currently Summoned Across Desks:
                </p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {nowCallingTickets.map((t, idx) => (
                    <div
                      key={t.id}
                      onClick={() => setCallingIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs cursor-pointer transition-all ${
                        idx === activeCallingIndex
                          ? 'bg-amber-500/20 border-amber-500 text-white font-bold ring-1 ring-amber-500/30'
                          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="font-mono font-bold text-amber-400">{t.displayId}</span>
                      <span className="truncate max-w-[90px]">{t.customerName}</span>
                      <span className="text-zinc-500 font-medium">→ {t.resourceName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. LOBBY SELF CHECK-IN & SMART QR CARD */}
          <div className="flex-[1.25] rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl flex items-stretch justify-between relative overflow-hidden" style={{ minHeight: '280px' }}>
            {/* Subtle gradient styling */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-zinc-950/60 pointer-events-none" />

            {/* Left side: text, instructions, wait estimates */}
            <div className="flex-1 z-10 flex flex-col justify-between p-6 sm:p-7 min-w-0 pr-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider w-fit">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selfServeModeEnabled ? 'Self-Serve Check-In' : 'Join Queue Mobile'}</span>
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    {selfServeModeEnabled ? 'Scan QR Code to Check In' : 'Scan to Take Your Ticket'}
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-1 leading-relaxed">
                    Use your phone camera to scan the QR code. You will receive live WhatsApp queue progress notifications.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 text-xs">
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">Estimated Wait</span>
                  <span className="text-emerald-400 font-mono font-bold text-base sm:text-lg">
                    {upcomingTokens.length > 0 ? `~${upcomingTokens.length * 5} mins` : 'Immediate'}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 text-xs">
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase tracking-wider">In Line / Booked</span>
                  <span className="text-amber-400 font-mono font-bold text-base sm:text-lg">
                    {upcomingTokens.length} Customer{upcomingTokens.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: QR Code aligned flush from top-to-bottom of div height with NO gap */}
            <div className="h-full aspect-square shrink-0 bg-white flex flex-col items-center justify-center p-3.5 sm:p-4 relative select-none shadow-2xl">
              {joinUrl ? (
                <div className="w-full h-full flex items-center justify-center">
                  <QRCode
                    value={joinUrl}
                    size={320}
                    fgColor="#09090b"
                    bgColor="#ffffff"
                    style={{ height: '100%', width: '100%', maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-mono text-xs">
                  Loading QR...
                </div>
              )}
              <div className="mt-1.5 text-center shrink-0">
                <span className="text-[10px] sm:text-[11px] font-black text-zinc-950 tracking-widest uppercase font-mono bg-zinc-100 px-3 py-0.5 rounded-full border border-zinc-200">
                  Scan With Camera
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── RIGHT COLUMN: 5 Columns ─────────────────────────── */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-4 min-h-0 h-full">

          {/* 1. NEXT UP IN QUEUE (HIGH PRIORITY) */}
          <div className="flex-1 rounded-3xl bg-zinc-900/90 border border-zinc-800 p-5 shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Next Up in Queue</h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                {upcomingTokens.length} in Line
              </span>
            </div>

            {/* Scrollable Next Up List with Large Legible Names */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0">
              <AnimatePresence initial={false}>
                {upcomingTokens.slice(0, 5).map((t, idx) => {
                  const isScheduled = t.currentState === 'SCHEDULED' || t.currentState === 'CREATED' || !!t.scheduledTime;
                  const schedDate = t.scheduledTime ? new Date(t.scheduledTime) : null;
                  const minsUntil = schedDate ? Math.round((schedDate.getTime() - Date.now()) / 60000) : null;
                  const timeFormatted = schedDate ? schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

                  return (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all shadow-xs ${
                        isScheduled
                          ? 'bg-sky-950/30 border-sky-800/50 hover:bg-sky-950/50'
                          : 'bg-zinc-800/60 border-zinc-800/80 hover:bg-zinc-800/90'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Position Badge */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/30 font-mono'
                            : isScheduled
                            ? 'bg-sky-500/20 text-sky-300 font-mono border border-sky-500/30'
                            : 'bg-zinc-700/50 text-zinc-300 font-mono'
                        }`}>
                          #{idx + 1}
                        </div>

                        {/* Ticket Number & Customer Name */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black font-mono text-base text-amber-400 tabular-nums">
                              {t.displayId}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                              isScheduled
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : t.currentState === 'CHECKED_IN'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-zinc-700/60 text-zinc-300'
                            }`}>
                              {isScheduled ? `Slot: ${timeFormatted || 'Booked'}` : t.currentState === 'CHECKED_IN' ? 'Checked In' : 'Waiting'}
                            </span>
                          </div>
                          {/* Big Customer Name */}
                          <p className="text-base font-bold text-white truncate mt-0.5">
                            {t.customerName}
                          </p>
                        </div>
                      </div>

                      {/* Service/Queue info & Wait status */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-zinc-300 block truncate max-w-[130px]">
                          {t.serviceName || t.queueName || 'General'}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 font-medium">
                          {isScheduled && minsUntil !== null
                            ? minsUntil <= 0
                              ? 'Ready now'
                              : `in ${minsUntil}m`
                            : idx === 0
                            ? 'Next caller'
                            : `~${(idx + 1) * 5}m wait`}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {upcomingTokens.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                  <Users className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm font-semibold">No customers waiting</p>
                  <p className="text-xs text-zinc-600 mt-0.5">The queue is currently clear</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. RECENTLY PROCESSED / AT DESKS */}
          <div className="h-[38%] rounded-3xl bg-zinc-900/90 border border-zinc-800 p-5 shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-800 shrink-0">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">At Desks / Recent</h3>
              <span className="text-xs text-zinc-600 font-mono">{recentlyServed.length} history</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              <AnimatePresence initial={false}>
                {recentlyServed.slice(0, 4).map((t, idx) => (
                  <motion.div
                    key={t.id + idx}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.85 }}
                    exit={{ opacity: 0 }}
                    className="p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono font-bold text-white text-sm">{t.displayId}</span>
                      <span className="text-zinc-300 font-medium truncate max-w-[100px]">{t.customerName || 'Customer'}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-zinc-400 font-medium">→ {t.resourceName}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        t.currentState === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : t.currentState === 'IN_SERVICE'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {t.currentState === 'COMPLETED' ? 'Done' : t.currentState === 'IN_SERVICE' ? 'In Service' : 'Called'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {recentlyServed.length === 0 && (
                <div className="h-full flex items-center justify-center text-xs text-zinc-600 italic">
                  No recent activity recorded
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ─── BOTTOM TICKER TAPE ─────────────────────────────────── */}
      <footer
        className="h-10 mt-3 rounded-xl border flex items-center overflow-hidden relative shrink-0"
        style={{
          backgroundColor: branding?.primaryColor ? `${branding.primaryColor}18` : 'rgba(79, 70, 229, 0.08)',
          borderColor: branding?.primaryColor ? `${branding.primaryColor}35` : 'rgba(79, 70, 229, 0.2)',
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent z-10" />
        <div
          className="flex items-center gap-4 whitespace-nowrap ticker-scroll font-bold text-xs relative z-10"
          style={{ color: branding?.primaryColor || '#818cf8' }}
        >
          <span>Welcome to {tenantName}</span>
          <span>•</span>
          <span>Please proceed promptly to your assigned desk when your ticket is announced</span>
          <span>•</span>
          <span>Have your identification, medical documents, or confirmation QR ready</span>
          <span>•</span>
          <span>Scan the QR code on screen to check in or receive live queue notifications on WhatsApp</span>
          <span>•</span>
          <span>Thank you for your cooperation and patience</span>
        </div>
      </footer>
    </div>
  );
}
