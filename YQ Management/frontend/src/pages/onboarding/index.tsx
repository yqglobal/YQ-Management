import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import { QrCode, Loader2, ArrowRight, Store, Activity, Pizza, Briefcase, Check, Keyboard, Copy, CheckCircle2, Users, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useWhatsapp from '../../hooks/useWhatsapp';

const COUNTRY_CODES = [
  { code: '+27', label: '🇿🇦 +27 (ZA)' },
  { code: '+1', label: '🇺🇸 +1 (US/CA)' },
  { code: '+44', label: '🇬🇧 +44 (UK)' },
  { code: '+91', label: '🇮🇳 +91 (IN)' },
  { code: '+61', label: '🇦🇺 +61 (AU)' },
  { code: '+49', label: '🇩🇪 +49 (DE)' },
  { code: '+33', label: '🇫🇷 +33 (FR)' },
  { code: '+55', label: '🇧🇷 +55 (BR)' },
  { code: '+971', label: '🇦🇪 +971 (AE)' },
  { code: '+234', label: '🇳🇬 +234 (NG)' },
  { code: '+254', label: '🇰🇪 +254 (KE)' },
];

const BUSINESS_TEMPLATES = [
  {
    id: 'general',
    title: 'General',
    description: 'Standard queue for everyday use.',
    icon: Store,
    queues: [
      {
        name: 'General Queue',
        formConfig: [
          { id: 'name', type: 'text', label: 'Full Name', required: true, system: false },
          { id: 'phone', type: 'phone', label: 'WhatsApp Number', required: true, system: false }
        ]
      }
    ]
  },
  {
    id: 'hospital',
    title: 'Hospital & Clinic',
    description: 'Manage patient flow across departments.',
    icon: Activity,
    queues: [
      {
        name: 'Walk-in Clinic',
        formConfig: [
          { id: 'name', type: 'text', label: 'Patient Name', required: true, system: false },
          { id: 'phone', type: 'phone', label: 'WhatsApp Number', required: true, system: false },
          { id: 'symptoms', type: 'textarea', label: 'Primary Symptoms', required: true, system: false }
        ]
      },
      {
        name: 'Pharmacy Pickup',
        formConfig: [
          { id: 'name', type: 'text', label: 'Patient Name', required: true, system: false },
          { id: 'prescription', type: 'text', label: 'Prescription Number', required: true, system: false }
        ]
      },
      {
        name: 'Doctor Appointment',
        formConfig: [
          { id: 'name', type: 'text', label: 'Patient Name', required: true, system: false },
          { id: 'phone', type: 'phone', label: 'WhatsApp Number', required: true, system: false },
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
    queues: [
      {
        name: 'Order Pickup',
        formConfig: [
          { id: 'name', type: 'text', label: 'Customer Name', required: true, system: false },
          { id: 'orderNum', type: 'text', label: 'Order Number', required: true, system: false }
        ]
      },
      {
        name: 'Dine-in Waitlist',
        formConfig: [
          { id: 'name', type: 'text', label: 'Name', required: true, system: false },
          { id: 'phone', type: 'phone', label: 'WhatsApp Number', required: true, system: false },
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
    queues: [
      {
        name: 'Document Submission',
        formConfig: [
          { id: 'name', type: 'text', label: 'Applicant Name', required: true, system: false },
          { id: 'passport', type: 'text', label: 'Passport Number', required: true, system: false },
          { id: 'visaType', type: 'dropdown', label: 'Visa Type', required: true, system: false, options: ['Tourist', 'Business', 'Student', 'Work'] }
        ]
      },
      {
        name: 'Biometrics',
        formConfig: [
          { id: 'name', type: 'text', label: 'Applicant Name', required: true, system: false },
          { id: 'phone', type: 'phone', label: 'WhatsApp Number', required: true, system: false },
          { id: 'appointmentId', type: 'text', label: 'Appointment ID', required: true, system: false }
        ]
      }
    ]
  }
];

export default function Onboarding() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedType, setSelectedType] = useState<string>('general');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+27');

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

  const updateStep = (newStep: 1 | 2 | 3 | 4) => {
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

      const savedStep = localStorage.getItem('onboarding_step');
      if (savedStep) {
        const parsed = parseInt(savedStep, 10);
        if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4) setStep(parsed as 1 | 2 | 3 | 4);
      }
      const savedData = localStorage.getItem('onboarding_form_data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.companyName) setCompanyName(parsed.companyName);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.selectedType) setSelectedType(parsed.selectedType);
        } catch (e) { }
      }
    }
  }, [router.query]);

  useEffect(() => {
    if (inviteCode && (step === 2 || step === 3)) {
      updateStep(4);
    }
  }, [inviteCode, step]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding_form_data', JSON.stringify({ fullName, companyName, phone, selectedType }));
    }
  }, [fullName, companyName, phone, selectedType]);

  const savePersonalInfoMutation = useMutation({
    mutationFn: () => {
      // Clean phone and combine with country code
      const formattedPhone = phone.trim().startsWith('+') ? phone.trim() : `${countryCode} ${phone.trim().replace(/^0/, '')}`;
      return fetchApi('/auth/personal-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          phone: formattedPhone,
          companyName: inviteCode ? (inviteInfo?.workspaceName || 'Team Workspace') : companyName
        }),
      });
    },
    onSuccess: () => {
      if (inviteCode) {
        updateStep(4);
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
    mutationFn: (template: typeof BUSINESS_TEMPLATES[number]) =>
      Promise.all(template.queues.map(q =>
        fetchApi('/queue', {
          method: 'POST',
          body: JSON.stringify({ name: q.name, formConfig: q.formConfig }),
        })
      )),
    onSuccess: () => {
      updateStep(3);
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      toast.success('Queues setup successfully');
    },
    onError: () => {
      toast.error('Failed to setup your queues. Please try again.');
    },
    onSettled: () => {
    },
  });

  const {
    statusQuery: whatsappStatusQuery,
    cachedQrQuery,
    connectMutation: connectWhatsAppMutation,
    pairingCodeMutation: generatePairingCodeMutation,
  } = useWhatsapp();

  const whatsappStatus = whatsappStatusQuery.data;

  // When entering step 3, try to load a cached QR quickly
  useEffect(() => {
    let cancelled = false;
    if (step === 3 && cachedQrQuery.data?.qr) {
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

  const finishOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('onboarding_step');
      localStorage.removeItem('onboarding_form_data');
    }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">
      <Head>
        <title>Onboarding | Qmova</title>
      </Head>

      {/* LEFT PANEL */}
      <div className="w-full lg:w-1/3 min-h-[40vh] lg:min-h-screen bg-gradient-to-br from-[#1E3A8A] to-[#0F172A] p-8 lg:p-12 flex flex-col text-white shrink-0">
        <div className="flex items-center gap-2.5 mb-24">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-black text-white text-base shadow-[0_0_15px_rgba(255,255,255,0.2)] tracking-tighter">
            Q
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">Qmova</span>
        </div>

        <div className="max-w-md">
          {step === 1 ? (
            <>
              <h1 className="text-5xl font-bold mb-6 leading-tight">{inviteCode ? 'Join Your Team' : 'Welcome to Qmova'}</h1>
              <p className="text-blue-200/70 text-lg leading-relaxed">
                {inviteCode
                  ? "Let's save your personal profile details before entering your workspace."
                  : "Let's start by getting to know you and your business."}
              </p>
            </>
          ) : step === 2 ? (
            <>
              <h1 className="text-5xl font-bold mb-6 leading-tight">What kind of business are you running?</h1>
              <p className="text-blue-200/70 text-lg leading-relaxed">
                We'll automatically set up the perfect queues and custom form questions tailored to your industry.
              </p>
            </>
          ) : step === 3 ? (
            <>
              <h1 className="text-5xl font-bold mb-6 leading-tight">Connect WhatsApp.</h1>
              <p className="text-blue-200/70 text-lg leading-relaxed">
                Automatically notify customers about their queue position through WhatsApp.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-5xl font-bold mb-6 leading-tight">You're ready to jump in.</h1>
              <p className="text-blue-200/70 text-lg leading-relaxed">
                Your personal profile has been configured. Confirm below to complete joining your team's Qmova workspace.
              </p>
            </>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2">
          {inviteCode ? (
            <>
              <div className={`w-6 h-1.5 rounded-full ${step === 1 ? 'bg-white' : 'bg-white/30'}`}></div>
              <div className={`w-6 h-1.5 rounded-full ${step === 4 ? 'bg-white' : 'bg-white/30'}`}></div>
            </>
          ) : (
            <>
              <div className={`w-4 h-1 rounded-full ${step === 1 ? 'bg-white' : 'bg-white/30'}`}></div>
              <div className={`w-4 h-1 rounded-full ${step === 2 ? 'bg-white' : 'bg-white/30'}`}></div>
              <div className={`w-4 h-1 rounded-full ${step === 3 ? 'bg-white' : 'bg-white/30'}`}></div>
              <div className="w-4 h-1 rounded-full bg-white/30"></div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 bg-[#F3F4F6] flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl py-12">

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-md mx-auto">
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Jane Doe"
                    />
                  </div>
                  {inviteCode ? (
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">Joining Workspace</p>
                      </div>
                      <p className="text-lg font-extrabold text-gray-900">{inviteInfo?.workspaceName || 'Team Workspace'}</p>
                      <p className="text-sm text-gray-600">Assigned Role: <span className="font-semibold text-indigo-700 uppercase">{inviteInfo?.role || 'STAFF'}</span></p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company / Workspace Name</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Acme Corp"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <div className="flex rounded-xl shadow-sm bg-gray-50 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all overflow-hidden">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-transparent text-gray-800 font-medium px-3 py-3 border-r border-gray-200 focus:outline-none cursor-pointer text-sm"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-transparent text-gray-900 placeholder:text-gray-400 font-medium outline-none"
                        placeholder="71 234 5678"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => savePersonalInfoMutation.mutate()}
                  disabled={savePersonalInfoMutation.isPending || !fullName || (!inviteCode && !companyName)}
                  className="w-full mt-8 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {savePersonalInfoMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {savePersonalInfoMutation.isPending ? 'Saving...' : 'Continue'}
                  {!savePersonalInfoMutation.isPending && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">

              <div className="grid grid-cols-2 gap-4 mb-8">
                {BUSINESS_TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedType === template.id;
                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedType(template.id)}
                      className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${isSelected
                          ? 'bg-white border-[#2563EB] shadow-[0_0_0_4px_rgba(37,99,235,0.1)]'
                          : 'bg-white/60 border-transparent hover:bg-white hover:shadow-md'
                        }`}
                    >
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-6 h-6 bg-[#2563EB] rounded-full flex items-center justify-center text-white">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isSelected ? 'bg-blue-50 text-[#2563EB]' : 'bg-gray-100 text-gray-500'}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{template.title}</h3>
                      <p className="text-sm text-gray-500">{template.description}</p>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Includes</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {template.queues.map(q => (
                            <li key={q.name} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                              {q.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => updateStep(1)}
                  className="w-1/3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSetupQueues}
                  disabled={setupQueuesMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {setupQueuesMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {setupQueuesMutation.isPending ? 'Setting up queues...' : 'Continue'}
                  {!setupQueuesMutation.isPending && <ArrowRight className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-right-8 duration-500 bg-white rounded-3xl p-10 shadow-xl border border-gray-100 text-center">

              {whatsappStatus?.state !== 'open' ? (
                <>
                  {qrCode ? (
                    <div className="animate-in zoom-in duration-500">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">Scan QR Code</h3>
                      <p className="text-gray-500 max-w-sm mx-auto mb-6">
                        Open WhatsApp on your phone, go to Linked Devices, and scan this QR code.
                      </p>
                      <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto mb-6 border border-gray-100">
                        {qrCode.startsWith && qrCode.startsWith('data:image') ? (
                          <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                        ) : (
                          <div className="w-64 h-64 flex items-center justify-center">
                            <QRCodeSVG value={qrCode} size={256} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-3 text-gray-500 font-medium">
                        <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
                        Waiting for connection...
                      </div>
                    </div>
                  ) : connectionMode === 'code' ? (
                    <div className="animate-in zoom-in duration-500">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        {pairingCode ? 'Enter This Code in WhatsApp' : 'Connect with Pairing Code'}
                      </h3>
                      {pairingCode ? (
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">
                          Open WhatsApp on your phone, go to Settings → Linked Devices, and enter this code.
                        </p>
                      ) : (
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">
                          Enter your WhatsApp phone number to receive a pairing code. No QR scanning required.
                        </p>
                      )}

                      {pairingCode ? (
                        <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
                          <p className="text-sm text-gray-500 mb-2">Pairing Code</p>
                          <div className="flex items-center justify-center gap-2">
                            <code className="text-lg font-mono font-bold text-gray-900 tracking-wider">{pairingCode}</code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(pairingCode);
                                setPairingCopied(true);
                                setTimeout(() => setPairingCopied(false), 2000);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copy code"
                            >
                              {pairingCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Enter this code in WhatsApp within 60 seconds</p>
                        </div>
                      ) : (
                        <div className="bg-blue-50 rounded-2xl p-4 mb-4 border border-blue-100">
                          <p className="text-sm text-gray-500">We&apos;ll generate a pairing code that you enter on your phone.</p>
                        </div>
                      )}

                      {!pairingCode && (
                        <div className="flex flex-col gap-3">
                          <input
                            type="tel"
                            value={pairingPhoneNumber}
                            onChange={(e) => setPairingPhoneNumber(e.target.value.toUpperCase())}
                            placeholder="Enter phone number (e.g. 5511999999999)"
                            maxLength={15}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-mono text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          />
                          <button
                            onClick={() => generatePairingCodeMutation.mutate(pairingPhoneNumber)}
                            disabled={generatePairingCodeMutation.isPending || pairingPhoneNumber.length < 7}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                          >
                            {generatePairingCodeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Keyboard className="w-5 h-5" />}
                            {generatePairingCodeMutation.isPending ? 'Generating...' : 'Generate Pairing Code'}
                          </button>
                          <p className="text-xs text-gray-400">Include country code, no spaces or + sign</p>
                        </div>
                      )}

                      <button
                        onClick={() => { setConnectionMode('qr'); setPairingCode(null); setPairingPhoneNumber(''); }}
                        className="mt-4 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                      >
                        Use QR code instead
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <QrCode className="w-12 h-12 text-[#2563EB]" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Link Your WhatsApp</h3>
                      <p className="text-gray-500 max-w-md mx-auto mb-8">
                        Connecting your WhatsApp allows you to automatically notify customers when they join a queue, track their position, and alert them when it's their turn.
                      </p>
                      <button
                        onClick={handleConnectWhatsApp}
                        disabled={connectWhatsAppMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                      >
                        {connectWhatsAppMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                        {connectWhatsAppMutation.isPending ? 'Generating QR Code...' : 'Connect WhatsApp'}
                      </button>
                      <button
                        onClick={() => setConnectionMode('code')}
                        className="w-full mt-3 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Keyboard className="w-4 h-4" />
                        Use pairing code instead
                      </button>
                      <button
                        onClick={finishOnboarding}
                        className="w-full py-4 text-gray-500 hover:text-gray-700 font-bold transition-colors"
                      >
                        Skip for now
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="animate-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">WhatsApp Connected!</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-8">
                    Your account is successfully linked and ready to send notifications.
                  </p>
                  <button
                    onClick={finishOnboarding}
                    className="w-full py-4 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    Go to Dashboard <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-start">
                <button
                  type="button"
                  onClick={() => updateStep(2)}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                >
                  ← Back to Queues
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-8 duration-500 bg-white rounded-3xl p-10 shadow-xl border border-gray-100 text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100">
                <Users className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Confirm Workspace Join</h2>
              <p className="text-gray-500 mb-8 text-sm">
                You have been invited to join <strong className="text-gray-900">{inviteInfo?.workspaceName || 'your team workspace'}</strong> with role <strong className="text-indigo-600 uppercase font-bold">{inviteInfo?.role || 'STAFF'}</strong>.
              </p>
              <div className="bg-gray-50 p-5 rounded-2xl mb-8 border border-gray-100 text-left space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Full Name:</span>
                  <span className="text-gray-900 font-bold">{fullName}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Mobile Number:</span>
                  <span className="text-gray-900 font-bold">{phone.startsWith('+') ? phone : `${countryCode} ${phone}`}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-500 font-medium">Invite Token:</span>
                  <span className="text-indigo-600 font-mono font-bold tracking-wider">{inviteCode}</span>
                </div>
              </div>
              <button
                onClick={handleConfirmJoinWorkspace}
                disabled={joiningWorkspace}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2 text-base disabled:opacity-70"
              >
                {joiningWorkspace ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {joiningWorkspace ? 'Entering Workspace...' : 'Enter Workspace Dashboard'}
              </button>
              <button
                type="button"
                onClick={() => updateStep(1)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-800 font-semibold transition-colors block mx-auto"
              >
                ← Edit Personal Details
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
