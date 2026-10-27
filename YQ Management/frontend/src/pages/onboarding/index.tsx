import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import {
  QrCode, Loader2, Store, Activity, Pizza, Briefcase, Check, Keyboard, Copy,
  CheckCircle2, Users, Scissors, Landmark, Truck, Utensils, Workflow,
  Plus, Trash2, MapPin, ChevronDown, ChevronUp, Zap, AlertTriangle, Building2,
  Sparkles, ArrowRight,
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useWhatsapp from '../../hooks/useWhatsapp';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useAuth } from '../../components/AuthContext';
import { countryCodes as allCountryCodes } from '../../lib/country-codes';
import { JoinWorkspaceModal } from '../../components/modals/JoinWorkspaceModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingService {
  name: string;
  description?: string;
  expectedDuration?: number;
  allowAppointments?: boolean;
  seedFlow: boolean; // seed with default journey template
}

interface OnboardingLocation {
  id: string; // local uuid for tracking
  name: string;
  address: string;
  industryKey: string;
  subTypeKey: string;
  services: OnboardingService[];
  enableWaitlist: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRY_CODES = allCountryCodes
  .map((c) => ({ country: c.country, code: c.code, name: c.name, label: `${c.name} (${c.code})` }))
  .sort((a, b) => a.name.localeCompare(b.name));

const ICON_MAP: Record<string, any> = {
  healthcare: Activity,
  food_and_beverage: Pizza,
  government_and_civic: Briefcase,
  events_and_invitations: Utensils,
  beauty_and_wellness: Scissors,
  hospitality_and_accommodation: Store,
  finance_and_insurance: Landmark,
  fitness_and_recreation: Activity,
  automotive_and_mechanical: Truck,
  logistics_and_supply_chain: Truck,
  education_and_training: Users,
  legal_and_professional: Briefcase,
  retail_and_commerce: Store,
  corporate_and_hr: Users,
};

function makeLocId() {
  return Math.random().toString(36).slice(2, 10);
}

function makeDefaultLocation(): OnboardingLocation {
  return {
    id: makeLocId(),
    name: '',
    address: '',
    industryKey: '',
    subTypeKey: '',
    services: [],
    enableWaitlist: true,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Card for a single onboarding location in the multi-location builder */
function LocationCard({
  loc,
  index,
  businessCatalog,
  canRemove,
  onUpdate,
  onRemove,
}: {
  loc: OnboardingLocation;
  index: number;
  businessCatalog: any[];
  canRemove: boolean;
  onUpdate: (updated: OnboardingLocation) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const selectedIndustry = businessCatalog.find((i: any) => i.key === loc.industryKey);
  const selectedSubType = selectedIndustry?.subTypes?.find((s: any) => s.key === loc.subTypeKey);
  const templateServices: any[] = selectedSubType?.services ?? [];

  const handleIndustryChange = (key: string) => {
    onUpdate({ ...loc, industryKey: key, subTypeKey: '', services: [] });
  };

  const handleSubTypeChange = (key: string) => {
    const industry = businessCatalog.find((i: any) => i.key === loc.industryKey);
    const sub = industry?.subTypes?.find((s: any) => s.key === key);
    // Pre-select all template services with seedFlow=true
    const services: OnboardingService[] = (sub?.services ?? []).map((s: any) => ({
      name: s.name,
      description: s.description,
      expectedDuration: s.expectedDuration,
      allowAppointments: s.allowAppointments,
      seedFlow: true,
    }));
    onUpdate({ ...loc, subTypeKey: key, services });
  };

  const toggleService = (svcName: string) => {
    const exists = loc.services.find((s) => s.name === svcName);
    if (exists) {
      onUpdate({ ...loc, services: loc.services.filter((s) => s.name !== svcName) });
    } else {
      const template = templateServices.find((s: any) => s.name === svcName);
      onUpdate({
        ...loc,
        services: [
          ...loc.services,
          {
            name: svcName,
            description: template?.description,
            expectedDuration: template?.expectedDuration,
            allowAppointments: template?.allowAppointments,
            seedFlow: true,
          },
        ],
      });
    }
  };

  const toggleSeedFlow = (svcName: string) => {
    onUpdate({
      ...loc,
      services: loc.services.map((s) =>
        s.name === svcName ? { ...s, seedFlow: !s.seedFlow } : s,
      ),
    });
  };

  const Icon = ICON_MAP[loc.industryKey] || Building2;
  const serviceCount = loc.services.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-border dark:border-dark-border bg-canvas dark:bg-black/40 overflow-hidden"
    >
      {/* Card Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-surface-bright dark:bg-zinc-900/60 border-b border-border dark:border-dark-border">
        <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-sky-500/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary dark:text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-on-surface dark:text-white text-sm truncate">
            {loc.name || `Location ${index + 1}`}
          </p>
          <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">
            {serviceCount} service{serviceCount !== 1 ? 's' : ''} selected
            {loc.subTypeKey && selectedSubType ? ` · ${selectedSubType.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {canRemove && (
            <button
              onClick={onRemove}
              className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Remove location"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-white/5 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Card Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-5">
              {/* Name & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary dark:text-sky-400" />
                    Location Name
                  </label>
                  <input
                    type="text"
                    value={loc.name}
                    onChange={(e) => onUpdate({ ...loc, name: e.target.value })}
                    placeholder="e.g. Main Branch, Downtown Clinic"
                    className="w-full h-11 px-3.5 rounded-xl border border-border dark:border-dark-border bg-white/60 dark:bg-black/40 text-on-surface dark:text-white placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface dark:text-white">Address (optional)</label>
                  <input
                    type="text"
                    value={loc.address}
                    onChange={(e) => onUpdate({ ...loc, address: e.target.value })}
                    placeholder="123 Main St, City"
                    className="w-full h-11 px-3.5 rounded-xl border border-border dark:border-dark-border bg-white/60 dark:bg-black/40 text-on-surface dark:text-white placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Industry Selection */}
              {businessCatalog.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface dark:text-white">Business Industry</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {businessCatalog.map((industry: any) => {
                      const Ico = ICON_MAP[industry.key] || Store;
                      const sel = loc.industryKey === industry.key;
                      return (
                        <button
                          key={industry.key}
                          onClick={() => handleIndustryChange(industry.key)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-sm ${
                            sel
                              ? 'bg-primary-fixed dark:bg-sky-900/20 border-primary text-on-surface dark:text-white font-semibold'
                              : 'border-border dark:border-dark-border text-on-surface-variant dark:text-zinc-400 hover:border-outline-variant hover:text-on-surface dark:hover:text-white'
                          }`}
                        >
                          <Ico className={`w-4 h-4 shrink-0 ${sel ? 'text-primary dark:text-sky-400' : ''}`} />
                          <span className="truncate">{industry.name.split(' &')[0].split(' and')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-Type Selection */}
              {loc.industryKey && selectedIndustry?.subTypes?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface dark:text-white">Business Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedIndustry.subTypes.map((sub: any) => {
                      const sel = loc.subTypeKey === sub.key;
                      return (
                        <button
                          key={sub.key}
                          onClick={() => handleSubTypeChange(sub.key)}
                          className={`text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                            sel
                              ? 'bg-primary-fixed dark:bg-sky-900/20 border-primary text-on-surface dark:text-white'
                              : 'border-border dark:border-dark-border text-on-surface-variant dark:text-zinc-400 hover:border-outline-variant hover:text-on-surface dark:hover:text-white'
                          }`}
                        >
                          <p className="font-semibold">{sub.name}</p>
                          <p className="text-xs opacity-70 mt-0.5 line-clamp-1">{sub.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Services Selection */}
              {loc.subTypeKey && templateServices.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-on-surface dark:text-white">
                      Services
                      <span className="ml-2 text-xs font-normal text-on-surface-variant dark:text-zinc-400">
                        ({loc.services.length} selected)
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const services: OnboardingService[] = templateServices.map((s: any) => ({
                            name: s.name,
                            description: s.description,
                            expectedDuration: s.expectedDuration,
                            allowAppointments: s.allowAppointments,
                            seedFlow: true,
                          }));
                          onUpdate({ ...loc, services });
                        }}
                        className="text-xs text-primary dark:text-sky-400 hover:underline"
                      >
                        Select all
                      </button>
                      <span className="text-xs text-outline">·</span>
                      <button
                        onClick={() => onUpdate({ ...loc, services: [] })}
                        className="text-xs text-on-surface-variant dark:text-zinc-400 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {templateServices.map((svc: any) => {
                      const selected = loc.services.find((s) => s.name === svc.name);
                      const seedFlow = selected?.seedFlow ?? false;
                      return (
                        <div
                          key={svc.name}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            selected
                              ? 'bg-primary/5 dark:bg-sky-500/5 border-primary/30 dark:border-sky-500/30'
                              : 'border-border dark:border-dark-border hover:border-outline-variant'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => toggleService(svc.name)}
                            className="w-4 h-4 text-primary rounded border-border dark:border-dark-border focus:ring-primary shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${selected ? 'text-on-surface dark:text-white' : 'text-on-surface-variant dark:text-zinc-400'}`}>
                              {svc.name}
                            </p>
                            <p className="text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">
                              {svc.expectedDuration} min{svc.allowAppointments ? ' · Appointments' : ''}
                            </p>
                          </div>
                          {/* Seed flows toggle — only shown when service is selected */}
                          {selected && (
                            <button
                              onClick={() => toggleSeedFlow(svc.name)}
                              title={seedFlow ? 'Default flows will be seeded' : 'No flows — configure manually'}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                                seedFlow
                                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-surface-container-high dark:bg-zinc-800 text-on-surface-variant dark:text-zinc-400'
                              }`}
                            >
                              <Workflow className="w-3 h-3" />
                              {seedFlow ? 'Flows' : 'No flows'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Waitlist toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loc.enableWaitlist}
                  onChange={(e) => onUpdate({ ...loc, enableWaitlist: e.target.checked })}
                  className="w-4 h-4 text-primary rounded border-border dark:border-dark-border focus:ring-primary"
                />
                <div>
                  <p className="text-sm font-medium text-on-surface dark:text-white">Enable Walk-in Waitlist</p>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400">Uncheck if this location operates by appointment only.</p>
                </div>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Plan Meter — shows resource usage and smart plan recommendation */
function PlanMeter({
  totalLocations,
  totalServices,
  planFitData,
  isLoading,
}: {
  totalLocations: number;
  totalServices: number;
  planFitData: any;
  isLoading: boolean;
}) {
  if (isLoading || !planFitData) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const { trialFits, recommendedPlanId, plans } = planFitData;
  const nonEnterprisePlans = (plans ?? []).filter((p: any) => !p.plan.name.toLowerCase().includes('enterprise'));
  const recommendedPlan = plans?.find((p: any) => p.plan.id === recommendedPlanId);

  return (
    <div className="space-y-6">
      {/* Resource summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-low dark:bg-zinc-900 rounded-2xl p-4 border border-border dark:border-dark-border text-center">
          <p className="text-3xl font-bold text-on-surface dark:text-white">{totalLocations}</p>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Location{totalLocations !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="bg-surface-container-low dark:bg-zinc-900 rounded-2xl p-4 border border-border dark:border-dark-border text-center">
          <p className="text-3xl font-bold text-on-surface dark:text-white">{totalServices}</p>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1 flex items-center justify-center gap-1">
            <Workflow className="w-3.5 h-3.5" /> Service{totalServices !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Trial fits banner */}
      {trialFits ? (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl">
          <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
              ✅ Your setup fits the Free Trial!
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              {totalLocations} location{totalLocations !== 1 ? 's' : ''} · {totalServices} service{totalServices !== 1 ? 's' : ''} — start free for 14 days, no credit card needed.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              ⬆ Your setup needs {recommendedPlan?.plan?.name ?? 'a higher plan'}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              The free trial allows up to {plans?.[0]?.plan?.limits?.maxLocations ?? 1} location{(plans?.[0]?.plan?.limits?.maxLocations ?? 1) !== 1 ? 's' : ''} and {plans?.[0]?.plan?.limits?.maxServices ?? 5} services.
              {' '}You selected {totalLocations} location{totalLocations !== 1 ? 's' : ''} and {totalServices} service{totalServices !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-on-surface dark:text-white">Available Plans</p>
        {nonEnterprisePlans.map((planResult: any) => {
          const { plan, fits, isTrial } = planResult;
          const isRecommended = plan.id === recommendedPlanId;
          const currency = plan.currency === 'ZAR' ? 'R' : '$';
          const priceDisplay = plan.price === 0 ? 'Free' : `${currency}${(plan.price / 100).toFixed(0)}/mo`;

          return (
            <div
              key={plan.id}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                isRecommended
                  ? 'bg-primary/5 dark:bg-sky-500/5 border-primary dark:border-sky-500 shadow-sm'
                  : fits
                  ? 'border-border dark:border-dark-border bg-canvas dark:bg-black/20'
                  : 'border-border dark:border-dark-border bg-canvas dark:bg-black/20 opacity-60'
              }`}
            >
              {/* Fit indicator */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                fits ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-surface-container-high dark:bg-zinc-800'
              }`}>
                {fits
                  ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  : <Zap className="w-4 h-4 text-on-surface-variant dark:text-zinc-500" />
                }
              </div>

              {/* Plan info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-on-surface dark:text-white text-sm">{plan.name}</p>
                  {isRecommended && (
                    <span className="text-[10px] font-bold bg-primary text-white dark:bg-sky-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {isTrial ? '✅ Fits Free' : 'Best Fit'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">
                  Up to {plan.limits?.maxLocations ?? '∞'} location{(plan.limits?.maxLocations ?? 0) !== 1 ? 's' : ''} · {plan.limits?.maxServices ?? '∞'} services · {plan.limits?.maxStaff ?? '∞'} staff
                </p>
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <p className={`font-bold text-sm ${isRecommended ? 'text-primary dark:text-sky-400' : 'text-on-surface dark:text-white'}`}>
                  {priceDisplay}
                </p>
                {isTrial && <p className="text-xs text-on-surface-variant dark:text-zinc-400">14-day trial</p>}
              </div>
            </div>
          );
        })}

        {/* Enterprise */}
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-border dark:border-dark-border opacity-80">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-violet-100 dark:bg-violet-500/20">
            <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-on-surface dark:text-white text-sm">Enterprise Plan</p>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">Custom limits · Dedicated support · API access</p>
          </div>
          <p className="text-sm font-bold text-on-surface dark:text-white shrink-0">Contact sales</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────

export default function Onboarding() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: businessCatalog = [] } = useQuery({
    queryKey: ['business-catalog'],
    queryFn: () => fetchApi('/onboarding/business-catalog'),
  });

  // ── Step management ────────────────────────────────────────────────────────
  // Steps: 0=welcome, 1=personal info, 2=location builder, 3=plan meter,
  //        4=plan commit, 5=provisioning, 6=google, 7=whatsapp, 8=done
  //        9=invite join
  const [step, setStep] = useState<number>(0);

  // ── Personal info ──────────────────────────────────────────────────────────
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<AnyFixMe>(null);
  const [isJoinTeamModalOpen, setIsJoinTeamModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCountryIso, setSelectedCountryIso] = useState('ZA');
  const [countryCode, setCountryCode] = useState('+27');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // ── Multi-location builder state ───────────────────────────────────────────
  const [locations, setLocations] = useState<OnboardingLocation[]>([makeDefaultLocation()]);

  // ── Plan selection ─────────────────────────────────────────────────────────
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [trialAgreed, setTrialAgreed] = useState(false);

  // ── Payment / provisioning ─────────────────────────────────────────────────
  const [paymentData, setPaymentData] = useState<AnyFixMe>(null);
  const paymentFormRef = useRef<HTMLFormElement>(null);
  const ozowFields = useMemo<Array<string>>(
    () => ['siteCode', 'countryCode', 'currencyCode', 'amount', 'transactionReference', 'bankReference', 'cancelUrl', 'errorUrl', 'successUrl', 'notifyUrl', 'isTest', 'hashCheck'],
    [],
  );

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'qr' | 'code'>('qr');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingPhoneNumber, setPairingPhoneNumber] = useState('');
  const [pairingCopied, setPairingCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // ── Google integration ─────────────────────────────────────────────────────
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [joiningWorkspace, setJoiningWorkspace] = useState(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  const derivedSubdomain = useMemo(
    () => companyName ? companyName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : '',
    [companyName],
  );
  const [debouncedSubdomain, setDebouncedSubdomain] = useState(derivedSubdomain);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSubdomain(derivedSubdomain), 500);
    return () => clearTimeout(t);
  }, [derivedSubdomain]);

  const totalLocations = locations.length;
  const totalServices = locations.reduce((sum, loc) => sum + loc.services.length, 0);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: subdomainCheck, isFetching: isCheckingSubdomain } = useQuery({
    queryKey: ['check-subdomain', debouncedSubdomain],
    queryFn: async () => {
      if (!debouncedSubdomain) return null;
      try {
        const tenant = await fetchApi(`/tenant/public/${debouncedSubdomain}`);
        if (tenant?.id === user?.tenantId) return { taken: false, error: false, isCurrentTenant: true };
        return { taken: true, error: false, isCurrentTenant: false };
      } catch (err: any) {
        if (err.status === 404) return { taken: false, error: false, isCurrentTenant: false };
        return { taken: false, error: true, isCurrentTenant: false };
      }
    },
    enabled: !!debouncedSubdomain,
    retry: false,
  });

  const { data: planFitData, isFetching: isFetchingPlanFit } = useQuery({
    queryKey: ['plan-fit', totalLocations, totalServices],
    queryFn: () => fetchApi(`/onboarding/check-plan-fit?locations=${totalLocations}&services=${totalServices}`),
    enabled: step >= 3, // Only fetch when on plan meter step or later
    staleTime: 30_000,
  });

  const { data: googleSettings, refetch: refetchGoogleSettings } = useQuery({
    queryKey: ['google-business-settings-onboarding'],
    queryFn: () => fetchApi('/integrations/google/business-profile').catch(() => null),
    enabled: step === 6,
  });

  const { data: allPlans = [] } = useQuery({
    queryKey: ['active-plans'],
    queryFn: () => fetchApi('/billing/plans?status=ACTIVE'),
  });

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const {
    statusQuery: whatsappStatusQuery,
    cachedQrQuery,
    connectMutation: connectWhatsAppMutation,
    pairingCodeMutation: generatePairingCodeMutation,
  } = useWhatsapp();
  const whatsappStatus = whatsappStatusQuery.data;

  useEffect(() => {
    if (step === 7 && cachedQrQuery.data?.qr) setQrCode(cachedQrQuery.data.qr);
  }, [step, cachedQrQuery.data]);

  useEffect(() => {
    if (whatsappStatus?.state === 'open') {
      setQrCode(null); setPairingCode(null); setPairingPhoneNumber('');
    } else if (whatsappStatus?.state === 'connecting' && whatsappStatus.qr) {
      setQrCode(whatsappStatus.qr);
    } else if (whatsappStatus?.state === 'close' || whatsappStatus?.state === 'unconfigured') {
      setQrCode(null);
    }
  }, [whatsappStatus]);

  // ── Auto-detect country ────────────────────────────────────────────────────
  useEffect(() => {
    import('../../lib/country-codes').then(({ detectCountryCode }) => {
      detectCountryCode().then((country) => {
        if (country) { setSelectedCountryIso(country.country); setCountryCode(country.code); }
      });
    }).catch(() => {});
  }, []);

  // ── Prefill from user profile ──────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      if (user.fullName && !fullName) setFullName(user.fullName);
      if (user.tenant?.name && !companyName) setCompanyName(user.tenant.name);
      else if (user.email && !companyName) {
        const domain = user.email.split('@')[1];
        if (domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(domain)) {
          const str = domain.split('.')[0];
          setCompanyName(str.charAt(0).toUpperCase() + str.slice(1));
        }
      }
      if (user.phone && !phone) setPhone(user.phone);
    }
  }, [user?.id]);

  // ── Restore from localStorage ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const code = (router.query.inviteCode || router.query.code || localStorage.getItem('qmova_invite_code')) as string;
    if (typeof code === 'string' && code.trim()) {
      const trimmed = code.trim().toUpperCase();
      setInviteCode(trimmed);
      fetchApi(`/workspace/invite-preview/${trimmed}`)
        .then((res: AnyFixMe) => {
          if (res?.valid) { setInviteInfo(res); if (!companyName) setCompanyName(res.workspaceName); }
        })
        .catch(() => {});
    }
    if (router.query.googleAuth === 'success') {
      toast.success('Google account connected successfully!');
      setStep(6);
      refetchGoogleSettings();
      const url = new URL(window.location.href);
      url.searchParams.delete('googleAuth');
      window.history.replaceState({}, '', url.toString());
    }
    const savedStep = localStorage.getItem('onboarding_step_v2');
    if (savedStep) {
      const parsed = parseInt(savedStep, 10);
      if (parsed >= 1 && parsed <= 8) setStep(parsed);
    }
    const savedData = localStorage.getItem('onboarding_form_v2');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.selectedCountryIso) setSelectedCountryIso(parsed.selectedCountryIso);
        if (parsed.countryCode) setCountryCode(parsed.countryCode);
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (Array.isArray(parsed.locations) && parsed.locations.length > 0) setLocations(parsed.locations);
      } catch {}
    }
  }, [router.query]);

  // ── Invite flow redirect ───────────────────────────────────────────────────
  useEffect(() => {
    if (inviteCode && step >= 2 && step <= 8) setStep(9);
  }, [inviteCode, step]);

  // ── Google integration state sync ──────────────────────────────────────────
  useEffect(() => {
    if (googleSettings?.googleIntegrations?.length > 0 && !selectedIntegrationId) {
      setSelectedIntegrationId(googleSettings.googleIntegrations[0].id);
    }
  }, [googleSettings, selectedIntegrationId]);

  // ── Persist form state ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('onboarding_step_v2', step.toString());
    localStorage.setItem('onboarding_form_v2', JSON.stringify({
      fullName, companyName, phone, selectedCountryIso, countryCode, timezone, locations,
    }));
  }, [step, fullName, companyName, phone, selectedCountryIso, countryCode, timezone, locations]);

  // ── Redirect if already onboarded ─────────────────────────────────────────
  useEffect(() => {
    if (user?.personalSettings?.onboardingCompleted && step !== 9 && !showConfetti) {
      router.replace('/dashboard');
    }
  }, [user?.personalSettings?.onboardingCompleted, step, showConfetti, router]);

  useEffect(() => {
    if (paymentData) {
      const t = window.setTimeout(() => {
        try { paymentFormRef.current?.requestSubmit(); } catch { try { paymentFormRef.current?.submit(); } catch {} }
      }, 100);
      return () => window.clearTimeout(t);
    }
  }, [paymentData]);

  // ── Location helpers ───────────────────────────────────────────────────────
  const addLocation = () => setLocations((prev) => [...prev, makeDefaultLocation()]);
  const removeLocation = (id: string) => setLocations((prev) => prev.filter((l) => l.id !== id));
  const updateLocation = useCallback((updated: OnboardingLocation) => {
    setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const savePersonalInfoMutation = useMutation({
    mutationFn: () => {
      const formattedPhone = phone.trim().startsWith('+') ? phone.trim() : `${countryCode} ${phone.trim().replace(/^0/, '')}`;
      const subdomainStr = companyName ? companyName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : undefined;
      return fetchApi('/auth/personal-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName,
          phone: formattedPhone,
          companyName: inviteCode ? (inviteInfo?.workspaceName || 'Team Workspace') : companyName,
          timezone,
          ...(subdomainStr ? { subdomain: subdomainStr } : {}),
        }),
      });
    },
    onSuccess: () => {
      if (inviteCode) { setStep(9); } else { setStep(2); }
      toast.success('Information saved');
    },
    onError: () => toast.error('Failed to save information. Please try again.'),
  });

  const provisionMutation = useMutation({
    mutationFn: async ({ planId, isTrial }: { planId?: string; isTrial?: boolean } = {}) => {
      const activePlanId = planId || selectedPlanId;
      await fetchApi('/onboarding/provision-multi', {
        method: 'POST',
        body: JSON.stringify({
          planId: activePlanId || undefined,
          locations: locations.map((loc) => {
            // Find the blueprintKey from catalog
            const industry = (businessCatalog as any[]).find((i: any) => i.key === loc.industryKey);
            const sub = industry?.subTypes?.find((s: any) => s.key === loc.subTypeKey);
            return {
              name: loc.name || `Location ${locations.indexOf(loc) + 1}`,
              address: loc.address || undefined,
              businessType: loc.subTypeKey,
              blueprintKey: sub?.flowTemplateKey ?? null,
              operatingMode: 'QUEUE_ONLY',
              enableWaitlist: loc.enableWaitlist,
              services: loc.services,
            };
          }),
        }),
      });
      return { isTrial: isTrial ?? true, activePlanId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['locations', 'services', 'current-subscription'] });
      toast.success('Workspace provisioned successfully!');
      if (data?.isTrial) {
        setStep(6); // → Google
      } else if (data?.activePlanId) {
        subscribeMutation.mutate({ planId: data.activePlanId, billingInterval: 'monthly' });
      } else {
        setStep(6);
      }
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to provision workspace. Please try again.'),
  });

  const subscribeMutation = useMutation({
    mutationFn: (data: { planId: string; billingInterval: string }) =>
      fetchApi('/payments/generate-link', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (data: AnyFixMe) => {
      if (data?.checkoutUrl || data?.paymentUrl) {
        setPaymentData(data);
      } else {
        toast.error('Could not initiate checkout');
      }
    },
    onError: () => toast.error('Error generating payment link'),
  });

  const saveGoogleSettingsMutation = useMutation({
    mutationFn: async () => {
      const locs = googleSettings?.locations || [];
      if (locs.length > 0 && selectedIntegrationId) {
        await fetchApi('/integrations/google/business-profile', {
          method: 'PATCH',
          body: JSON.stringify({
            locations: [{ id: locs[0].id, googleIntegrationId: selectedIntegrationId, googlePlaceId: googlePlaceId || null, googleCalendarId: null }],
          }),
        });
      }
    },
    onSuccess: () => setStep(7),
  });

  const handleConfirmJoinWorkspace = async () => {
    if (!inviteCode) return;
    setJoiningWorkspace(true);
    try {
      await fetchApi('/auth/join-with-invite', { method: 'POST', body: JSON.stringify({ inviteCode }) });
      await fetchApi('/auth/personal-settings', { method: 'PATCH', body: JSON.stringify({ onboardingCompleted: true }) });
      localStorage.removeItem('qmova_invite_code');
      localStorage.removeItem('onboarding_step_v2');
      localStorage.removeItem('onboarding_form_v2');
      document.cookie = 'qmova_invite_code=; path=/; max-age=0; SameSite=Lax';
      toast.success(`You have successfully joined ${inviteInfo?.workspaceName || 'the workspace'}!`);
      router.push('/dashboard');
    } catch (err: AnyFixMe) {
      toast.error(err.message || 'Failed to join workspace');
    } finally {
      setJoiningWorkspace(false);
    }
  };

  const finishOnboarding = async () => {
    try {
      await fetchApi('/auth/personal-settings', { method: 'PATCH', body: JSON.stringify({ onboardingCompleted: true }) });
    } catch {}
    setShowConfetti(true);
    localStorage.removeItem('onboarding_step_v2');
    localStorage.removeItem('onboarding_form_v2');
    setTimeout(() => router.push('/dashboard'), 2500);
  };

  // ── Plan commit handler ────────────────────────────────────────────────────
  const handlePlanCommit = async (planId: string, isTrial: boolean) => {
    setSelectedPlanId(planId);
    if (isTrial) {
      if (!trialAgreed) {
        toast.error('Please confirm you want to start the 14-day free trial.');
        return;
      }
      setStep(5);
      provisionMutation.mutate({ planId, isTrial: true });
    } else {
      setStep(5);
      provisionMutation.mutate({ planId, isTrial: false });
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const locationsValid = locations.every((l) => l.name.trim().length > 0 && l.services.length > 0);
  const personalInfoValid = fullName.trim().length > 0 && (inviteCode || (companyName.trim().length > 0 && subdomainCheck && !subdomainCheck.taken && !subdomainCheck.error && !isCheckingSubdomain));

  // ── Step labels for progress ───────────────────────────────────────────────
  const TOTAL_STEPS = inviteCode ? 2 : 8;
  const currentStepProgress = inviteCode ? (step === 1 ? 1 : 2) : Math.min(step, 8);

  // ── Loading / redirected states ────────────────────────────────────────────
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (user?.personalSettings?.onboardingCompleted && step !== 9 && !showConfetti) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Head><title>Workspace Ready | Qmova</title></Head>
        <div className="w-full max-w-md bg-card dark:bg-dark-card rounded-[2.5rem] border border-border dark:border-dark-border p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">You're already set up!</h1>
          <p className="text-on-surface-variant mb-4">Redirecting to your dashboard...</p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-x-hidden font-sans selection:bg-primary/20">
      {/* Background glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] dark:bg-sky-500/20 mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-sky-400/10 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      {showConfetti && <Confetti width={typeof window !== 'undefined' ? window.innerWidth : 1000} height={typeof window !== 'undefined' ? window.innerHeight : 1000} recycle={false} numberOfPieces={500} gravity={0.15} style={{ zIndex: 100 }} />}

      <Head><title>Onboarding | Qmova</title></Head>

      <main className={`w-full ${step === 2 || step === 3 ? 'max-w-4xl' : 'max-w-2xl'} transition-[max-width] duration-500 ease-in-out bg-white/70 dark:bg-[#121212]/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 md:p-8 relative z-10 overflow-hidden my-6 md:my-8`}>
        {/* Progress bar */}
        {step > 0 && (
          <div className="flex gap-2 mb-6 w-full max-w-[200px] mx-auto">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i + 1 <= currentStepProgress ? 'bg-primary dark:bg-sky-500' : 'bg-surface-variant dark:bg-zinc-800'}`}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ═══ STEP 0: Welcome ════════════════════════════════════════════ */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-6 items-center text-center py-4">
              <Logo width={140} height={22} />
              <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight mt-4">Welcome to Qmova</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-lg mx-auto">Are you setting up a new business workspace, or joining an existing team?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl mt-6">
                <button onClick={() => setStep(1)} className="p-6 rounded-2xl border-2 border-border dark:border-dark-border hover:border-[#0284C7] bg-white dark:bg-zinc-800 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-all text-left">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center mb-4"><Store className="w-6 h-6 text-[#0284C7]" /></div>
                  <h3 className="text-lg font-bold text-on-surface dark:text-white mb-1">Create Workspace</h3>
                  <p className="text-sm text-on-surface-variant dark:text-zinc-400">I am the owner or admin setting up a new Qmova account.</p>
                </button>
                <button
                  onClick={() => setIsJoinTeamModalOpen(true)}
                  className="p-6 rounded-2xl border-2 border-border dark:border-dark-border hover:border-[#7C3AED] bg-white dark:bg-zinc-800 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center mb-4"><Users className="w-6 h-6 text-[#7C3AED]" /></div>
                  <h3 className="text-lg font-bold text-on-surface dark:text-white mb-1">Join Team</h3>
                  <p className="text-sm text-on-surface-variant dark:text-zinc-400">I have an invite code from my manager to join as staff.</p>
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 1: Personal Info ══════════════════════════════════════ */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-6">
              <header className="text-center flex flex-col items-center gap-2">
                <Logo width={160} height={26} />
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">{inviteCode ? 'Join Your Team' : 'Welcome to Qmova'}</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-lg mx-auto">{inviteCode ? "Let's save your personal profile before entering your workspace." : "Let's start by getting to know you and your business."}</p>
              </header>
              <div className="space-y-5 mt-2">
                <div className="space-y-2">
                  <label className="font-body-md font-medium text-on-surface dark:text-white block">Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full h-14 px-4 rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-md focus:bg-white dark:focus:bg-black focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface dark:text-white placeholder:text-outline-variant" placeholder="Jane Doe" />
                </div>
                {inviteCode ? (
                  <div className="p-6 bg-primary-fixed dark:bg-sky-900/20 border border-primary-fixed-dim dark:border-sky-500/20 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                    <div className="flex items-center gap-3 mb-2"><span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" /><p className="font-label-caps text-label-caps uppercase tracking-wider text-on-primary-fixed dark:text-sky-300">Joining Workspace</p></div>
                    <p className="font-headline-sm text-headline-sm text-on-surface dark:text-white font-bold">{inviteInfo?.workspaceName || 'Team Workspace'}</p>
                    <p className="font-body-sm text-on-surface-variant dark:text-sky-200/70 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full border border-primary-fixed-dim/50">Role: <span className="font-bold uppercase text-primary dark:text-sky-400">{inviteInfo?.role || 'STAFF'}</span></p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="font-body-md font-medium text-on-surface dark:text-white block">Company / Workspace Name</label>
                    <div className="relative">
                      <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={`w-full h-14 px-4 rounded-xl border bg-white/50 dark:bg-black/40 backdrop-blur-md outline-none transition-all text-on-surface dark:text-white placeholder:text-outline-variant ${subdomainCheck?.taken ? 'border-red-500/50 focus:border-red-500' : 'border-white/40 dark:border-white/10 focus:border-primary focus:ring-2 focus:ring-primary/20'}`} placeholder="Acme Corp" />
                      {companyName.length > 0 && (
                        <div className={`absolute -bottom-5 left-1 text-[12px] flex items-center gap-1 ${!subdomainCheck || isCheckingSubdomain ? 'text-zinc-500' : subdomainCheck.taken ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isCheckingSubdomain ? <Loader2 className="w-3 h-3 animate-spin" /> : subdomainCheck?.taken ? '⚠' : <CheckCircle2 className="w-3 h-3" />}
                          {derivedSubdomain || 'your-company'}.{process.env.NEXT_PUBLIC_DOMAIN_BASE || 'qmova.com'}{subdomainCheck?.taken ? ' (taken)' : subdomainCheck && !isCheckingSubdomain ? ' (available)' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2 pt-1">
                  <label className="font-body-md font-medium text-on-surface dark:text-white block">Phone Number</label>
                  <div className="flex h-14 rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-md overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <select value={selectedCountryIso} onChange={(e) => { const iso = e.target.value; setSelectedCountryIso(iso); const c = COUNTRY_CODES.find((x) => x.country === iso); if (c) setCountryCode(c.code); }} className="bg-surface-container-lowest dark:bg-black/20 text-on-surface dark:text-white font-medium px-4 border-r border-border dark:border-dark-border focus:outline-none text-sm w-[140px] truncate">
                      {COUNTRY_CODES.map((c, i) => <option key={`${c.country}-${i}`} value={c.country}>{c.label}</option>)}
                    </select>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 bg-transparent text-on-surface dark:text-white placeholder:text-outline-variant outline-none" placeholder="71 234 5678" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-body-md font-medium text-on-surface dark:text-white block">Timezone</label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full h-14 px-4 rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-md focus:bg-white dark:focus:bg-black focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface dark:text-white">
                    {Intl.supportedValuesOf('timeZone').map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <button onClick={() => setStep(0)} className="px-5 py-2 rounded-lg text-on-surface-variant dark:text-outline hover:bg-surface-container-high dark:hover:bg-white/5 transition-colors text-sm">Back</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => savePersonalInfoMutation.mutate()} disabled={savePersonalInfoMutation.isPending || !personalInfoValid} className="min-h-[44px] px-8 rounded-lg font-medium bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
                  {savePersonalInfoMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 2: Location Builder (multi-location) ══════════════════ */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-6">
              <header className="text-center flex flex-col gap-2">
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">Set Up Your Locations</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-xl mx-auto">
                  Add each of your locations, choose the services offered, and optionally seed them with pre-built journey flows.
                </p>
              </header>

              {/* Location cards */}
              <div className="space-y-4">
                <AnimatePresence>
                  {locations.map((loc, idx) => (
                    <LocationCard
                      key={loc.id}
                      loc={loc}
                      index={idx}
                      businessCatalog={businessCatalog as any[]}
                      canRemove={locations.length > 1}
                      onUpdate={updateLocation}
                      onRemove={() => removeLocation(loc.id)}
                    />
                  ))}
                </AnimatePresence>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={addLocation}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border dark:border-dark-border text-on-surface-variant dark:text-zinc-400 hover:border-primary/50 hover:text-primary dark:hover:text-sky-400 transition-all text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Location
                </motion.button>
              </div>

              {/* Resource meter preview */}
              <div className="flex items-center gap-4 p-4 bg-surface-container-low dark:bg-zinc-900/60 rounded-2xl border border-border dark:border-dark-border text-sm">
                <div className="flex items-center gap-2 text-on-surface dark:text-white">
                  <MapPin className="w-4 h-4 text-primary dark:text-sky-400" />
                  <span className="font-semibold">{totalLocations}</span>
                  <span className="text-on-surface-variant dark:text-zinc-400">location{totalLocations !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-4 w-px bg-border dark:bg-dark-border" />
                <div className="flex items-center gap-2 text-on-surface dark:text-white">
                  <Workflow className="w-4 h-4 text-primary dark:text-sky-400" />
                  <span className="font-semibold">{totalServices}</span>
                  <span className="text-on-surface-variant dark:text-zinc-400">service{totalServices !== 1 ? 's' : ''} total</span>
                </div>
                <div className="ml-auto text-xs text-on-surface-variant dark:text-zinc-400">
                  Plan match shown in next step →
                </div>
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                <button onClick={() => setStep(1)} className="w-full sm:w-auto px-6 py-2 rounded-lg text-on-surface-variant dark:text-outline hover:bg-surface-container-high dark:hover:bg-white/5 transition-colors text-sm font-medium">Back</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(3)} disabled={!locationsValid || totalServices === 0} className="w-full sm:w-auto min-h-[44px] px-8 rounded-lg font-medium bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
                  See Plan Options <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: Plan Meter + Smart Recommendation ══════════════════ */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-6">
              <header className="text-center flex flex-col gap-2">
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">Choose Your Plan</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-lg mx-auto">
                  Based on your {totalLocations} location{totalLocations !== 1 ? 's' : ''} and {totalServices} service{totalServices !== 1 ? 's' : ''}, we've highlighted the best plan for you.
                </p>
              </header>

              <PlanMeter
                totalLocations={totalLocations}
                totalServices={totalServices}
                planFitData={planFitData}
                isLoading={isFetchingPlanFit}
              />

              {/* Trial agreement (for free plan) */}
              {planFitData?.trialFits && (
                <motion.label whileHover={{ scale: 1.01 }} className="flex items-start gap-3 cursor-pointer p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl">
                  <input type="checkbox" checked={trialAgreed} onChange={(e) => setTrialAgreed(e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 shrink-0" />
                  <span className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    I confirm I'd like to start my <strong>14-day free trial</strong>. I understand the trial limits and I can upgrade at any time.
                  </span>
                </motion.label>
              )}

              {/* Plan commit buttons */}
              {!isFetchingPlanFit && planFitData && (
                <div className="space-y-3">
                  {planFitData.trialFits && (
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const trialPlan = planFitData.plans?.find((p: any) => p.isTrial);
                        if (trialPlan) handlePlanCommit(trialPlan.plan.id, true);
                      }}
                      disabled={!trialAgreed || provisionMutation.isPending}
                      className="w-full h-12 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {provisionMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Start Free Trial — Build Workspace</>}
                    </motion.button>
                  )}

                  {/* Paid plan buttons */}
                  {planFitData.plans
                    ?.filter((p: any) => !p.isTrial && !p.plan.name.toLowerCase().includes('enterprise'))
                    .map((planResult: any) => {
                      const { plan, fits } = planResult;
                      const isRecommended = plan.id === planFitData.recommendedPlanId;
                      const currency = plan.currency === 'ZAR' ? 'R' : '$';
                      const price = (plan.price / 100).toFixed(0);
                      return (
                        <motion.button
                          key={plan.id}
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => handlePlanCommit(plan.id, false)}
                          disabled={subscribeMutation.isPending && subscribeMutation.variables?.planId === plan.id}
                          className={`w-full h-12 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                            isRecommended
                              ? 'bg-primary hover:bg-primary/90 text-white'
                              : 'border border-border dark:border-dark-border text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-white/5'
                          }`}
                        >
                          {subscribeMutation.isPending && subscribeMutation.variables?.planId === plan.id
                            ? <Loader2 className="w-5 h-5 animate-spin" />
                            : <>{isRecommended && <Zap className="w-4 h-4" />} {plan.name} — {currency}{price}/mo</>}
                        </motion.button>
                      );
                    })}
                </div>
              )}

              <div className="pt-2 flex justify-start">
                <button onClick={() => setStep(2)} className="px-6 py-2 rounded-lg text-on-surface-variant dark:text-outline hover:bg-surface-container-high dark:hover:bg-white/5 transition-colors text-sm font-medium">← Back to Locations</button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 5: Provisioning ════════════════════════════════════════ */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center gap-8 py-8">
              <div className="w-20 h-20 rounded-[1.5rem] bg-primary/10 dark:bg-sky-500/10 flex items-center justify-center">
                {provisionMutation.isPending
                  ? <Loader2 className="w-10 h-10 animate-spin text-primary dark:text-sky-400" />
                  : provisionMutation.isSuccess
                  ? <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  : <Building2 className="w-10 h-10 text-primary dark:text-sky-400" />}
              </div>
              <div>
                <h2 className="font-headline-md text-2xl font-bold text-on-surface dark:text-white mb-3">
                  {provisionMutation.isPending
                    ? 'Building your workspace…'
                    : subscribeMutation.isPending
                    ? 'Preparing secure checkout…'
                    : provisionMutation.isSuccess
                    ? 'Workspace Ready!'
                    : 'Provisioning Could Not Complete'}
                </h2>
                <p className="text-on-surface-variant dark:text-zinc-400 text-sm max-w-md">
                  {provisionMutation.isPending
                    ? `Setting up ${totalLocations} location${totalLocations !== 1 ? 's' : ''} with ${totalServices} service${totalServices !== 1 ? 's' : ''} and their queues…`
                    : subscribeMutation.isPending
                    ? 'Redirecting to payment checkout...'
                    : provisionMutation.isSuccess
                    ? "All your locations and services are live. Let's set up a few more integrations."
                    : (provisionMutation.error as any)?.message || 'Something went wrong. Please check your plan limits or try again.'}
                </p>
              </div>
              {provisionMutation.isError && (
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <button
                    onClick={() => setStep(2)}
                    className="h-11 px-6 rounded-xl border border-border dark:border-dark-border text-on-surface dark:text-white hover:bg-surface-container-high dark:hover:bg-white/5 transition-colors text-sm font-medium"
                  >
                    ← Back to Locations
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => provisionMutation.mutate({ planId: selectedPlanId || undefined, isTrial: planFitData?.trialFits })}
                    className="h-11 px-6 rounded-xl font-medium bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Loader2 className="w-4 h-4" /> Retry
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ STEP 6: Google Integration ═════════════════════════════════ */}
          {step === 6 && (
            <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-6 text-center items-center">
              <header className="flex flex-col gap-2 w-full">
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">Supercharge with Google</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-2xl mx-auto">Connect your Google Business Profile to automate workflows and boost your online reputation.</p>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-2 text-left">
                <div className="bg-surface-container-low dark:bg-zinc-800/50 p-4 rounded-xl border border-border flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-blue-600 dark:text-blue-400">calendar_month</span></div>
                  <div><h4 className="font-bold text-on-surface dark:text-white text-sm">Calendar Sync</h4><p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">Sync Qmova appointments to Google Calendars to prevent double-booking.</p></div>
                </div>
                <div className="bg-surface-container-low dark:bg-zinc-800/50 p-4 rounded-xl border border-border flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">star</span></div>
                  <div><h4 className="font-bold text-on-surface dark:text-white text-sm">Smart Reviews</h4><p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">Automatically ask happy customers for a 5-star Google review after their visit.</p></div>
                </div>
              </div>
              <div className="w-full max-w-md mt-4 p-8 bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border rounded-2xl flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1V11.1Z" /></svg>
                </div>
                {googleSettings?.googleIntegrations?.length > 0 ? (
                  <div className="w-full flex flex-col gap-4 text-left">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-on-surface dark:text-zinc-200">Select Connected Google Account</label>
                      <select value={selectedIntegrationId} onChange={(e) => setSelectedIntegrationId(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100">
                        <option value="">-- Select an account --</option>
                        {googleSettings.googleIntegrations.map((int: AnyFixMe) => <option key={int.id} value={int.id}>{int.email}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-on-surface dark:text-zinc-200">Google Place ID (optional, for reviews)</label>
                      <input type="text" value={googlePlaceId} onChange={(e) => setGooglePlaceId(e.target.value)} placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4" className="w-full h-12 px-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400" />
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => saveGoogleSettingsMutation.mutate()} disabled={saveGoogleSettingsMutation.isPending || !selectedIntegrationId} className="w-full h-12 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
                      {saveGoogleSettingsMutation.isPending ? 'Saving...' : 'Save & Continue'}
                    </motion.button>
                    <div className="flex gap-2">
                      <button onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?intent=link_tenant_onboarding`} className="flex-1 h-10 text-sm border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300">Connect different account</button>
                      <button onClick={() => setStep(7)} className="flex-1 h-10 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Skip for now</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <p className="text-on-surface-variant dark:text-zinc-400 text-sm text-center">Connect your Google Account to enable Calendar Sync and Smart Reviews.</p>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?intent=link_tenant_onboarding`; }} className="w-full h-12 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white transition-opacity">Connect Google Account</motion.button>
                    <button onClick={() => setStep(7)} className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Skip for now</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 7: WhatsApp ════════════════════════════════════════════ */}
          {step === 7 && (
            <motion.div key="step7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-6 text-center items-center">
              <header className="flex flex-col gap-2 w-full">
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">Connect WhatsApp</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-lg mx-auto">Automatically notify customers about their queue position through WhatsApp.</p>
              </header>
              <div className="w-full max-w-sm mt-4">
                {whatsappStatus?.state !== 'open' ? (
                  <>
                    {qrCode ? (
                      <div className="animate-in zoom-in duration-500 flex flex-col items-center">
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-border inline-block mb-6">
                          {qrCode.startsWith('data:image') ? <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 rounded-2xl" /> : <div className="w-64 h-64 flex items-center justify-center"><QRCodeSVG value={qrCode} size={256} /></div>}
                        </div>
                        <p className="text-on-surface-variant dark:text-outline font-body-md mb-6 max-w-xs mx-auto">Open WhatsApp on your phone, go to Settings → Linked Devices, and scan this QR code.</p>
                        <div className="flex items-center gap-2 text-indigo-500 font-semibold"><Loader2 className="w-5 h-5 animate-spin" />Waiting for scan...</div>
                      </div>
                    ) : connectionMode === 'code' ? (
                      <div className="animate-in zoom-in duration-500 w-full">
                        {pairingCode ? (
                          <div className="bg-surface-bright dark:bg-black/50 rounded-2xl p-6 mb-6 border border-border dark:border-dark-border">
                            <p className="text-xs text-outline uppercase tracking-wider mb-4">Pairing Code</p>
                            <div className="flex items-center justify-center gap-3 mb-4">
                              <code className="text-3xl font-bold tracking-[0.2em] text-on-surface dark:text-white">{pairingCode}</code>
                              <button onClick={() => { navigator.clipboard.writeText(pairingCode); setPairingCopied(true); setTimeout(() => setPairingCopied(false), 2000); }} className="p-2 bg-surface-container-low dark:bg-white/10 rounded-lg text-on-surface-variant">
                                {pairingCopied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                              </button>
                            </div>
                            <p className="text-sm text-on-surface-variant dark:text-outline">Open WhatsApp Settings → Linked Devices and enter this code within 60s.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 w-full">
                            <p className="text-sm text-on-surface-variant dark:text-outline mb-2">Enter your WhatsApp phone number to receive a pairing code.</p>
                            <input type="tel" value={pairingPhoneNumber} onChange={(e) => setPairingPhoneNumber(e.target.value)} placeholder="e.g. 5511999999999" maxLength={15} className="w-full h-14 bg-canvas dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 font-mono text-center tracking-wider text-on-surface dark:text-white focus:outline-none focus:border-[#25D366] transition-shadow" />
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => generatePairingCodeMutation.mutate(pairingPhoneNumber)} disabled={generatePairingCodeMutation.isPending || pairingPhoneNumber.length < 7} className="w-full flex items-center justify-center gap-2 h-14 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl font-medium disabled:opacity-50">
                              {generatePairingCodeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Keyboard className="w-5 h-5" />}
                              {generatePairingCodeMutation.isPending ? 'Generating...' : 'Generate Pairing Code'}
                            </motion.button>
                          </div>
                        )}
                        <button onClick={() => { setConnectionMode('qr'); setPairingCode(null); setPairingPhoneNumber(''); }} className="mt-6 text-sm text-outline hover:text-on-surface font-medium border-b border-transparent hover:border-outline transition-colors">Use QR code instead</button>
                      </div>
                    ) : (
                      <>
                        <div className="w-24 h-24 bg-[#25D366]/10 text-[#25D366] rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#25D366]/20"><QrCode className="w-10 h-10" /></div>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => connectWhatsAppMutation.mutate(false)} disabled={connectWhatsAppMutation.isPending} className="w-full flex items-center justify-center gap-2 h-14 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-xl font-medium disabled:opacity-50">
                          {connectWhatsAppMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                          {connectWhatsAppMutation.isPending ? 'Generating QR Code...' : 'Connect via QR Code'}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setConnectionMode('code')} className="w-full mt-4 flex items-center justify-center gap-2 h-14 bg-surface-bright dark:bg-black/20 border border-border dark:border-dark-border text-on-surface dark:text-white rounded-xl font-medium hover:bg-surface-container-low dark:hover:bg-white/5">
                          <Keyboard className="w-5 h-5 text-outline" />Connect via Pairing Code
                        </motion.button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="animate-in zoom-in duration-500 w-full flex flex-col items-center">
                    <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/30"><CheckCircle2 className="w-12 h-12" /></div>
                    <h3 className="text-xl font-bold text-on-surface dark:text-white mb-2">WhatsApp Connected!</h3>
                    <p className="text-on-surface-variant dark:text-outline mb-4 max-w-sm mx-auto">Your account is successfully linked and ready to send notifications.</p>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(8)} className="w-full h-14 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-xl font-medium flex items-center justify-center gap-2">
                      Continue <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                )}
              </div>
              {whatsappStatus?.state !== 'open' && (
                <div className="w-full pt-4 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                  <button onClick={() => setStep(6)} className="w-full sm:w-auto px-6 py-2 rounded-lg text-on-surface-variant dark:text-outline hover:bg-surface-container-high dark:hover:bg-white/5 transition-colors text-sm">Back</button>
                  <button onClick={() => setStep(8)} className="w-full sm:w-auto px-8 py-2 rounded-lg font-medium border border-border dark:border-dark-border text-on-surface dark:text-white hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors text-sm">Skip for now</button>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ STEP 8: Done 🎉 ════════════════════════════════════════════ */}
          {step === 8 && (
            <motion.div key="step8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center gap-8 py-6">
              <div className="w-24 h-24 rounded-[2rem] bg-primary/10 dark:bg-sky-500/10 flex items-center justify-center border border-primary/20 dark:border-sky-500/20">
                <Sparkles className="w-12 h-12 text-primary dark:text-sky-400" />
              </div>
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight mb-3">You're all set!</h1>
                <p className="font-body-lg text-on-surface-variant dark:text-zinc-400 max-w-md mx-auto">
                  Your workspace is live with {totalLocations} location{totalLocations !== 1 ? 's' : ''} and {totalServices} service{totalServices !== 1 ? 's' : ''}. Head to your dashboard to start serving customers.
                </p>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={finishOnboarding} className="h-14 px-10 rounded-2xl font-bold bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity flex items-center gap-3 text-lg shadow-lg">
                Go to Dashboard <ArrowRight className="w-5 h-5" />
              </motion.button>
              <div className="flex flex-col sm:flex-row gap-4 text-sm text-on-surface-variant dark:text-zinc-400">
                <button onClick={() => setStep(7)} className="hover:text-on-surface dark:hover:text-white transition-colors">← Connect WhatsApp</button>
                <button onClick={() => setStep(6)} className="hover:text-on-surface dark:hover:text-white transition-colors">Connect Google</button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 9: Invite Join ════════════════════════════════════════ */}
          {step === 9 && (
            <motion.div key="step9" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="flex flex-col gap-6 text-center items-center">
              <div className="w-24 h-24 rounded-[2rem] bg-primary-fixed dark:bg-sky-900/20 text-primary dark:text-sky-500 flex items-center justify-center mx-auto border border-primary-fixed-dim/50"><Users className="w-12 h-12" /></div>
              <header className="flex flex-col gap-2 w-full max-w-lg">
                <h2 className="font-headline-lg text-headline-lg text-on-surface dark:text-white tracking-tight">Confirm Workspace Join</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline">
                  You have been invited to join <strong className="text-on-surface dark:text-white">{inviteInfo?.workspaceName || 'your team workspace'}</strong> with role <strong className="text-primary dark:text-sky-400 uppercase">{inviteInfo?.role || 'STAFF'}</strong>.
                </p>
              </header>
              <div className="w-full max-w-md bg-canvas dark:bg-black/50 p-6 rounded-2xl border border-border dark:border-dark-border text-left space-y-4">
                <div className="flex justify-between"><span className="text-sm text-outline">Full Name:</span><span className="text-sm font-semibold text-on-surface dark:text-white">{fullName}</span></div>
                <div className="flex justify-between"><span className="text-sm text-outline">Phone:</span><span className="text-sm text-on-surface dark:text-white">{countryCode} {phone}</span></div>
                <div className="flex justify-between"><span className="text-sm text-outline">Workspace:</span><span className="text-sm font-semibold text-on-surface dark:text-white">{inviteInfo?.workspaceName || 'Team'}</span></div>
              </div>
              <div className="w-full pt-4 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
                <button onClick={() => setStep(1)} className="w-full sm:w-auto px-6 py-2 rounded-lg text-on-surface-variant dark:text-outline hover:bg-surface-container-high dark:hover:bg-white/5 transition-colors text-sm">Edit Profile</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleConfirmJoinWorkspace} disabled={joiningWorkspace} className="w-full sm:w-auto min-h-[44px] px-8 rounded-lg font-medium bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50">
                  {joiningWorkspace ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join Workspace'}
                  {!joiningWorkspace && <ArrowRight className="w-4 h-4" />}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Hidden auto-submit Ozow form */}
      {paymentData && (
        <form ref={paymentFormRef} action={paymentData.checkoutUrl || paymentData.paymentUrl} method="POST" target="_self" className="hidden">
          {ozowFields.map((field) => (
            <input key={field} type="hidden" name={field.charAt(0).toUpperCase() + field.slice(1)} value={String(paymentData[field] ?? '')} />
          ))}
        </form>
      )}
      {/* Join Team Modal */}
      <JoinWorkspaceModal
        isOpen={isJoinTeamModalOpen}
        onClose={() => setIsJoinTeamModalOpen(false)}
        title="Join Your Team"
        description="Enter the 8-character invite code provided by your manager to join their workspace."
        onCustomSubmit={async (cleanCode) => {
          try {
            const res = await fetchApi(`/workspace/invite-preview/${cleanCode}`);
            if (res?.valid) {
              setInviteInfo(res);
              setInviteCode(cleanCode);
              setCompanyName(res.workspaceName);
              setStep(1);
              toast.success(`Verified! Joining ${res.workspaceName}`);
              return true;
            } else {
              toast.error('Invalid or expired invite code');
              return false;
            }
          } catch {
            toast.error('Could not verify invite code. Please try again.');
            return false;
          }
        }}
      />
    </div>
  );
}
