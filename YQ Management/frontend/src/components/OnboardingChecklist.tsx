/**
 * OnboardingChecklist
 * -------------------
 * A persistent floating "Getting Started" widget shown to new tenants on the
 * dashboard. Guides them through 5 key activation steps to reach their
 * "aha moment" in <5 minutes.
 *
 * Progress is stored in localStorage so it survives page navigations.
 * Auto-hides once all 5 steps are completed and confirmed.
 */
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';

const STORAGE_KEY = 'qmova_onboarding_dismissed';

interface Step {
  id: string;
  label: string;
  description: string;
  href: string;
  checkFn?: (data: OnboardingData) => boolean;
}

interface OnboardingData {
  queueCount: number;
  serviceCount: number;
  staffCount: number;
  whatsappConnected: boolean;
  hasSharedQr: boolean;
}

const STEPS: Step[] = [
  {
    id: 'create_queue',
    label: 'Create your first queue',
    description: 'Set up a queue so customers can start joining.',
    href: '/dashboard/queues',
    checkFn: (d) => d.queueCount > 0,
  },
  {
    id: 'add_service',
    label: 'Add a service',
    description: 'Define what services you offer (e.g. "Haircut", "Consultation").',
    href: '/dashboard/queues',
    checkFn: (d) => d.serviceCount > 0,
  },
  {
    id: 'invite_staff',
    label: 'Invite a staff member',
    description: 'Add your team so they can manage the queue.',
    href: '/dashboard/settings/team',
    checkFn: (d) => d.staffCount > 0,
  },
  {
    id: 'connect_whatsapp',
    label: 'Connect WhatsApp',
    description: 'Send real-time updates to customers via WhatsApp.',
    href: '/dashboard/settings/integrations',
    checkFn: (d) => d.whatsappConnected,
  },
  {
    id: 'share_qr',
    label: 'Share your QR code',
    description: 'Place your QR code at your door — customers scan it to join.',
    href: '/dashboard/queues',
    checkFn: () => false, // Manually completable
  },
];

export function OnboardingChecklist() {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [manualComplete, setManualComplete] = useState<Record<string, boolean>>({});

  // Load dismissed/manual state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.dismissed) setDismissed(true);
        if (parsed.manual) setManualComplete(parsed.manual);
      }
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((updates: { dismissed?: boolean; manual?: Record<string, boolean> }) => {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...updates }));
    } catch { /* ignore */ }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    save({ dismissed: true });
  };

  const toggleManual = (id: string) => {
    const updated = { ...manualComplete, [id]: !manualComplete[id] };
    setManualComplete(updated);
    save({ manual: updated });
  };

  // Fetch live onboarding state
  const { data: onboardingData } = useQuery<OnboardingData>({
    queryKey: ['onboarding-state'],
    queryFn: () => fetchApi('/tenant/onboarding-state'),
    staleTime: 30_000,
    retry: false,
  });

  if (dismissed || !onboardingData) return null;

  const completedSteps = STEPS.filter((step) => {
    if (step.checkFn) return step.checkFn(onboardingData);
    return !!manualComplete[step.id];
  });

  // Auto-dismiss if all steps done and user has seen it
  const allDone = completedSteps.length === STEPS.length;
  if (allDone) {
    // Let user see the success state briefly before hiding
    setTimeout(handleDismiss, 4000);
  }

  const progress = Math.round((completedSteps.length / STEPS.length) * 100);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-6 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-white shrink-0" />
          <div>
            <p className="text-white font-bold text-sm leading-tight">Getting Started</p>
            <p className="text-indigo-200 text-xs">{completedSteps.length}/{STEPS.length} steps complete</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronUp className="w-4 h-4 text-white" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="text-indigo-200 hover:text-white transition-colors"
            aria-label="Dismiss onboarding checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <motion.div
          className="h-1 bg-indigo-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Steps */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            {allDone ? (
              <div className="p-5 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="font-bold text-gray-800 mb-1">You&apos;re all set!</p>
                <p className="text-gray-500 text-sm">Your queue is ready for customers.</p>
              </div>
            ) : (
              <ul className="p-3 space-y-1 max-h-72 overflow-y-auto">
                {STEPS.map((step) => {
                  const done = step.checkFn
                    ? step.checkFn(onboardingData)
                    : !!manualComplete[step.id];
                  return (
                    <li key={step.id}>
                      <div className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group">
                        <button
                          onClick={() => !step.checkFn && toggleManual(step.id)}
                          className={`shrink-0 mt-0.5 transition-colors ${
                            step.checkFn ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300 group-hover:text-indigo-300 transition-colors" />
                          )}
                        </button>
                        <Link href={step.href} className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-tight ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {step.label}
                          </p>
                          {!done && (
                            <p className="text-xs text-gray-400 leading-tight mt-0.5 truncate">{step.description}</p>
                          )}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
