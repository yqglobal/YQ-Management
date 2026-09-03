import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { QrCode, Loader2, ArrowRight, Store, Activity, Pizza, Briefcase, Check, Keyboard, Copy, CheckCircle2, Users, Shield, Scissors, Landmark, Truck } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useWhatsapp from '../../hooks/useWhatsapp';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

import { countryCodes as allCountryCodes } from '../../lib/country-codes';

const COUNTRY_CODES = allCountryCodes
  .map(c => ({
    country: c.country,
    code: c.code,
    name: c.name,
    label: `${c.name} (${c.code})`
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const BUSINESS_TEMPLATES = [
  {
    id: 'general',
    title: 'General',
    description: 'Standard setup for everyday use.',
    icon: Store,
    services: [
      {
        name: 'General Queue',
        formConfig: [
          { id: 'notes', type: 'textarea', label: 'Reason for visit', required: false, system: false }
        ]
      }
    ]
  },
  {
    id: 'hospital',
    title: 'Hospital & Clinic',
    description: 'Manage patient flow across departments.',
    icon: Activity,
    services: [
      {
        name: 'Walk-in Clinic',
        formConfig: [
          { id: 'symptoms', type: 'textarea', label: 'Primary Symptoms', required: true, system: false }
        ]
      },
      {
        name: 'Pharmacy Pickup',
        formConfig: [
          { id: 'prescription', type: 'text', label: 'Prescription Number', required: true, system: false }
        ]
      },
      {
        name: 'Doctor Appointment',
        formConfig: [
          { id: 'doctor', type: 'dropdown', label: 'Doctor', required: true, system: false, options: ['Dr. Smith', 'Dr. Johnson', 'Dr. Lee'] }
        ]
      }
    ]
  },
  {
    id: 'fastfood',
    title: 'Restaurant & Fast Food',
    description: 'Order pickups and dine-in waitlists.',
    icon: Pizza,
    services: [
      {
        name: 'Order Pickup',
        formConfig: [
          { id: 'orderNum', type: 'text', label: 'Order Number', required: true, system: false }
        ]
      },
      {
        name: 'Dine-in Waitlist',
        formConfig: [
          { id: 'partySize', type: 'dropdown', label: 'Party Size', required: true, system: false, options: ['1-2', '3-4', '5-6', '7+'] },
          { id: 'highChair', type: 'checkbox', label: 'Need a high chair?', required: false, system: false }
        ]
      }
    ]
  },
  {
    id: 'visa',
    title: 'Visa & Government',
    description: 'High-security document processing.',
    icon: Briefcase,
    services: [
      {
        name: 'Document Submission',
        formConfig: [
          { id: 'passport', type: 'text', label: 'Passport Number', required: true, system: false },
          { id: 'visaType', type: 'dropdown', label: 'Visa Type', required: true, system: false, options: ['Tourist', 'Business', 'Student', 'Work'] }
        ]
      },
      {
        name: 'Biometrics',
        formConfig: [
          { id: 'appointmentId', type: 'text', label: 'Appointment ID', required: true, system: false }
        ]
      }
    ]
  },
  {
    id: 'salon',
    title: 'Salon & Beauty',
    description: 'Manage stylists and beauty appointments.',
    icon: Scissors,
    services: [
      {
        name: 'Haircut & Styling',
        formConfig: [
          { id: 'stylist', type: 'dropdown', label: 'Preferred Stylist', required: false, system: false, options: ['Anyone', 'Alex', 'Sam', 'Jordan'] }
        ]
      },
      {
        name: 'Color & Treatment',
        formConfig: []
      }
    ]
  },
  {
    id: 'bank',
    title: 'Bank & Finance',
    description: 'Teller queues and loan consultations.',
    icon: Landmark,
    services: [
      {
        name: 'Teller Services',
        formConfig: [
          { id: 'accountNum', type: 'text', label: 'Account Number (optional)', required: false, system: false }
        ]
      },
      {
        name: 'Loan Consultation',
        formConfig: [
          { id: 'loanType', type: 'dropdown', label: 'Loan Type', required: true, system: false, options: ['Personal', 'Mortgage', 'Auto', 'Business'] }
        ]
      }
    ]
  },
  {
    id: 'logistics',
    title: 'Logistics & Courier',
    description: 'Parcel pickup and dispatch queues.',
    icon: Truck,
    services: [
      {
        name: 'Parcel Pickup',
        formConfig: [
          { id: 'trackingNum', type: 'text', label: 'Tracking Number', required: true, system: false }
        ]
      },
      {
        name: 'Dispatch / Drop-off',
        formConfig: [
          { id: 'reference', type: 'text', label: 'Drop-off Reference', required: false, system: false }
        ]
      }
    ]
  }
];

export default function Onboarding() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedType, setSelectedType] = useState<string>('general');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountryIso, setSelectedCountryIso] = useState('ZA');
  const [countryCode, setCountryCode] = useState('+27');
  
  useEffect(() => {
    import('../../lib/country-codes').then(({ detectCountryByTimezone, getCountryByAbbr }) => {
      // 1. Primary robust detection via free IP geolocation
      fetch('https://get.geojs.io/v1/ip/country.json')
        .then(res => res.json())
        .then(data => {
          if (data && data.country) {
            const country = getCountryByAbbr(data.country);
            if (country) {
              setSelectedCountryIso(country.country);
              setCountryCode(country.code);
              return;
            }
          }
          throw new Error('GeoJS failed or country not found');
        })
        .catch(() => {
          // 2. Fallback to Timezone detection
          const abbr = detectCountryByTimezone();
          const country = getCountryByAbbr(abbr);
          if (country) {
            setSelectedCountryIso(country.country);
            setCountryCode(country.code);
          }
        });
    }).catch(() => {});
  }, []);
  
  // New Step 2 State
  const [locationName, setLocationName] = useState('Main Branch');
  const [locationAddress, setLocationAddress] = useState('');
  const [enableWaitlist, setEnableWaitlist] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Invitation State
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{ workspaceName: string; role: string; valid: boolean } | null>(null);
  const [joiningWorkspace, setJoiningWorkspace] = useState(false);

  // WhatsApp State
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'qr' | 'code'>('qr');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingPhoneNumber, setPairingPhoneNumber] = useState('');
  const [pairingCopied, setPairingCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [trialAgreed, setTrialAgreed] = useState(false);

  const updateStep = (newStep: 1 | 2 | 3 | 4 | 5 | 6) => {
    setStep(newStep);
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_step', newStep.toString());
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const code = (router.query.inviteCode || router.query.code || localStorage.getItem('qmova_invite_code')) as string;
      if (typeof code === 'string' && code.trim()) {
        const trimmed = code.trim().toUpperCase();
        setInviteCode(trimmed);
        fetchApi(`/workspace/invite-preview/${trimmed}`)
          .then((res: any) => {
            if (res?.valid) {
              setInviteInfo(res);
              if (!companyName) setCompanyName(res.workspaceName);
            }
          })
          .catch(() => { });
      }

      if (router.query.googleAuth === 'success') {
        toast.success('Google account connected successfully!');
        updateStep(4);
        // Clean up URL
        const url = new URL(window.location.href);
        url.searchParams.delete('googleAuth');
        window.history.replaceState({}, '', url.toString());
      }

      const savedStep = localStorage.getItem('onboarding_step');
      if (savedStep) {
        const parsed = parseInt(savedStep, 10);
        if (parsed >= 1 && parsed <= 6) setStep(parsed as 1 | 2 | 3 | 4 | 5 | 6);
      }
      const savedData = localStorage.getItem('onboarding_form_data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.companyName) setCompanyName(parsed.companyName);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.selectedType) setSelectedType(parsed.selectedType);
          if (parsed.locationName) setLocationName(parsed.locationName);
          if (parsed.locationAddress) setLocationAddress(parsed.locationAddress);
          if (parsed.timezone) setTimezone(parsed.timezone);
          if (parsed.enableWaitlist !== undefined) setEnableWaitlist(parsed.enableWaitlist);
        } catch (e) { }
      }
    }
  }, [router.query]);

  // When selectedType changes, update selectedServices
  useEffect(() => {
    const template = BUSINESS_TEMPLATES.find(t => t.id === selectedType);
    if (template) {
      setSelectedServices(template.services.map(s => s.name));
    }
  }, [selectedType]);

  useEffect(() => {
    if (inviteCode && (step === 2 || step === 3 || step === 4 || step === 5)) {
      updateStep(6);
    }
  }, [inviteCode, step]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_form_data', JSON.stringify({ fullName, companyName, phone, selectedType, locationName, locationAddress, timezone, enableWaitlist }));
    }
  }, [fullName, companyName, phone, selectedType, locationName, locationAddress, timezone, enableWaitlist]);

  const savePersonalInfoMutation = useMutation({
    mutationFn: () => {
      // Clean phone and combine with country code
      const formattedPhone = phone.trim().startsWith('+') ? phone.trim() : `${countryCode} ${phone.trim().replace(/^0/, '')}`;
      const subdomainStr = companyName ? companyName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : undefined;
      return fetchApi('/auth/personal-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          phone: formattedPhone,
          companyName: inviteCode ? (inviteInfo?.workspaceName || 'Team Workspace') : companyName,
          timezone,
          ...(subdomainStr ? { subdomain: subdomainStr } : {})
        }),
      });
    },
    onSuccess: () => {
      if (inviteCode) {
        updateStep(6);
      } else {
        updateStep(2);
      }
      toast.success('Information saved');
    },
    onError: () => {
      toast.error('Failed to save information. Please try again.');
    },
  });

  const handleConfirmJoinWorkspace = async () => {
    if (!inviteCode) return;
    setJoiningWorkspace(true);
    try {
      await fetchApi('/workspace/join', {
        method: 'POST',
        body: JSON.stringify({ code: inviteCode }),
      });
      await fetchApi('/auth/personal-settings', {
        method: 'PATCH',
        body: JSON.stringify({ onboardingCompleted: true })
      });
      localStorage.removeItem('qmova_invite_code');
      localStorage.removeItem('onboarding_step');
      localStorage.removeItem('onboarding_form_data');
      document.cookie = 'qmova_invite_code=; path=/; max-age=0; SameSite=Lax';
      toast.success(`You have successfully joined ${inviteInfo?.workspaceName || 'the workspace'}!`);
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to join workspace');
    } finally {
      setJoiningWorkspace(false);
    }
  };

  const setupQueuesMutation = useMutation({
    mutationFn: async (template: typeof BUSINESS_TEMPLATES[number]) => {
      // 1. Create Location
      const location = await fetchApi('/location', {
        method: 'POST',
        body: JSON.stringify({ name: locationName, address: locationAddress }),
      });
      // 2. Create Services and Queues under that location
      const servicesToCreate = template.services.filter(s => selectedServices.includes(s.name));
      await Promise.all(servicesToCreate.map(async s => {
        const service = await fetchApi('/service', {
          method: 'POST',
          body: JSON.stringify({ 
            name: `${s.name} Service`, 
            locationId: location.id,
            description: 'Created during setup',
            formConfig: s.formConfig
          }),
        });
      }));
      
      // 3. Save Waitlist preference to Tenant
      const tenant = await fetchApi('/tenant/me').catch(() => null);
      if (tenant) {
        await fetchApi(`/tenant/${tenant.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
             customerExperience: {
               ...(tenant.customerExperience || {}),
               enableWaitlist
             }
          })
        }).catch(() => null);
      }
    },
    onSuccess: () => {
      updateStep(3);
      queryClient.invalidateQueries({ queryKey: ['locations', 'services'] });
      toast.success('Location & Services setup successfully');
    },
    onError: () => {
      toast.error('Failed to setup your workspace. Please try again.');
    },
  });

  const {
    statusQuery: whatsappStatusQuery,
    cachedQrQuery,
    connectMutation: connectWhatsAppMutation,
    pairingCodeMutation: generatePairingCodeMutation,
  } = useWhatsapp();

  const whatsappStatus = whatsappStatusQuery.data;

  // Fetch Active Plans
  const { data: plans = [], isLoading: isPlansLoading } = useQuery({
    queryKey: ['active-plans'],
    queryFn: () => fetchApi('/billing/plans?status=ACTIVE'),
  });

  const subscribeMutation = useMutation({
    mutationFn: (data: { planId: string; billingInterval: string }) =>
      fetchApi('/payments/generate-link', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (data: any) => {
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error('Could not initiate checkout');
      }
    },
    onError: () => {
      toast.error('Error generating payment link');
    },
  });

  // When entering step 4, try to load a cached QR quickly
  useEffect(() => {
    let cancelled = false;
    if (step === 4 && cachedQrQuery.data?.qr) {
      setQrCode(cachedQrQuery.data.qr);
    }
    return () => { cancelled = true; };
  }, [step, cachedQrQuery.data]);

  useEffect(() => {
    if (whatsappStatus?.state === 'open') {
      setQrCode(null);
      setPairingCode(null);
      setPairingPhoneNumber('');
    } else if (whatsappStatus?.state === 'connecting') {
      if (whatsappStatus.qr) setQrCode(whatsappStatus.qr);
    } else if (whatsappStatus?.state === 'close' || whatsappStatus?.state === 'unconfigured') {
      setQrCode(null);
    }
  }, [whatsappStatus]);

  const handleSetupQueues = () => {
    const template = BUSINESS_TEMPLATES.find(t => t.id === selectedType);
    if (template) {
      setupQueuesMutation.mutate(template);
    }
  };

  const handleConnectWhatsApp = () => {
    connectWhatsAppMutation.mutate(false);
  };

  const finishOnboarding = async () => {
    try {
      await fetchApi('/auth/personal-settings', {
        method: 'PATCH',
        body: JSON.stringify({ onboardingCompleted: true })
      });
    } catch (e) {
      console.error('Failed to complete onboarding flag', e);
    }
    setShowConfetti(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('onboarding_step');
      localStorage.removeItem('onboarding_form_data');
    }
    setTimeout(() => {
      router.push('/dashboard');
    }, 2500);
  };
  const totalSteps = inviteCode ? 2 : 5;
  const currentStepProgress = inviteCode ? (step === 1 ? 1 : 2) : step;

  return (
    <div className="min-h-screen bg-surface dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-x-hidden font-sans selection:bg-primary/20">
      {showConfetti && <Confetti width={typeof window !== 'undefined' ? window.innerWidth : 1000} height={typeof window !== 'undefined' ? window.innerHeight : 1000} recycle={false} numberOfPieces={500} gravity={0.15} />}
      <Head>
        <title>Onboarding | Qmova</title>
      </Head>

      <main className="w-full max-w-2xl bg-card dark:bg-dark-card rounded-[2.5rem] border border-border dark:border-dark-border shadow-sm p-8 md:p-12 relative overflow-hidden my-12">
        {/* Progress Tracker */}
        <div className="flex gap-2 mb-10 w-full max-w-[200px] mx-auto">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i + 1 <= currentStepProgress ? 'bg-primary dark:bg-sky-500' : 'bg-surface-variant dark:bg-zinc-800'}`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8"
            >
              <header className="text-center flex flex-col items-center gap-2">
                <div className="mb-2">
                  <Logo width={160} height={26} />
                </div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">
                  {inviteCode ? 'Join Your Team' : 'Welcome to Qmova'}
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-lg mx-auto">
                  {inviteCode
                    ? "Let's save your personal profile details before entering your workspace."
                    : "Let's start by getting to know you and your business."}
                </p>
              </header>

              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <label className="font-body-md font-medium text-on-surface dark:text-white block">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-[56px] px-4 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow font-body-lg text-on-surface dark:text-white placeholder:text-outline-variant"
                    placeholder="Jane Doe"
                  />
                </div>

                {inviteCode ? (
                  <div className="p-6 bg-primary-fixed dark:bg-sky-900/20 border border-primary-fixed-dim dark:border-sky-500/20 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                      <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-primary-fixed dark:text-sky-300">Joining Workspace</p>
                    </div>
                    <p className="font-headline-sm text-headline-sm text-on-surface dark:text-white font-bold">{inviteInfo?.workspaceName || 'Team Workspace'}</p>
                    <p className="font-body-sm text-on-surface-variant dark:text-sky-200/70 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full border border-primary-fixed-dim/50">
                      Assigned Role: <span className="font-bold uppercase text-primary dark:text-sky-400">{inviteInfo?.role || 'STAFF'}</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="font-body-md font-medium text-on-surface dark:text-white block">Company / Workspace Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full h-[56px] px-4 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow font-body-lg text-on-surface dark:text-white placeholder:text-outline-variant"
                        placeholder="Acme Corp"
                      />
                      {companyName.length > 0 && (
                        <div className="absolute -bottom-6 left-1 flex items-center gap-1.5 text-[13px] text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-top-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Portal URL: <strong>{companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'your-company'}.qmova.app</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="font-body-md font-medium text-on-surface dark:text-white block">Phone Number</label>
                  <div className="flex h-[56px] rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-shadow">
                    <select
                      value={selectedCountryIso}
                      onChange={(e) => {
                        const iso = e.target.value;
                        setSelectedCountryIso(iso);
                        const c = COUNTRY_CODES.find(x => x.country === iso);
                        if (c) setCountryCode(c.code);
                      }}
                      className="bg-surface-container-lowest dark:bg-black/20 text-on-surface dark:text-white font-medium px-4 border-r border-border dark:border-dark-border focus:outline-none cursor-pointer text-sm"
                    >
                      {COUNTRY_CODES.map((c, i) => (
                        <option key={`${c.country}-${c.code}-${i}`} value={c.country}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 bg-transparent text-on-surface dark:text-white placeholder:text-outline-variant font-medium outline-none"
                      placeholder="71 234 5678"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="font-body-md font-medium text-on-surface dark:text-white block">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-[56px] px-4 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow font-body-lg text-on-surface dark:text-white"
                  >
                    {Intl.supportedValuesOf('timeZone').map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-8 mt-2 border-t border-border dark:border-dark-border flex justify-end">
                <button
                  onClick={() => savePersonalInfoMutation.mutate()}
                  disabled={savePersonalInfoMutation.isPending || !fullName || (!inviteCode && !companyName)}
                  className="w-full sm:w-auto min-h-[44px] px-8 rounded-lg font-body-md font-medium bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savePersonalInfoMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                  {!savePersonalInfoMutation.isPending && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8"
            >
              <header className="text-center flex flex-col gap-2">
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">
                  Operating Model Selection
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-lg mx-auto">
                  What kind of business are you running? We'll tailor your queues.
                </p>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BUSINESS_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedType === template.id;
                  return (
                    <label 
                      key={template.id}
                      onClick={() => setSelectedType(template.id)}
                      className={`relative flex cursor-pointer rounded-2xl border p-5 transition-all ${
                        isSelected
                          ? 'bg-primary-fixed dark:bg-sky-900/20 border-primary shadow-[0_0_0_2px_rgba(0,97,148,0.2)] dark:shadow-[0_0_0_2px_rgba(14,165,233,0.2)]'
                          : 'bg-canvas dark:bg-black/50 border-border dark:border-dark-border hover:border-outline-variant dark:hover:border-outline'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="operatingModel" 
                        value={template.id} 
                        checked={isSelected}
                        onChange={() => setSelectedType(template.id)}
                        className="sr-only" 
                      />
                      <div className="flex w-full items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-white dark:bg-sky-500' : 'bg-surface-variant dark:bg-zinc-800 text-outline'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-headline-sm text-headline-sm text-on-surface dark:text-white">
                              {template.title}
                            </p>
                            <div className="text-on-surface-variant dark:text-outline mt-1 font-body-sm text-body-sm leading-relaxed">
                              {template.description}
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              
              <div className="space-y-6 pt-6 border-t border-border dark:border-dark-border">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-body-md font-medium text-on-surface dark:text-white block">Your Primary Location Name</label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="w-full h-[56px] px-4 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow font-body-lg text-on-surface dark:text-white"
                      placeholder="e.g., Downtown Clinic, Main Branch"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-body-md font-medium text-on-surface dark:text-white block">Location Address (Optional)</label>
                    <input
                      type="text"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      className="w-full h-[56px] px-4 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow font-body-lg text-on-surface dark:text-white placeholder:text-outline-variant"
                      placeholder="e.g., 123 Main St, Cityville"
                    />
                  </div>
                </div>
                
                <label className="flex items-center gap-4 p-4 rounded-xl border border-border dark:border-dark-border bg-surface-bright dark:bg-zinc-900 cursor-pointer">
                  <div className="flex items-center justify-center w-6 h-6">
                    <input 
                      type="checkbox" 
                      checked={enableWaitlist} 
                      onChange={(e) => setEnableWaitlist(e.target.checked)}
                      className="w-5 h-5 text-primary dark:text-sky-500 rounded border-border dark:border-dark-border focus:ring-primary dark:focus:ring-sky-500" 
                    />
                  </div>
                  <div>
                    <p className="font-body-md font-bold text-on-surface dark:text-white">Enable Walk-in Waitlist</p>
                    <p className="font-body-sm text-on-surface-variant dark:text-outline mt-0.5">Uncheck if you operate strictly by appointment.</p>
                  </div>
                </label>

                <div className="space-y-3">
                  <label className="font-label-caps text-label-caps text-outline uppercase tracking-wider block">Which services do you offer?</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BUSINESS_TEMPLATES.find(t => t.id === selectedType)?.services.map(s => (
                      <label key={s.name} className="flex items-center gap-3 p-3 bg-canvas dark:bg-black/50 hover:bg-surface-variant dark:hover:bg-zinc-800 border border-border dark:border-dark-border rounded-xl cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedServices.includes(s.name)} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServices([...selectedServices, s.name]);
                            } else {
                              setSelectedServices(selectedServices.filter(name => name !== s.name));
                            }
                          }}
                          className="w-4 h-4 text-primary dark:text-sky-500 rounded border-border dark:border-dark-border focus:ring-primary dark:focus:ring-sky-500" 
                        />
                        <span className="font-body-md font-medium text-on-surface dark:text-white">{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-border dark:border-dark-border flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={() => updateStep(1)}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-lg font-body-md font-medium text-on-surface-variant dark:text-outline hover:bg-surface-container-high dark:hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSetupQueues}
                  disabled={setupQueuesMutation.isPending}
                  className="w-full sm:w-auto min-h-[44px] px-8 rounded-lg font-body-md font-medium bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {setupQueuesMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Workspace'}
                  {!setupQueuesMutation.isPending && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8 text-center items-center"
            >
              <header className="flex flex-col gap-2 w-full">
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">
                  Connect Google Accounts
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-lg mx-auto">
                  Sync calendar appointments and harvest business reviews automatically by connecting your Google accounts.
                </p>
              </header>

              <div className="w-full max-w-sm mt-4 p-8 bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border rounded-2xl flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" />
                  </svg>
                </div>
                <p className="text-on-surface-variant dark:text-zinc-400 text-sm mb-4">
                  You can connect multiple Google accounts later from the Settings page.
                </p>
                <button
                  onClick={() => {
                    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?intent=link_tenant_onboarding`;
                  }}
                  className="w-full min-h-[44px] px-8 rounded-lg font-body-md font-medium bg-blue-600 hover:bg-blue-700 text-white transition-opacity flex items-center justify-center gap-2"
                >
                  Connect Google Account
                </button>
                <button
                  onClick={() => updateStep(4)}
                  className="w-full mt-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8 text-center items-center"
            >
              <header className="flex flex-col gap-2 w-full">
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">
                  Connect WhatsApp
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-lg mx-auto">
                  Automatically notify customers about their queue position through WhatsApp.
                </p>
              </header>

              <div className="w-full max-w-sm mt-4">
                {whatsappStatus?.state !== 'open' ? (
                  <>
                    {qrCode ? (
                      <div className="animate-in zoom-in duration-500 flex flex-col items-center">
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-border inline-block mb-6">
                          {qrCode.startsWith && qrCode.startsWith('data:image') ? (
                            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 rounded-2xl" />
                          ) : (
                            <div className="w-64 h-64 flex items-center justify-center">
                              <QRCodeSVG value={qrCode} size={256} />
                            </div>
                          )}
                        </div>
                        <p className="text-on-surface-variant dark:text-outline font-body-md mb-6 max-w-xs mx-auto">
                          Open WhatsApp on your phone, go to Settings → Linked Devices, and scan this QR code.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center justify-center gap-3 text-indigo-500 font-semibold">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Waiting for scan...
                          </div>
                          <p className="text-sm text-gray-500 dark:text-zinc-400 text-center max-w-[280px]">
                            After scanning QR on WhatsApp mobile phone, wait for 15-20 seconds for the screen to update.
                          </p>
                        </div>
                      </div>
                    ) : connectionMode === 'code' ? (
                      <div className="animate-in zoom-in duration-500 w-full">
                        {pairingCode ? (
                          <div className="bg-surface-bright dark:bg-black/50 rounded-2xl p-6 mb-6 border border-border dark:border-dark-border">
                            <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider mb-4">Pairing Code</p>
                            <div className="flex items-center justify-center gap-3 mb-4">
                              <code className="text-3xl font-data-mono font-bold text-on-surface dark:text-white tracking-[0.2em]">{pairingCode}</code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(pairingCode);
                                  setPairingCopied(true);
                                  setTimeout(() => setPairingCopied(false), 2000);
                                }}
                                className="p-2 bg-surface-container-low dark:bg-white/10 rounded-lg text-on-surface-variant dark:text-outline hover:text-on-surface transition-colors"
                              >
                                {pairingCopied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                              </button>
                            </div>
                            <p className="font-body-sm text-on-surface-variant dark:text-outline">Open WhatsApp Settings → Linked Devices and enter this code within 60s.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 w-full">
                            <p className="font-body-md text-on-surface-variant dark:text-outline mb-2">Enter your WhatsApp phone number to receive a pairing code.</p>
                            <input
                              type="tel"
                              value={pairingPhoneNumber}
                              onChange={(e) => setPairingPhoneNumber(e.target.value.toUpperCase())}
                              placeholder="Enter phone (e.g. 5511999999999)"
                              maxLength={15}
                              className="w-full h-[56px] bg-canvas dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 font-data-mono text-center tracking-wider text-on-surface dark:text-white focus:outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366] transition-shadow"
                            />
                            <button
                              onClick={() => generatePairingCodeMutation.mutate(pairingPhoneNumber)}
                              disabled={generatePairingCodeMutation.isPending || pairingPhoneNumber.length < 7}
                              className="w-full flex items-center justify-center gap-2 h-[56px] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl font-body-md font-semibold transition-colors disabled:opacity-50"
                            >
                              {generatePairingCodeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Keyboard className="w-5 h-5" />}
                              {generatePairingCodeMutation.isPending ? 'Generating...' : 'Generate Pairing Code'}
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => { setConnectionMode('qr'); setPairingCode(null); setPairingPhoneNumber(''); }}
                          className="mt-6 font-body-sm text-outline hover:text-on-surface dark:hover:text-white font-medium transition-colors border-b border-transparent hover:border-outline"
                        >
                          Use QR code instead
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-24 h-24 bg-[#25D366]/10 text-[#25D366] rounded-3xl flex items-center justify-center mx-auto mb-8 border border-[#25D366]/20">
                          <QrCode className="w-10 h-10" />
                        </div>
                        <button
                          onClick={handleConnectWhatsApp}
                          disabled={connectWhatsAppMutation.isPending}
                          className="w-full flex items-center justify-center gap-2 h-[56px] bg-[#25D366] hover:bg-[#1DA851] text-white rounded-xl font-body-md font-semibold transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {connectWhatsAppMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                          {connectWhatsAppMutation.isPending ? 'Generating QR Code...' : 'Connect via QR Code'}
                        </button>
                        <button
                          onClick={() => setConnectionMode('code')}
                          className="w-full mt-4 flex items-center justify-center gap-2 h-[56px] bg-surface-bright dark:bg-black/20 border border-border dark:border-dark-border text-on-surface dark:text-white rounded-xl font-body-md font-semibold transition-colors hover:bg-surface-container-low dark:hover:bg-white/5"
                        >
                          <Keyboard className="w-5 h-5 text-outline" />
                          Connect via Pairing Code
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="animate-in zoom-in duration-500 w-full flex flex-col items-center">
                    <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface dark:text-white mb-2">WhatsApp Connected!</h3>
                    <p className="font-body-md text-on-surface-variant dark:text-outline max-w-sm mx-auto mb-8">
                      Your account is successfully linked and ready to send notifications.
                    </p>
                    <button
                      onClick={() => updateStep(5)}
                      className="w-full h-[56px] bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl font-body-md font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      Continue <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                )}
              </div>

              {whatsappStatus?.state !== 'open' && (
                <div className="w-full pt-8 mt-4 border-t border-border dark:border-dark-border flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                  <button
                    type="button"
                    onClick={() => updateStep(2)}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-lg font-body-md font-medium text-on-surface-variant dark:text-outline hover:bg-surface-container-high dark:hover:bg-white/5 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => updateStep(5)}
                    className="w-full sm:w-auto min-h-[44px] px-8 rounded-lg font-body-md font-medium border border-border dark:border-dark-border text-on-surface dark:text-white hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 6 && (
            <motion.div 
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8 text-center items-center"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-primary-fixed dark:bg-sky-900/20 text-primary dark:text-sky-500 flex items-center justify-center mx-auto mb-2 border border-primary-fixed-dim/50">
                <Users className="w-12 h-12" />
              </div>
              
              <header className="flex flex-col gap-2 w-full max-w-lg">
                <h2 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">Confirm Workspace Join</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline">
                  You have been invited to join <strong className="text-on-surface dark:text-white font-semibold">{inviteInfo?.workspaceName || 'your team workspace'}</strong> with role <strong className="text-primary dark:text-sky-400 uppercase font-bold tracking-wider text-[13px] ml-1">{inviteInfo?.role || 'STAFF'}</strong>.
                </p>
              </header>

              <div className="w-full max-w-md bg-canvas dark:bg-black/50 p-6 rounded-2xl border border-border dark:border-dark-border text-left space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-body-sm text-outline">Full Name:</span>
                  <span className="font-body-md text-on-surface dark:text-white font-semibold">{fullName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-sm text-outline">Phone Number:</span>
                  <span className="font-data-mono text-[14px] text-on-surface dark:text-white font-medium">
                    {countryCode} {phone}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-sm text-outline">Workspace:</span>
                  <span className="font-body-md text-on-surface dark:text-white font-semibold">{inviteInfo?.workspaceName || 'Team'}</span>
                </div>
              </div>

              <div className="w-full pt-8 border-t border-border dark:border-dark-border flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={() => updateStep(1)}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-lg font-body-md font-medium text-on-surface-variant dark:text-outline hover:bg-surface-container-high dark:hover:bg-white/5 transition-colors"
                >
                  Edit Profile
                </button>
                <button
                  onClick={handleConfirmJoinWorkspace}
                  disabled={joiningWorkspace}
                  className="w-full sm:w-auto min-h-[44px] px-8 rounded-lg font-body-md font-medium bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {joiningWorkspace ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join Workspace'}
                  {!joiningWorkspace && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
                </button>
              </div>
            </motion.div>
          )}
          {step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-8"
            >
              <header className="text-center flex flex-col gap-2">
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">
                  Choose Your Plan
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-lg mx-auto">
                  Get started with the plan that fits your business best. Upgrade later as you grow.
                </p>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                {isPlansLoading ? (
                  <div className="col-span-2 flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : (
                  plans.filter((p: any) => !p.name.toLowerCase().includes('enterprise')).map((plan: any) => {
                    const isPopular = plan.name.toLowerCase().includes('standard') || plan.name.toLowerCase().includes('pro');
                    return (
                      <div key={plan.id} className={`relative flex flex-col p-6 rounded-3xl ${isPopular ? 'bg-gradient-to-br from-primary-container to-primary/10 dark:from-sky-900/40 dark:to-sky-800/10 border-2 border-primary dark:border-sky-500 shadow-md transform md:-translate-y-2' : 'bg-surface-container-lowest dark:bg-zinc-900 border border-border dark:border-dark-border shadow-sm'}`}>
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary dark:bg-sky-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            Recommended
                          </div>
                        )}
                        <h3 className="text-xl font-bold text-on-surface dark:text-white mb-2">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className={`text-3xl font-bold ${isPopular ? 'text-primary dark:text-sky-400' : 'text-on-surface dark:text-white'}`}>
                            {plan.currency === 'ZAR' ? 'R' : '$'}{plan.price}
                          </span>
                          <span className="text-on-surface-variant dark:text-outline font-medium">/ month</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                          <li className="flex items-center gap-3 text-sm text-on-surface-variant dark:text-outline">
                            <Check className={`w-5 h-5 shrink-0 ${isPopular ? 'text-primary dark:text-sky-400' : 'text-on-surface-variant dark:text-outline'}`} />
                            <span>Up to {plan.limits?.maxTokens || 500} Tokens/day</span>
                          </li>
                          <li className="flex items-center gap-3 text-sm text-on-surface-variant dark:text-outline">
                            <Check className={`w-5 h-5 shrink-0 ${isPopular ? 'text-primary dark:text-sky-400' : 'text-on-surface-variant dark:text-outline'}`} />
                            <span>Up to {plan.limits?.maxQueues || 1} Queues</span>
                          </li>
                          {plan.features?.whatsappNotifications && (
                            <li className="flex items-center gap-3 text-sm text-on-surface-variant dark:text-outline">
                              <Check className={`w-5 h-5 shrink-0 ${isPopular ? 'text-primary dark:text-sky-400' : 'text-on-surface-variant dark:text-outline'}`} />
                              <span>WhatsApp Notifications</span>
                            </li>
                          )}
                        </ul>
                        
                        {plan.price === 0 && (
                          <label className="flex items-start gap-3 mt-4 mb-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={trialAgreed}
                              onChange={(e) => setTrialAgreed(e.target.checked)}
                              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-on-surface-variant dark:text-outline leading-tight">
                              I confirm and agree to start my 14-day free trial.
                            </span>
                          </label>
                        )}
                        <button
                          onClick={() => {
                            if (plan.price === 0) {
                              if (!trialAgreed) {
                                toast.error("Please confirm you want to start the 14-day free trial, or choose a paid plan.");
                                return;
                              }
                              finishOnboarding();
                            } else {
                              subscribeMutation.mutate({ planId: plan.id, billingInterval: 'monthly' });
                            }
                          }}
                          disabled={subscribeMutation.isPending && subscribeMutation.variables?.planId === plan.id}
                          className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${isPopular ? 'bg-primary hover:bg-primary-container text-white' : 'bg-surface-container-high dark:bg-white/10 text-on-surface dark:text-white hover:bg-surface-container-highest dark:hover:bg-white/20'} disabled:opacity-50`}
                        >
                          {subscribeMutation.isPending && subscribeMutation.variables?.planId === plan.id ? <Loader2 className="w-5 h-5 animate-spin" /> : (plan.price === 0 ? 'Start 14-Day Free Trial' : 'Upgrade Now')}
                        </button>

                      </div>
                    );
                  })
                )}
              </div>

              
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
