import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/router';

export function AcceptPoliciesModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if policies are already accepted
    const isAccepted = localStorage.getItem('qmova_policies_accepted_v1');
    // Only show on dashboard routes if not accepted
    if (!isAccepted && router.pathname.startsWith('/dashboard')) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [router.pathname]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Allow a small margin of error (e.g. 50px)
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (!accepted || !hasScrolledToBottom) return;
    localStorage.setItem('qmova_policies_accepted_v1', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-2xl bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-border dark:border-white/10 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface dark:text-white tracking-tight">Updated Terms & Privacy Policy</h2>
            <p className="text-on-surface-variant dark:text-zinc-400 mt-2 font-medium">
              Please review our updated policies before continuing to use QMova. You must scroll to the bottom to accept.
            </p>
          </div>

          {/* Scrollable Content Area */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 text-on-surface-variant dark:text-zinc-300 font-body-sm relative"
          >
            <section>
              <h3 className="text-lg font-semibold text-on-surface dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Terms of Service
              </h3>
              <p className="mb-4">
                By accessing and using QMova, you agree to comply with our core terms regarding queue management, fair usage of tokens, and SLA obligations. 
              </p>
              <ul className="list-disc pl-5 space-y-2 mb-6 text-sm opacity-80">
                <li>You are responsible for the data you collect from your patrons.</li>
                <li>API limits must be respected; excessive polling may result in temporary suspension.</li>
                <li>WhatsApp communication is subject to Meta's Business Policies.</li>
              </ul>
              <div className="p-4 bg-surface-container-low dark:bg-black/20 rounded-lg border border-border dark:border-white/5 text-xs font-mono leading-relaxed opacity-70">
                // Legal Disclaimer Snapshot
                <br/>
                QMova provides software "as-is" without warranty. We do not guarantee uninterrupted service, though we strive for 99.9% uptime. Liability is limited to the amount paid in the preceding 12 months.
              </div>
            </section>

            <div className="h-px w-full bg-border dark:bg-white/10 my-4" />

            <section>
              <h3 className="text-lg font-semibold text-on-surface dark:text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Privacy Policy & Data Processing
              </h3>
              <p className="mb-4">
                We act as a Data Processor for the queue information you capture. We strictly adhere to POPIA and GDPR standards for data residency and encryption.
              </p>
              <ul className="list-disc pl-5 space-y-2 mb-6 text-sm opacity-80">
                <li>All PHI/PII data is encrypted at rest using AES-256.</li>
                <li>You retain full ownership of your customer lists.</li>
                <li>We do not sell your patrons' data to third-party brokers.</li>
              </ul>
              <div className="space-y-4 text-sm opacity-60">
                <p>1. Data Collection: We collect only the minimum necessary data to provide our queue management services.</p>
                <p>2. Data Retention: Queue data is automatically anonymized after 30 days unless specifically configured otherwise in your workspace settings.</p>
                <p>3. Third-Party Services: We integrate with essential infrastructure providers (e.g., AWS, Vercel) who are subject to strict DPA agreements.</p>
                <p>4. User Rights: Your end-users have the right to request deletion of their data, which you must facilitate through our API or dashboard.</p>
                <br/><br/><br/><br/><br/><br/><br/><br/>
              </div>
              <p className="mt-8 text-center text-xs opacity-50 font-medium tracking-widest uppercase">End of Document</p>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="p-6 md:p-8 border-t border-border dark:border-white/10 shrink-0 bg-surface-container-lowest dark:bg-black/20">
            <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border transition-all ${
              hasScrolledToBottom 
                ? 'border-border dark:border-white/10 hover:bg-surface-container-low dark:hover:bg-white/5' 
                : 'border-red-500/20 bg-red-500/5 cursor-not-allowed opacity-60'
            }`}>
              <div className="pt-0.5">
                <input 
                  type="checkbox" 
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  disabled={!hasScrolledToBottom}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50 transition-all cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <p className="font-medium text-on-surface dark:text-white">I agree to the Terms of Service and Privacy Policy.</p>
                {!hasScrolledToBottom && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Please scroll to the bottom of the document to enable.
                  </p>
                )}
              </div>
            </label>

            <button
              onClick={handleAccept}
              disabled={!accepted || !hasScrolledToBottom}
              className="w-full mt-6 h-12 bg-primary hover:bg-primary-container text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {hasScrolledToBottom ? (
                <>Accept & Continue <CheckCircle2 className="w-4 h-4" /></>
              ) : (
                'Review remaining terms...'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
