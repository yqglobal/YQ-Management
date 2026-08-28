import React from 'react';
import { Lock } from 'lucide-react';
import Link from 'next/link';

export function AccessDeniedOverlay() {
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Access Denied
        </h2>
        
        <p className="text-gray-600 dark:text-zinc-400 mb-8">
          You do not have permission to view this page or feature. Please contact your workspace administrator to request access.
        </p>
        
        <div className="flex gap-4 w-full">
          <button 
            onClick={() => window.history.back()}
            className="flex-1 px-5 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-medium transition-colors"
          >
            Go Back
          </button>
          
          <Link href="/dashboard" className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
