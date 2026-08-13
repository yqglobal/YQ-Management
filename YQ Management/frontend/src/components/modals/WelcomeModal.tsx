import React from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-white/10 relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-800 dark:text-white" />
          </button>
          
          <div className="h-64 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Welcome to Qmova</h2>
            </div>
            
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          </div>

          <div className="p-8 text-center space-y-6">
            <p className="text-lg text-gray-600 dark:text-zinc-300 leading-relaxed font-medium">
              We are incredibly excited to meet you! You are now set up and ready to transform your customer experience. 
            </p>
            
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl text-left border border-gray-100 dark:border-white/5 space-y-4">
               <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                 Quick Start Guide
               </h3>
               <ul className="space-y-3 text-sm text-gray-600 dark:text-zinc-400">
                 <li className="flex items-start gap-2">
                   <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">1</div>
                   Manage your active walk-ins and appointments right here on the <strong>Dashboard</strong>.
                 </li>
                 <li className="flex items-start gap-2">
                   <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">2</div>
                   Head to <strong>Settings &gt; Customer Experience</strong> to customize your intake forms.
                 </li>
                 <li className="flex items-start gap-2">
                   <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">3</div>
                   Use the <strong>New Walk-in</strong> button to quickly add someone to the queue.
                 </li>
               </ul>
            </div>

            <Button 
              onClick={onClose}
              className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2"
            >
              Let's Go! <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
