import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ScanLine,
  CheckCircle2,
  Check,
  XCircle,
  RefreshCcw,
  Camera,
  AlertTriangle,
  Clock,
  UserX,
  Lock,
  DoorClosed,
  MapPinOff,
  Building2,
  WifiOff,
  Smartphone,
  PlayCircle,
  StopCircle,
  Ticket,
  User,
  Keyboard,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { detectCountryByTimezone } from '../../../lib/country-codes';

type ScannerStatus = 'idle' | 'scanning' | 'processing' | 'approved' | 'rejected' | 'error';

interface ValidationResult {
  valid: boolean;
  status: string;
  reason?: string;
  tokenId?: string;
  customerName?: string;
  queueName?: string;
  locationName?: string;
  serviceBooked?: string;
  position?: number;
  purpose?: string;
  phone?: string;
  joinedAt?: string;
  queueId?: string;
  isAppointment?: boolean;
  scheduledFor?: string;
  checkedIn?: boolean;
}

interface HistoryToken {
  id: string;
  customer: {
    name: string;
    phone?: string;
  };
  service?: {
    name: string;
  };
  location?: {
    name: string;
  };
  purpose?: string;
  currentState: string;
  createdAt: string;
}

const SCANNER_CONFIG = {
  fps: 12,
  qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
    const size = Math.floor(minEdge * 0.7);
    return { width: Math.max(150, size), height: Math.max(150, size) };
  },
  rememberLastUsedCamera: true,
};

