import React from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

interface QuotaExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'queues' | 'tokens';
  usage: number;
  limit: number;
  planName?: string | null;
}

export function QuotaExhaustedModal({ isOpen, onClose, type, usage, limit, planName }: QuotaExhaustedModalProps) {
  if (!isOpen || typeof document === 'undefined') return null;

  const isQueue = type === 'queues';
  const title = isQueue ? 'Queue Limit Reached' : 'Monthly Token Limit Reached';
  const description = isQueue
    ? `You've used all ${limit} queue${limit !== 1 ? 's' : ''} allowed on your current plan.`
    : `You've used ${usage} of ${limit} tokens this month on your current plan.`;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-bold text-on-surface dark:text-white">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors text-on-surface-variant"
            >
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mb-5">{description}</p>

          {/* Usage bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs font-medium text-on-surface-variant dark:text-zinc-400 mb-2">
              <span>{isQueue ? 'Queues' : 'Tokens this month'}</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{usage} / {limit}</span>
            </div>
            <div className="h-2.5 bg-surface-container-low dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (usage / limit) * 100)}%` }}
              />
            </div>
          </div>

          {/* Current plan */}
          {planName && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant dark:text-zinc-400 mb-6 px-3 py-2 bg-surface-container-low dark:bg-white/5 rounded-lg">
              <span className="font-semibold text-on-surface dark:text-white">Current plan:</span>
              <span className="px-2 py-0.5 bg-primary/10 dark:bg-primary/20 text-primary rounded-full font-bold uppercase tracking-wider text-[10px]">{planName}</span>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard/settings/billing"
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary-container text-white rounded-xl font-semibold transition-all hover:-translate-y-0.5 shadow-sm"
            >
              <Zap className="w-4 h-4" strokeWidth={1.5} />
              Upgrade Plan
            </Link>
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-low dark:hover:bg-white/5 rounded-xl transition-colors font-medium"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
