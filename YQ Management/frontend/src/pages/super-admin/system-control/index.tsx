import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sliders, 
  Mail, 
  CreditCard, 
  Key, 
  ShieldCheck, 
  Power, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Zap, 
  Smartphone, 
  ExternalLink,
  Server,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';

interface ToggleConfig {
  key: string;
  name: string;
  description: string;
  icon: AnyFixMe;
  color: string;
}

const SERVICE_CONFIGS: ToggleConfig[] = [
  {
    key: 'keepAliveBackend',
    name: 'Site Backend Keep-Alive Service',
    description: 'Automated 14-minute cron ping to /health. Keeps server active at all times; toggle off during maintenance.',
    icon: Power,
    color: 'from-violet-500 to-indigo-600'
  },
  {
    key: 'keepAliveWhatsapp',
    name: 'WhatsApp Server Keep-Alive Service',
    description: 'Automated 14-minute status check to Evolution API v2 instance to ensure constant messaging readiness.',
    icon: RefreshCw,
    color: 'from-cyan-500 to-teal-600'
  },
  {
    key: 'emailService',
    name: 'Brevo Email SMTP & Relays',
    description: 'Controls automated transactional emails, registration notices, and invoice delivery.',
    icon: Mail,
    color: 'from-purple-500 to-indigo-600'
  },
  {
    key: 'whatsappService',
    name: 'Evolution WhatsApp API v2',
    description: 'Governs automated queue notifications, turn reminders, and customer broadcast messages.',
    icon: Smartphone,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    key: 'paymentGateway',
    name: 'Ozow Direct Bank EFT Payments',
    description: 'Enables real-time automated bank account settlement and subscription checkout processing.',
    icon: CreditCard,
    color: 'from-amber-500 to-orange-600'
  },
  {
    key: 'otpVerification',
    name: 'Redis OTP Security Engine',
    description: 'Manages 5-minute TTL caching and delivery of 6-digit verification PINs for staff and admins.',
    icon: Key,
    color: 'from-indigo-500 to-purple-600'
  },
  {
    key: 'kioskCheckin',
    name: 'Public Kiosk & QR Registration',
    description: 'Activates physical reception kiosks, QR displays, and walk-in ticket token dispensation.',
    icon: Server,
    color: 'from-blue-500 to-cyan-600'
  },
  {
    key: 'automatedWebhooks',
    name: 'Real-Time Webhook Dispatcher',
    description: 'Automatically fires real-time HTTP event notifications to integrated enterprise tenant endpoints.',
    icon: Zap,
    color: 'from-fuchsia-500 to-purple-600'
  },
];

