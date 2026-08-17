import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import useWhatsapp from '../../../../hooks/useWhatsapp';
import { useAuth } from '../../../../components/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { Send, MessageSquare, QrCode, Loader2, AlertCircle, CheckCircle2, Phone, RefreshCw, Terminal, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import PhoneInput from '../../../../components/PhoneInput';
import { toast } from 'sonner';
import { PremiumFeatureGate } from '../../../../components/PremiumFeatureGate';

export default function WhatsAppSettingsPage() {
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeType, setQrCodeType] = useState<'base64' | 'text' | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'qr' | 'code'>('qr');
  const [pairingPhoneNumber, setPairingPhoneNumber] = useState('');
  const [pairingCountryCode, setPairingCountryCode] = useState('+1');
  const [testPhone, setTestPhone] = useState('');
  const [testCountryCode, setTestCountryCode] = useState('+1');
  const [testMessage, setTestMessage] = useState('Test message from Qmova');
  const [qrCountdown, setQrCountdown] = useState<number>(60);
  
  const logToBackend = (level: string, message: string, data?: any) => {
    fetchApi('/whatsapp/frontend-log', {
      method: 'POST',
      body: JSON.stringify({ level, message, data })
    }).catch(() => {});
  };
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { data: tenant = null } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me'),
  });

  const updateTenantMutation = useMutation({
    mutationFn: (data: any) => fetchApi(`/tenant/${tenant?.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const { statusQuery, logsQuery, cachedQrQuery, connectMutation, pairingCodeMutation, disconnectMutation, testMutation } = useWhatsapp();
  const whatsappStatus = statusQuery.data;
  const logs = logsQuery.data;
  const isWhatsAppConnected = whatsappStatus?.state === 'open';

  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logs?.length) {
      console.log('[WhatsApp] Received new logs:', logs.length);
      if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      }
    }
  }, [logs]);

  useEffect(() => {
    console.log('[WhatsApp] Status updated:', whatsappStatus);
    if (whatsappStatus?.state === 'open') {
      console.log('[WhatsApp] Device is connected. Clearing QR codes.');
      setQrCode(null);
      setQrCodeType(null);
      setPairingCode(null);
    } else if (whatsappStatus) {
      if (whatsappStatus.qr) {
        console.log('[WhatsApp] Valid QR found in status. Type:', whatsappStatus.qrType);
        setQrCode(whatsappStatus.qr);
        setQrCodeType(whatsappStatus.qrType || (whatsappStatus.qr.startsWith('data:image') ? 'base64' : 'text'));
      } else if (whatsappStatus.qr === null) {
        console.log('[WhatsApp] Backend explicitly cleared QR (likely syncing). Clearing UI QR.');
        setQrCode(null);
        setQrCodeType(null);
      } else {
        console.log('[WhatsApp] Status is not open and no QR is present in status payload.');
      }
    }
  }, [whatsappStatus]);

  // Sync the global tenant query cache with the WhatsApp connection status
  useEffect(() => {
    if (tenant && isWhatsAppConnected !== undefined) {
      if (isWhatsAppConnected !== tenant.whatsappConnected) {
        queryClient.setQueryData(['tenant', 'me'], (old: any) => {
          if (!old) return old;
          return { ...old, whatsappConnected: isWhatsAppConnected };
        });
      }
    }
  }, [isWhatsAppConnected, tenant?.whatsappConnected, queryClient]);

  useEffect(() => {
    if (cachedQrQuery?.data?.qr) {
      console.log('[WhatsApp] Cached QR found:', { expiresAt: cachedQrQuery.data.expiresAt });
      setQrCode(cachedQrQuery.data.qr);
      setQrCodeType(cachedQrQuery.data.qr.startsWith('data:image') ? 'base64' : 'text');
    }
  }, [cachedQrQuery?.data]);

  useEffect(() => {
    console.log('[WhatsApp] Connect mutation status:', connectMutation.status, connectMutation.data);
    if (connectMutation.isSuccess && connectMutation.data?.qr) {
      console.log('[WhatsApp] Setting QR from successful connection mutation.');
      toast.success('QR Code ready! Please scan using WhatsApp.');
      logToBackend('info', 'QR Code received and displayed to user');
      setQrCode(connectMutation.data.qr);
      setQrCodeType(connectMutation.data.qr.startsWith('data:image') ? 'base64' : 'text');
    }
    if (connectMutation.isSuccess && connectMutation.data?.state === 'open') {
      console.log('[WhatsApp] Connection mutation indicated already open.');
      toast.success('WhatsApp is connected!');
      logToBackend('info', 'WhatsApp connected successfully');
    }
    if (connectMutation.isError) {
      const err: any = connectMutation.error;
      console.error('[WhatsApp] Connect mutation error effect:', err);
      toast.error(err?.details?.message || err?.message || 'Failed to connect to WhatsApp');
      logToBackend('error', 'Failed to connect to WhatsApp', err);
    }
  }, [connectMutation.status, connectMutation.data, connectMutation.error, connectMutation.isSuccess, connectMutation.isError]);

  useEffect(() => {
    if (qrCode) {
      setQrCountdown(60);
    }
  }, [qrCode]);

  useEffect(() => {
    if (!qrCode || isWhatsAppConnected || connectionMode !== 'qr') return;
    
    if (qrCountdown <= 0) {
      if (!connectMutation.isPending) {
        connectMutation.mutate(true);
        setQrCountdown(60);
      }
      return;
    }

    const timer = setInterval(() => {
      setQrCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [qrCountdown, qrCode, isWhatsAppConnected, connectionMode, connectMutation]);

  return (
    <PremiumFeatureGate
      featureKey="whatsappNotifications"
      featureName="WhatsApp Integration"
      description="Connect your WhatsApp Business account to send automated notifications, position updates, and serve customers via chat."
    >
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)] transition-all duration-300 group">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#25D366]"></div>

      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-[#25D366]" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">WhatsApp Integration</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Connect your WhatsApp account to send automated queue notifications.</p>
        </div>
      </div>

      <div className="space-y-12">
        {/* Connection Status Section */}
        <section>
          {isWhatsAppConnected ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-surface-bright dark:bg-zinc-900 rounded-2xl border border-emerald-200 dark:border-emerald-900 shadow-sm animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 animate-ping rounded-full" />
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center relative shadow-sm border-2 border-emerald-500">
                  <CheckCircle2 strokeWidth={1.5} className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white mt-6 mb-2 tracking-tight font-semibold">Connected & Active</h3>
              {whatsappStatus?.connectedNumber && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full font-body-sm font-bold tracking-wide uppercase mb-6 border border-emerald-200 dark:border-emerald-500/20">
                  <Phone strokeWidth={1.5} className="w-4 h-4" />
                  +{whatsappStatus.connectedNumber}
                </div>
              )}
              <p className="font-body-md text-on-surface-variant dark:text-outline mb-8 max-w-md mx-auto text-center">
                Your device is successfully paired. You can now send automated queue notifications and messages to your customers.
              </p>
              <button 
                onClick={() => {
                  logToBackend('info', 'User requested to disconnect WhatsApp');
                  disconnectMutation.mutate();
                }}
                disabled={disconnectMutation.isPending}
                className="h-[44px] px-8 text-error bg-error-container hover:bg-error-container/80 rounded-lg font-body-md font-semibold transition-colors disabled:opacity-50"
              >
                {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect Device'}
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 items-start bg-surface-bright dark:bg-zinc-900 rounded-2xl p-6 md:p-8 border border-border dark:border-dark-border shadow-sm">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white tracking-tight font-semibold">Link Your Account</h3>
                  <p className="font-body-sm text-on-surface-variant dark:text-outline">
                    Connect your business WhatsApp account to automate notifications. You can connect by scanning a QR code or using a pairing code directly on your phone.
                  </p>
                </div>
                
                <div className="flex p-1 bg-surface-container-low dark:bg-black/50 rounded-xl">
                  <button 
                    onClick={() => setConnectionMode('qr')} 
                    className={`flex-1 flex items-center justify-center gap-2 h-[40px] rounded-lg font-body-sm font-semibold transition-all duration-300 ${connectionMode === 'qr' ? 'bg-white dark:bg-zinc-800 text-on-surface dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-on-surface'}`}
                  >
                    <QrCode strokeWidth={1.5} className="w-4 h-4" /> QR Code
                  </button>
                  <button 
                    onClick={() => setConnectionMode('code')} 
                    className={`flex-1 flex items-center justify-center gap-2 h-[40px] rounded-lg font-body-sm font-semibold transition-all duration-300 ${connectionMode === 'code' ? 'bg-white dark:bg-zinc-800 text-on-surface dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-on-surface'}`}
                  >
                    <Smartphone strokeWidth={1.5} className="w-4 h-4" /> Pairing Code
                  </button>
                </div>

                {connectionMode === 'code' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="space-y-2">
                      <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider">WhatsApp Phone Number</label>
                      <div className="h-[44px] rounded-lg bg-white dark:bg-black/50 border border-border dark:border-dark-border focus-within:ring-1 focus-within:ring-[#25D366] focus-within:border-[#25D366]">
                        <PhoneInput 
                          value={pairingPhoneNumber}
                          onChange={setPairingPhoneNumber}
                          countryCode={pairingCountryCode}
                          onCountryCodeChange={setPairingCountryCode}
                          placeholder="234 567 8900"
                          className="w-full h-full !border-none !bg-transparent px-3 text-on-surface dark:text-white font-body-md"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          logToBackend('info', 'User requested pairing code', { phone: `${pairingCountryCode}${pairingPhoneNumber}` });
                          const res: any = await pairingCodeMutation.mutateAsync(`${pairingCountryCode}${pairingPhoneNumber}`);
                          if (res?.pairingCode) {
                            setPairingCode(res.pairingCode);
                            logToBackend('info', 'Pairing code received successfully');
                          }
                          await statusQuery.refetch();
                        } catch (e: any) {
                          logToBackend('error', 'Failed to generate pairing code', e);
                          toast.error(e?.message || 'Failed to generate pairing code');
                        }
                      }}
                      disabled={pairingCodeMutation.isPending || !pairingPhoneNumber}
                      className="w-full h-[44px] bg-[#25D366] hover:bg-[#1DA851] disabled:opacity-50 text-white rounded-lg font-body-md font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      {pairingCodeMutation.isPending ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <Smartphone strokeWidth={1.5} className="w-5 h-5" />}
                      Generate Pairing Code
                    </button>
                  </div>
                )}

                {connectionMode === 'qr' && !qrCode && (
                   <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                      <button
                        onClick={() => {
                          logToBackend('info', 'User clicked Connect WhatsApp QR');
                          connectMutation.mutate(false);
                        }}
                        disabled={connectMutation.isPending}
                        className="w-full py-4 bg-[#25D366] hover:bg-[#1DA851] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-sm flex flex-col items-center justify-center gap-1"
                      >
                        <div className="flex items-center gap-2">
                          {connectMutation.isPending ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <QrCode strokeWidth={1.5} className="w-5 h-5" />}
                          <span className="font-body-lg">Generate QR Code</span>
                        </div>
                        <span className="font-body-sm text-white/80">Click to fetch a new secure connection QR</span>
                      </button>
                   </div>
                )}
              </div>

              <div className="flex items-center justify-center h-full min-h-[300px]">
                {connectionMode === 'qr' && qrCode ? (
                  <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-border dark:border-dark-border">
                      <div className="w-64 h-64 flex items-center justify-center">
                        {qrCodeType === 'base64' || qrCode.startsWith('data:image') ? (
                          <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain rounded-xl" />
                        ) : (
                          <QRCodeSVG value={qrCode} size={240} bgColor="#ffffff" fgColor="#000000" level="M" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-surface-container-low dark:bg-black/50 px-4 py-2 rounded-full shadow-sm border border-border dark:border-dark-border">
                      <button
                        onClick={() => connectMutation.mutate(true)}
                        disabled={connectMutation.isPending}
                        className="flex items-center gap-2 font-body-sm font-semibold text-on-surface dark:text-white hover:text-[#25D366] transition-colors"
                      >
                        <RefreshCw strokeWidth={1.5} className={`w-4 h-4 ${connectMutation.isPending ? 'animate-spin' : ''}`} />
                        {connectMutation.isPending ? 'Refreshing...' : 'Refresh QR'}
                      </button>
                      <div className="flex items-center gap-2 text-[12px] font-data-mono text-outline pl-3 border-l border-border dark:border-dark-border">
                        Expires in {qrCountdown}s
                      </div>
                    </div>
                  </div>
                ) : connectionMode === 'code' && pairingCode ? (
                   <div className="flex flex-col items-center justify-center h-full animate-in zoom-in duration-500 w-full">
                     <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-sm border border-border dark:border-dark-border text-center w-full">
                       <p className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline mb-4 uppercase tracking-wider">Your Pairing Code</p>
                       <div className="text-4xl font-data-mono tracking-[0.2em] font-bold text-on-surface dark:text-white select-all">
                          {pairingCode}
                       </div>
                       <p className="mt-6 font-body-sm text-on-surface-variant dark:text-outline max-w-xs mx-auto">
                         Enter this code when prompted in the WhatsApp app on your mobile device.
                       </p>
                     </div>
                   </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center opacity-60">
                    <div className="w-48 h-48 border-2 border-dashed border-border dark:border-dark-border rounded-2xl flex flex-col items-center justify-center gap-4 bg-surface-container-lowest dark:bg-black/20">
                       {whatsappStatus?.state === 'connecting' ? (
                         <>
                           <Loader2 strokeWidth={1.5} className="w-12 h-12 text-outline animate-spin" />
                           <span className="font-body-sm font-semibold text-outline">Connecting...</span>
                         </>
                       ) : (
                         <>
                           {connectionMode === 'qr' ? <QrCode strokeWidth={1.5} className="w-12 h-12 text-outline" /> : <Smartphone strokeWidth={1.5} className="w-12 h-12 text-outline" />}
                           <span className="font-body-sm font-semibold text-outline">Click 'Generate' to start</span>
                         </>
                       )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {isWhatsAppConnected && (
          <section className="bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-border dark:border-dark-border pb-2">
              <Send strokeWidth={1.5} className="w-5 h-5 text-on-surface-variant dark:text-outline" />
              <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white tracking-tight font-semibold">Send Test Message</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider">Recipient Number</label>
                  <div className="h-[44px] rounded-lg bg-white dark:bg-black/50 border border-border dark:border-dark-border focus-within:ring-1 focus-within:ring-[#25D366] focus-within:border-[#25D366]">
                    <PhoneInput 
                      value={testPhone} 
                      onChange={setTestPhone} 
                      countryCode={testCountryCode}
                      onCountryCodeChange={setTestCountryCode}
                      placeholder="234 567 8900"
                      className="w-full h-full !border-none !bg-transparent px-3 text-on-surface dark:text-white font-body-md" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider">Message Content</label>
                   <textarea
                     value={testMessage}
                     onChange={(e) => setTestMessage(e.target.value)}
                     className="w-full p-3 rounded-lg bg-white dark:bg-black/50 border border-border dark:border-dark-border focus:ring-1 focus:ring-[#25D366] focus:border-[#25D366] resize-none h-24 font-body-md text-on-surface dark:text-white outline-none"
                     placeholder="Type a test message..."
                   />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <div className="bg-surface-container-lowest dark:bg-black/20 rounded-xl p-6 border border-border dark:border-dark-border h-full flex flex-col justify-between">
                  <div className="font-body-sm text-on-surface-variant dark:text-outline mb-6">
                    Test your integration by sending a direct message to any valid WhatsApp number. Standard messaging rates may apply if using official WhatsApp Business APIs.
                  </div>
                  <button 
                    onClick={() => {
                      logToBackend('info', 'User sent a test message', { phone: `${testCountryCode}${testPhone}` });
                      testMutation.mutate({ phone: `${testCountryCode}${testPhone}`, message: testMessage }, {
                        onSuccess: () => {
                          toast.success('Test message sent successfully');
                          logToBackend('info', 'Test message sent successfully');
                        },
                        onError: (err: any) => {
                          toast.error(err?.message || 'Failed to send test message');
                          logToBackend('error', 'Failed to send test message', err);
                        }
                      });
                    }}
                    disabled={testMutation.isPending || !testPhone || !testMessage}
                    className="w-full h-[44px] bg-[#25D366] hover:bg-[#1DA851] disabled:opacity-50 text-white font-body-md font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    {testMutation.isPending ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <Send strokeWidth={1.5} className="w-5 h-5" />}
                    Dispatch Message
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Chatbot Configuration Section */}
        {isWhatsAppConnected && (
          <section className="pt-8 border-t border-border dark:border-dark-border">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white tracking-tight font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" /> Auto-Reply Chatbot
                </h3>
                <p className="font-body-sm text-on-surface-variant dark:text-outline mt-1">
                  Enable automated menu-driven responses for incoming customer messages.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={tenant?.chatbotEnabled || false}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    if (enabled) {
                      if (confirm('Are you sure you want to enable the Auto-Reply Chatbot? This will automatically reply to incoming WhatsApp messages with a predefined menu.')) {
                        updateTenantMutation.mutate({ chatbotEnabled: true });
                      }
                    } else {
                      updateTenantMutation.mutate({ chatbotEnabled: false });
                    }
                  }}
                />
                <div className="w-14 h-7 bg-surface-container-high dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-500"></div>
              </label>
            </div>

            {tenant?.chatbotEnabled && (
              <div className="bg-surface-bright dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-dark-border shadow-sm animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
                <div>
                  <h4 className="font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider mb-3">Predefined Menu Options</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 bg-surface-container-lowest dark:bg-black/20 p-3 rounded-lg border border-border dark:border-dark-border">
                      <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">1</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-on-surface dark:text-white">Check Queue Status</p>
                        <p className="text-xs text-on-surface-variant dark:text-zinc-500">Automatically replies with their live position and wait time.</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 rounded-md">Default</span>
                    </div>

                    <div className="flex items-center gap-4 bg-surface-container-lowest dark:bg-black/20 p-3 rounded-lg border border-border dark:border-dark-border">
                      <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">2</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-on-surface dark:text-white">Cancel Queue Entry</p>
                        <p className="text-xs text-on-surface-variant dark:text-zinc-500">Allows them to cancel their visit and frees up the spot.</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 rounded-md">Default</span>
                    </div>

                    <div className="flex items-center gap-4 bg-surface-container-lowest dark:bg-black/20 p-3 rounded-lg border border-border dark:border-dark-border">
                      <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">3</div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-on-surface dark:text-white">Request Human Assistance</p>
                        <p className="text-xs text-on-surface-variant dark:text-zinc-500">Pauses the bot and routes the chat to the manual admin dashboard.</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 rounded-md">Default</span>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-500 mt-4">
                    When a customer replies with "1", "2", or "3", the system will instantly process the action. More customization options coming soon.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {user?.role === 'SUPER_ADMIN' && (
        <section className="pt-4">
          <div className="bg-[#0D1117] rounded-2xl overflow-hidden border border-gray-800 shadow-sm">
            <div className="flex items-center gap-2 px-6 py-3 bg-[#161B22] border-b border-gray-800">
              <Terminal strokeWidth={1.5} className="w-4 h-4 text-gray-400" />
              <h3 className="font-label-caps text-label-caps font-bold text-gray-300 tracking-wide uppercase">System Logs Feed</h3>
              <div className="ml-auto flex gap-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                 <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
            </div>
            <div ref={logsContainerRef} className="p-4 h-64 overflow-y-auto font-data-mono text-[12px] text-[#7EE787] space-y-2">
              {logs?.length > 0 ? (
                logs.map((log: any, i: number) => (
                  <div key={i} className="flex gap-4 hover:bg-white/5 p-1 rounded transition-colors">
                    <span className="text-gray-500 whitespace-nowrap shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                    </span>
                    <span className="text-[#58A6FF] font-semibold w-24 shrink-0">
                      [{log.action}]
                    </span>
                    <span className="text-gray-300 break-all leading-relaxed">
                      {Object.keys(log.details || {}).length > 0 ? JSON.stringify(log.details) : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic flex items-center justify-center h-full">System idle. Awaiting connectivity events...</div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </section>
        )}
      </div>
    </div>
    </PremiumFeatureGate>
  );
}
