import { useState, useMemo } from 'react';
import { Dialog, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { fetchApi } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';

interface PlanSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: any, billingInterval: string) => void;
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

  const handleSelect = (plan: any) => {
    setDowngradeError(null);
    if (status === 'ACTIVE' && planName && planName !== plan.name) {
      if (plan.limits) {
        let maxQueues = typeof plan.limits === 'string' ? JSON.parse(plan.limits).maxQueues : plan.limits.maxQueues;
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
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose} className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
      <div className="mb-6">
        <DialogTitle className="text-2xl font-bold text-center">Choose a Plan</DialogTitle>
        <DialogDescription className="text-center text-base">
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
              Annually <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">Save 10%</span>
            </button>
          </div>
        </div>

        {downgradeError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium">
            {downgradeError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan: any) => {
            const price = billingInterval === 'yearly' && plan.billingInterval === 'monthly'
              ? Math.floor(plan.price * 12 * 0.9)
              : plan.price;
            const isPopular = plan.name.toLowerCase().includes('standard') || plan.name.toLowerCase().includes('pro');
            const isCurrent = plan.name === planName;

            return (
              <div key={plan.id} className={`bg-card dark:bg-dark-card rounded-[24px] border ${isCurrent ? 'border-primary shadow-md' : isPopular ? 'border-primary/50 shadow-lg' : 'border-border'} p-6 flex flex-col relative overflow-hidden`}>
                {isPopular && !isCurrent && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                )}
                {isCurrent && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-headline-md text-headline-md font-semibold">{plan.name}</h3>
                  {isCurrent && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">Current</span>
                  )}
                </div>
                <p className="font-body-sm text-on-surface-variant h-10 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="font-data-mono-lg text-3xl">{plan.currency === 'ZAR' ? 'R' : '$'}{price}</span>
                  <span className="text-on-surface-variant ml-1">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
                </div>
                
                <Button
                  variant={isCurrent ? "outline" : isPopular ? "default" : "secondary"}
                  disabled={isCurrent || isPendingPayment}
                  onClick={() => handleSelect(plan)}
                  className="w-full mb-6"
                >
                  {isCurrent ? 'Active Plan' : isPendingPayment ? 'Payment Pending' : 'Select Plan'}
                </Button>

                <div className="space-y-3 flex-1">
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">Features included:</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                      <span className="text-sm">Up to {plan.limits?.maxQueues || 1} Queues</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                      <span className="text-sm">Up to {plan.limits?.maxTokens || 500} Tokens/day</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                      <span className="text-sm">Up to {plan.limits?.maxLocations || 1} Locations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                      <span className="text-sm">Up to {plan.limits?.maxServices || 1} Services</span>
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
