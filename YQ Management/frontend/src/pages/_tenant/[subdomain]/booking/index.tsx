import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useTheme } from '../../../../components/ThemeProvider';
import { Sun, Moon } from 'lucide-react';
import { detectCountryByTimezone } from '../../../../lib/country-codes';
import QRCode from 'react-qr-code';

interface Service {
  id: string;
  name: string;
  description?: string;
  expectedDuration?: number;
  locationId?: string;
  formConfig?: any[];
  queues: Queue[];
}

interface Queue {
  id: string;
  name: string;
  status: string;
  allowAppointments: boolean;
  appointmentGranularityMins: number;
  formConfig?: any[];
}

interface TenantPortalProps {
  tenant: any;
  services: Service[];
  queues: Queue[];
  error?: string;
  ipCountry?: string;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { subdomain } = context.params as { subdomain: string };
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  try {
    const tenantRes = await fetch(`${baseUrl}/tenant/public/${subdomain}`);
    if (!tenantRes.ok) return tenantRes.status === 404 ? { notFound: true } : { props: { tenant: null, services: [], queues: [], error: 'Unable to load.' } };
    const tenant = await tenantRes.json();

    const [servicesRes, queuesRes] = await Promise.all([
      fetch(`${baseUrl}/service/public/tenant/${tenant.id}`),
      fetch(`${baseUrl}/queue/public/tenant/${tenant.id}`),
    ]);

    const services: Service[] = servicesRes.ok ? await servicesRes.json() : [];
    const queues: Queue[] = queuesRes.ok ? await queuesRes.json() : [];

    const ipCountry = context.req.headers['x-vercel-ip-country'] as string || null;

    return { props: { tenant, services, queues, ipCountry } };
  } catch (e) {
    return { props: { tenant: null, services: [], queues: [], error: 'Unable to load tenant information.', ipCountry: null } };
  }
};

