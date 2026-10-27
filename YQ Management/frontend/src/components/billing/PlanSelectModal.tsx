import { useState } from 'react';
import { Dialog, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckCircle2, Loader2, X, Zap, Crown, Star, Sparkles, ShieldCheck } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { fetchApi } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';

interface PlanSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: Record<string, unknown>, billingInterval: string) => void;
  isPendingPayment?: boolean;
}

function getTierIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('enterprise')) return <Crown className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
  if (n.includes('premium') || n.includes('pro')) return <Crown className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />;
  if (n.includes('standard')) return <Star className="w-5 h-5 text-sky-500 dark:text-sky-400" />;
  return <Zap className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />;
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
        const maxServices = typeof plan.limits === 'string'
          ? JSON.parse(plan.limits as string).maxServices
          : (plan.limits as Record<string, unknown>)?.maxServices;
        if (maxServices && usage.services > (maxServices as number)) {
          // Warning modal handled in parent
        }
      }
    }
    onSelectPlan(plan, billingInterval);
  };

  if (planLoading || isPlansLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose} className="sm:max-w-[450px] flex justify-center p-8 bg-surface dark:bg-zinc-900 border-border dark:border-zinc-800 rounded-3xl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Dialog>
    );
  }

  // Filter ONLY the 3 paid plans: Standard, Premium, Enterprise (Exclude Trial/Free)
  const paidPlans = (plans as any[]).filter((p: any) => {
    const isTrial = p.price === 0 || p.type === 'TRIAL' || (p.name as string).toLowerCase().includes('trial');
    return !isTrial;
  });

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={onClose} 
      className="w-[94vw] max-w-5xl max-h-[92vh] overflow-y-auto bg-surface dark:bg-zinc-900 border-border dark:border-zinc-800 rounded-[28px] md:rounded-[32px] p-5 md:p-8 shadow-2xl dark:shadow-black/80"
    >
      <button 
        onClick={onClose}
        className="absolute right-5 top-5 p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none z-20"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="text-center max-w-xl mx-auto pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Pricing & Plans
        </div>
        <DialogTitle className="text-2xl md:text-3xl font-extrabold text-on-surface dark:text-white tracking-tight">
          Choose the Perfect Plan
        </DialogTitle>
        <DialogDescription className="text-sm mt-1 text-on-surface-variant dark:text-zinc-400">
          Scale your queuing operations with high throughput, multi-location support, and real-time analytics.
        </DialogDescription>
      </div>

      {/* Interval Toggle */}
      <div className="flex justify-center my-5">
        <div className="inline-flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 rounded-xl shadow-inner">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              billingInterval === 'monthly'
                ? 'bg-white dark:bg-zinc-700 text-on-surface dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              billingInterval === 'yearly'
                ? 'bg-white dark:bg-zinc-700 text-on-surface dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Annually
            <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              Save 10%
            </span>
          </button>
        </div>
      </div>

      {downgradeError && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl mb-5 text-xs font-medium text-center">
          {downgradeError}
        </div>
      )}

      {/* Exactly 3 Paid Plans in 1 Balanced Row on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
        {paidPlans.map((plan) => {
          const isCurrent = plan.name === planName;
          const isPopular = (plan.name as string).toLowerCase().includes('premium') || (plan.name as string).toLowerCase().includes('pro');
          const isEnterprise = (plan.name as string).toLowerCase().includes('enterprise');

          const rawPrice = plan.price >= 1000 ? Math.round(plan.price / 100) : plan.price;
          const rawAnnualPrice = plan.annualPrice && plan.annualPrice >= 1000 ? Math.round(plan.annualPrice / 100) : (plan.annualPrice || 0);

          const displayPrice = billingInterval === 'yearly' && rawAnnualPrice > 0
            ? rawAnnualPrice
            : billingInterval === 'yearly'
              ? Math.floor(rawPrice * 12 * 0.9)
              : rawPrice;

          const savingsAmount = billingInterval === 'yearly'
            ? Math.max(0, (rawPrice * 12) - displayPrice)
            : 0;

          const planLimits: any = typeof plan.limits === 'string'
            ? JSON.parse(plan.limits as string)
            : (plan.limits || {});

          return (
            <div
              key={plan.id as string}
              className={`rounded-2xl border transition-all duration-300 flex flex-col justify-between p-5 md:p-6 relative overflow-hidden ${
                isCurrent
                  ? 'bg-card dark:bg-zinc-950/70 border-emerald-500 shadow-xl dark:shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                  : isPopular
                    ? 'bg-gradient-to-b from-indigo-50/70 to-white dark:from-indigo-950/30 dark:to-zinc-950/70 border-indigo-500/60 dark:border-indigo-500/50 shadow-xl dark:shadow-indigo-500/15 hover:border-indigo-500 hover:-translate-y-1'
                    : isEnterprise
                      ? 'bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-zinc-950/70 border-amber-500/40 dark:border-amber-500/30 hover:border-amber-500/60 hover:-translate-y-1'
                      : 'bg-card dark:bg-zinc-950/50 border-border dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 hover:-translate-y-1'
              }`}
            >
              {/* Top Accent Bar */}
              {isPopular && (
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              )}
              {isCurrent && (
                <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
              )}
              {isEnterprise && (
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-amber-600" />
              )}

              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : isPopular
                          ? 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border-indigo-500/20 shadow-sm'
                          : isEnterprise
                            ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/20 shadow-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                    }`}>
                      {getTierIcon(plan.name as string)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base md:text-lg text-on-surface dark:text-white leading-tight">
                        {plan.name as string}
                      </h3>
                      <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5 line-clamp-1">
                        {isEnterprise ? 'Custom Scale & SLAs' : plan.description || 'Full Features'}
                      </p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  {isCurrent && (
                    <span className="bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0">
                      Current
                    </span>
                  )}
                  {isPopular && !isCurrent && (
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider shadow-sm shrink-0">
                      Popular
                    </span>
                  )}
                  {isEnterprise && !isCurrent && (
                    <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0">
                      Scale
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl md:text-4xl font-black tracking-tight ${
                      isPopular 
                        ? 'text-indigo-600 dark:text-indigo-400' 
                        : isEnterprise
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-on-surface dark:text-white'
                    }`}>
                      {plan.currency === 'ZAR' ? 'R' : '$'}{displayPrice.toLocaleString('en-ZA')}
                    </span>
                    <span className="text-on-surface-variant dark:text-zinc-400 text-xs font-semibold">
                      /{billingInterval === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>

                  {billingInterval === 'yearly' && savingsAmount > 0 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      Save R{savingsAmount.toLocaleString('en-ZA')}/year
                    </p>
                  ) : (
                    <p className="text-xs text-on-surface-variant dark:text-zinc-500 mt-1">
                      Billed {billingInterval} via Ozow
                    </p>
                  )}
                </div>

                {/* CTA Action Button */}
                <Button
                  variant={isCurrent ? "outline" : isPopular ? "default" : "secondary"}
                  disabled={isCurrent || isPendingPayment}
                  onClick={() => handleSelect(plan)}
                  className={`w-full h-11 rounded-xl font-bold text-xs md:text-sm transition-all mb-5 ${
                    isCurrent
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-default'
                      : isPopular
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
                        : isEnterprise
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-500/20'
                          : 'dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white'
                  }`}
                >
                  {isCurrent
                    ? 'Active Plan'
                    : isPendingPayment
                      ? 'Payment Pending'
                      : `Choose ${plan.name}`
                  }
                </Button>

                {/* Feature List */}
                <div className="space-y-2.5 border-t border-border dark:border-zinc-800/80 pt-4">
                  <p className="text-[11px] text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider font-extrabold">
                    What's included:
                  </p>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-2.5">
                      <div className="p-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs text-on-surface dark:text-zinc-300 font-medium">
                        Up to {planLimits?.maxLocations || (isEnterprise ? 10 : 1)} Location{(planLimits?.maxLocations || 1) === 1 ? '' : 's'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="p-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs text-on-surface dark:text-zinc-300 font-medium">
                        Up to {planLimits?.maxServices || (isEnterprise ? 100 : 5)} Services
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="p-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs text-on-surface dark:text-zinc-300 font-medium">
                        {(planLimits?.maxTokens || (isEnterprise ? 100000 : 1000)).toLocaleString()} Tokens/month
                      </span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <div className="p-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs text-on-surface dark:text-zinc-300 font-medium">
                        Up to {planLimits?.maxStaff || planLimits?.maxMembers || (isEnterprise ? 100 : 5)} Staff Members
                      </span>
                    </li>
                    {plan.features?.whatsappNotifications && (
                      <li className="flex items-center gap-2.5">
                        <div className="p-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs text-on-surface dark:text-zinc-300 font-medium">
                          WhatsApp Notifications
                        </span>
                      </li>
                    )}
                    {plan.features?.whatsappChat && (
                      <li className="flex items-center gap-2.5">
                        <div className="p-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs text-on-surface dark:text-zinc-300 font-medium">
                          WhatsApp Interactive Chat
                        </span>
                      </li>
                    )}
                    {plan.features?.customBranding && (
                      <li className="flex items-center gap-2.5">
                        <div className="p-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs text-on-surface dark:text-zinc-300 font-medium">
                          Custom Branding & QR Portals
                        </span>
                      </li>
                    )}
                    {isEnterprise && (
                      <li className="flex items-center gap-2.5">
                        <div className="p-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs text-on-surface dark:text-zinc-300 font-medium">
                          Dedicated Account Support & SLAs
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Bottom security seal */}
              <div className="mt-5 pt-3.5 border-t border-border/60 dark:border-zinc-800/60 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Instant EFT via Ozow</span>
              </div>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
