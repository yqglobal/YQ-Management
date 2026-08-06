import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { MessageSquare, QrCode, Smartphone, Loader2, Send, Save, AlertCircle, CheckCircle2, Phone, RefreshCw, Terminal } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import PhoneInput from '../../../components/PhoneInput';
export default function WhatsAppSettingsPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeType, setQrCodeType] = useState<'base64' | 'text' | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'qr' | 'code'>('qr');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingPhoneNumber, setPairingPhoneNumber] = useState('');
  const [pairingCountryCode, setPairingCountryCode] = useState('+1');
  const [generatingPairingCode, setGeneratingPairingCode] = useState(false);

  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testCountryCode, setTestCountryCode] = useState('+1');
  const [testMessage, setTestMessage] = useState('Test message from Qmova');
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, string>>({});
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logsEndRef.current]);

  useEffect(() => {
    const saved = localStorage.getItem('templateDrafts');
    if (saved) {
      try { setTemplateDrafts(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('templateDrafts', JSON.stringify(templateDrafts));
  }, [templateDrafts]);

  const { data: whatsappStatus, refetch: refetchWhatsAppStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => fetchApi('/whatsapp/status'),
    refetchInterval: (data: any) => {
      if (qrCode || pairingCode || data?.state === 'connecting') return 1500;
      return 30000; // Poll every 30s to detect background disconnects
    },
  });

  const isWhatsAppConnected = whatsappStatus?.state === 'open';

  const { data: logs, refetch: refetchLogs } = useQuery({
    queryKey: ['whatsapp-logs'],
    queryFn: () => fetchApi('/whatsapp/logs'),
    refetchInterval: 2500,
  });

  useEffect(() => {
    if (logs?.length) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const { data: waTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: () => fetchApi('/communication/templates/whatsapp'),
    enabled: isWhatsAppConnected,
  });

  useEffect(() => {
    if (whatsappStatus?.state === 'open') {
      setQrCode(null);
      setQrCodeType(null);
      setPairingCode(null);
      setPairingPhoneNumber('');
      setInstanceName(whatsappStatus.instanceName);
    } else if (whatsappStatus) {
      if (whatsappStatus.instanceName) {
        setInstanceName(prev => prev || whatsappStatus.instanceName || null);
      }
      if (whatsappStatus.qr) {
        setQrCode(whatsappStatus.qr);
        setQrCodeType(whatsappStatus.qrType || (whatsappStatus.qr.startsWith('data:image') ? 'base64' : 'text'));
      }
    }
  }, [whatsappStatus]);

  const connectWhatsAppMutation = useMutation({
    mutationFn: async () => {
      // Check current status first to avoid creating duplicate instances
      const status = await fetchApi('/whatsapp/status');
      if (status?.state === 'open') return status;
      if (status?.state === 'connecting' && status.qr) return status;
      // otherwise trigger connect which will create or refresh QR
      return fetchApi('/whatsapp/connect', { method: 'POST' });
    },
    onMutate: () => { setQrCode(null); setQrCodeType(null); },
    onSuccess: (res) => {
      if (res.qr) {
        setQrCode(res.qr);
        setQrCodeType(res.qrType || (res.qr.startsWith('data:image') ? 'base64' : 'text'));
        toast.success('QR Code ready! Please scan using WhatsApp.');
      } else if (res.state === 'open') {
        toast.success('WhatsApp is connected!');
      } else {
        toast.info('Connecting to WhatsApp instance...');
      }
      refetchWhatsAppStatus();
    },
    onError: (err: any) => {
      toast.error(err.details?.message || err.message || 'Failed to initialize WhatsApp connection. Please check Evolution API.');
    },
  });

  const generatePairingCodeMutation = useMutation({
    mutationFn: (phoneNumber: string) => fetchApi('/whatsapp/pairing-code', { 
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    }),
    onMutate: () => setPairingCode(null),
    onSuccess: (res) => {
      if (res.pairingCode) setPairingCode(res.pairingCode);
      refetchWhatsAppStatus();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to generate pairing code');
    }
  });

  const disconnectWhatsAppMutation = useMutation({
    mutationFn: () => fetchApi('/whatsapp/disconnect', { method: 'POST' }),
    onSuccess: () => {
      setQrCode(null);
      setInstanceName(null);
      setPairingCode(null);
      refetchWhatsAppStatus();
      toast.success('WhatsApp disconnected successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to disconnect WhatsApp');
    },
  });

  const testWhatsAppMutation = useMutation({
    mutationFn: (data: { phone: string, message: string }) => fetchApi('/whatsapp/test', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => toast.success('Test message sent successfully!'),
    onError: (err: any) => toast.error(err.message || 'Failed to send test message')
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (data: { id: string, content: string }) => fetchApi(`/communication/templates/whatsapp/${data.id}`, {
      method: 'PUT',
      body: JSON.stringify({ content: data.content })
    }),
    onSuccess: () => {
      toast.success('Template saved successfully');
      refetchTemplates();
      setSavingTemplate(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save template');
      setSavingTemplate(null);
    }
  });

  return (
    <SettingsLayout pageTitle="WhatsApp Settings" pageSubtitle="Connect your WhatsApp account to send queue notifications">
      <Head>
        <title>WhatsApp Settings | Qmova</title>
      </Head>

      <div className="space-y-8 max-w-4xl">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">WhatsApp Integration</h2>
          </div>

          <div className="grid gap-6 p-6 border border-gray-200 dark:border-zinc-800 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/20">
            {isWhatsAppConnected ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-50 dark:border-green-900/10">
                  <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">WhatsApp is Connected</h3>
                {whatsappStatus?.connectedNumber && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium mb-6">
                    <Phone className="w-4 h-4" />
                    +{whatsappStatus.connectedNumber}
                  </div>
                )}
                <p className="text-gray-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
                  Your device is successfully paired. You can now send automated queue notifications to your customers.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={() => disconnectWhatsAppMutation.mutate()}
                    disabled={disconnectWhatsAppMutation.isPending}
                    className="px-6 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl font-medium transition-colors"
                  >
                    Disconnect Device
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-zinc-400 mb-6">
                  Connect your business WhatsApp account to automatically notify customers about their queue status.
                </p>
                
                {!qrCode && !pairingCode ? (
                  <div className="flex justify-center">
                    {connectWhatsAppMutation.isPending ? (
                      <div className="flex flex-col items-center p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                        <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Connecting...</h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 text-center max-w-xs">
                          Requesting QR code from WhatsApp servers.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <button
                          onClick={() => connectWhatsAppMutation.mutate()}
                          disabled={connectWhatsAppMutation.isPending}
                          className="px-6 py-3 bg-[#25D366] hover:bg-[#1DA851] text-white font-medium rounded-xl transition-all shadow-sm flex items-center gap-2"
                        >
                          {connectWhatsAppMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                          Connect WhatsApp
                        </button>
                        {whatsappStatus?.state === 'connecting' && (
                          <p className="text-xs text-amber-500 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Instance is connecting – click above to get a fresh QR
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    {connectionMode === 'qr' && qrCode && (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-64 h-64 bg-white border-4 border-gray-200 dark:border-zinc-700 flex items-center justify-center rounded-xl p-3">
                          {/* If QR is a raw text string (e.g. "2@abc123..."), render with QRCodeSVG */}
                          {/* If it's already a base64 image, render with <img> */}
                          {qrCodeType === 'base64' || qrCode.startsWith('data:image') ? (
                            <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                          ) : (
                            <QRCodeSVG value={qrCode} size={220} bgColor="#ffffff" fgColor="#000000" level="M" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-500 text-center">
                          Open WhatsApp → Settings → Linked Devices → Link a Device
                        </p>
                        <button
                          onClick={() => connectWhatsAppMutation.mutate()}
                          disabled={connectWhatsAppMutation.isPending}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all text-sm flex items-center gap-2"
                        >
                          {connectWhatsAppMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          {connectWhatsAppMutation.isPending ? 'Refreshing...' : 'Refresh QR'}
                        </button>
                      </div>
                    )}
                    {connectionMode === 'code' && (
                      <div className="w-full max-w-sm flex flex-col items-center">
                        {pairingCode ? (
                          <div className="text-4xl font-mono tracking-widest font-bold text-gray-900 dark:text-white mb-6 bg-gray-100 dark:bg-zinc-800 py-4 px-8 rounded-2xl">
                             {pairingCode}
                          </div>
                        ) : (
                          <div className="w-full flex flex-col gap-3 mb-6">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter WhatsApp Phone Number</label>
                            <PhoneInput 
                              value={pairingPhoneNumber}
                              onChange={setPairingPhoneNumber}
                              countryCode={pairingCountryCode}
                              onCountryCodeChange={setPairingCountryCode}
                              placeholder="234 567 8900"
                              className="w-full"
                            />
                            <button 
                              onClick={() => generatePairingCodeMutation.mutate(`${pairingCountryCode}${pairingPhoneNumber}`)}
                              disabled={generatePairingCodeMutation.isPending || !pairingPhoneNumber}
                              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              {generatePairingCodeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                              Get Pairing Code
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-gray-500 mt-4 text-center max-w-sm">
                      {connectionMode === 'qr' ? 'Open WhatsApp on your phone, go to Linked Devices, and scan this QR code.' : 'Open WhatsApp on your phone, you will receive a notification to enter this code.'}
                    </p>
                    <div className="mt-6 flex gap-4">
                       <button onClick={() => setConnectionMode('qr')} className={`px-4 py-2 rounded-lg text-sm font-medium ${connectionMode === 'qr' ? 'bg-gray-200 text-gray-900' : 'text-gray-500'}`}>Use QR</button>
                       <button onClick={() => setConnectionMode('code')} className={`px-4 py-2 rounded-lg text-sm font-medium ${connectionMode === 'code' ? 'bg-gray-200 text-gray-900' : 'text-gray-500'}`}>Use Pairing Code</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
        
        {isWhatsAppConnected && (
          <section className="pt-8 border-t border-gray-200 dark:border-zinc-800">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Send a Test Message</h3>
            <div className="flex gap-4 items-start">
               <PhoneInput 
                 value={testPhone} 
                 onChange={setTestPhone} 
                 countryCode={testCountryCode}
                 onCountryCodeChange={setTestCountryCode}
                 placeholder="234 567 8900"
                 className="flex-1" 
               />
               <button 
                  onClick={() => testWhatsAppMutation.mutate({ phone: `${testCountryCode}${testPhone}`, message: testMessage })}
                  disabled={testWhatsAppMutation.isPending || !testPhone}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center gap-2"
               >
                 {testWhatsAppMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                 Send
               </button>
            </div>
          </section>
        )}

        <section className="pt-8 border-t border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">System Logs</h3>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 h-64 overflow-y-auto font-mono text-sm text-green-400 space-y-2 border border-gray-800">
            {logs?.length > 0 ? (
              logs.map((log: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <span className="text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-blue-400 font-semibold w-48 shrink-0">
                    [{log.action}]
                  </span>
                  <span className="text-gray-300 break-all">
                    {Object.keys(log.details || {}).length > 0 ? JSON.stringify(log.details) : ''}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic">No logs available. Connect WhatsApp or send a message to generate logs.</div>
            )}
            <div ref={logsEndRef} />
          </div>
        </section>
      </div>
    </SettingsLayout>
  );
}
