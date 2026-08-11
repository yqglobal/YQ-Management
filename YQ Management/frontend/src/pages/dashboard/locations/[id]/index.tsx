import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/AdminLayout';
import { ArrowLeft, ExternalLink, Scan, Settings, QrCode, RefreshCw, AlertTriangle, Keyboard } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { useAuth } from '../../../../components/AuthContext';
import { useQueueSocket } from '../../../../hooks/useQueueSocket';
import { toast } from 'sonner';
import { QueueHeader } from '../../../../components/queue/QueueHeader';
import { QueueControls } from '../../../../components/queue/QueueControls';
import { TokenList } from '../../../../components/queue/TokenList';
import { SettingsPanel } from '../../../../components/queue/SettingsPanel';
import { SharePanel } from '../../../../components/queue/SharePanel';
import { ErrorBoundary } from '../../../../components/ErrorBoundary';
// import { ChatDrawer } from '../../../../components/queue/ChatDrawer';

export default function QueueWorkspace() {
  const router = useRouter();
  const { user } = useAuth();
  const { id } = router.query;
  const activeTab = (router.query.tab as 'workspace' | 'settings' | 'share') || 'workspace';
  const setActiveTab = (tab: 'workspace' | 'settings' | 'share') => {
    router.push({ query: { ...router.query, tab } }, undefined, { shallow: true });
  };

  // Chat State (disabled - ChatDrawer commented out)
  // const [chatToken, setChatToken] = useState<any>(null);
  // const [chatMessage, setChatMessage] = useState('');

  // Settings Form Builder State
  const [formConfig, setFormConfig] = useState<any[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [queueName, setQueueName] = useState('');
  const [nextQueueId, setNextQueueId] = useState<string>('');
  const [allowAppointments, setAllowAppointments] = useState(false);
  const [requireManualCheckIn, setRequireManualCheckIn] = useState(false);
  const [appointmentGranularityMins, setAppointmentGranularityMins] = useState(15);
  const [showName, setShowName] = useState(true);
  const [showTokenNumber, setShowTokenNumber] = useState(true);
  const [generationMode, setGenerationMode] = useState<'sequential' | 'random'>('random');
  const [tokenFormat, setTokenFormat] = useState<'alphanumeric' | 'numeric'>('alphanumeric');
  const [tokenPrefix, setTokenPrefix] = useState('CC');
  const [ttsTemplate, setTtsTemplate] = useState('');

  const { data: allQueues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue'),
  });

  const queryClient = useQueryClient();

  const { data: queue = null, refetch: refetchQueue, isLoading: isQueueLoading, error: queueError } = useQuery({
    queryKey: ['queue', id],
    queryFn: async () => {
      const q = await fetchApi(`/queue/${id}`);
      if (q) {
        setQueueName(q.name);
        setNextQueueId(q.nextQueueId || '');
        setAllowAppointments(q.allowAppointments || false);
        setRequireManualCheckIn(q.requireManualCheckIn || false);
        setAppointmentGranularityMins(q.appointmentGranularityMins || 15);
         setFormConfig(q.formConfig || [
          { id: 'name', type: 'text', label: 'Full Name', required: true, system: true },
          { id: 'phone', type: 'phone', label: 'WhatsApp Number', required: true, system: true },
        ]);
        const dc = q.tokenDisplayConfig || {};
        setShowName(dc.showName !== false);
        setShowTokenNumber(dc.showTokenNumber !== false);
        setGenerationMode(dc.generationMode || 'random');
        setTokenFormat(dc.format || 'alphanumeric');
        setTokenPrefix(dc.prefix || 'CC');
        setTtsTemplate(dc.ttsTemplate || '');
       }
       return q;
     },
    enabled: !!id,
  });

  const { data: tokens = [], refetch, isLoading: isTokensLoading, error: tokensError } = useQuery({
    queryKey: ['queueTokens', id],
    queryFn: () => fetchApi(`/queue/${id}/tokens`),
    enabled: !!id,
  });

  const { joinRoom } = useQueueSocket({
    queueId: id as string,
    onTokenJoined: () => refetch(),
    onTokenServing: () => refetch(),
    onTokenCompleted: () => refetch(),
    onTokenMissed: () => refetch(),
    onNewMessage: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  useEffect(() => {
    if (id) joinRoom(id as string);
  }, [id, joinRoom]);

  const servingToken = tokens.find((t: any) => t.status === 'SERVING');

  const isOffline = !navigator.onLine;

  const handleRetry = useCallback(() => {
    refetch();
    refetchQueue();
  }, [refetch, refetchQueue]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const nextBtn = document.querySelector('[data-shortcut="next"]') as HTMLElement;
        nextBtn?.click();
      }
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const skipBtn = document.querySelector('[data-shortcut="skip"]') as HTMLElement;
        skipBtn?.click();
      }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleRetry();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRetry]);

  const isLoading = isQueueLoading || isTokensLoading;
  const hasError = queueError || tokensError;

  return (
    <ErrorBoundary>
      <AdminLayout pageTitle={queue?.name || 'Queue'} pageSubtitle="Queue workspace">
        <Head>
          <title>Manage {queueName || 'Queue'} | Qmova</title>
        </Head>

        {isOffline && (
          <div className="max-w-6xl mx-auto mb-4 px-4 sm:px-6 lg:px-8">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl flex items-center gap-3 text-yellow-700 dark:text-yellow-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>You are offline. Some features may not work.</span>
            <button onClick={handleRetry} className="ml-auto px-3 py-1 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg text-xs font-medium hover:bg-yellow-200 dark:hover:bg-yellow-500/30 transition-colors">
              Retry
            </button>
            </div>
          </div>
        )}

        {hasError && !isLoading && (
          <div className="max-w-6xl mx-auto mb-4 px-4 sm:px-6 lg:px-8">
            <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Failed to load queue data</h3>
            <p className="text-sm text-red-500 dark:text-red-400 mb-4">Please check your connection and try again.</p>
            <button onClick={handleRetry} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mx-auto">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-8 pb-12 p-4 sm:p-6 lg:p-8">
          <QueueHeader
            queueName={queueName}
            queueId={id as string}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isAdmin={user?.role === 'TENANT_ADMIN'}
          />

          {isLoading && !hasError ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="h-20 bg-gray-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
              <div className="h-48 bg-gray-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
              <div className="h-64 bg-gray-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
            </div>
          ) : activeTab === 'workspace' ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              <p className="text-zinc-400 text-sm">Ready to serve visitors</p>
              <QueueControls queueId={id as string} servingToken={servingToken} />
              <TokenList
                tokens={tokens}
                queueId={id as string}
                nextQueueId={queue?.nextQueueId}
              />
            </div>
          ) : activeTab === 'share' ? (
            <SharePanel queueId={id as string} />
          ) : (
             <SettingsPanel
               queueId={id as string}
               queueName={queueName}
               formConfig={formConfig}
               setQueueName={setQueueName}
               setFormConfig={setFormConfig}
               allQueues={allQueues}
               nextQueueId={nextQueueId}
               setNextQueueId={setNextQueueId}
               allowAppointments={allowAppointments}
               setAllowAppointments={setAllowAppointments}
               requireManualCheckIn={requireManualCheckIn}
               setRequireManualCheckIn={setRequireManualCheckIn}
               appointmentGranularityMins={appointmentGranularityMins}
               setAppointmentGranularityMins={setAppointmentGranularityMins}
               showName={showName}
               setShowName={setShowName}
               showTokenNumber={showTokenNumber}
               setShowTokenNumber={setShowTokenNumber}
               generationMode={generationMode}
               setGenerationMode={setGenerationMode}
               tokenFormat={tokenFormat}
               setTokenFormat={setTokenFormat}
               tokenPrefix={tokenPrefix}
               setTokenPrefix={setTokenPrefix}
               ttsTemplate={ttsTemplate}
               setTtsTemplate={setTtsTemplate}
             />
          )}
        </div>

        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          <Keyboard className="w-3 h-3" />
          <span>N = Next</span>
          <span className="mx-1">·</span>
          <span>S = Skip</span>
          <span className="mx-1">·</span>
          <span>R = Refresh</span>
        </div>
      </AdminLayout>
    </ErrorBoundary>
  );
}