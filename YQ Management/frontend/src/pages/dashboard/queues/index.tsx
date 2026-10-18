import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Head from 'next/head';
import AdminLayout from '../../../components/AdminLayout';
import { Plus, X, Loader2, ListOrdered, Settings2, PlayCircle, PauseCircle, CheckCircle2, Printer } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/router';
import { usePlan } from '../../../hooks/usePlan';
import { QuotaExhaustedModal } from '../../../components/QuotaExhaustedModal';
import Link from 'next/link';
import { ServiceModal } from '../../../components/modals/ServiceModal';
import PrintQRModal from '../../../components/PrintQRModal';
import { useLocation } from '../../../components/LocationContext';
import { useAuth } from '../../../components/AuthContext';
import { QuotaFreezeGuard } from '../../../components/QuotaFreezeGuard';
import { QuotaWarningBanner } from '../../../components/QuotaWarningBanner';

export default function QueuesList() {
  const router = useRouter();
  const { activeLocationId } = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [isPrintQRModalOpen, setIsPrintQRModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const plan = usePlan();

  const locParamPrefix = activeLocationId && activeLocationId !== 'all' ? `?locationId=${activeLocationId}` : '';

  const { user } = useAuth();
  const { data: queues = [], isLoading } = useQuery({
    queryKey: ['queues', activeLocationId],
    queryFn: () => fetchApi(`/queue${locParamPrefix}`),
  });

  const filteredQueues = React.useMemo(() => {
    let q = queues;
    if (user && user.role === 'MANAGER') {
      if (user.allowedServiceIds && user.allowedServiceIds.length > 0) {
        q = q.filter((queue: AnyFixMe) => {
          if (queue.services && queue.services.length > 0) {
            return queue.services.some((svc: AnyFixMe) => user.allowedServiceIds!.includes(svc.id));
          }
          return false;
        });
      }
    }
    return q;
  }, [queues, user]);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
  });



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-500/20">
            <PlayCircle strokeWidth={1.5} className="w-3 h-3" /> Active
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-500/20">
            <PauseCircle strokeWidth={1.5} className="w-3 h-3" /> Paused
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-zinc-300 text-xs font-bold uppercase tracking-wider border border-border dark:border-white/10">
            <CheckCircle2 strokeWidth={1.5} className="w-3 h-3" /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container dark:bg-white/10 text-on-surface-variant text-xs font-bold uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  return (
    <AdminLayout pageTitle="Queues">
      <Head>
        <title>Queues | Qmova</title>
      </Head>

      <div className="w-full mx-auto space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-white tracking-tight">Queues</h1>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-0.5">Manage your virtual and physical queues</p>
          </div>
                    <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrintQRModalOpen(true)}
              disabled={isLoading || filteredQueues.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-low dark:bg-white/5 border border-border dark:border-dark-border hover:bg-surface-container dark:hover:bg-white/10 text-on-surface dark:text-white rounded-xl font-medium transition-colors text-sm disabled:opacity-50"
            >
              <Printer strokeWidth={1.5} className="w-4 h-4" />
              Print QR
            </button>
          </div>
        </div>

        <QuotaWarningBanner 
          resourceType="queues" 
          frozenCount={plan.frozenCounts.queues} 
          limit={plan.limits.maxQueues || plan.limits.maxServices} 
        />

        {/* List */}
        <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
          {isLoading && (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-surface-container-low dark:bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && filteredQueues.length === 0 && (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-surface-container-low dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <ListOrdered strokeWidth={1.5} className="w-8 h-8 text-on-surface-variant opacity-50" />
              </div>
              <p className="text-lg font-semibold text-on-surface dark:text-white mb-1">No queues yet</p>
              
              {locations.length === 0 || services.length === 0 ? (
                <>
                  <p className="text-sm text-on-surface-variant dark:text-zinc-400 max-w-sm mb-6">
                    Before you can create a queue, you need to set up at least one {locations.length === 0 ? 'location' : 'service'}.
                  </p>
                  <Link
                    href="/dashboard/settings/operations"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-container transition-colors"
                  >
                    <Settings2 strokeWidth={1.5} className="w-4 h-4" /> Go to Operations
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-on-surface-variant dark:text-zinc-400 max-w-sm">
                    No queues have been auto-generated yet. Create a service to automatically generate a queue.
                  </p>
                </>
              )}
            </div>
          )}

          {!isLoading && filteredQueues.length > 0 && (
            <div className="grid grid-cols-1 divide-y divide-border dark:divide-dark-border">
              {filteredQueues.map((queue: AnyFixMe, i: number) => (
                <QuotaFreezeGuard key={queue.id} isFrozen={queue.frozenByQuota} resourceName="queue">
                  <div
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low dark:hover:bg-white/[0.02] transition-colors"
                  >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                      <ListOrdered strokeWidth={1.5} className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-semibold text-on-surface dark:text-white">{queue.name}</h3>
                        {getStatusBadge(queue.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-on-surface-variant dark:text-zinc-400">
                        <span>{queue.services?.length || 0} linked service{(queue.services?.length || 0) !== 1 ? 's' : ''}</span>
                        {queue.location?.name && <span>· {queue.location.name}</span>}
                        {queue._count && typeof queue._count.tokens === 'number' && (
                          <span className="font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                            {queue._count.tokens} active tokens
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => router.push(`/dashboard/queues/${queue.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-surface-container-low dark:bg-white/5 border border-border dark:border-dark-border hover:bg-surface-container dark:hover:bg-white/10 text-on-surface dark:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Settings2 strokeWidth={1.5} className="w-4 h-4" />
                      Manage
                    </button>
                  </div>
                </div>
                </QuotaFreezeGuard>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Queue Modal Removed */}


      {showQuotaModal && (
        <QuotaExhaustedModal
          type="queues"
          isOpen={showQuotaModal}
          onClose={() => setShowQuotaModal(false)}
          usage={plan.usage.queues}
          limit={plan.limits.maxQueues || plan.limits.maxServices}
          planName={plan.planName}
        />
      )}

      <ServiceModal 
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
      />
      <PrintQRModal 
        open={isPrintQRModalOpen} 
        onClose={() => setIsPrintQRModalOpen(false)} 
        queues={queues} 
      />
    </AdminLayout>
  );
}