export default function SystemControlPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Test Email State
  const [emailTo, setEmailTo] = useState('yqbuddysa@gmail.com');
  const [emailSubject, setEmailSubject] = useState('Qmova Authentication Code');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailOtpResult, setEmailOtpResult] = useState<string | null>(null);

  // Test WhatsApp State
  const [waPhone, setWaPhone] = useState('+27821234567');
  const [waMessageType, setWaMessageType] = useState<'otp' | 'standard'>('otp');
  const [waCustomText, setWaCustomText] = useState('Welcome to Qmova Queue System!');
  const [sendingWa, setSendingWa] = useState(false);
  const [waOtpResult, setWaOtpResult] = useState<string | null>(null);

  // Test Payment Redirect State
  const [payAmount, setPayAmount] = useState('10.00');
  const [payTestMode, setPayTestMode] = useState<boolean>(false);
  const [generatingPay, setGeneratingPay] = useState(false);
  const [payPayload, setPayPayload] = useState<AnyFixMe | null>(null);
  const [redirectStatusMsg, setRedirectStatusMsg] = useState<{ type: 'success' | 'error' | 'cancelled'; text: string } | null>(null);

  // Check URL query parameters for returning payment test redirects
  useEffect(() => {
    if (router.query.payment_status === 'success') {
      setRedirectStatusMsg({ type: 'success', text: '✅ Ozow Payment verification completed successfully! The gateway redirect test succeeded.' }); // eslint-disable-line react-hooks/set-state-in-effect
      toast.success('Test payment redirect completed successfully!');
    } else if (router.query.payment_status === 'cancelled') {
      setRedirectStatusMsg({ type: 'cancelled', text: '⚠️ Payment test redirect was cancelled at the Ozow bank interface.' }); // eslint-disable-line react-hooks/set-state-in-effect
    } else if (router.query.payment_status === 'error') {
      setRedirectStatusMsg({ type: 'error', text: '❌ An error was returned by the Ozow payment gateway during redirect verification.' }); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [router.query.payment_status]);

  // Fetch System Toggles
  const { data: toggles = {}, isLoading: togglesLoading, refetch: refetchToggles } = useQuery({
    queryKey: ['system-toggles'],
    queryFn: () => fetchApi('/super-admin/system-toggles'),
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: (data: { service: string; enabled: boolean }) =>
      fetchApi('/super-admin/system-toggles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (newData, variables) => {
      queryClient.setQueryData(['system-toggles'], newData);
      toast.success(`Service "${variables.service}" is now ${variables.enabled ? 'ONLINE (Enabled)' : 'OFFLINE (Disabled)'}`);
    },
    onError: () => {
      toast.error('Failed to update service status switch');
    },
  });

  const handleToggle = (key: string, currentVal: boolean) => {
    toggleMutation.mutate({ service: key, enabled: !currentVal });
  };

  const handleSendTestEmailOtp = async () => {
    if (!emailTo) {
      toast.error('Please enter a target recipient email address');
      return;
    }
    setSendingEmail(true);
    setEmailOtpResult(null);
    try {
      const res = await fetchApi('/super-admin/communication/test-email', {
        method: 'POST',
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          type: 'otp',
        }),
      });
      if (res.success) {
        if (res.otp) setEmailOtpResult(res.otp);
        toast.success('OTP Verification Email sent successfully via Brevo!');
      } else {
        toast.error(res.error || 'Failed to dispatch email');
      }
    } catch (e: AnyFixMe) {
      toast.error(e.message || 'Error executing email test transmission');
    }
    setSendingEmail(false);
  };

  const handleSendTestWhatsApp = async () => {
    if (!waPhone) {
      toast.error('Please enter a valid WhatsApp phone number with country code');
      return;
    }
    setSendingWa(true);
    setWaOtpResult(null);
    try {
      const res = await fetchApi('/super-admin/communication/test-whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          phone: waPhone,
          message: waCustomText,
          type: waMessageType,
        }),
      });
      if (res.success) {
        if (res.otp) setWaOtpResult(res.otp);
        toast.success(`WhatsApp ${waMessageType === 'otp' ? 'OTP Verification' : 'Message'} dispatched!`);
      } else {
        toast.error(res.error || 'WhatsApp transmission unsuccessful');
      }
    } catch (e: AnyFixMe) {
      toast.error(e.message || 'Error invoking WhatsApp Evolution service');
    }
    setSendingWa(false);
  };

  const handleGeneratePaymentRedirect = async () => {
    setGeneratingPay(true);
    setPayPayload(null);
    try {
      const res = await fetchApi('/super-admin/payments/test-redirect', {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(payAmount) || 10.0,
          isTestMode: payTestMode,
        }),
      });
      if (res.paymentUrl && res.hashCheck) {
        setPayPayload(res);
        toast.success('SHA512 HMAC payment cryptographic signature generated!');
      } else {
        toast.error('Failed to receive complete Ozow gateway payload');
      }
    } catch (e: AnyFixMe) {
      toast.error(e.message || 'Error generating test payment redirect signature');
    }
    setGeneratingPay(false);
  };

  const handleLaunchPaymentRedirect = () => {
    if (!payPayload) return;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payPayload.paymentUrl;

    const fields = ['siteCode', 'countryCode', 'currencyCode', 'amount', 'transactionReference', 'bankReference', 'cancelUrl', 'errorUrl', 'successUrl', 'notifyUrl', 'isTest', 'hashCheck'];
    fields.forEach(field => {
      if (payPayload[field] !== undefined) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = field.charAt(0).toUpperCase() + field.slice(1);
        input.value = String(payPayload[field]);
        form.appendChild(input);
      }
    });

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <SuperAdminLayout pageTitle="Master System Control" pageSubtitle="Real-time service toggles, messaging diagnostics, and gateway test redirects">
      <Head>
        <title>System Control &amp; Testing | Super Admin</title>
      </Head>

      <div className="max-w-7xl mx-auto space-y-10 pb-20">
        {/* Banner */}
        <div className="bg-gradient-to-r from-zinc-900 via-gray-900 to-black p-8 sm:p-10 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-black text-indigo-400 tracking-wider uppercase">
              <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" /> Infrastructure Command Matrix
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase drop-shadow">
              System Control Hub
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Instantly control platform sub-systems, execute messaging diagnostics across email &amp; WhatsApp pipelines, and initiate payment gateway verification sequences.
            </p>
          </div>

          <button
            onClick={() => refetchToggles()}
            disabled={togglesLoading}
            className="relative z-10 shrink-0 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white rounded-2xl font-bold uppercase tracking-wider text-xs shadow-lg border border-gray-700 flex items-center justify-center gap-2.5 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${togglesLoading ? 'animate-spin' : ''}`} />
            <span>Sync Toggle State</span>
          </button>
        </div>

        {/* Payment Test Redirect Status Notification (if returning from Ozow) */}
        {redirectStatusMsg && (
          <div className={`p-6 rounded-2xl border-2 flex items-center justify-between shadow-xl ${
            redirectStatusMsg.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' :
            redirectStatusMsg.type === 'cancelled' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' :
            'bg-red-500/15 border-red-500/40 text-red-300'
          }`}>
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-8 h-8 shrink-0" />
              <p className="font-extrabold text-sm sm:text-base">{redirectStatusMsg.text}</p>
            </div>
            <button
              onClick={() => {
                setRedirectStatusMsg(null); // eslint-disable-line react-hooks/set-state-in-effect
                router.replace('/super-admin/system-control', undefined, { shallow: true });
              }}
              className="px-4 py-2 bg-black/40 hover:bg-black/60 rounded-xl text-xs font-bold text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SECTION 1: MASTER SERVICE TOGGLES */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                <Sliders className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
                Live Service Circuit Breakers
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Toggle essential platform capabilities in real time. Changes take immediate effect across all connected workspaces.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full uppercase">
              ⚡ LIVE OVERRIDE READY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICE_CONFIGS.map((service) => {
              const IconComponent = service.icon;
              const isEnabled = toggles[service.key] !== false; // defaults to true
              return (
                <div
                  key={service.key}
                  className={`p-6 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between shadow-md ${
                    isEnabled
                      ? 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 hover:border-indigo-500/70'
                      : 'bg-gray-100 dark:bg-zinc-950 border-gray-300 dark:border-white/5 opacity-75'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${service.color} text-white shadow-lg`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      
                      {/* Interactive Switch Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggle(service.key, isEnabled)}
                        disabled={toggleMutation.isPending}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                          isEnabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-zinc-700'
                        }`}
                      >
                        <span className="sr-only">Toggle {service.name}</span>
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-md ${
                            isEnabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`text-[11px] font-black uppercase tracking-wider ${isEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isEnabled ? 'Operational & Active' : 'Offline / Throttled'}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1.5">{service.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed">{service.description}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                    <span>Key: {service.key}</span>
                    <span className="font-bold">{isEnabled ? 'RUNNING' : 'STOPPED'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: INTERACTIVE TEST INJECTION SUITE */}
        <div className="space-y-6 pt-6">
          <div className="border-b border-gray-200 dark:border-white/10 pb-4">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
              <Zap className="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
              Live Diagnostic Trigger Suites
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
              Inject live verification payloads directly into production messaging engines and payment processing gateways.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* CARD 1: WHATSAPP & SMS OTP TESTER */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-7 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-emerald-500/60 transition-all">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <Smartphone className="w-6 h-6 text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                    Evolution API v2
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Send WhatsApp Message / OTP</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    Dispatch live WhatsApp turn notices or verification PINs directly to staff or client phone numbers.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-emerald-400 mb-1.5">
                      Target Phone Number
                    </label>
                    <input
                      type="text"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      placeholder="+27821234567"
                      className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-white/10 rounded-xl py-3 px-4 font-mono text-sm text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-emerald-400 mb-1.5">
                      Test Mode Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setWaMessageType('otp')}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                          waMessageType === 'otp' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        🔐 OTP PIN
                      </button>
                      <button
                        type="button"
                        onClick={() => setWaMessageType('standard')}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                          waMessageType === 'standard' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        💬 Queue Alert
                      </button>
                    </div>
                  </div>

                  {waMessageType === 'standard' && (
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-emerald-400 mb-1.5">
                        Message Payload
                      </label>
                      <input
                        type="text"
                        value={waCustomText}
                        onChange={(e) => setWaCustomText(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {waOtpResult && (
                  <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-emerald-300">OTP Sent &amp; Cached!</p>
                      <p className="text-xs font-mono font-bold text-white mt-0.5">Code: <span className="text-emerald-400 text-lg">{waOtpResult}</span></p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  </div>
                )}
              </div>

              <button
                onClick={handleSendTestWhatsApp}
                disabled={sendingWa || !waPhone}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all mt-4"
              >
                {sendingWa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sendingWa ? 'Dispatching...' : `Send WhatsApp ${waMessageType.toUpperCase()}`}</span>
              </button>
            </div>

            {/* CARD 2: BREVO EMAIL OTP TESTER */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-7 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-indigo-500/60 transition-all">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                    <Mail className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300">
                    Brevo Relay Active
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Send Test Email OTP</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    Inject an authentic 6-digit login verification OTP code into Brevo SMTP queues for instant delivery check.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-indigo-400 mb-1.5">
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="yqbuddysa@gmail.com"
                      className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-white/10 rounded-xl py-3 px-4 font-medium text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-indigo-400 mb-1.5">
                      Email Subject Title
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {emailOtpResult && (
                  <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-emerald-300">Relayed Successfully!</p>
                      <p className="text-xs font-mono font-bold text-white mt-0.5">Delivered OTP: <span className="text-emerald-400 text-lg">{emailOtpResult}</span></p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  </div>
                )}
              </div>

              <button
                onClick={handleSendTestEmailOtp}
                disabled={sendingEmail || !emailTo}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all mt-4"
              >
                {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sendingEmail ? 'Relaying over SMTP...' : 'Transmit Test Email OTP'}</span>
              </button>
            </div>

            {/* CARD 3: OZOW PAYMENT GATEWAY REDIRECT TESTER */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-7 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-amber-500/60 transition-all">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <CreditCard className="w-6 h-6 text-amber-500" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    payTestMode ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {payTestMode ? 'Sandbox Simulator' : 'Live Bank Production'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Send Payment Gateway Redirect</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    Generate an SHA512 cryptographic checkout session and test browser redirect into Ozow bank verification.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-amber-400 mb-1.5">
                        Amount (ZAR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-300 dark:border-white/10 rounded-xl py-3 px-3 font-mono text-sm text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-amber-400 mb-1.5">
                        Gateway Environment
                      </label>
                      <button
                        type="button"
                        onClick={() => setPayTestMode(!payTestMode)}
                        className={`w-full py-3 px-3 rounded-xl font-extrabold text-xs transition-all border flex items-center justify-center gap-1.5 ${
                          !payTestMode ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-amber-600/20 border-amber-500 text-amber-300'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${!payTestMode ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                        {!payTestMode ? 'Live EFT' : 'Sandbox'}
                      </button>
                    </div>
                  </div>
                </div>

                {payPayload && (
                  <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase text-amber-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> SHA512 Signature Validated
                      </p>
                    </div>
                    <p className="text-[11px] text-zinc-300 font-mono truncate">Ref: <span className="text-amber-300">{payPayload.transactionReference}</span></p>
                    <button
                      type="button"
                      onClick={handleLaunchPaymentRedirect}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" /> Launch Live Gateway Redirect
                    </button>
                  </div>
                )}
              </div>

              {!payPayload ? (
                <button
                  onClick={handleGeneratePaymentRedirect}
                  disabled={generatingPay || !payAmount}
                  className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2.5 transition-all mt-4"
                >
                  {generatingPay ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  <span>{generatingPay ? 'Signing Payload...' : 'Generate Redirect Signature'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setPayPayload(null)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-bold uppercase text-xs transition-all"
                >
                  Reset Checkout Signature
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
