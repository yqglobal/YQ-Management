import React, { useEffect, useState } from 'react';

interface Step {
  elementId: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    elementId: 'tour-queues-nav',
    title: 'Manage Your Queues',
    description: 'This is where you can see all your active queues and create new ones.',
  },
  {
    elementId: 'tour-create-queue-btn',
    title: 'Create a Queue',
    description: 'Click here to create a new queue. You can select pre-built templates for your specific business type!',
  },
  {
    elementId: 'tour-settings-nav',
    title: 'Connect WhatsApp',
    description: "Don't forget to connect your WhatsApp in the settings so your customers get real-time SMS updates.",
  },
];

export function DashboardTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('yq_has_seen_tour');
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const element = document.getElementById(STEPS[currentStep]?.elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, isOpen]);

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
    <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6">
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
