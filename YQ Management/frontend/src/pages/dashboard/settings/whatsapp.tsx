import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import useWhatsapp from '../../../hooks/useWhatsapp';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { Send, MessageSquare, QrCode, Loader2, AlertCircle, CheckCircle2, Phone, RefreshCw, Terminal, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import PhoneInput from '../../../components/PhoneInput';
import { toast } from 'sonner';

export default function WhatsAppSettingsPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrCodeType, setQrCodeType] = useState<'base64' | 'text' | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'qr' | 'code'>('qr');
  const [pairingPhoneNumber, setPairingPhoneNumber] = useState('');
  const [pairingCountryCode, setPairingCountryCode] = useState('+1');
  const [testPhone, setTestPhone] = useState('');
  const [testCountryCode, setTestCountryCode] = useState('+1');
  const [testMessage, setTestMessage] = useState('Test message from Qmova');
  
  const logToBackend = (level: string, message: string, data?: any) => {
    fetchApi('/whatsapp/frontend-log', {
      method: 'POST',
      body: JSON.stringify({ level, message, data })
    }).catch(() => {});
  };
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  const { statusQuery, logsQuery, cachedQrQuery, connectMutation, pairingCodeMutation, disconnectMutation, testMutation } = useWhatsapp();
  const whatsappStatus = statusQuery.data;
  const logs = logsQuery.data;
  const isWhatsAppConnected = whatsappStatus?.state === 'open';

  useEffect(() => {
    if (logs?.length) {
      console.log('[WhatsApp] Received new logs:', logs.length);
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      } else {
        console.log('[WhatsApp] Status is not open and no QR is present in status payload.');
      }
    }
  }, [whatsappStatus]);

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

  return (
    <SettingsLayout pageTitle="WhatsApp Settings" pageSubtitle="Connect your WhatsApp account for instant messaging">
      <Head>
        <title>WhatsApp Settings | Qmova</title>
      </Head>

      <div className="space-y-8 max-w-5xl mx-auto">
        <section className="relative overflow-hidden rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg">
          <div className="absolute top-0 right-0 p-32 bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 p-32 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl shadow-lg shadow-green-500/20 text-white">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Device Connectivity</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Manage your active WhatsApp connection</p>
              </div>
            </div>

            {isWhatsAppConnected ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 animate-ping rounded-full" />
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center relative shadow-xl shadow-green-500/30 border-4 border-white dark:border-zinc-900">
                    <CheckCircle2 className="w-12 h-12 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-2 tracking-tight">Connected & Active</h3>
                {whatsappStatus?.connectedNumber && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-sm font-semibold mb-8 border border-green-200 dark:border-green-800/50 shadow-inner">
                    <Phone className="w-4 h-4" />
                    +{whatsappStatus.connectedNumber}
                  </div>
                )}
                <p className="text-gray-500 dark:text-zinc-400 mb-8 max-w-md mx-auto text-center">
                  Your device is successfully paired. You can now send automated queue notifications and messages to your customers.
                </p>
                <button 
                  onClick={() => {
                    logToBackend('info', 'User requested to disconnect WhatsApp');
                    disconnectMutation.mutate();
                  }}
                  disabled={disconnectMutation.isPending}
                  className="px-8 py-3 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-2xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect Device'}
                </button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-12 items-start py-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Link Your Account</h3>
                    <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed">
                      Connect your business WhatsApp account to automate notifications. You can connect by scanning a QR code or using a pairing code directly on your phone.
                    </p>
                  </div>
                  
                  <div className="flex p-1 bg-gray-100/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-2xl">
                    <button 
                      onClick={() => setConnectionMode('qr')} 
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${connectionMode === 'qr' ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm scale-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-zinc-700/50 scale-95'}`}
                    >
                      <QrCode className="w-4 h-4" /> QR Code
                    </button>
                    <button 
                      onClick={() => setConnectionMode('code')} 
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${connectionMode === 'code' ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm scale-100' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-zinc-700/50 scale-95'}`}
                    >
                      <Smartphone className="w-4 h-4" /> Pairing Code
                    </button>
                  </div>

                  {connectionMode === 'code' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">WhatsApp Phone Number</label>
                        <div className="p-1 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
                          <PhoneInput 
                            value={pairingPhoneNumber}
                            onChange={setPairingPhoneNumber}
                            countryCode={pairingCountryCode}
                            onCountryCodeChange={setPairingCountryCode}
                            placeholder="234 567 8900"
                            className="w-full !border-none !shadow-none !bg-transparent"
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
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-2xl font-semibold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                      >
                        {pairingCodeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
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
                          className="w-full py-4 bg-[#25D366] hover:bg-[#1DA851] text-white font-semibold rounded-2xl transition-all shadow-lg shadow-[#25D366]/30 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 group"
                        >
                          <div className="flex items-center gap-2">
                            {connectMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                            <span className="text-lg">Generate QR Code</span>
                          </div>
                          <span className="text-xs text-white/80 font-normal">Click to fetch a new secure connection QR</span>
                        </button>
                     </div>
                  )}
                </div>

                <div className="flex items-center justify-center lg:justify-end h-full min-h-[300px]">
                  {connectionMode === 'qr' && qrCode ? (
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-500">
                      <div className="p-4 bg-white rounded-[2rem] shadow-2xl shadow-black/10 border border-gray-100 dark:border-zinc-800 transform hover:scale-105 transition-transform duration-500 group relative">
                        <div className="absolute inset-0 border-2 border-[#25D366] rounded-[2rem] opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 pointer-events-none" />
                        <div className="w-64 h-64 flex items-center justify-center">
                          {qrCodeType === 'base64' || qrCode.startsWith('data:image') ? (
                            <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain rounded-xl" />
                          ) : (
                            <QRCodeSVG value={qrCode} size={240} bgColor="#ffffff" fgColor="#000000" level="M" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-gray-200 dark:border-zinc-700">
                        <button
                          onClick={() => connectMutation.mutate(true)}
                          disabled={connectMutation.isPending}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors group"
                        >
                          <RefreshCw className={`w-4 h-4 ${connectMutation.isPending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                          {connectMutation.isPending ? 'Refreshing...' : 'Refresh QR'}
                        </button>
                        {cachedQrQuery?.data?.expiresAt && (
                          <div className="flex items-center gap-2 text-xs text-zinc-500 pl-3 border-l border-gray-200 dark:border-zinc-700">
                            Expires in {Math.max(0, Math.round((cachedQrQuery.data.expiresAt - Date.now())/1000))}s
                          </div>
                        )}
                      </div>
                    </div>
                  ) : connectionMode === 'code' && pairingCode ? (
                     <div className="flex flex-col items-center justify-center h-full animate-in zoom-in duration-500">
                       <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 text-center relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />
                         <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">Your Pairing Code</p>
                         <div className="text-5xl font-mono tracking-[0.2em] font-bold text-gray-900 dark:text-white select-all">
                            {pairingCode}
                         </div>
                         <p className="mt-6 text-sm text-gray-500 max-w-xs mx-auto">
                           Enter this code when prompted in the WhatsApp app on your mobile device.
                         </p>
                       </div>
                     </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                      <div className="w-48 h-48 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-3xl flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-zinc-800/50">
                         {connectionMode === 'qr' ? <QrCode className="w-12 h-12 text-gray-400" /> : <Smartphone className="w-12 h-12 text-gray-400" />}
                         <span className="text-sm font-medium text-gray-500">Awaiting Generation</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {isWhatsAppConnected && (
          <section className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-gray-200 dark:border-zinc-800 rounded-3xl p-8 shadow-lg animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Send Test Message</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recipient Number</label>
                  <div className="p-1 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                    <PhoneInput 
                      value={testPhone} 
                      onChange={setTestPhone} 
                      countryCode={testCountryCode}
                      onCountryCodeChange={setTestCountryCode}
                      placeholder="234 567 8900"
                      className="w-full !border-none !shadow-none !bg-transparent" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Message Content</label>
                   <textarea
                     value={testMessage}
                     onChange={(e) => setTestMessage(e.target.value)}
                     className="w-full p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-sm focus:ring-2 focus:ring-blue-500 resize-none h-24 text-sm text-gray-900 dark:text-white outline-none transition-shadow"
                     placeholder="Type a test message..."
                   />
                </div>
              </div>
              <div className="flex flex-col justify-end">
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 h-full flex flex-col justify-between">
                  <div className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
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
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-blue-500/20"
                  >
                    {testMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Dispatch Message
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="pt-4 animate-in fade-in duration-700 delay-300">
          <div className="bg-[#0D1117] rounded-3xl overflow-hidden border border-gray-800 shadow-2xl">
            <div className="flex items-center gap-2 px-6 py-4 bg-[#161B22] border-b border-gray-800">
              <Terminal className="w-5 h-5 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-300 tracking-wide uppercase">System Logs Feed</h3>
              <div className="ml-auto flex gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-500/80" />
                 <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                 <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
            </div>
            <div className="p-6 h-72 overflow-y-auto font-mono text-xs md:text-sm text-[#7EE787] space-y-3 custom-scrollbar">
              {logs?.length > 0 ? (
                logs.map((log: any, i: number) => (
                  <div key={i} className="flex gap-4 group hover:bg-white/5 p-1 rounded-md transition-colors">
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
                <div className="text-gray-600 italic flex items-center justify-center h-full">System idle. Awaiting connectivity events...</div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </section>
      </div>
    </SettingsLayout>
  );
}
