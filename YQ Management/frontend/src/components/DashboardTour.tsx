import React, { useEffect, useState } from 'react';

interface Step {
  elementId: string;
  title: string;
  description: string;
  route: string;
}

const STEPS: Step[] = [
  {
    elementId: 'tour-queues-nav',
    title: 'Manage Your Queues',
    description: 'This is where you can see all your active queues and create new ones.',
    route: '/dashboard/queues',
  },
  {
    elementId: 'tour-create-queue-btn',
    title: 'Create a Queue',
    description: 'Click here to create a new queue. You can select pre-built templates for your specific business type!',
    route: '/dashboard/queues',
  },
  {
    elementId: 'tour-settings-nav',
    title: 'Connect WhatsApp',
    description: "Don't forget to connect your WhatsApp in the settings so your customers get real-time SMS updates.",
    route: '/dashboard/settings',
  },
];

import { useRouter } from 'next/router';

export function DashboardTour({ canStart = true }: { canStart?: boolean }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!canStart) return;
    const hasSeenTour = localStorage.getItem('yq_has_seen_tour');
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, [canStart]);


  useEffect(() => {
    if (!isOpen) return;

    const step = STEPS[currentStep];
    if (step && step.route && router.pathname !== step.route) {
      router.push(step.route).then(() => {
        setTimeout(() => {
          const element = document.getElementById(step.elementId);
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      });
    } else {
      const element = document.getElementById(step?.elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep, isOpen, router]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('yq_has_seen_tour', 'true');
  };

  if (!isOpen) return null;

  const step = STEPS[currentStep];

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-end justify-end p-4 pointer-events-none">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-sm p-6 pointer-events-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{step.title}</h3>
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            {currentStep + 1}/{STEPS.length}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">{step.description}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            {currentStep < STEPS.length - 1 ? 'Next' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
