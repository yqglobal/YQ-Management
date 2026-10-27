import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import {
  Plus,
  Copy,
  Edit2,
  Trash2,
  Workflow,
  AlertCircle,
  Link2,
  Loader2,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { CreateJourneyModal } from '../../../components/modals/CreateJourneyModal';
import { ConfirmModal } from '../../../components/modals/ConfirmModal';

export default function JourneysIndex() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteFlowId, setDeleteFlowId] = useState<string | null>(null);
  const [duplicateFlowId, setDuplicateFlowId] = useState<string | null>(null);

  const { data: flows = [], isLoading: flowsLoading } = useQuery({
    queryKey: ['service-flows'],
    queryFn: () => fetchApi('/service-flows'),
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
  });

  const isLoading = flowsLoading || servicesLoading;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/service-flows/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Journey deleted');
      queryClient.invalidateQueries({ queryKey: ['service-flows'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/service-flows/${id}/duplicate`, { method: 'POST' }),
    onSuccess: (data) => {
      toast.success('Journey duplicated');
      queryClient.invalidateQueries({ queryKey: ['service-flows'] });
      router.push(`/dashboard/journeys/${data.id}`);
    },
  });

  const getServiceForFlow = (serviceId: string) =>
    (services as any[]).find((s: any) => s.id === serviceId);

  // Services with no flow — useful for the empty state CTA
  const linkedServiceIds = new Set<string>((flows as any[]).map((f: any) => f.serviceId).filter(Boolean));
  const unlinkedServicesCount = (services as any[]).filter((s: any) => !linkedServiceIds.has(s.id)).length;

  const linkedFlows = (flows as any[]).filter((f: any) => f.serviceId);
  const orphanFlows = (flows as any[]).filter((f: any) => !f.serviceId);

  return (
    <AdminLayout pageTitle="Journey Builder" pageSubtitle="Design multi-step service execution flows">
      <Head>
        <title>Journeys | Qmova</title>
      </Head>

      <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* ─── Page header ─── */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-white flex items-center gap-2.5">
              <Workflow className="w-6 h-6 text-indigo-500" />
              Service Journeys
            </h1>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
              Each service can have one journey — a step-by-step process for your customers.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            disabled={unlinkedServicesCount === 0 && !isLoading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-semibold transition-colors shadow-sm text-sm"
            title={unlinkedServicesCount === 0 ? 'All services already have a journey' : 'Create a new journey'}
          >
            <Plus className="w-4 h-4" />
            New Journey
          </button>
        </div>

        {/* ─── Loading ─── */}
        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (flows as any[]).length === 0 ? (
          /* ─── Empty state ─── */
          <div className="text-center py-20 bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-5">
              <Workflow className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold text-on-surface dark:text-white mb-2">No Journeys Yet</h3>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mb-6 max-w-sm mx-auto leading-relaxed">
              A journey defines the stages a customer moves through — from check-in to checkout. Each service can have one journey.
            </p>
            {(services as any[]).length === 0 ? (
              <button
                onClick={() => router.push('/dashboard/services')}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                Create a Service first <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                Build Your First Journey <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* ─── Linked journeys ─── */}
            {linkedFlows.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5" />
                  Active Journeys ({linkedFlows.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {linkedFlows.map((flow: any) => {
                    const service = getServiceForFlow(flow.serviceId);
                    const customStepCount = (flow.steps || []).filter((s: any) => !s.isSystem).length;
                    return (
                      <JourneyCard
                        key={flow.id}
                        flow={flow}
                        service={service}
                        customStepCount={customStepCount}
                        onEdit={() => router.push(`/dashboard/journeys/${flow.id}`)}
                        onDuplicate={() => setDuplicateFlowId(flow.id)}
                        onDelete={() => setDeleteFlowId(flow.id)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* ─── Orphaned / draft journeys ─── */}
            {orphanFlows.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unlinked Drafts ({orphanFlows.length})
                </h2>
                <p className="text-xs text-on-surface-variant dark:text-zinc-500 mb-4">
                  These journeys are not linked to any service and won't be triggered for customers.
                  Open them and use the Settings button to link to a service.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {orphanFlows.map((flow: any) => {
                    const customStepCount = (flow.steps || []).filter((s: any) => !s.isSystem).length;
                    return (
                      <JourneyCard
                        key={flow.id}
                        flow={flow}
                        service={null}
                        customStepCount={customStepCount}
                        onEdit={() => router.push(`/dashboard/journeys/${flow.id}`)}
                        onDuplicate={() => setDuplicateFlowId(flow.id)}
                        onDelete={() => setDeleteFlowId(flow.id)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* ─── Services without journeys ─── */}
            {unlinkedServicesCount > 0 && (
              <section>
                <h2 className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" />
                  Services Without a Journey ({unlinkedServicesCount})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(services as any[])
                    .filter((s: any) => !linkedServiceIds.has(s.id))
                    .map((svc: any) => (
                      <button
                        key={svc.id}
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-3 p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-left hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                          <Plus className="w-4 h-4 text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-on-surface dark:text-white truncate">{svc.name}</div>
                          <div className="text-xs text-zinc-400 mt-0.5">Add journey →</div>
                        </div>
                      </button>
                    ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <CreateJourneyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <ConfirmModal
        isOpen={!!deleteFlowId}
        onClose={() => setDeleteFlowId(null)}
        onConfirm={async () => {
          if (!deleteFlowId) return;
          await deleteMutation.mutateAsync(deleteFlowId);
          setDeleteFlowId(null);
        }}
        title="Delete Journey"
        description="Are you sure you want to delete this customer journey? This action cannot be undone."
        confirmText="Delete Journey"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!duplicateFlowId}
        onClose={() => setDuplicateFlowId(null)}
        onConfirm={async () => {
          if (!duplicateFlowId) return;
          await duplicateMutation.mutateAsync(duplicateFlowId);
          setDuplicateFlowId(null);
        }}
        title="Duplicate Journey"
        description="Create a clone of this journey with all its steps and configuration?"
        confirmText="Duplicate"
        variant="primary"
        isLoading={duplicateMutation.isPending}
      />
    </AdminLayout>
  );
}

// ─── Journey Card ────────────────────────────────────────────────────────────

function JourneyCard({
  flow,
  service,
  customStepCount,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  flow: any;
  service: any;
  customStepCount: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const isDraft = !service;

  return (
    <div
      className={`group relative flex flex-col bg-card dark:bg-dark-card border rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all ${
        isDraft
          ? 'border-amber-200 dark:border-amber-900/40'
          : 'border-border dark:border-dark-border hover:border-indigo-300 dark:hover:border-indigo-800'
      }`}
      onClick={onEdit}
    >
      {/* Draft badge */}
      {isDraft && (
        <div className="absolute top-0 right-0 bg-amber-50 dark:bg-amber-900/30 border-l border-b border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-bl-xl rounded-tr-2xl flex items-center gap-1">
          <AlertCircle className="w-2.5 h-2.5" />
          Unlinked
        </div>
      )}

      <div className="p-5 flex-1">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isDraft ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-indigo-50 dark:bg-indigo-900/30'
          }`}>
            <Workflow className={`w-4.5 h-4.5 w-[18px] h-[18px] ${
              isDraft ? 'text-zinc-400' : 'text-indigo-600 dark:text-indigo-400'
            }`} />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <h3 className="font-bold text-on-surface dark:text-white text-base truncate leading-tight">{flow.name}</h3>
            {flow.description && (
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 line-clamp-1 mt-0.5">{flow.description}</p>
            )}
          </div>
        </div>

        {/* Service badge */}
        {service ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3">
            <Link2 className="w-3 h-3" />
            {service.name}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-3">
            <AlertCircle className="w-3 h-3" />
            No service linked
          </div>
        )}

        {/* Step count */}
        <div className="flex items-center gap-4 text-xs text-on-surface-variant dark:text-zinc-400">
          <span>
            <span className="font-bold text-on-surface dark:text-white">{customStepCount}</span>{' '}
            custom stage{customStepCount !== 1 ? 's' : ''}
          </span>
          <span>
            <span className="font-bold text-on-surface dark:text-white">{(flow.steps || []).length}</span>{' '}
            total
          </span>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border dark:border-dark-border/50 bg-zinc-50/50 dark:bg-zinc-800/20">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Open Editor
        </button>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onDuplicate}
            className="p-1.5 text-zinc-400 hover:text-on-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
