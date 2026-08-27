import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, X, LayoutDashboard, Settings, UserPlus, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    id: 1,
    title: 'Welcome to Qmova',
    icon: <Sparkles className="w-8 h-8 text-white" />,
    color: 'from-indigo-500 via-purple-500 to-pink-500',
    content: (
      <div className="space-y-4">
        <p className="text-lg text-gray-600 dark:text-zinc-300 leading-relaxed font-medium">
          We're incredibly excited to meet you! You are now set up and ready to transform your customer experience.
        </p>
        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-left">
          <h4 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-500" />
            The Magic of Digital Queues
          </h4>
          <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed">
            Qmova replaces chaotic waiting rooms with smart, digital check-ins. Your customers can wait anywhere, track their status on their phones, and get notified when it's their turn.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: 'The Service Desk',
    icon: <LayoutDashboard className="w-8 h-8 text-white" />,
    color: 'from-blue-500 via-cyan-500 to-teal-500',
    content: (
      <div className="space-y-4">
        <p className="text-base text-gray-600 dark:text-zinc-300">
          The Service Desk is your command center. This is where your staff will spend most of their time.
        </p>
        <ul className="space-y-3 text-sm text-left">
          <li className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center flex-shrink-0"><UserPlus className="w-3.5 h-3.5" /></div>
            <div>
              <strong className="text-gray-900 dark:text-white block">Add Walk-ins</strong>
              <span className="text-gray-500 dark:text-gray-400">Quickly add walk-in customers to the queue.</span>
            </div>
          </li>
          <li className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">2</div>
            <div>
              <strong className="text-gray-900 dark:text-white block">Call & Serve</strong>
              <span className="text-gray-500 dark:text-gray-400">Move tickets from Waiting → Serving → Completed.</span>
            </div>
          </li>
        </ul>
      </div>
    )
  },
  {
    id: 3,
    title: 'Customize Everything',
    icon: <Settings className="w-8 h-8 text-white" />,
    color: 'from-orange-500 via-red-500 to-rose-500',
    content: (
      <div className="space-y-4">
        <p className="text-base text-gray-600 dark:text-zinc-300">
          Tailor Qmova perfectly to your business needs in the Settings area.
        </p>
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-white/5">
            <h5 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Customer Experience</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400">Upload your logo, set your brand colors, and edit intake forms.</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-white/5">
            <h5 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Operations</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage locations, add services, and organize queues.</p>
          </div>
        </div>
      </div>
    )
  }
];

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-white/10 relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full transition-colors z-20"
          >
            <X className="w-5 h-5 text-gray-800 dark:text-white" />
          </button>
          
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className={`h-48 bg-gradient-to-br ${step.color} relative flex items-center justify-center overflow-hidden`}>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                  <div className="relative z-10 flex flex-col items-center mt-6">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/30">
                      {step.icon}
                    </div>
                  </div>
                  
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                </div>

                <div className="p-8 text-center bg-white dark:bg-zinc-900">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-6">{step.title}</h2>
                  {step.content}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-zinc-800/30 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex gap-2">
              {STEPS.map((s, idx) => (
                <div 
                  key={s.id} 
                  className={`h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-indigo-600' : 'w-2 bg-gray-300 dark:bg-zinc-600'}`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button 
                  onClick={handlePrev}
                  variant="outline"
                  className="px-4 py-2 font-semibold"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
              <Button 
                onClick={handleNext}
                className={`px-6 py-2 text-white font-bold transition-all ${
                  currentStep === STEPS.length - 1 
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                    : 'bg-gray-900 dark:bg-white dark:text-black hover:scale-105'
                }`}
              >
                {currentStep === STEPS.length - 1 ? "Get Started" : "Next"} 
                {currentStep < STEPS.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
