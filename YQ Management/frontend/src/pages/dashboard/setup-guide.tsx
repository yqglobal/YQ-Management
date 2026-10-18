import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../components/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronRight,
  Rocket,
  MapPin,
  Layers,
  Users,
  QrCode,
  Zap,
  ArrowRight,
  Workflow,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { getTenantUrl } from '../../lib/utils';

// ── Setup Step Definition ────────────────────────────────────────────────────

interface SetupStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  action?: string;
  modes?: ('QUEUE_ONLY' | 'APPOINTMENTS' | 'JOURNEY')[];
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: 'location',
    icon: <MapPin className="w-5 h-5" />,
    title: 'Create your first location',
    description:
      'A location is a physical site (branch, clinic, store). All queues and services live under a location.',
    href: '/dashboard/settings/operations?tab=locations',
    action: 'Add Location',
  },
  {
    id: 'service',
    icon: <Layers className="w-5 h-5" />,
    title: 'Set up your services',
    description:
      'Services define what customers come in for (e.g. "General Consultation", "Pharmacy Pickup"). Each service can have its own hours, staff, and queue.',
    href: '/dashboard/settings/operations?tab=services',
    action: 'Add Service',
    modes: ['QUEUE_ONLY', 'APPOINTMENTS'],
  },
  {
    id: 'flows',
    icon: <Workflow className="w-5 h-5" />,
    title: 'Configure your workflows',
    description:
      'Set up custom workflows, queues, and service templates to perfectly match your business operations.',
    href: '/dashboard/settings/operations?tab=flows',
    action: 'Configure Flows',
    modes: ['QUEUE_ONLY', 'APPOINTMENTS'],
  },
  {
    id: 'journey',
    icon: <span className="text-base">🗺️</span>,
    title: 'Design a service journey',
    description:
      'A Journey defines the stages a customer moves through (e.g. Registration → Blood Test → Results Collection). Build it in the Journey Builder.',
    href: '/dashboard/journeys',
    action: 'Open Journey Builder',
    modes: ['JOURNEY'],
  },
  {
    id: 'appointments',
    icon: <span className="text-base">📅</span>,
    title: 'Enable appointment booking',
    description:
      'Turn on "Allow Appointments" for each service to let customers book time slots online. Set your hours and slot duration.',
    href: '/dashboard/settings/operations?tab=services',
    action: 'Configure Booking',
    modes: ['APPOINTMENTS'],
  },
  {
    id: 'whatsapp',
    icon: <Zap className="w-5 h-5" />,
    title: 'Connect WhatsApp',
    description:
      'Send automatic confirmations, reminders, and position updates to customers via WhatsApp. Requires an Evolution API instance.',
    href: '/dashboard/settings/integrations?tab=whatsapp',
    action: 'Connect WhatsApp',
  },
  {
    id: 'staff',
    icon: <Users className="w-5 h-5" />,
    title: 'Invite your team',
    description:
      'Add staff members, assign roles (Operator, Manager), and set which services or locations they can access.',
    href: '/dashboard/settings/team',
    action: 'Invite Staff',
  },
  {
    id: 'qr',
    icon: <QrCode className="w-5 h-5" />,
    title: 'Share your booking portal',
    description:
      'Each queue and service has a unique QR code and booking link. Print or display it at your entrance, or embed it on your website.',
    href: 'CUSTOM_BOOKING_LINK',
    action: 'Open Booking Portal',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function SetupGuide() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const storageKey = user?.tenantId ? `qmova_setup_steps_${user.tenantId}` : null;

  // Fetch tenant to check operatingMode and existing setup state
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => fetchApi('/tenant/me'),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location').catch(() => []),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service').catch(() => []),
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue').catch(() => []),
  });

  // Query service flows (Journeys)
  const { data: flows = [] } = useQuery({
    queryKey: ['service-flows'],
    queryFn: () => fetchApi('/service-flows').catch(() => []),
  });

  // Query WhatsApp live status
  const { data: whatsappStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => fetchApi('/whatsapp/status').catch(() => null),
  });

  // Query users and staff
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchApi('/users').catch(() => []),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => fetchApi('/staff').catch(() => []),
  });

  // Query visits
  const { data: visitsRaw = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => fetchApi('/visits').catch(() => []),
  });

  const visits: any[] = Array.isArray(visitsRaw)
    ? visitsRaw
    : Array.isArray((visitsRaw as any)?.data)
    ? (visitsRaw as any).data
    : [];

  const locationsList: any[] = Array.isArray(locations)
    ? locations
    : Array.isArray((locations as any)?.data)
    ? (locations as any).data
    : [];

  const servicesList: any[] = Array.isArray(services)
    ? services
    : Array.isArray((services as any)?.data)
    ? (services as any).data
    : [];

  const queuesList: any[] = Array.isArray(queues)
    ? queues
    : Array.isArray((queues as any)?.data)
    ? (queues as any).data
    : [];

  const flowsList: any[] = Array.isArray(flows)
    ? flows
    : Array.isArray((flows as any)?.data)
    ? (flows as any).data
    : [];

  const usersList: any[] = Array.isArray(users)
    ? users
    : Array.isArray((users as any)?.data)
    ? (users as any).data
    : [];

  const staffList: any[] = Array.isArray(staff)
    ? staff
    : Array.isArray((staff as any)?.data)
    ? (staff as any).data
    : [];

  // Load persisted completed steps on mount
  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed: string[] = stored ? JSON.parse(stored) : [];
      const remoteSaved: string[] = tenant?.customerExperience?.completedSetupSteps || [];
      const combined = new Set([...parsed, ...remoteSaved]);
      if (tenant?.customerExperience?.portalShared) {
        combined.add('qr');
      }
      setCompletedSteps(combined);
    } catch {
      // ignore JSON parse error
    }
  }, [storageKey, tenant]);

  const updateTenantMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi(`/tenant/${user?.tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/tenant/${user?.tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ setupComplete: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] });
      toast.success('🎉 Setup marked as complete! Your workspace is ready.');
      router.push('/dashboard/service-desk');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to complete setup');
    },
  });

  const persistStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(stepId);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch {
          // ignore
        }
      }
      return next;
    });

    // Also persist to backend tenant.customerExperience
    if (user?.tenantId) {
      const currentExp = tenant?.customerExperience || {};
      const updatedList = Array.from(new Set([...(currentExp.completedSetupSteps || []), stepId]));
      const patchData: any = {
        customerExperience: {
          ...currentExp,
          completedSetupSteps: updatedList,
        },
      };
      if (stepId === 'qr') {
        patchData.customerExperience.portalShared = true;
      }
      updateTenantMutation.mutate(patchData);
    }
  };

  const handleSharePortal = (copyOnly = false) => {
    persistStepComplete('qr');
    const portalUrl = tenant?.subdomain ? getTenantUrl(tenant.subdomain, '/booking') : '';

    if (copyOnly) {
      if (portalUrl) {
        navigator.clipboard.writeText(portalUrl);
        toast.success('🎉 Booking portal link copied to clipboard! Step marked as complete.');
      } else {
        toast.success('Portal link created! Step marked as complete.');
      }
    } else {
      if (portalUrl) {
        window.open(portalUrl, '_blank', 'noopener,noreferrer');
        toast.success('Booking portal opened! Step marked as complete.');
      }
    }
  };

  const operatingMode = tenant?.operatingMode || 'QUEUE_ONLY';

  // Compute comprehensive auto-detected step completion from real backend state
  const getStepStatus = (step: SetupStep): boolean => {
    // 1. Manually completed or previously saved in localStorage/remote
    if (completedSteps.has(step.id)) return true;

    // 2. Location
    if (step.id === 'location') {
      return locationsList.length > 0;
    }

    // 3. Service
    if (step.id === 'service') {
      return servicesList.length > 0;
    }

    // 4. Flows
    if (step.id === 'flows') {
      return (
        flowsList.length > 0 ||
        servicesList.some((s) => s.serviceFlow || s.serviceFlowId)
      );
    }

    // 5. Journey ("Design a service journey")
    // Detects:
    // - Service that has journey attached
    // - Service flows exist
    // - Applied templates (flows with stages / blueprintFlows)
    if (step.id === 'journey') {
      const hasServiceWithJourney = servicesList.some(
        (s) =>
          s.serviceFlow ||
          s.serviceFlowId ||
          s.journeyStages ||
          (s.serviceFlow?.steps && s.serviceFlow.steps.length > 0)
      );
      const hasFlows = flowsList.length > 0;
      const hasTemplatesApplied = flowsList.some(
        (f) => f.steps && f.steps.length > 0
      );
      const hasBlueprint = (tenant?.blueprintFlows as any[])?.length > 0;
      return hasServiceWithJourney || hasFlows || hasTemplatesApplied || hasBlueprint;
    }

    // 6. Appointments
    if (step.id === 'appointments') {
      return servicesList.some((s) => s.allowAppointments);
    }

    // 7. WhatsApp ("Connect WhatsApp")
    // Detects:
    // - Active Evolution/Meta connection status (open / CONNECTED)
    // - Tenant whatsappConnected flag
    // - Existing whatsapp instance ID or whatsapp phone
    if (step.id === 'whatsapp') {
      const isWaOpen =
        whatsappStatus?.state === 'open' ||
        whatsappStatus?.state === 'CONNECTED' ||
        whatsappStatus?.connected === true;
      const isTenantWaConnected = tenant?.whatsappConnected === true;
      const hasWaInstance = !!tenant?.whatsappInstanceId || !!tenant?.whatsappPhone;
      return isWaOpen || isTenantWaConnected || hasWaInstance;
    }

    // 8. Team ("Invite your team")
    // Detects:
    // - Multiple active users
    // - Pending invited users or non-owner members
    // - Staff records
    // - Pending invitations
    if (step.id === 'staff') {
      const hasMultipleUsers = usersList.length > 1;
      const hasInvitedOrStaff = usersList.some(
        (u) => u.isInvite || u.status === 'INVITED' || u.role !== 'OWNER'
      );
      const hasStaffRecords = staffList.length > 0;
      const hasInvitations = (tenant?.invitations as any[])?.length > 0;
      return hasMultipleUsers || hasInvitedOrStaff || hasStaffRecords || hasInvitations;
    }

    // 9. Share Booking Portal ("Share your booking portal")
    // Detects:
    // - Flag portalShared on customerExperience
    // - Completed in local storage
    // - Visits originating from online portal or QR kiosk
    if (step.id === 'qr') {
      const portalSharedFlag = tenant?.customerExperience?.portalShared === true;
      const hasOnlineVisits = Array.isArray(visits) && visits.some(
        (v) =>
          v.source === 'ONLINE' ||
          v.source === 'QR_KIOSK' ||
          v.source === 'PORTAL' ||
          v.source === 'SELF_SERVE'
      );
      return Boolean(portalSharedFlag || hasOnlineVisits);
    }

    return false;
  };

  // Only show steps relevant to the tenant's operating mode
  const visibleSteps = SETUP_STEPS.filter(
    (s) => !s.modes || s.modes.includes(operatingMode)
  );

  const totalSteps = visibleSteps.length;
  const doneCount = visibleSteps.filter((s) => getStepStatus(s)).length;
  const progress = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;
  const portalUrl = tenant?.subdomain ? getTenantUrl(tenant.subdomain, '/booking') : '';

  return (
    <AdminLayout pageTitle="Setup Guide" pageSubtitle="Your workspace setup checklist">
      <Head>
        <title>Setup Guide | Qmova</title>
        <meta name="description" content="Complete your Qmova workspace setup step by step." />
      </Head>

      <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Rocket className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-on-surface dark:text-white">Setup Guide</h1>
            </div>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400">
              Follow these steps to get your workspace fully operational.
            </p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-on-surface dark:text-white">
              {doneCount} of {totalSteps} steps complete
            </span>
            <span className="font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-2 bg-surface-variant dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="h-full bg-gradient-to-r from-primary to-sky-400 rounded-full"
            />
          </div>
          {progress === 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    All steps complete!
                  </p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-500">
                    Your workspace is ready to go live.
                  </p>
                </div>
              </div>
              <button
                onClick={() => markCompleteMutation.mutate()}
                disabled={markCompleteMutation.isPending}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-2 cursor-pointer shadow-md"
              >
                Go Live <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Steps List */}
        <div className="space-y-3">
          <AnimatePresence>
            {visibleSteps.map((step, idx) => {
              const isDone = getStepStatus(step);
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * idx }}
                  className={`relative flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200 ${
                    isDone
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-card dark:bg-dark-card border-border dark:border-dark-border hover:border-primary/40'
                  }`}
                >
                  {/* Step number / check */}
                  <div
                    className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-surface-variant dark:bg-zinc-800 text-outline'
                    }`}
                  >
                    {isDone ? <Check className="w-5 h-5" /> : step.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-semibold text-sm ${
                              isDone
                                ? 'text-zinc-500 dark:text-zinc-400 line-through'
                                : 'text-on-surface dark:text-white'
                            }`}
                          >
                            {step.title}
                          </h3>
                          {isDone && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                              Completed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* If not done, offer Mark Done */}
                        {!isDone && (
                          <button
                            onClick={() => {
                              persistStepComplete(step.id);
                              toast.success(`"${step.title}" marked as complete!`);
                            }}
                            className="text-xs text-outline hover:text-primary transition-colors underline underline-offset-2 cursor-pointer"
                          >
                            Mark done
                          </button>
                        )}

                        {/* QR / Portal Step Specific Actions */}
                        {step.id === 'qr' && !isDone && (
                          <div className="flex items-center gap-1.5">
                            {portalUrl && (
                              <button
                                onClick={() => handleSharePortal(true)}
                                title="Copy public booking link"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold transition-colors border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                Copy Link
                              </button>
                            )}
                            <button
                              onClick={() => handleSharePortal(false)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                            >
                              {step.action || 'Open Booking Portal'} <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Standard Navigation Actions */}
                        {step.href && step.id !== 'qr' && !isDone && (
                          <Link href={step.href}>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-xs">
                              {step.action || 'Go'} <ChevronRight className="w-3 h-3" />
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Shortcut: Go to Dashboard early */}
        <div className="text-center pt-4">
          <Link
            href="/dashboard/service-desk"
            className="text-sm text-outline hover:text-primary transition-colors underline underline-offset-2"
          >
            Skip setup — go to dashboard anyway
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