export default function AdminScanner() {
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [manualTokenId, setManualTokenId] = useState('');
  const [manualProcessing, setManualProcessing] = useState(false);
  const [lookupTab, setLookupTab] = useState<'token' | 'phone'>('token');

  const [defaultCountry, setDefaultCountry] = useState<any>('US');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('qmova_scanner_country');
      if (saved) {
        setDefaultCountry(saved);
      } else {
        const detected = detectCountryByTimezone();
        setDefaultCountry(detected || 'US');
      }
    }
  }, []);
  const [manualPhone, setManualPhone] = useState('');
  const [phoneProcessing, setPhoneProcessing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const manualStopRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resultContainerRef = useRef<HTMLDivElement>(null);
  const DEBOUNCE_TIME = 1000;
  const IDLE_TIMEOUT_MS = 10000;

  const { data: history = [], isLoading: historyLoading } = useQuery<HistoryToken[]>({
    queryKey: ['recent-scans'],
    queryFn: () => fetchApi('/visits'),
  });

  const recentScans = useMemo(() => {
    if (!history.length) return [];
    return history.filter((t) => t.currentState === 'CHECKED_IN' || t.currentState === 'COMPLETED').slice(0, 20);
  }, [history]);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(async () => {
      idleTimerRef.current = null;
      manualStopRef.current = true;
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // ignore stop errors when page is leaving
        }
        scannerRef.current = null;
      }
      setScannerStatus('idle');
    }, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: PromiseRejectionEvent) => {
      const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
      if (message.includes('play()') && message.includes('removed from the document')) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

   const getCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setError('Camera API not supported in this browser or over insecure HTTP.');
        return;
      }

      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter((device) => device.kind === 'videoinput');

      if (videoDevices.length === 0 || (videoDevices.length > 0 && !videoDevices[0].label)) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          devices = await navigator.mediaDevices.enumerateDevices();
          videoDevices = devices.filter((device) => device.kind === 'videoinput');
        } catch (e) {
          console.warn('Initial silent camera permission request failed or denied:', e);
        }
      }

      const sortedCameras = [...videoDevices].sort((a, b) => {
        const aIsFront = a.label.toLowerCase().includes('front');
        const bIsFront = b.label.toLowerCase().includes('front');
        return aIsFront === bIsFront ? 0 : aIsFront ? 1 : -1;
      });

      setAvailableCameras(sortedCameras);

      if (sortedCameras.length > 0) {
        const defaultCamera = useFrontCamera
          ? sortedCameras.find(c => c.label.toLowerCase().includes('front')) || sortedCameras[0]
          : sortedCameras.find(c => !c.label.toLowerCase().includes('front')) || sortedCameras[0];
        setSelectedCamera(defaultCamera?.deviceId || sortedCameras[0].deviceId);
      } else {
        setError('No camera devices found. Please connect a camera and check permissions.');
      }
    } catch {
      setError('Unable to access camera. Please check permissions.');
    }
  }, [useFrontCamera]);

  const requestCameraPermission = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      await getCameras();
    } catch {
      setError('Camera permission denied. Please allow camera access and try again.');
    }
  }, [getCameras]);

  const initializeScanner = useCallback(async () => {
    if (scannerRef.current || manualStopRef.current) return;

    setIsInitializing(true);
    setError(null);

    try {
      const html5QrCode = new Html5Qrcode('reader');
      const config = { ...SCANNER_CONFIG };

      const onScanSuccess = async (decodedText: string) => {
        const now = Date.now();
        if (now - lastScanTimeRef.current < DEBOUNCE_TIME) return;
        lastScanTimeRef.current = now;

        if (isProcessing) return;
        setIsProcessing(true);
        setScannerStatus('processing');

        try {
          await html5QrCode.pause();

          if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
          }

          if (!decodedText || decodedText.length < 5) {
            throw new Error('Invalid QR code format');
          }

          const result = await fetchApi('/token/validate', {
            method: 'POST',
            body: JSON.stringify({ tokenId: decodedText })
          });

          const validationResult: ValidationResult = {
            valid: result.valid,
            status: result.status,
            reason: result.reason,
            tokenId: decodedText,
            customerName: result.customerName,
            queueName: result.queueName,
            locationName: result.locationName,
            serviceBooked: result.serviceBooked,
            purpose: result.purpose,
            phone: result.phone,
            joinedAt: result.joinedAt,
            queueId: result.queueId,
            isAppointment: result.isAppointment,
            scheduledFor: result.scheduledFor,
            checkedIn: result.checkedIn,
          };

          setValidationResult(validationResult);
          setScannerStatus(validationResult.valid ? 'approved' : 'rejected');

          setTimeout(() => {
            setScannerStatus('scanning');
            try { html5QrCode.resume(); } catch (e) { console.error(e); }
            resetIdleTimer();
          }, 3000);

        } catch (e: unknown) {
          let status = 'Invalid QR Code';
          let reason = 'Unknown error';
          if (e instanceof Error) {
            reason = e.message;
            status = 'Rejected';
          }

          setValidationResult({
            valid: false,
            status,
            reason,
            tokenId: decodedText,
          });
          setScannerStatus('rejected');

          setTimeout(() => {
            setScannerStatus('scanning');
            try { html5QrCode.resume(); } catch (e) { console.error(e); }
            resetIdleTimer();
          }, 3000);

        } finally {
          setIsProcessing(false);
        }
      };

      const onScanFailure = (_error: unknown) => {
        // Ignore normal scan errors
      };

      try {
        if (selectedCamera) {
          await html5QrCode.start(selectedCamera, config, onScanSuccess, onScanFailure);
        } else {
          throw new Error('No selected camera ID, trying facingMode fallback');
        }
      } catch (primaryErr) {
        console.warn('Failed starting with selectedCamera ID, falling back to facingMode:', primaryErr);
        try {
          await html5QrCode.start(
            { facingMode: useFrontCamera ? 'user' : 'environment' },
            config,
            onScanSuccess,
            onScanFailure
          );
        } catch (secondaryErr) {
          console.warn('Failed starting with environment facingMode, trying user/default webcam:', secondaryErr);
          await html5QrCode.start({ facingMode: 'user' }, config, onScanSuccess, onScanFailure);
        }
      }

      scannerRef.current = html5QrCode;
      setScannerStatus('scanning');
      resetIdleTimer();

    } catch (err: any) {
      console.error('Final scanner initialization error:', err);
      setError('Failed to initialize camera scanner. Please check permissions or select a different camera.');
      setScannerStatus('error');
    } finally {
      setIsInitializing(false);
    }
  }, [selectedCamera, isProcessing, useFrontCamera]);

  const cleanupScanner = useCallback(async () => {
    if (scannerRef.current) {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore cleanup errors
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanning = useCallback(async () => {
    manualStopRef.current = false;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    setError(null);
    setValidationResult(null);
    if (!selectedCamera && availableCameras.length === 0) {
      try {
        await requestCameraPermission();
      } catch (e) {
        console.warn('Camera request failed:', e);
      }
    }
    await initializeScanner();
  }, [selectedCamera, availableCameras, initializeScanner, requestCameraPermission]);

  const stopScanning = useCallback(async () => {
    setIsInitializing(false);
    manualStopRef.current = true;
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    await cleanupScanner();
    setScannerStatus('idle');
  }, [cleanupScanner]);

  const validateManualToken = useCallback(async () => {
    if (!manualTokenId.trim()) {
      setError('Please enter a token ID');
      return;
    }

    setManualProcessing(true);
    setError(null);
    setValidationResult(null);
    setScannerStatus('processing');

    try {
      const result = await fetchApi('/token/validate', {
        method: 'POST',
        body: JSON.stringify({ tokenId: manualTokenId.trim() }),
      });

      const validationResult: ValidationResult = {
        valid: result.valid,
        status: result.status,
        reason: result.reason,
        tokenId: manualTokenId.trim(),
        customerName: result.customerName,
        queueName: result.queueName,
        locationName: result.locationName,
        serviceBooked: result.serviceBooked,
        purpose: result.purpose,
        phone: result.phone,
        joinedAt: result.joinedAt,
        queueId: result.queueId,
        isAppointment: result.isAppointment,
        scheduledFor: result.scheduledFor,
        checkedIn: result.checkedIn,
      };

      setValidationResult(validationResult);
      setScannerStatus(validationResult.valid ? 'approved' : 'rejected');
    } catch (e: unknown) {
      let status = 'Invalid Token';
      let reason = 'Unknown error';

      if (e instanceof Error) {
        reason = e.message;
        status = 'Rejected';
      }

      setValidationResult({
        valid: false,
        status,
        reason,
        tokenId: manualTokenId.trim(),
      });
      setScannerStatus('rejected');
    } finally {
      setManualProcessing(false);
    }
  }, [manualTokenId]);

  const handleCheckIn = useCallback(async () => {
    if (!validationResult?.tokenId) return;
    try {
      await fetchApi(`/token/${validationResult.tokenId}/checkin`, { method: 'POST' });
      setValidationResult((prev) => prev ? { ...prev, checkedIn: true, status: 'WAITING' } : prev);
      alert('Checked in successfully!');
    } catch (e: any) {
      alert(e.message || 'Failed to check in');
    }
  }, [validationResult?.tokenId]);

  const lookupByPhone = useCallback(async () => {
    if (!manualPhone.trim()) {
      setError('Please enter a phone number');
      return;
    }
    setPhoneProcessing(true);
    setError(null);
    setValidationResult(null);
    setScannerStatus('processing');
    try {
      const result = await fetchApi(`/customers/by-phone?phone=${encodeURIComponent(manualPhone.trim())}`);
      if (!result) throw new Error('No customer found with this phone number');
      // Build a pseudo validation result from customer record
      const latest = result.visits?.[0];
      setValidationResult({
        valid: true,
        status: 'FOUND',
        tokenId: latest?.id || result.id,
        customerName: result.name || 'Unknown',
        queueName: latest?.queue?.name || '—',
        phone: result.phone,
        joinedAt: latest?.createdAt,
        queueId: latest?.queueId,
      });
      setScannerStatus('approved');
    } catch (e: any) {
      setValidationResult({
        valid: false,
        status: 'Not Found',
        reason: e?.message || 'No customer found with this phone number.',
        tokenId: manualPhone.trim(),
      });
      setScannerStatus('rejected');
    } finally {
      setPhoneProcessing(false);
    }
  }, [manualPhone]);

  useEffect(() => {
    getCameras();
    return () => {
      cleanupScanner();
    };
  }, [getCameras, cleanupScanner]);

  useEffect(() => {
    if (validationResult && resultContainerRef.current) {
      resultContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [validationResult]);

  useEffect(() => {
    if (scannerStatus === 'idle' && !manualStopRef.current) {
      const timer = setTimeout(() => {
        startScanning();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [scannerStatus, startScanning]);

  useEffect(() => {
    if (availableCameras.length > 0) {
      const newCamera = useFrontCamera
        ? availableCameras.find(c => c.label.toLowerCase().includes('front'))
        : availableCameras.find(c => !c.label.toLowerCase().includes('front'));

      if (newCamera && newCamera.deviceId !== selectedCamera) {
        setSelectedCamera(newCamera.deviceId);
      }
    }
  }, [useFrontCamera, availableCameras, selectedCamera]);

  return (
    <AdminLayout pageTitle="Scanner">
      <Head>
        <title>Scanner | Qmova</title>
        <style>{`
          .laser {
              animation: scan 2.5s infinite linear;
              position: absolute;
              left: 12.5%;
              top: 50%;
              transform: translateY(-50%);
          }

          @keyframes scan {
              0% { top: 10%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { top: 90%; opacity: 0; }
          }
        `}</style>
      </Head>

      <div className="max-w-7xl mx-auto space-y-6">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-on-surface dark:text-white font-headline-lg tracking-tight font-semibold">Concierge Intake & Verification</h2>
          <p className="text-on-surface-variant dark:text-surface-variant mt-2 font-body-lg">Scan digital passes or manually check-in walk-in visitors</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Left Column (Scanner) */}
          <div className="flex flex-col gap-6">
            <div className="bg-card dark:bg-dark-card rounded-2xl border border-border dark:border-dark-border p-8 shadow-sm flex-1 flex flex-col">
              
              <div className="aspect-square max-h-[380px] w-full mx-auto rounded-xl bg-zinc-950 relative overflow-hidden mb-6 shadow-inner flex items-center justify-center">
                {/* Scanner Viewport — fills container, centered */}
                <div id="reader" className="absolute inset-0 w-full h-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
                
                {isInitializing && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white bg-black/50">
                    <Loader2 strokeWidth={1.5} className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-sm">Initializing Camera...</span>
                  </div>
                )}
                
                {/* Decorative Reticle */}
                <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-white/80 rounded-tl-lg pointer-events-none z-10"></div>
                <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-white/80 rounded-tr-lg pointer-events-none z-10"></div>
                <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-white/80 rounded-bl-lg pointer-events-none z-10"></div>
                <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-white/80 rounded-br-lg pointer-events-none z-10"></div>
                
                {/* Switch Camera Button */}
                {availableCameras.length > 1 && (
                  <div className="absolute top-4 right-4 z-20">
                    <button
                      onClick={() => {
                        setUseFrontCamera(!useFrontCamera);
                        stopScanning().then(() => setTimeout(() => startScanning(), 100));
                      }}
                      className="bg-black/60 backdrop-blur-sm text-white p-2 rounded-full border border-white/20 hover:bg-black/80 transition-colors shadow-lg"
                      title="Switch Camera"
                    >
                      <RefreshCcw strokeWidth={1.5} className="w-5 h-5" />
                    </button>
                  </div>
                )}
                
                {scannerStatus === 'scanning' && (
                  <div className="laser h-0.5 w-3/4 bg-primary/80 shadow-[0_0_15px_rgba(0,97,148,0.5)] z-10 pointer-events-none"></div>
                )}
                
                <div className="absolute bottom-4 z-10 w-full flex justify-between px-4 items-center">
                  <span className="text-white text-xs font-data-mono tracking-widest uppercase bg-black/50 px-2 py-1 rounded">
                    {scannerStatus === 'scanning' ? 'Camera Active: Awaiting QR...' : scannerStatus === 'processing' ? 'Validating...' : 'Camera Stopped'}
                  </span>
                  
                  {scannerStatus === 'scanning' ? (
                     <button onClick={stopScanning} className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"><StopCircle strokeWidth={1.5} className="w-5 h-5"/></button>
                  ) : (
                     <button onClick={startScanning} className="bg-primary hover:bg-primary-container text-white p-1 rounded-full"><PlayCircle strokeWidth={1.5} className="w-5 h-5"/></button>
                  )}
                </div>
              </div>

              <div className="mt-auto">
                {/* Lookup Tab switcher */}
                <div className="flex items-center gap-1 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-xl p-1 mb-4">
                  {(['token', 'phone'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => { setLookupTab(t); setError(null); }}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                        lookupTab === t ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                      }`}
                    >
                      {t === 'token' ? 'Token ID' : 'Phone Number'}
                    </button>
                  ))}
                </div>

                {lookupTab === 'token' ? (
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={manualTokenId}
                      onChange={(e) => setManualTokenId(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') validateManualToken(); }}
                      className="h-12 w-full rounded-xl bg-surface-container dark:bg-dark-canvas border border-border dark:border-dark-border px-4 font-data-mono text-base focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline text-on-surface dark:text-white"
                      placeholder="Enter Token ID"
                    />
                    <button
                      onClick={validateManualToken}
                      disabled={manualProcessing || manualTokenId.trim().length < 5}
                      className="h-12 min-h-[44px] bg-primary hover:bg-primary-container text-white rounded-xl w-full font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {manualProcessing ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : 'Lookup by Token'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <PhoneInput
                      international
                      defaultCountry={defaultCountry}
                      onCountryChange={(country) => {
                        if (country) {
                          setDefaultCountry(country);
                          localStorage.setItem('qmova_scanner_country', country);
                        }
                      }}
                      value={manualPhone}
                      onChange={(value) => setManualPhone(value || '')}
                      onKeyDown={(e: any) => { if (e.key === 'Enter') lookupByPhone(); }}
                      className="h-12 w-full rounded-xl bg-surface-container dark:bg-dark-canvas border border-border dark:border-dark-border px-4 text-base focus-within:ring-1 focus-within:ring-primary focus-within:border-primary outline-none transition-all placeholder:text-outline text-on-surface dark:text-white"
                      placeholder="e.g. +91 98765 43210"
                    />
                    <button
                      onClick={lookupByPhone}
                      disabled={phoneProcessing || manualPhone.trim().length < 7}
                      className="h-12 min-h-[44px] bg-primary hover:bg-primary-container text-white rounded-xl w-full font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {phoneProcessing ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : 'Lookup by Phone'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (Verification) */}
          <div className="flex flex-col" ref={resultContainerRef}>
            <div className="bg-card dark:bg-dark-card rounded-2xl border border-border dark:border-dark-border p-8 shadow-sm flex-1 flex flex-col scroll-mt-24">
              
              {!validationResult && scannerStatus !== 'processing' && (
                <div className="flex-1 flex flex-col items-center justify-center text-outline text-center space-y-4">
                  <div className="w-20 h-20 bg-surface-container-low dark:bg-inverse-surface rounded-full flex items-center justify-center">
                     <ScanLine strokeWidth={1.5} className="w-10 h-10 opacity-50" />
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-lg text-on-surface dark:text-white tracking-tight font-semibold">Awaiting Scan</h3>
                    <p className="text-body-sm mt-1">Please scan a visitor's QR code or use manual lookup</p>
                  </div>
                </div>
              )}

              {scannerStatus === 'processing' && (
                <div className="flex-1 flex flex-col items-center justify-center text-primary text-center space-y-4">
                  <Loader2 strokeWidth={1.5} className="w-16 h-16 animate-spin" />
                  <h3 className="font-headline-sm text-lg tracking-tight font-semibold">Verifying Identity...</h3>
                </div>
              )}

              {validationResult && (
                <>
                  {/* Section A: Profile */}
                  <div className="flex items-start justify-between mb-8 pb-8 border-b border-border dark:border-dark-border">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2 ${validationResult.valid ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'}`}>
                        {validationResult.customerName ? validationResult.customerName.substring(0, 2).toUpperCase() : (validationResult.valid ? <Check strokeWidth={1.5} className="w-8 h-8"/> : <XCircle strokeWidth={1.5} className="w-8 h-8" />)}
                      </div>
                      <div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${validationResult.valid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                          {validationResult.valid ? (
                            <><CheckCircle2 strokeWidth={1.5} className="w-3.5 h-3.5" /> Access Granted</>
                          ) : (
                            <><XCircle strokeWidth={1.5} className="w-3.5 h-3.5" /> Access Denied</>
                          )}
                        </div>
                        <h3 className="text-2xl font-bold text-on-surface dark:text-white font-headline-md tracking-tight font-semibold">{validationResult.customerName || 'Unknown Visitor'}</h3>
                        {validationResult.phone && <p className="text-outline font-data-mono text-sm mt-1">{validationResult.phone}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Section B: Details */}
                  <div className="space-y-4 mb-8 flex-1">
                    {!validationResult.valid && validationResult.reason && (
                      <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-5 border border-red-100 dark:border-red-500/20 text-red-800 dark:text-red-400">
                        <p className="font-semibold mb-1">Rejection Reason:</p>
                        <p>{validationResult.reason}</p>
                      </div>
                    )}
                    
                    {validationResult.valid && (
                      <>
                        <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-5 border border-primary/20 flex flex-col gap-4">
                          <div className="flex justify-between items-center">
                            <span className="text-outline text-sm font-medium">Service Line</span>
                            <span className="font-semibold text-on-surface dark:text-white">{validationResult.queueName || 'General Consultation'}</span>
                          </div>
                          {validationResult.serviceBooked && (
                            <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                              <span className="text-outline text-sm font-medium">Service Booked</span>
                              <span className="font-semibold text-on-surface dark:text-white">{validationResult.serviceBooked}</span>
                            </div>
                          )}
                          {validationResult.locationName && (
                            <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                              <span className="text-outline text-sm font-medium">Location</span>
                              <span className="font-semibold text-on-surface dark:text-white">{validationResult.locationName}</span>
                            </div>
                          )}
                          {validationResult.isAppointment && validationResult.scheduledFor && (
                            <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                              <span className="text-outline text-sm font-medium">Appointment Time</span>
                              <div className="text-right">
                                <span className="font-semibold text-on-surface dark:text-white block">
                                  {new Date(validationResult.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {(() => {
                                  const diffMins = (new Date().getTime() - new Date(validationResult.scheduledFor).getTime()) / 60000;
                                  if (diffMins < -15) return <span className="text-xs text-amber-500 font-semibold uppercase">Early</span>;
                                  if (diffMins > 15) return <span className="text-xs text-red-500 font-semibold uppercase">Late</span>;
                                  return <span className="text-xs text-emerald-500 font-semibold uppercase">On Time</span>;
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-surface-container-low dark:bg-inverse-surface rounded-xl p-4 border border-border dark:border-dark-border flex justify-between items-center">
                          <span className="text-outline text-sm font-medium">Token Status</span>
                          <span className={`font-semibold font-data-mono ${validationResult.status === 'WAITING' ? 'text-amber-500' : validationResult.status === 'SERVING' ? 'text-emerald-500' : validationResult.status === 'MISSED' ? 'text-red-500' : 'text-on-surface dark:text-white'}`}>{validationResult.status}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Section C: Action */}
                  <div className="mt-auto pt-8 border-t border-border dark:border-dark-border">
                    {validationResult.valid ? (
                       validationResult.isAppointment && !validationResult.checkedIn ? (
                         <button 
                           onClick={handleCheckIn}
                           className="h-16 min-h-[44px] w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                         >
                           <CheckCircle2 strokeWidth={1.5} className="w-5 h-5" />
                           Check In
                         </button>
                       ) : (
                         <button 
                           onClick={() => { setValidationResult(null); startScanning(); }}
                           className="h-16 min-h-[44px] w-full bg-on-surface dark:bg-white text-white dark:text-zinc-900 text-lg font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                         >
                           <RefreshCcw strokeWidth={1.5} className="w-5 h-5" />
                           Scan Next Ticket
                         </button>
                       )
                    ) : (
                       <button 
                         onClick={() => { setValidationResult(null); startScanning(); }}
                         className="h-16 min-h-[44px] w-full bg-on-surface dark:bg-white text-white dark:text-zinc-900 text-lg font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                       >
                         <RefreshCcw strokeWidth={1.5} className="w-5 h-5" />
                         Scan Next Ticket
                       </button>
                    )}
                    
                    {validationResult.valid && (!validationResult.isAppointment || validationResult.checkedIn) && (
                      <p className="text-center text-outline text-sm mt-4 font-body-sm">
                        Visitor has already been verified and is in the system.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
