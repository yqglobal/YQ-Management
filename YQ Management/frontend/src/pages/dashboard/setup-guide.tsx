import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../components/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Rocket, MapPin, Layers, Users, QrCode, Zap, ExternalLink, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

// ── Setup Step Definition ────────────────────────────────────────────────────

interface SetupStep {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  action?: string;
  modes?: ('QUEUE_ONLY' | 'APPOINTMENTS' | 'JOURNEY')[];
  checkFn?: (data: any) => boolean;
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: 'location',
    icon: <MapPin className="w-5 h-5" />,
    title: 'Create your first location',
    description: 'A location is a physical site (branch, clinic, store). All queues and services live under a location.',
    href: '/dashboard/settings/operations?tab=locations',
    action: 'Add Location',
  },
  {
    id: 'service',
    icon: <Layers className="w-5 h-5" />,
    title: 'Set up your services',
    description: 'Services define what customers come in for (e.g. "General Consultation", "Pharmacy Pickup"). Each service can have its own hours, staff, and queue.',
    href: '/dashboard/settings/operations?tab=services',
    action: 'Add Service',
  },
  {
    id: 'queue',
    icon: <span className="text-base">🎟️</span>,
    title: 'Create a queue',
    description: 'A queue is the live line customers join. Link it to one or more services. For walk-in only, one queue per service is typical.',
    href: '/dashboard/queues',
    action: 'Create Queue',
    modes: ['QUEUE_ONLY'],
  },
  {
    id: 'appointments',
    icon: <span className="text-base">📅</span>,
    title: 'Enable appointment booking',
    description: 'Turn on "Allow Appointments" for each service to let customers book time slots online. Set your hours and slot duration.',
    href: '/dashboard/settings/operations?tab=services',
    action: 'Configure Booking',
    modes: ['APPOINTMENTS', 'JOURNEY'],
  },
  {
    id: 'journey',
    icon: <span className="text-base">🗺️</span>,
    title: 'Design a service journey',
    description: 'A Journey defines the stages a customer moves through (e.g. Registration → Blood Test → Results Collection). Build it in the Journey Builder.',
    href: '/dashboard/journeys',
    action: 'Open Journey Builder',
    modes: ['JOURNEY'],
  },
  {
    id: 'staff',
    icon: <Users className="w-5 h-5" />,
    title: 'Invite your team',
    description: 'Add staff members, assign roles (Operator, Manager), and set which services or locations they can access.',
    href: '/dashboard/settings/team',
    action: 'Invite Staff',
  },
  {
    id: 'qr',
    icon: <QrCode className="w-5 h-5" />,
    title: 'Share your booking portal',
    description: 'Each queue and service has a unique QR code and booking link. Print or display it at your entrance, or embed it on your website.',
    href: '/dashboard/queues',
    action: 'Get QR Code',
  },
  {
    id: 'whatsapp',
    icon: <Zap className="w-5 h-5" />,
    title: 'Connect WhatsApp (optional)',
    description: 'Send automatic confirmations, reminders, and position updates to customers via WhatsApp. Requires an Evolution API instance.',
    href: '/dashboard/settings/integrations?tab=whatsapp',
    action: 'Connect WhatsApp',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function SetupGuide() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Fetch tenant to check operatingMode and existing setup state
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => fetchApi('/tenant/me'),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
  });

  const { data: queues = [] } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue'),
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
  });

  const operatingMode = tenant?.operatingMode || 'QUEUE_ONLY';

  // Compute auto-detected step completion from real data
  const getStepStatus = (step: SetupStep): boolean => {
    if (completedSteps.has(step.id)) return true;
    if (step.id === 'location') return (locations as any[]).length > 0;
    if (step.id === 'service') return (services as any[]).length > 0;
    if (step.id === 'queue') return (queues as any[]).length > 0;
    return false;
  };

  // Only show steps relevant to the tenant's operating mode
  const visibleSteps = SETUP_STEPS.filter(
    (s) => !s.modes || s.modes.includes(operatingMode),
  );

  const totalSteps = visibleSteps.length;
  const doneCount = visibleSteps.filter((s) => getStepStatus(s)).length;
  const progress = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;

  const modeLabels: Record<string, { label: string; color: string; icon: string }> = {
    QUEUE_ONLY: { label: 'Walk-in Queue Mode', color: 'sky', icon: '🎟️' },
    APPOINTMENTS: { label: 'Appointment Mode', color: 'violet', icon: '📅' },
    JOURNEY: { label: 'Multi-Step Journey Mode', color: 'emerald', icon: '🗺️' },
  };
  const modeInfo = modeLabels[operatingMode] || modeLabels['QUEUE_ONLY'];

  return (
    <AdminLayout pageTitle="Setup Guide" pageSubtitle="Your workspace setup checklist">
      <Head>
        <title>Setup Guide | Qmova</title>
        <meta name="description" content="Complete your Qmova workspace setup step by step." />
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

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

          {/* Operating Mode badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
            operatingMode === 'QUEUE_ONLY' ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
            : operatingMode === 'APPOINTMENTS' ? 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
          }`}>
            <span>{modeInfo.icon}</span>
            <span>{modeInfo.label}</span>
            <Link href="/dashboard/settings/workspace" className="opacity-60 hover:opacity-100 transition-opacity">
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
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
            <span className="font-medium text-on-surface dark:text-white">{doneCount} of {totalSteps} steps complete</span>
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
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">All steps complete!</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-500">Your workspace is ready to go live.</p>
                </div>
              </div>
              <button
                onClick={() => markCompleteMutation.mutate()}
                disabled={markCompleteMutation.isPending}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-2"
              >
                Go Live <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Steps */}
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
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                    isDone ? 'bg-emerald-500 text-white' : 'bg-surface-variant dark:bg-zinc-800 text-outline'
                  }`}>
                    {isDone ? <Check className="w-5 h-5" /> : step.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className={`font-semibold text-sm ${isDone ? 'line-through text-on-surface-variant dark:text-zinc-500' : 'text-on-surface dark:text-white'}`}>
                          {step.title}
                        </h3>
                        <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1 leading-relaxed">
                          {step.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isDone && (
                          <button
                            onClick={() => setCompletedSteps((prev) => new Set([...prev, step.id]))}
                            className="text-xs text-outline hover:text-primary transition-colors underline underline-offset-2"
                          >
                            Mark done
                          </button>
                        )}
                        {step.href && !isDone && (
                          <Link href={step.href}>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
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
          <Link href="/dashboard/service-desk" className="text-sm text-outline hover:text-primary transition-colors underline underline-offset-2">
            Skip setup — go to dashboard anyway
          </Link>
        </div>

      </div>
    </AdminLayout>
  );
}
