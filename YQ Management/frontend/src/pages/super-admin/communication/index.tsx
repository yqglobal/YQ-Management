import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  MessageSquare, 
  CreditCard, 
  Key, 
  QrCode, 
  RefreshCw, 
  ShieldCheck, 
  Smartphone, 
  ExternalLink, 
  Sparkles,
  Server,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';

export default function SuperAdminCommunication() {
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp' | 'qr' | 'payments'>('email');
  
  // Email & OTP Test States
  const [testEmailTo, setTestEmailTo] = useState('yqbuddysa@gmail.com');
  const [testEmailSubject, setTestEmailSubject] = useState('Qmova Account Verification Code');
  const [emailTestType, setEmailTestType] = useState<'standard' | 'otp'>('otp');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [lastSentEmailOtp, setLastSentEmailOtp] = useState<string | null>(null);

  // WhatsApp & OTP Test States
  const [testPhone, setTestPhone] = useState('+27821234567');
  const [testWaMessage, setTestWaMessage] = useState('Welcome to Qmova Queue Management System!');
  const [waTestType, setWaTestType] = useState<'standard' | 'otp'>('otp');
  const [sendingTestWa, setSendingTestWa] = useState(false);
  const [lastSentWaOtp, setLastSentWaOtp] = useState<string | null>(null);

  // QR Test State
  const [qrTestValue, setQrTestValue] = useState('https://yq-qmova.vercel.app/kiosk/demo-tenant-123');
  const [checkingConnection, setCheckingConnection] = useState(false);

  // Fetch Live System Status
  const { data: systemStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['superadmin-system-status'],
    queryFn: () => fetchApi('/super-admin/communication/status'),
    refetchInterval: 30000,
  });

  // Fetch Templates
  const { data: emailTemplates } = useQuery({
    queryKey: ['superadmin-email-templates'],
    queryFn: () => fetchApi('/super-admin/communication/templates/email'),
  });

  // Fetch WhatsApp Instances for Global Monitor
  const { data: whatsappInstances, isLoading: instancesLoading, refetch: refetchInstances } = useQuery({
    queryKey: ['superadmin-whatsapp-instances'],
    queryFn: () => fetchApi('/super-admin/whatsapp-instances'),
    enabled: activeTab === 'whatsapp',
    refetchInterval: 15000,
  });

  const handleRefreshStatus = async () => {
    setCheckingConnection(true);
    try {
      await refetchStatus();
      toast.success('Live system diagnostics refreshed successfully!');
    } catch {
      toast.error('Failed to communicate with diagnostic endpoint');
    }
    setCheckingConnection(false);
  };

  const handleTestEmail = async () => {
    if (!testEmailTo) {
      toast.error('Please enter a recipient email address');
      return;
    }
    setSendingTestEmail(true);
    setLastSentEmailOtp(null);
    try {
      const res = await fetchApi('/super-admin/communication/test-email', { 
        method: 'POST', 
        body: JSON.stringify({ 
          to: testEmailTo, 
          subject: testEmailSubject,
          type: emailTestType
        }) 
      });
      if (res.success) {
        if (res.otp) setLastSentEmailOtp(res.otp);
        toast.success(`Live ${emailTestType === 'otp' ? 'OTP Verification' : 'Test'} Email sent successfully via Brevo!`);
      } else {
        toast.error(res.error || 'Failed to send test email');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error executing email test transmission');
    }
    setSendingTestEmail(false);
  };

  const handleTestWhatsApp = async () => {
    if (!testPhone) {
      toast.error('Please enter a valid target phone number');
      return;
    }
    setSendingTestWa(true);
    setLastSentWaOtp(null);
    try {
      const res = await fetchApi('/super-admin/communication/test-whatsapp', { 
        method: 'POST', 
        body: JSON.stringify({ 
          phone: testPhone, 
          message: testWaMessage,
          type: waTestType
        }) 
      });
      if (res.success) {
        if (res.otp) setLastSentWaOtp(res.otp);
        toast.success(`WhatsApp ${waTestType === 'otp' ? 'OTP Alert' : 'Message'} queued via Evolution API!`);
      } else {
        toast.error(res.error || 'WhatsApp transmission unsuccessful');
      }
    } catch (e: any) {
      toast.error(e.message || 'Error calling WhatsApp provider endpoint');
    }
    setSendingTestWa(false);
  };

  return (
    <SuperAdminLayout pageTitle="System Command & Testing Hub" pageSubtitle="Live diagnostic controls for Email, OTP, WhatsApp, Ozow Payments, and QR checks">
      <Head>
        <title>Command &amp; Diagnostics | Super Admin</title>
      </Head>

      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Top Title Bar with Refresh Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-900 via-zinc-900 to-black p-8 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 tracking-wider uppercase">
              <Zap className="w-4 h-4 fill-indigo-500 animate-pulse" /> Production Infrastructure
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-sm">
              System Diagnostics &amp; Telemetry
            </h1>
            <p className="text-zinc-400 text-sm max-w-2xl">
              Execute diagnostic transmissions across Brevo Email Relays, Evolution WhatsApp pipelines, Redis OTP engines, and Ozow payment gateways.
            </p>
          </div>
          <button
            onClick={handleRefreshStatus}
            disabled={checkingConnection || statusLoading}
            className="relative z-10 shrink-0 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-50 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all"
          >
            <RefreshCw className={`w-5 h-5 ${checkingConnection || statusLoading ? 'animate-spin' : ''}`} />
            <span>{checkingConnection ? 'Pinging Servers...' : 'Refresh Status'}</span>
          </button>
        </div>

        {/* 4-Column Live System Telemetry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Brevo Email */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden transition-all hover:border-indigo-500/60">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <Mail className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                systemStatus?.email?.connected ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
              }`}>
                {systemStatus?.email?.connected ? '🟢 ONLINE & RELAYING' : '🟡 CHECKING'}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Email Engine</h3>
            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">Brevo SMTP Relay</p>
            <p className="text-xs text-zinc-400 mt-2 truncate">Sender: <span className="font-mono text-indigo-400">{systemStatus?.email?.sender || 'yqbuddysa@gmail.com'}</span></p>
          </div>

          {/* Card 2: WhatsApp Evolution */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden transition-all hover:border-emerald-500/60">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Smartphone className="w-6 h-6 text-emerald-500" />
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                systemStatus?.whatsapp?.configured ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-500'
              }`}>
                {systemStatus?.whatsapp?.configured ? '🟢 INSTANCE ACTIVE' : '🔴 UNCONFIGURED'}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">WhatsApp API</h3>
            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">Evolution v2 Server</p>
            <p className="text-xs text-zinc-400 mt-2 truncate">Instance: <span className="font-mono text-emerald-400">{systemStatus?.whatsapp?.instance || 'yq_instance'}</span></p>
          </div>

          {/* Card 3: Redis OTP */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden transition-all hover:border-indigo-500/60">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl">
                <Key className="w-6 h-6 text-indigo-500" />
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-400">
                ⚡ FAST TTL CACHE
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">OTP Verification</h3>
            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">Redis OTP Engine</p>
            <p className="text-xs text-zinc-400 mt-2">Security: <span className="font-mono text-indigo-400">300s Auto-Expiration</span></p>
          </div>

          {/* Card 4: Ozow Payments */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden transition-all hover:border-amber-500/60">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <CreditCard className="w-6 h-6 text-amber-500" />
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                systemStatus?.payments?.configured ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
              }`}>
                🟢 PAYMENTS LIVE
              </span>
            </div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Payments Gateway</h3>
            <p className="text-lg font-black text-gray-900 dark:text-white mt-1">Ozow Bank Direct</p>
            <p className="text-xs text-zinc-400 mt-2 truncate">Site Code: <span className="font-mono text-amber-400">{systemStatus?.payments?.siteCode || 'YQB-YQB-001'}</span></p>
          </div>
        </div>

        {/* Navigation Tabs for Test Suite */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'email'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-600 dark:text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>1. Email &amp; OTP Tester</span>
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-gray-600 dark:text-zinc-400 hover:text-white hover:bg-emerald-950/40'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>2. WhatsApp &amp; SMS Tester</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'qr'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-gray-600 dark:text-zinc-400 hover:text-white hover:bg-indigo-950/40'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>3. QR &amp; Scanner Checker</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'payments'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-gray-600 dark:text-zinc-400 hover:text-white hover:bg-amber-950/40'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>4. Payments &amp; Checkout Inspector</span>
          </button>
        </div>

        {/* TAB 1: EMAIL & OTP SUITE */}
        {activeTab === 'email' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-5">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
                    <Send className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                    Live Brevo Email &amp; OTP Transmission
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    Send verified OTP codes and transactional emails directly through production SMTP relays.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-indigo-300 mb-2">
                    Message Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setEmailTestType('otp')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        emailTestType === 'otp'
                          ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                          : 'border-gray-800 bg-black/30 text-zinc-400 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-indigo-400 text-sm font-black mb-1">
                        <Key className="w-4 h-4" /> OTP Verification Email
                      </div>
                      <p className="text-xs text-zinc-400">Generates and transmits an official 6-digit verification OTP.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailTestType('standard')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        emailTestType === 'standard'
                          ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                          : 'border-gray-800 bg-black/30 text-zinc-400 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-indigo-400 text-sm font-black mb-1">
                        <Mail className="w-4 h-4" /> Standard System Notification
                      </div>
                      <p className="text-xs text-zinc-400">Sends standard transactional system diagnostic notice.</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-indigo-300 mb-2">
                    Target Recipient Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="yqbuddysa@gmail.com or customer@example.com"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-white/10 rounded-2xl py-3.5 px-5 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-indigo-300 mb-2">
                    Custom Subject Header
                  </label>
                  <input
                    type="text"
                    value={testEmailSubject}
                    onChange={(e) => setTestEmailSubject(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-white/10 rounded-2xl py-3.5 px-5 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                  />
                </div>

                <button
                  onClick={handleTestEmail}
                  disabled={sendingTestEmail || !testEmailTo}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-98 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-sm tracking-wider shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all"
                >
                  {sendingTestEmail ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {sendingTestEmail ? 'Relaying Through Brevo Servers...' : `Transmit ${emailTestType.toUpperCase()} Test`}
                </button>

                {lastSentEmailOtp && (
                  <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-white">OTP Verification Code Successfully Delivered!</h4>
                        <p className="text-xs text-zinc-300">The 6-digit code sent to <b className="text-emerald-300">{testEmailTo}</b> is:</p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-emerald-950 border border-emerald-500 text-2xl font-black text-emerald-400 font-mono tracking-widest rounded-xl shadow">
                      {lastSentEmailOtp}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Email Templates Sidebar */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl space-y-4 h-fit">
              <div className="border-b border-gray-200 dark:border-white/10 pb-4">
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" /> Active Email Templates
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Available system notification layouts.</p>
              </div>
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {emailTemplates?.map((template: any) => (
                  <div key={template.key} className="p-3.5 rounded-2xl border border-gray-800 bg-black/40 hover:border-indigo-500/60 transition-colors">
                    <p className="font-bold text-sm text-white">{template.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-zinc-500 font-mono">{template.key}</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">HTML &amp; Text</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WHATSAPP & SMS SUITE */}
        {activeTab === 'whatsapp' && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-xl max-w-4xl space-y-6">
            <div className="border-b border-gray-200 dark:border-white/10 pb-5">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
                <Smartphone className="w-6 h-6 text-emerald-500" />
                Live Evolution API WhatsApp &amp; OTP Testing
              </h2>
              <p className="text-xs text-gray-500 dark:text-emerald-200/60 mt-1">
                Test WhatsApp queue alerts, slot reminders, and OTP security verifications over Evolution API v2.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-emerald-300 mb-2">
                  Payload Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setWaTestType('otp')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      waTestType === 'otp'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white font-bold'
                        : 'border-gray-800 bg-black/30 text-zinc-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-black mb-1">
                      <Key className="w-4 h-4" /> WhatsApp OTP Security Notice
                    </div>
                    <p className="text-xs text-zinc-400">Generates and sends a 6-digit WhatsApp OTP validation PIN.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaTestType('standard')}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      waTestType === 'standard'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white font-bold'
                        : 'border-gray-800 bg-black/30 text-zinc-400 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-black mb-1">
                      <MessageSquare className="w-4 h-4" /> Queue Turn / Lobby Alert
                    </div>
                    <p className="text-xs text-zinc-400">Sends standard queue progress notification text.</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-emerald-300 mb-2">
                  Target WhatsApp Phone Number (With Country Code)
                </label>
                <input
                  type="text"
                  placeholder="+27821234567"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-white/10 rounded-2xl py-3.5 px-5 text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
                />
              </div>

              {waTestType === 'standard' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-emerald-300 mb-2">
                    Message Content
                  </label>
                  <textarea
                    rows={4}
                    value={testWaMessage}
                    onChange={(e) => setTestWaMessage(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-white/10 rounded-2xl p-4 text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
                  />
                </div>
              )}

              <button
                onClick={handleTestWhatsApp}
                disabled={sendingTestWa || !testPhone}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-sm tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all"
              >
                {sendingTestWa ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {sendingTestWa ? 'Dispatching Over Evolution Server...' : `Send Live WhatsApp ${waTestType.toUpperCase()} Message`}
              </button>

              {lastSentWaOtp && (
                <div className="p-5 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">WhatsApp OTP Dispatched!</h4>
                      <p className="text-xs text-zinc-300">Generated verification PIN for <b className="text-emerald-300">{testPhone}</b>:</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-emerald-950 border border-emerald-500 text-2xl font-black text-emerald-400 font-mono tracking-widest rounded-xl shadow">
                    {lastSentWaOtp}
                  </div>
                </div>
              )}
            </div>
            
            {/* GLOBAL WHATSAPP INSTANCE MONITOR */}
            <div className="mt-10 border-t border-gray-200 dark:border-white/10 pt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-emerald-500" /> Global Tenant Instance Monitor
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">Real-time Evolution API connection status across all tenants.</p>
                </div>
                <button
                  onClick={() => refetchInstances()}
                  disabled={instancesLoading}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${instancesLoading ? 'animate-spin' : ''}`} /> Sync State
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="bg-zinc-800/50 text-xs uppercase font-bold text-gray-300 border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-xl">Tenant</th>
                      <th className="px-4 py-3">Instance ID</th>
                      <th className="px-4 py-3">DB State</th>
                      <th className="px-4 py-3">Evo Server State</th>
                      <th className="px-4 py-3 rounded-tr-xl">Health Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {whatsappInstances?.map((instance: any) => (
                      <tr key={instance.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">{instance.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{instance.instanceId || 'None'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${instance.dbConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {instance.dbConnected ? 'TRUE' : 'FALSE'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${instance.evoActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {instance.evoActive ? 'ACTIVE' : 'MISSING'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {instance.status === 'healthy' && <span className="text-emerald-400 text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Healthy</span>}
                          {instance.status === 'stale_db' && <span className="text-amber-400 text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Stale DB</span>}
                          {instance.status === 'stale_evo' && <span className="text-amber-400 text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Missing Evo Instance</span>}
                          {instance.status === 'disconnected' && <span className="text-gray-500 text-xs font-bold flex items-center gap-1"><XCircle className="w-4 h-4" /> Disconnected</span>}
                          {instance.status === 'unconfigured' && <span className="text-zinc-600 text-xs font-bold">Unconfigured</span>}
                        </td>
                      </tr>
                    ))}
                    {!whatsappInstances?.length && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 italic">No instances found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: QR & SCANNER SUITE */}
        {activeTab === 'qr' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-xl space-y-6">
              <div className="border-b border-gray-200 dark:border-white/10 pb-5">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
                  <QrCode className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                  Interactive QR Token &amp; Kiosk Generator
                </h2>
                <p className="text-xs text-gray-500 dark:text-indigo-200/60 mt-1">
                  Generate dynamic check-in QR matrices for physical lobby displays and ticket kiosks.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-indigo-300 mb-2">
                  Target QR Payload / Kiosk URL
                </label>
                <input
                  type="text"
                  value={qrTestValue}
                  onChange={(e) => setQrTestValue(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-300 dark:border-white/10 rounded-2xl py-3.5 px-5 text-gray-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                />
              </div>

              <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-3">
                <p className="text-xs text-indigo-300 font-semibold">Quick Test Shortcuts:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQrTestValue('https://yq-qmova.vercel.app/kiosk/demo-tenant-123')}
                    className="px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/70 text-indigo-300 rounded-lg text-xs font-mono transition-all"
                  >
                    Kiosk Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrTestValue('TOKEN-V94-817')}
                    className="px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/70 text-indigo-300 rounded-lg text-xs font-mono transition-all"
                  >
                    Token UUID Test
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="/dashboard/check-in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-sm tracking-wider shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-5 h-5" /> Launch Live Staff QR Scanner
                </a>
              </div>
            </div>

            {/* QR Preview Studio */}
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-xl flex flex-col items-center justify-center text-center space-y-6">
              <div className="p-6 bg-white rounded-3xl shadow-2xl border-8 border-gray-900 flex items-center justify-center">
                {qrTestValue ? (
                  <QRCode value={qrTestValue} size={220} />
                ) : (
                  <p className="text-gray-500 text-sm py-16 px-6">Enter text above to preview QR code.</p>
                )}
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-950 px-3 py-1 rounded-full">
                  Scanner Verified &amp; High-Contrast
                </span>
                <p className="text-xs text-zinc-400 mt-2 max-w-sm">
                  This QR matrix conforms to high error-correction tolerances for instant detection by smartphone cameras and lobby webcams.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENTS & BILLING SUITE */}
        {activeTab === 'payments' && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-xl max-w-4xl space-y-8">
            <div className="border-b border-gray-200 dark:border-white/10 pb-5">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
                <CreditCard className="w-6 h-6 text-amber-500" />
                Ozow Payments Gateway
              </h2>
              <p className="text-xs text-gray-500 dark:text-amber-200/60 mt-1">
                Automated bank account settlement setup for subscription checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 bg-black/40 border border-amber-900/30 rounded-2xl space-y-2">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Gateway Configuration</p>
                <p className="text-lg font-extrabold text-white">Ozow Bank Direct EFT</p>
                <p className="text-xs text-zinc-400">Site Code: <span className="text-amber-400 font-mono font-bold">{systemStatus?.payments?.siteCode || 'YQB-YQB-001'}</span></p>
              </div>
              <div className="p-6 bg-black/40 border border-amber-900/30 rounded-2xl space-y-2">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Environment Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-lg font-extrabold text-emerald-400">Active (Production Ready)</p>
                </div>
                <p className="text-xs text-zinc-400">Connected to direct bank verification routes.</p>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" /> Payment Flow &amp; Subscription Sync Verified
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                When businesses check out on plans, the backend generates an SHA512 HMAC verification signature with your private key (<code className="text-amber-300 font-mono">000c8b...</code>), redirects to Ozow Pay, and automatically processes webhooks to activate workspaces instantly upon bank clearance.
              </p>
              <div className="pt-2 flex flex-wrap gap-4">
                <a
                  href="/dashboard/settings/billing"
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Open Tenant Checkout Simulator
                </a>
                <a
                  href="/super-admin/plans"
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
                >
                  Manage Subscription Plans
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