export default function TenantBooking({ tenant, services, queues, error, ipCountry }: TenantPortalProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState(1);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultCountry, setDefaultCountry] = useState<any>('US');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  
  const [regionBlocked, setRegionBlocked] = useState(false);

  useEffect(() => {
    const detected = ipCountry || detectCountryByTimezone();
    setDefaultCountry(detected);
    
    // Check operating countries
    if (tenant?.operatingCountries && tenant.operatingCountries.length > 0) {
      if (!tenant.operatingCountries.includes(detected)) {
        setRegionBlocked(true);
      }
    }

    const { locationId, serviceId, queueId } = router.query;
    
    // Auto-select location
    if (locationId && typeof locationId === 'string' && tenant?.locations?.some((l: any) => l.id === locationId)) {
      setSelectedLocationId(locationId);
      setStep(2); // Skip location step
    } else if (tenant?.locations && tenant.locations.length === 1) {
      setSelectedLocationId(tenant.locations[0].id);
      setStep(2); // Skip location step
    } else if (!tenant?.locations || tenant.locations.length === 0) {
      setStep(2); // Skip location step if none exist
    }

    // Auto-select service & queue
    if (serviceId && typeof serviceId === 'string') {
      const s = services.find(x => x.id === serviceId);
      if (s) {
        if (s.locationId) setSelectedLocationId(s.locationId);
        setSelectedServiceIds([serviceId]);
        if (queueId && typeof queueId === 'string') {
          setServiceDetails(prev => ({
            ...prev,
            [serviceId]: { 
              joinMode: 'immediate',
              selectedDate: '',
              selectedSlot: '',
              responses: {},
              ...(prev[serviceId] || {}), 
              queueId 
            }
          }));
        }
        setStep(3); // Jump straight to service details
      }
    }
  }, [tenant, router.query]);
  
  // State for the per-service dynamic flow
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const [serviceDetails, setServiceDetails] = useState<Record<string, {
    joinMode: 'immediate' | 'appointment',
    selectedDate: string,
    selectedSlot: string,
    queueId?: string,
    responses: Record<string, any>
  }>>({});
  
  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState<Record<string, boolean>>({});

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [tokens, setTokens] = useState<any[]>([]);
  const [statusDataMap, setStatusDataMap] = useState<Record<string, any>>({});

  // Local storage persistence removed in favor of secure shareable URLs

  const primaryColor = tenant?.branding?.primaryColor || '#4f46e5';
  const logoUrl = tenant?.branding?.logoUrl;
  const baseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') : 'http://localhost:3000';

  // Find the queue for a given service (always use the first ACTIVE one linked)
  const getQueueForService = (serviceId: string) => {
    const s = services.find(x => x.id === serviceId);
    return s?.queues.find(q => q.status === 'ACTIVE') || null;
  };

  // Helper for contact details
  const supportNumber = tenant?.customerCareNumber || tenant?.phone || null;

  // Realtime updates for multiple tokens
  useEffect(() => {
    if (tokens.length === 0) return;
    const socket = io(baseUrl);
    
    const refreshStatus = () => {
      tokens.forEach(t => {
        fetch(`${baseUrl}/token/${t.id}/status`)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d) {
              setStatusDataMap(prev => ({ ...prev, [t.id]: d }));
            }
          });
      });
    };
    
    refreshStatus();
    socket.on('queue_status_changed', refreshStatus);
    socket.on('token_serving', refreshStatus);
    socket.on('token_completed', refreshStatus);
    socket.on('token_missed', refreshStatus);
    return () => { socket.disconnect(); };
  }, [tokens.length, baseUrl]);

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleNextStepLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId) return setErrorMsg('Please select a location.');
    setErrorMsg('');
    setStep(2);
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErrorMsg('Please enter your name.');
    if (selectedServiceIds.length === 0) return setErrorMsg('Please select at least one service.');
    
    setErrorMsg('');
    setCurrentServiceIndex(0);
    setStep(3); // Proceed to dynamic flow
  };

  const currentServiceId = selectedServiceIds[currentServiceIndex];
  const currentService = services.find(s => s.id === currentServiceId);
  const currentQueue = currentService ? getQueueForService(currentService.id) : null;
  
  const currentDetails = serviceDetails[currentServiceId] || {
    joinMode: 'immediate', selectedDate: '', selectedSlot: '', responses: {}
  };

  const updateCurrentDetails = (updates: Partial<typeof currentDetails>) => {
    setServiceDetails(prev => ({
      ...prev,
      [currentServiceId]: { ...currentDetails, ...updates }
    }));
  };

  // Fetch slots when date changes for current service
  useEffect(() => {
    if (!currentService || !currentDetails.selectedDate || currentDetails.joinMode !== 'appointment') return;
    setLoadingSlots(p => ({ ...p, [currentServiceId]: true }));
    fetch(`${baseUrl}/service/${currentService.id}/slots?date=${currentDetails.selectedDate}`)
      .then(r => r.ok ? r.json() : [])
      .then(slots => setAvailableSlots(p => ({ ...p, [currentServiceId]: slots })))
      .catch(() => setAvailableSlots(p => ({ ...p, [currentServiceId]: [] })))
      .finally(() => setLoadingSlots(p => ({ ...p, [currentServiceId]: false })));
  }, [currentDetails.selectedDate, currentService, currentDetails.joinMode, currentServiceId, baseUrl]);

  const formConfig = React.useMemo(() => {
    if (!currentService || !currentQueue) return [];
    let config: any[] = [];
    if (currentService.formConfig) config = [...config, ...currentService.formConfig];
    if (currentQueue.formConfig) config = [...config, ...currentQueue.formConfig];
    // Deduplicate
    return Array.from(new Map(config.map(item => [item.id, item])).values());
  }, [currentService, currentQueue]);

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (currentDetails.joinMode === 'appointment' && !currentDetails.selectedSlot) {
      return setErrorMsg('Please select a time slot.');
    }
    
    const activeQueues = currentService?.queues?.filter(q => q.status === 'ACTIVE') || [];
    if (activeQueues.length > 1 && !currentDetails.queueId) {
      return setErrorMsg('Please select a queue.');
    }

    for (const field of formConfig) {
      if (field.required && !currentDetails.responses[field.id]) {
        return setErrorMsg(`Please fill in: ${field.label}`);
      }
    }
    
    // Proceed to next service or OTP
    if (currentServiceIndex < selectedServiceIds.length - 1) {
      setCurrentServiceIndex(idx => idx + 1);
    } else {
      setStep(4); // Show confirmation
    }
  };

  const handleConfirm = () => {
    setStep(5);
  };

  useEffect(() => {
    if (step === 5) triggerJoinSequence();
  }, [step]);

  const triggerJoinSequence = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (phone) {
        // Pass serviceId for the first selected service
        const firstServiceId = selectedServiceIds[0];
        const otpRes = await fetch(`${baseUrl}/token/request-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, serviceId: firstServiceId }),
        });
        if (otpRes.ok) {
          setOtpSent(true);
          setLoading(false);
          return;
        } else if (otpRes.status === 503 || otpRes.status === 404) {
          // WhatsApp not connected or number not registered, silently bypass OTP
          await submitJoin();
          return;
        } else {
          const errData = await otpRes.json();
          throw new Error(errData.message || 'Failed to request OTP');
        }
      }
      await submitJoin();
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  const submitJoin = async (otpCode?: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const bookings = selectedServiceIds.map(sid => {
        const d = serviceDetails[sid] || {};
        return {
          serviceId: sid,
          scheduledFor: d.joinMode === 'appointment' && d.selectedSlot ? d.selectedSlot : undefined,
          formResponses: d.responses || {}
        };
      });

      const res = await fetch(`${baseUrl}/public-visit/join-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          phone: phone || undefined,
          otp: otpCode || undefined,
          language: 'en',
          bookings
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to complete booking.');
      }
      const data = await res.json();
      const accessTokens = data.map((d: any) => d.accessToken).filter(Boolean).join(',');
      let targetUrl = `/booking/status?tokens=${accessTokens}`;
      if (window.location.pathname.startsWith('/t/')) {
        const parts = window.location.pathname.split('/');
        if (parts.length >= 3) {
          targetUrl = `/t/${parts[2]}/booking/status?tokens=${accessTokens}`;
        }
      }
      router.push(targetUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (tokenId: string) => {
    try {
      // It might be Visit cancel not Token, but let's assume /visit/cancel exists. Actually let's use the visit ID.
      await fetch(`${baseUrl}/visit/${tokenId}/cancel`, { method: 'POST' });
      setTokens(prev => prev.filter(t => t.id !== tokenId));
      if (tokens.length <= 1) {
        setStep(1); // Reset if all cancelled
      }
    } catch {}
  };

  if (error || !tenant || regionBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border rounded-2xl p-8 max-w-sm w-full text-center shadow">
          <h1 className="text-xl font-bold mb-2">Unavailable</h1>
          <p className="text-gray-500">{regionBlocked ? 'Bookings are not currently available in your region.' : (error || 'This portal is unavailable.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col items-center">
      <Head>
        <title>{tenant.name} | Book an Appointment</title>
        <meta name="description" content={`Book an appointment or join the waitlist at ${tenant.name}. Services include ${services.map(s => s.name).join(', ')}.`} />
        <meta property="og:title" content={`${tenant.name} | Book an Appointment`} />
        <meta property="og:description" content={`Book an appointment or join the waitlist at ${tenant.name}.`} />
        <script 
          type="application/ld+json" 
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": tenant.name,
              "url": `https://${tenant.id}.qmova.app/booking`,
              "telephone": tenant.phone || tenant.customerCareNumber || undefined,
              "description": `Book an appointment or join the waitlist at ${tenant.name}. Services include ${services.map(s => s.name).join(', ')}.`
            })
          }} 
        />
        <style>{`
          .PhoneInputInput { background: transparent; border: none; outline: none; width: 100%; color: inherit; }
          .PhoneInput { padding: 0.875rem 1rem; border-radius: 0.75rem; border: 1px solid var(--border-color); background: var(--bg-color); transition: all 0.2s; }
          .PhoneInput:focus-within { border-color: var(--primary-color); box-shadow: 0 0 0 2px var(--primary-color-alpha); }
          .PhoneInputCountrySelect { background: transparent; color: inherit; }
          .PhoneInputCountrySelect option { color: #000; background: #fff; }
          :root { --border-color: #e2e8f0; --bg-color: #ffffff; --primary-color: ${primaryColor}; --primary-color-alpha: ${primaryColor}33; }
          .dark { --border-color: #27272a; --bg-color: #18181b; }
          .dark .PhoneInputCountrySelect option { color: #fff; background: #18181b; }
        `}</style>
      </Head>

      {/* Header */}
      <header className="w-full max-w-md sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {step > 1 && step < 5 && (
            <button onClick={() => {
              if (step === 3 && currentServiceIndex > 0) setCurrentServiceIndex(i => i - 1);
              else if (step === 3 && currentServiceIndex === 0) setStep(2);
              else setStep(step - 1);
            }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
              ←
            </button>
          )}
          {logoUrl ? (
            <img src={logoUrl} alt={tenant.name} className="h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: primaryColor }}>
              {tenant.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-lg">{tenant.name}</span>
        </div>
        
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-500 dark:text-gray-400"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="w-full max-w-md p-6 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Location Selection */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 flex-1">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-extrabold tracking-tight mb-2">Welcome to {tenant.name}</h1>
                <p className="text-gray-500 dark:text-gray-400">Select a Location</p>
              </div>

              <form onSubmit={handleNextStepLocation} className="space-y-6">
                <div className="space-y-3">
                  {tenant?.locations?.map((loc: any) => (
                    <label key={loc.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedLocationId === loc.id ? 'border-transparent shadow-md' : 'border-gray-200 dark:border-zinc-800'}`} style={selectedLocationId === loc.id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}>
                      <input 
                        type="radio" 
                        name="location"
                        checked={selectedLocationId === loc.id} 
                        onChange={() => setSelectedLocationId(loc.id)}
                        className="w-5 h-5" style={{ accentColor: primaryColor }}
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-base">{loc.name}</h3>
                        {(loc.address || loc.city) && <p className="text-sm text-gray-500 mt-1">{[loc.address, loc.city].filter(Boolean).join(', ')}</p>}
                      </div>
                    </label>
                  ))}
                </div>
                {errorMsg && <p className="text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{errorMsg}</p>}
                <button type="submit" disabled={!selectedLocationId} className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                  Continue
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 2: Name, Phone, Service Selection */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 flex-1">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-extrabold tracking-tight mb-2">Welcome to {tenant.name}</h1>
                <p className="text-gray-500 dark:text-gray-400">Digital Check-in</p>
              </div>

              {services.length === 0 ? (
                <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px] text-gray-400">event_upcoming</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Coming Soon</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[250px]">
                    We are currently setting up our digital services. Please check back later or contact us directly.
                  </p>
                  {supportNumber && (
                    <a href={`tel:${supportNumber}`} className="mt-4 px-6 py-2.5 rounded-full font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95" style={{ backgroundColor: primaryColor }}>
                      Contact Support
                    </a>
                  )}
                </div>
              ) : (
                <form onSubmit={handleNextStep1} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wider">Your Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required
                        className="w-full p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 transition-shadow focus:border-transparent"
                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">WhatsApp Number</label>
                      <PhoneInput international defaultCountry={defaultCountry} value={phone} onChange={(v: any) => setPhone(v)} className="PhoneInput" />
                      <p className="text-xs text-gray-500 mt-2">Optional. Enter a valid WhatsApp number for live updates.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wider">Select Services <span className="text-red-500">*</span></label>
                    {services.filter(s => !s.locationId || s.locationId === selectedLocationId).length === 0 ? (
                      <p className="text-sm text-gray-500">No services available at this location.</p>
                    ) : (
                      services.filter(s => !s.locationId || s.locationId === selectedLocationId).map(service => (
                        <label key={service.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedServiceIds.includes(service.id) ? 'border-transparent shadow-md' : 'border-gray-200 dark:border-zinc-800'}`} style={selectedServiceIds.includes(service.id) ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}>
                          <input 
                            type="checkbox" checked={selectedServiceIds.includes(service.id)} onChange={() => toggleService(service.id)}
                            className="w-5 h-5 rounded border-gray-300" style={{ accentColor: primaryColor }}
                          />
                          <div className="flex-1">
                            <h3 className="font-bold text-base">{service.name}</h3>
                            {service.description && <p className="text-sm text-gray-500 mt-1">{service.description}</p>}
                          </div>
                        </label>
                      ))
                    )}
                  </div>

                  {errorMsg && <p className="text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{errorMsg}</p>}

                  <button type="submit" className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95" style={{ backgroundColor: primaryColor }}>
                    Continue
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* STEP 3: Service-specific Details Loop */}
          {step === 3 && currentService && (
            <motion.div key={`step2-${currentService.id}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 flex-1">
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Step {currentServiceIndex + 1} of {selectedServiceIds.length}</span>
                <h2 className="text-2xl font-bold mt-1">{currentService.name} Details</h2>
              </div>
              
              <form onSubmit={handleNextStep2} className="space-y-6">
                {formConfig.map((field: any) => (
                  <div key={field.id} className="space-y-2">
                    {field.type !== 'checkbox' && (
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                    )}
                    {field.type === 'text' && <input type="text" value={currentDetails.responses[field.id] || ''} onChange={e => updateCurrentDetails({ responses: {...currentDetails.responses, [field.id]: e.target.value} })} required={field.required} className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} />}
                    {field.type === 'textarea' && <textarea value={currentDetails.responses[field.id] || ''} onChange={e => updateCurrentDetails({ responses: {...currentDetails.responses, [field.id]: e.target.value} })} required={field.required} rows={3} className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} />}
                    {field.type === 'dropdown' && (
                      <select value={currentDetails.responses[field.id] || ''} onChange={e => updateCurrentDetails({ responses: {...currentDetails.responses, [field.id]: e.target.value} })} required={field.required} className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}>
                        <option value="" disabled>Select option</option>
                        {(field.options || []).map((opt: string, i: number) => <option key={i} value={opt}>{opt}</option>)}
                      </select>
                    )}
                    {field.type === 'checkbox' && (
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
                        <input type="checkbox" checked={!!currentDetails.responses[field.id]} onChange={e => updateCurrentDetails({ responses: {...currentDetails.responses, [field.id]: e.target.checked} })} className="w-5 h-5 rounded border-gray-300" style={{ accentColor: primaryColor }} />
                        <span className="text-sm font-medium">{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                      </label>
                    )}
                  </div>
                ))}

                {(currentService?.queues?.filter(q => q.status === 'ACTIVE').length || 0) > 1 && (
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Select Queue <span className="text-red-500">*</span></label>
                    <select 
                      value={currentDetails.queueId || ''} 
                      onChange={e => updateCurrentDetails({ queueId: e.target.value })} 
                      required 
                      className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:border-transparent" 
                      style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                    >
                      <option value="" disabled>Select a queue</option>
                      {currentService.queues.filter(q => q.status === 'ACTIVE').map(q => (
                        <option key={q.id} value={q.id}>{q.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {currentService?.allowAppointments && (
                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-zinc-800">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">When do you want to visit?</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => updateCurrentDetails({ joinMode: 'immediate' })} className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-all ${currentDetails.joinMode === 'immediate' ? 'border-transparent text-white shadow-md' : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300'}`} style={currentDetails.joinMode === 'immediate' ? { backgroundColor: primaryColor } : {}}>Now</button>
                      <button type="button" onClick={() => updateCurrentDetails({ joinMode: 'appointment' })} className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-all ${currentDetails.joinMode === 'appointment' ? 'border-transparent text-white shadow-md' : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300'}`} style={currentDetails.joinMode === 'appointment' ? { backgroundColor: primaryColor } : {}}>Book Slot</button>
                    </div>

                    {currentDetails.joinMode === 'appointment' && (
                      <div className="space-y-3 mt-4">
                        <input type="date" value={currentDetails.selectedDate} onChange={e => updateCurrentDetails({ selectedDate: e.target.value })} min={new Date().toISOString().split('T')[0]} className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:border-transparent" style={{ '--tw-ring-color': primaryColor } as React.CSSProperties} />
                        {currentDetails.selectedDate && (
                          <div className="grid grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto pr-1">
                            {loadingSlots[currentServiceId] ? <p className="col-span-3 text-sm text-center text-gray-500">Loading...</p> : availableSlots[currentServiceId]?.length === 0 ? <p className="col-span-3 text-sm text-center text-red-500">No slots available.</p> : availableSlots[currentServiceId]?.map(slot => (
                              <button key={slot} type="button" onClick={() => updateCurrentDetails({ selectedSlot: slot })} className={`p-2 rounded-lg text-sm font-bold transition-colors ${currentDetails.selectedSlot === slot ? 'text-white shadow-md' : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800'}`} style={currentDetails.selectedSlot === slot ? { backgroundColor: primaryColor } : {}}>
                                {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {errorMsg && <p className="text-red-500 text-sm font-medium text-center bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">{errorMsg}</p>}

                <button type="submit" className="w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95" style={{ backgroundColor: primaryColor }}>
                  {currentServiceIndex < selectedServiceIds.length - 1 ? 'Next Service' : 'Complete Booking'}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 4: Confirmation */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 flex-1 w-full max-w-lg mx-auto">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Review Your Booking</h2>
                <p className="text-gray-500">Please confirm your details</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
                <div className="border-b border-gray-100 dark:border-zinc-800 pb-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Name</p>
                  <p className="font-bold text-lg">{name}</p>
                </div>
                {phone && (
                  <div className="border-b border-gray-100 dark:border-zinc-800 pb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                    <p className="font-bold text-lg">{phone}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Selected Services</p>
                  <div className="space-y-3">
                    {selectedServiceIds.map(sid => {
                      const s = services.find(x => x.id === sid);
                      const details = serviceDetails[sid];
                      return (
                        <div key={sid} className="bg-gray-50 dark:bg-black/50 rounded-xl p-3 border border-gray-100 dark:border-zinc-800">
                          <p className="font-bold">{s?.name}</p>
                          {details?.joinMode === 'appointment' ? (
                            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                              Appointment: {new Date(details.selectedSlot).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          ) : (
                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-1">Walk-in (Join Now)</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setStep(3)} className="px-6 py-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Back
                </button>
                <button type="button" onClick={handleConfirm} className="flex-1 py-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95" style={{ backgroundColor: primaryColor }}>
                  Confirm Booking
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: OTP */}
          {step === 5 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-6 pt-8">
              {loading && !otpSent ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-current rounded-full animate-spin mb-4" style={{ color: primaryColor }} />
                  <p className="text-gray-500 font-medium">Processing...</p>
                </div>
              ) : otpSent ? (
                <div className="w-full space-y-6">
                  <h2 className="text-2xl font-bold">Verify your number</h2>
                  <p className="text-gray-500">Enter the code sent to <br/><strong className="text-gray-900 dark:text-white">{phone}</strong></p>
                  
                  <input
                    type="text" inputMode="numeric" maxLength={6} value={otp}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setOtp(val);
                      if (val.length === 6) submitJoin(val);
                    }}
                    placeholder="000000"
                    className="w-full bg-white dark:bg-zinc-900 border-2 border-gray-200 rounded-xl p-4 text-3xl tracking-[0.5em] text-center font-mono outline-none"
                    autoFocus
                  />
                  {errorMsg && <p className="text-red-500 text-sm font-medium">{errorMsg}</p>}
                </div>
              ) : null}
            </motion.div>
          )}

          {/* STEP 6: Boarding Passes */}
          {step === 6 && tokens.length > 0 && (
            <motion.div key="step6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 w-full space-y-6">
              <h2 className="text-xl font-bold text-center">Your Boarding Passes</h2>
              {tokens.map(token => {
                const statusData = statusDataMap[token.id] || { token };
                const t = statusData.token || token;
                const isDone = t.status === 'COMPLETED' || t.status === 'MISSED';
                const isServing = t.status === 'SERVING';
                
                // Which service is this for?
                const q = queues.find(x => x.id === t.queueId);
                const s = services.find(x => x.queues.some(sq => sq.id === q?.id));

                return (
                  <div key={token.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full shadow-lg relative overflow-hidden border border-gray-100 dark:border-zinc-800">
                    <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: primaryColor }} />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{s?.name || q?.name}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">{t.isAppointment ? 'Appointment' : 'Walk-in'}</p>
                      </div>
                      <div className="text-right">
                         <span className="uppercase tracking-widest text-[10px] font-bold text-gray-400 block">Ticket</span>
                         <div className="font-mono text-xl font-extrabold">{t.displayId || t.id.substring(0,6).toUpperCase()}</div>
                      </div>
                    </div>

                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <QRCode value={t.id} size={100} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                      </div>
                    </div>

                    {isServing && (
                      <div className="bg-amber-100 dark:bg-amber-900/40 border border-amber-500 rounded-xl p-3 text-center mb-4 animate-pulse">
                        <p className="text-amber-700 dark:text-amber-400 font-bold text-sm">Please proceed to {statusData.assignedResource?.name || 'the service desk'}</p>
                      </div>
                    )}

                    {!isDone && !isServing && (
                      <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                        {t.isAppointment ? (
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Scheduled For</p>
                            <p className="font-bold">{new Date(t.scheduledFor).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Position</p>
                              <p className="text-2xl font-extrabold">{statusData.position || '—'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 uppercase">Est. Wait</p>
                              <p className="font-bold">{statusData.estimatedWaitTime ? `~${Math.round(statusData.estimatedWaitTime)} min` : '—'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {!isDone && (
                      <button onClick={() => handleCancel(t.id)} className="w-full mt-4 text-sm font-bold text-red-500 hover:text-red-600 transition-colors">
                        Cancel Visit
                      </button>
                    )}
                  </div>
                );
              })}
              <button 
                onClick={() => {
                  setStep(1);
                  setTokens([]);
                  setSelectedServiceIds([]);
                  setServiceDetails({});
                  setOtpSent(false);
                  setOtp('');
                }}
                className="w-full py-4 rounded-xl font-bold text-primary bg-primary/10 transition-colors hover:bg-primary/20"
                style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}
              >
                Book Another Service
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Support Number Banner */}
        {supportNumber && step < 4 && (
          <div className="mt-auto pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact us: <br/>
            <a href={`tel:${supportNumber}`} className="font-bold hover:underline" style={{ color: primaryColor }}>
              {supportNumber}
            </a>
          </div>
        )}

        {/* Branding Fallback (Powered by Qmova) */}
        {!tenant?.branding && (
          <div className="mt-8 pb-4 text-center">
            <a href="https://qmova.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <span>Powered by</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm">Qmova</span>
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
