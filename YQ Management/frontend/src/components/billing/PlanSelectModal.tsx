import { useState } from 'react';
import { Dialog, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { fetchApi } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';

interface PlanSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: Record<string, unknown>, billingInterval: string) => void;
  isPendingPayment?: boolean;
}

export function PlanSelectModal({ isOpen, onClose, onSelectPlan, isPendingPayment }: PlanSelectModalProps) {
  const { status, planName, usage, isLoading: planLoading } = usePlan();
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [downgradeError, setDowngradeError] = useState<string | null>(null);

  const { data: plans = [], isLoading: isPlansLoading } = useQuery({
    queryKey: ['active-plans'],
    queryFn: () => fetchApi('/billing/plans?status=ACTIVE'),
  });

  const handleSelect = (plan: Record<string, unknown>) => {
    setDowngradeError(null);
    if (status === 'ACTIVE' && planName && planName !== plan.name) {
      if (plan.limits) {
        const maxQueues = typeof plan.limits === 'string' ? JSON.parse(plan.limits as string).maxQueues : (plan.limits as Record<string, unknown>)?.maxQueues;
        if (maxQueues && usage.queues > maxQueues) {
          // It's a downgrade that exceeds hard limits. Wait, we decided to freeze them instead of blocking.
          // But actually, we just warn the user. We will open the downgrade warning modal from the parent!
        }
      }
    }
    onSelectPlan(plan, billingInterval);
  };

  if (planLoading || isPlansLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose} className="sm:max-w-[600px] flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose} className="sm:max-w-[950px] max-h-[90vh] overflow-y-auto bg-surface dark:bg-zinc-900 border-border dark:border-zinc-800 md:translate-x-[calc(-50%+128px)] rounded-[32px] p-8 md:p-10 shadow-2xl dark:shadow-black/50">
      <button 
        onClick={onClose}
        className="absolute right-6 top-6 p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="mb-8">
        <DialogTitle className="text-3xl font-extrabold text-center text-on-surface dark:text-white tracking-tight">Choose a Plan</DialogTitle>
        <DialogDescription className="text-center text-base mt-2 text-on-surface-variant dark:text-zinc-400">
          Select the best plan for your business needs.
        </DialogDescription>
      </div>

        <div className="flex justify-center my-6">
          <div className="inline-flex items-center p-1 bg-surface-container-low dark:bg-dark-canvas border border-border dark:border-dark-border rounded-lg">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 h-[40px] rounded-md font-body-sm font-semibold transition-colors ${billingInterval === 'monthly' ? 'bg-white dark:bg-zinc-800 text-on-surface dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-on-surface'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 h-[40px] rounded-md font-body-sm font-semibold transition-colors flex items-center gap-2 ${billingInterval === 'yearly' ? 'bg-white dark:bg-zinc-800 text-on-surface dark:text-white shadow-sm' : 'text-on-surface-variant dark:text-outline hover:text-on-surface'}`}
            >
              Annually <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">Save</span>
            </button>
          </div>
        </div>

        {downgradeError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium">
            {downgradeError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(plans as Record<string, unknown>[]).map((plan) => {
            const price = billingInterval === 'yearly' && plan.billingInterval === 'monthly'
              ? Math.floor(plan.price * 12 * (1 - (plan.annualDiscountPercent || 10) / 100))
              : plan.price;
            const isPopular = plan.name.toLowerCase().includes('standard') || plan.name.toLowerCase().includes('pro');
            const isCurrent = plan.name === planName;

            return (
              <div key={plan.id} className={`bg-card dark:bg-zinc-950/50 rounded-[28px] border ${isCurrent ? 'border-primary shadow-xl dark:border-primary/50' : isPopular ? 'border-primary/50 shadow-lg dark:border-primary/30' : 'border-border dark:border-zinc-800'} p-7 flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`}>
                {isPopular && !isCurrent && (
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-sky-400"></div>
                )}
                {isCurrent && (
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-green-400"></div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-headline-md text-xl font-bold text-on-surface dark:text-white">{plan.name}</h3>
                  {isCurrent && (
                    <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">Current</span>
                  )}
                </div>
                <p className="font-body-sm text-on-surface-variant dark:text-zinc-400 min-h-[60px] mb-6">{plan.description}</p>
                <div className="mb-8">
                  <span className="font-data-mono-lg text-4xl font-extrabold text-on-surface dark:text-white">{plan.currency === 'ZAR' ? 'R' : '$'}{price}</span>
                  <span className="text-on-surface-variant dark:text-zinc-500 ml-1 font-medium">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
                </div>
                
                <Button
                  variant={isCurrent ? "outline" : isPopular ? "default" : "secondary"}
                  disabled={isCurrent || isPendingPayment}
                  onClick={() => handleSelect(plan)}
                  className={`w-full mb-8 h-12 rounded-xl font-bold text-[15px] transition-all ${isCurrent ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : isPopular ? 'shadow-lg shadow-primary/25' : 'dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white'}`}
                >
                  {isCurrent ? 'Active Plan' : isPendingPayment ? 'Payment Pending' : 'Select Plan'}
                </Button>

                <div className="space-y-4 flex-1">
                  <p className="text-[11px] text-on-surface-variant dark:text-zinc-500 uppercase tracking-widest font-bold">Features included:</p>
                  <ul className="space-y-3.5">
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 bg-emerald-100 dark:bg-emerald-500/20 p-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-[14px] text-on-surface dark:text-zinc-300 font-medium">Up to {plan.limits?.maxQueues || 1} Queues</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 bg-emerald-100 dark:bg-emerald-500/20 p-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-[14px] text-on-surface dark:text-zinc-300 font-medium">Up to {plan.limits?.maxTokens || 500} Tokens/day</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 bg-emerald-100 dark:bg-emerald-500/20 p-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-[14px] text-on-surface dark:text-zinc-300 font-medium">Up to {plan.limits?.maxLocations || 1} Locations</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-0.5 bg-emerald-100 dark:bg-emerald-500/20 p-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-[14px] text-on-surface dark:text-zinc-300 font-medium">Up to {plan.limits?.maxServices || 1} Services</span>
                    </li>
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
    </Dialog>
  );
}
