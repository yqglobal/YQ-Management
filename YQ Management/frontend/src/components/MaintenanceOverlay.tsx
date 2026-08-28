import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServerCrash, RefreshCw } from 'lucide-react';

export function MaintenanceOverlay() {
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const handleMaintenance = () => setIsMaintenance(true);
    const handleRecovered = () => setIsMaintenance(false);

    window.addEventListener('api-maintenance', handleMaintenance);
    window.addEventListener('api-recovered', handleRecovered);

    return () => {
      window.removeEventListener('api-maintenance', handleMaintenance);
      window.removeEventListener('api-recovered', handleRecovered);
    };
  }, []);

  return (
    <AnimatePresence>
      {isMaintenance && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="max-w-md w-full bg-surface-container-low dark:bg-dark-surface border border-border dark:border-dark-border rounded-3xl p-8 shadow-2xl flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <h1 className="text-2xl font-bold text-on-surface dark:text-white mb-3">
              Services are Updating
            </h1>
            <p className="text-on-surface-variant dark:text-zinc-400 mb-8 leading-relaxed">
              We are currently deploying new updates and improvements. The service will be back online in a few minutes. Please hold tight!
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
            >
              Reload Page
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
