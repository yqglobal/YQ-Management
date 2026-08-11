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

type ScannerStatus = 'idle' | 'scanning' | 'processing' | 'approved' | 'rejected' | 'error';

interface ValidationResult {
  valid: boolean;
  status: string;
  reason?: string;
  tokenId?: string;
  customerName?: string;
  queueName?: string;
  position?: number;
  purpose?: string;
  phone?: string;
  joinedAt?: string;
  queueId?: string;
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

const SCANNER_STATUS_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  shadowColor: string;
}> = {
  'Entry Approved': {
    icon: <CheckCircle2 className="w-10 h-10 text-emerald-400" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    shadowColor: 'rgba(16, 185, 129, 0.2)',
  },
  'Green': {
    icon: <CheckCircle2 className="w-10 h-10 text-emerald-400" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    shadowColor: 'rgba(16, 185, 129, 0.2)',
  },
  'Invalid QR Code': {
    icon: <XCircle className="w-10 h-10 text-red-400" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    shadowColor: 'rgba(239, 68, 68, 0.2)',
  },
  'QR Expired': {
    icon: <Clock className="w-10 h-10 text-orange-400" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    shadowColor: 'rgba(251, 146, 60, 0.2)',
  },
  'Already Used': {
    icon: <UserX className="w-10 h-10 text-purple-400" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    shadowColor: 'rgba(168, 85, 247, 0.2)',
  },
  'Wrong Queue': {
    icon: <AlertTriangle className="w-10 h-10 text-amber-400" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    shadowColor: 'rgba(245, 158, 11, 0.2)',
  },
  'Wrong Branch/Location': {
    icon: <MapPinOff className="w-10 h-10 text-rose-400" />,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    shadowColor: 'rgba(244, 63, 94, 0.2)',
  },
  'Wrong Tenant/Organization': {
    icon: <Building2 className="w-10 h-10 text-cyan-400" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    shadowColor: 'rgba(6, 182, 212, 0.2)',
  },
  'Queue Closed': {
    icon: <DoorClosed className="w-10 h-10 text-gray-400" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    shadowColor: 'rgba(107, 114, 128, 0.2)',
  },
  'Queue Not Started Yet': {
    icon: <Clock className="w-10 h-10 text-blue-400" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    shadowColor: 'rgba(59, 130, 246, 0.2)',
  },
  'Person Already Checked In': {
    icon: <Check className="w-10 h-10 text-green-400" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    shadowColor: 'rgba(34, 197, 94, 0.2)',
  },
  'Token Revoked/Cancelled': {
    icon: <Lock className="w-10 h-10 text-yellow-400" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    shadowColor: 'rgba(250, 204, 21, 0.2)',
  },
  'Server/Network Error': {
    icon: <WifiOff className="w-10 h-10 text-pink-400" />,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    shadowColor: 'rgba(236, 72, 153, 0.2)',
  },
  'Red': {
    icon: <XCircle className="w-10 h-10 text-red-400" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    shadowColor: 'rgba(239, 68, 68, 0.2)',
  },
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
  const [manualMode, setManualMode] = useState(false);
  const [manualTokenId, setManualTokenId] = useState('');
  const [manualProcessing, setManualProcessing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const manualStopRef = useRef(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
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

      // If labels are empty (permission not yet granted in session) or no devices listed, prompt automatically
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
            purpose: result.purpose,
            phone: result.phone,
            joinedAt: result.joinedAt,
            queueId: result.queueId,
          };

          setValidationResult(validationResult);
          setScannerStatus(validationResult.valid ? 'approved' : 'rejected');

          setTimeout(() => {
            setScannerStatus('scanning');
            try { html5QrCode.resume(); } catch (e) { console.error(e); }
            resetIdleTimer();
          }, 2000);

        } catch (e: unknown) {
          let status = 'Invalid QR Code';
          let reason = 'Unknown error';

          if (e instanceof Error) {
            reason = e.message;

            if (e.message.includes('expired')) {
              status = 'QR Expired';
            } else if (e.message.includes('already used')) {
              status = 'Already Used';
            } else if (e.message.includes('wrong queue')) {
              status = 'Wrong Queue';
            } else if (e.message.includes('wrong branch')) {
              status = 'Wrong Branch/Location';
            } else if (e.message.includes('wrong tenant')) {
              status = 'Wrong Tenant/Organization';
            } else if (e.message.includes('queue closed')) {
              status = 'Queue Closed';
            } else if (e.message.includes('not started')) {
              status = 'Queue Not Started Yet';
            } else if (e.message.includes('already checked')) {
              status = 'Person Already Checked In';
            } else if (e.message.includes('revoked') || e.message.includes('cancelled')) {
              status = 'Token Revoked/Cancelled';
            } else if (e.message.includes('network') || e.message.includes('server')) {
              status = 'Server/Network Error';
            }
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
          }, 2000);

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

  const toggleCamera = useCallback(() => {
    setUseFrontCamera(prev => !prev);
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

   const resetScanner = useCallback(async () => {
     if (idleTimerRef.current) {
       clearTimeout(idleTimerRef.current);
       idleTimerRef.current = null;
     }
     await cleanupScanner();
     setValidationResult(null);
     setError(null);
     setScannerStatus('idle');
     await startScanning();
   }, [cleanupScanner, startScanning]);

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
         purpose: result.purpose,
         phone: result.phone,
         joinedAt: result.joinedAt,
         queueId: result.queueId,
       };

       setValidationResult(validationResult);
       setScannerStatus(validationResult.valid ? 'approved' : 'rejected');
     } catch (e: unknown) {
       let status = 'Invalid Token';
       let reason = 'Unknown error';

       if (e instanceof Error) {
         reason = e.message;

         if (e.message.includes('expired')) {
           status = 'QR Expired';
         } else if (e.message.includes('already used')) {
           status = 'Already Used';
         } else if (e.message.includes('wrong queue')) {
           status = 'Wrong Queue';
         } else if (e.message.includes('wrong branch')) {
           status = 'Wrong Branch/Location';
         } else if (e.message.includes('wrong tenant')) {
           status = 'Wrong Tenant/Organization';
         } else if (e.message.includes('queue closed')) {
           status = 'Queue Closed';
         } else if (e.message.includes('not started')) {
           status = 'Queue Not Started Yet';
         } else if (e.message.includes('already checked')) {
           status = 'Person Already Checked In';
         } else if (e.message.includes('revoked') || e.message.includes('cancelled')) {
           status = 'Token Revoked/Cancelled';
         } else if (e.message.includes('network') || e.message.includes('server')) {
           status = 'Server/Network Error';
         }
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

   useEffect(() => {
     getCameras();

     return () => {
       cleanupScanner();
     };
   }, [getCameras, cleanupScanner]);

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

  const getStatusConfig = (status: string) => SCANNER_STATUS_CONFIG[status] || SCANNER_STATUS_CONFIG['Invalid QR Code'];

  return (
    <AdminLayout pageTitle="Check-in" pageSubtitle="Scan QR codes and lookup appointments">
      <Head>
        <title>Check-in | Qmova</title>
      </Head>

      <div className="min-h-screen bg-gray-50/50 dark:bg-black/20 p-4 sm:p-6">
        <div className="mb-6">
          <p className="text-gray-500 dark:text-zinc-400 text-sm font-medium tracking-wider uppercase mb-1">
            Verify Tickets
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ScanLine className="w-8 h-8 text-indigo-500" />
            QR Scanner
          </h1>
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Scanner Card */}
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Live Scanner</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  {scannerStatus === 'scanning' && 'Scanning...'}
                  {scannerStatus === 'processing' && 'Validating...'}
                  {scannerStatus === 'idle' && 'Ready to scan'}
                  {isInitializing && 'Loading scanner...'}
                </p>
                </div>

                 <div className="flex items-center gap-3 flex-wrap">
                   {availableCameras.length > 1 && (
                     <div className="relative">
                       <Smartphone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-zinc-400 pointer-events-none" />
                       <select
                         value={selectedCamera}
                         onChange={(e) => {
                           const cameraId = e.target.value;
                           setSelectedCamera(cameraId);
                           const camera = availableCameras.find(c => c.deviceId === cameraId);
                           if (camera) {
                             setUseFrontCamera(camera.label.toLowerCase().includes('front'));
                           }
                         }}
                         disabled={scannerStatus === 'processing' || manualMode}
                         className="appearance-none pl-9 pr-8 py-2 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-[200px] truncate"
                       >
                         {availableCameras.map((camera, index) => (
                           <option key={camera.deviceId} value={camera.deviceId}>
                             {camera.label || `Camera ${index + 1}`}
                           </option>
                         ))}
                       </select>
                       <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-zinc-400 pointer-events-none" />
                     </div>
                   )}

                   <button
                     onClick={() => setManualMode(prev => !prev)}
                     disabled={scannerStatus === 'processing'}
                     className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                       manualMode
                         ? 'bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700'
                         : 'bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                     } disabled:opacity-50`}
                   >
                     <Keyboard className="w-4 h-4" />
                     {manualMode ? 'Manual Entry' : 'Manual Entry'}
                   </button>

                   {!manualMode && (
                     <button
                       onClick={scannerStatus === 'scanning' ? stopScanning : startScanning}
                       disabled={scannerStatus === 'processing'}
                       className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-white ${
                         scannerStatus === 'scanning'
                           ? 'bg-red-500 hover:bg-red-600'
                           : 'bg-indigo-600 hover:bg-indigo-700'
                       } disabled:opacity-50`}
                     >
                       {scannerStatus === 'scanning' ? (
                         <>
                           <StopCircle className="w-5 h-5" />
                           Stop
                         </>
                       ) : (
                         <>
                           <PlayCircle className="w-5 h-5" />
                           Start
                         </>
                       )}
                     </button>
                   )}

                   {manualMode && (
                     <button
                       onClick={validateManualToken}
                       disabled={manualProcessing || manualTokenId.trim().length < 5}
                       className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                     >
                       {manualProcessing ? (
                         <>
                           <Loader2 className="w-5 h-5 animate-spin" />
                           Validating...
                         </>
                       ) : (
                         <>
                           <CheckCircle2 className="w-5 h-5" />
                           Validate
                         </>
                       )}
                     </button>
                   )}
                 </div>
               </div>
             </div>

             <div className="min-h-[450px] sm:min-h-[500px] bg-black relative">
               {!manualMode ? (
                 <>
                   <div id="reader" className="w-full h-full"></div>
                   {isInitializing && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 z-10">
                       <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
                       <p className="text-lg font-medium">Loading Scanner...</p>
                       <p className="text-sm text-gray-400 mt-2">Initializing camera and QR detection</p>
                     </div>
                   )}
                 </>
               ) : (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                   <div className="w-full max-w-md">
                     <h3 className="text-xl font-bold text-white mb-2 text-center">Manual Token Entry</h3>
                     <p className="text-gray-400 text-sm text-center mb-6">
                       Enter a token ID to validate it without scanning
                     </p>
                     <div className="flex gap-3">
                       <input
                         type="text"
                         value={manualTokenId}
                         onChange={(e) => setManualTokenId(e.target.value)}
                         placeholder="Enter token ID..."
                         className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-zinc-500"
                         onKeyDown={(e) => {
                           if (e.key === 'Enter') validateManualToken();
                         }}
                       />
                       <button
                         onClick={validateManualToken}
                         disabled={manualProcessing || manualTokenId.trim().length < 5}
                         className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
                       >
                         {manualProcessing ? 'Validating...' : 'Validate'}
                       </button>
                     </div>
                     <p className="text-xs text-zinc-500 mt-3 text-center">
                       Press Enter or click Validate to check the token
                     </p>
                   </div>
                 </div>
               )}
              {scannerStatus === 'error' && error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-6">
                  <AlertTriangle className="w-12 h-12 mb-4" />
                  <p className="text-center mb-2">{error}</p>
                  {error.includes('camera') || error.includes('Camera') || error.includes('permission') ? (
                    <button
                      onClick={requestCameraPermission}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      Grant Camera Permission
                    </button>
                  ) : (
                    <button
                      onClick={resetScanner}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Retry
                    </button>
                  )}
                </div>
              )}
              {validationResult && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
                  <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(0,0,0,0.3)]"
                    style={{
                      backgroundColor: getStatusConfig(validationResult.status).bgColor,
                      borderColor: getStatusConfig(validationResult.status).borderColor
                    }}
                  >
                    {getStatusConfig(validationResult.status).icon}
                  </div>

                  <h3 className="text-2xl font-bold mb-2" style={{color: getStatusConfig(validationResult.status).color.split('-')[1]}}>
                    {validationResult.status}
                  </h3>

                  {validationResult.reason && (
                    <p className="text-gray-300 mb-4 max-w-md text-center">
                      {validationResult.reason}
                    </p>
                  )}

                  {validationResult.customerName && (
                    <div className="bg-white/10 dark:bg-zinc-800/50 rounded-lg px-4 py-2 mb-2">
                      <p className="text-sm font-medium">
                        <span className="text-gray-300">Customer:</span> {validationResult.customerName}
                      </p>
                    </div>
                  )}

                  {validationResult.queueName && (
                    <div className="bg-white/10 dark:bg-zinc-800/50 rounded-lg px-4 py-2 mb-4">
                      <p className="text-sm font-medium">
                        <span className="text-gray-300">Queue:</span> {validationResult.queueName}
                      </p>
                    </div>
                  )}

                  {validationResult.position && (
                    <div className="bg-white/10 dark:bg-zinc-800/50 rounded-lg px-4 py-2 mb-6">
                      <p className="text-sm font-medium">
                        <span className="text-gray-300">Position:</span> #{validationResult.position}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={resetScanner}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors shadow-lg"
                  >
                    <RefreshCcw className="w-5 h-5" />
                    Scan Next Ticket
                  </button>
                </div>
              )}
              {scannerStatus === 'idle' && !error && !validationResult && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-6">
                  <Camera className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg mb-2">Camera is off</p>
                  <p className="text-sm opacity-80">Click Start to begin scanning</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Scans Panel */}
          <div className="w-full xl:w-[420px] bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden flex flex-col shrink-0">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-white/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Approved Tickets
              </h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Recently checked-in customers
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading recent scans...</div>
              ) : recentScans.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Ticket className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No approved tickets yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {recentScans.map((scan) => (
                    <div key={scan.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {scan.customer?.name || 'Customer'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                              {scan.service?.name || scan.location?.name || 'Unknown Location'}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold tracking-wider uppercase">
                          {scan.currentState}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Ticket className="w-3.5 h-3.5" />
                          <span className="font-mono">{scan.id.slice(0, 8)}...</span>
                        </span>
                        {scan.purpose && (
                          <span className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-600"></span>
                            {scan.purpose}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 ml-auto">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
