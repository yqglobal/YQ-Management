import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CreditCard, Users, Activity, Globe, AlertCircle, Clock,
  CheckCircle2, XCircle, Settings, Store, Building2, MapPin, Check, X, ShieldAlert,
  Zap, Layers, Sliders, Crown, Info, ChevronDown, ChevronRight,
  RefreshCw, Send, Target, Star, Package, Workflow
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ── Reusable sub-components ───────────────────────────────────────────────────

function LimitRow({ label, planVal, customVal, unit = '', onChange, onClear, editing }: {
  label: string; planVal: any; customVal: any; unit?: string;
  onChange: (v: number | null) => void; onClear: () => void; editing: boolean;
}) {
  const effective = customVal ?? planVal;
  const hasOverride = customVal !== undefined && customVal !== null;
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
        <div className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
          Plan default: {planVal === null || planVal === undefined
            ? <span className="text-emerald-500 font-medium">Unlimited</span>
            : `${planVal.toLocaleString()}${unit}`}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {hasOverride && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 flex items-center gap-1">
            <Crown className="w-3 h-3" /> Override
          </span>
        )}
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="number" min={0}
              placeholder={planVal === null ? '∞' : String(planVal)}
              defaultValue={customVal ?? ''}
              className="w-24 h-8 px-3 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            />
            {hasOverride && (
              <button onClick={onClear} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-500 transition-colors" title="Remove override">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className={`text-sm font-bold ${hasOverride ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-zinc-300'}`}>
            {effective === null || effective === undefined
              ? <span className="text-emerald-500">∞ Unlimited</span>
              : `${Number(effective).toLocaleString()}${unit}`}
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureToggleRow({ label, desc, planVal, customVal, onChange, editing }: any) {
  const effective = customVal !== undefined ? customVal : planVal;
  const hasOverride = customVal !== undefined;
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          {label}
          {hasOverride && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 flex items-center gap-1">
              <Crown className="w-3 h-3" /> Override
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{desc}</div>
      </div>
      {editing ? (
        <select
          value={customVal === undefined ? '' : String(customVal)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}
          className="h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">Plan default ({String(planVal ?? 'false')})</option>
          <option value="true">Enabled (Override)</option>
          <option value="false">Disabled (Override)</option>
        </select>
      ) : (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          effective
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-zinc-400'
        }`}>
          {effective ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {effective ? 'Enabled' : 'Disabled'}
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SuperAdminTenantDetail() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['super-admin-tenant', id],
    queryFn: () => fetchApi(`/super-admin/tenants/${id}`),
    enabled: !!id,
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscription' | 'settings' | 'enterprise'>(
    (router.query.tab as any) || 'overview'
  );
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingInterval, setBillingInterval] = useState('MONTHLY');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isFree, setIsFree] = useState(false);

  // Enterprise state
  const [editingLimits, setEditingLimits] = useState(false);
  const [pendingLimits, setPendingLimits] = useState<any>({});
  const [pendingFeatures, setPendingFeatures] = useState<any>({});
  const [limitsNote, setLimitsNote] = useState('');
  const [showBlueprintDrawer, setShowBlueprintDrawer] = useState(false);
  const [blueprintDrawerMode, setBlueprintDrawerMode] = useState<'push' | 'apply'>('push');
  const [selectedBlueprintId, setSelectedBlueprintId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [pushCustomName, setPushCustomName] = useState('');
  const [expandedBlueprint, setExpandedBlueprint] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    name: '', subdomain: '', supportEmail: '', supportPhone: '',
    whatsappConnected: false, chatbotEnabled: false,
    enableSmartReviews: false, autonomousEnabled: false,
  });

  useEffect(() => {
    if (tenant) {
      setEditForm({
        name: tenant.name || '',
        subdomain: tenant.subdomain || '',
        supportEmail: tenant.supportEmail || '',
        supportPhone: tenant.supportPhone || '',
        whatsappConnected: !!tenant.whatsappConnected,
        chatbotEnabled: !!tenant.chatbotEnabled,
        enableSmartReviews: !!tenant.enableSmartReviews,
        autonomousEnabled: !!tenant.autonomousEnabled,
      });
    }
  }, [tenant]);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['super-admin-plans', 'ACTIVE'],
    queryFn: () => fetchApi('/super-admin/plans?status=ACTIVE'),
  });

  const { data: effectiveLimits, isLoading: limitsLoading, refetch: refetchLimits } = useQuery({
    queryKey: ['super-admin-effective-limits', id],
    queryFn: () => fetchApi(`/super-admin/tenants/${id}/effective-limits`),
    enabled: !!id,
  });

  const { data: blueprints, isLoading: blueprintsLoading } = useQuery({
    queryKey: ['super-admin-blueprints'],
    queryFn: () => fetchApi('/super-admin/blueprints'),
    enabled: !!id && activeTab === 'enterprise',
  });

  // Mutations
  const assignPlanMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi(`/super-admin/tenants/${id}/assign-plan`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success('Plan assigned successfully');
      setShowAssignPlanModal(false);
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant', id] });
    },
    onError: () => toast.error('Failed to assign plan'),
  });

  const cancelPlanMutation = useMutation({
    mutationFn: () => fetchApi(`/super-admin/tenants/${id}/cancel-plan`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Plan cancelled');
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant', id] });
    },
    onError: () => toast.error('Failed to cancel plan'),
  });

  const deleteTenantMutation = useMutation({
    mutationFn: (tenantId: string) => fetchApi(`/super-admin/tenants/${tenantId}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Business removed'); router.push('/super-admin/tenants'); },
    onError: () => toast.error('Failed to remove business'),
  });

  const updateTenantMutation = useMutation({
    mutationFn: (data: any) =>
      fetchApi(`/super-admin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success('Settings updated');
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenant', id] });
    },
    onError: () => toast.error('Failed to update settings'),
  });

  const setCustomLimitsMutation = useMutation({
    mutationFn: (dto: any) =>
      fetchApi(`/super-admin/tenants/${id}/custom-limits`, { method: 'PATCH', body: JSON.stringify(dto) }),
    onSuccess: () => {
      toast.success('Enterprise limits saved');
      setEditingLimits(false);
      setPendingLimits({});
      setPendingFeatures({});
      setLimitsNote('');
      queryClient.invalidateQueries({ queryKey: ['super-admin-effective-limits', id] });
      refetchLimits();
    },
    onError: () => toast.error('Failed to save limits'),
  });

  const pushBlueprintMutation = useMutation({
    mutationFn: ({ blueprintId, name }: any) =>
      fetchApi(`/super-admin/blueprints/${blueprintId}/push-to-tenant`, {
        method: 'POST',
        body: JSON.stringify({ tenantId: id, name }),
      }),
    onSuccess: () => {
      toast.success('Blueprint pushed to tenant library');
      setShowBlueprintDrawer(false);
      queryClient.invalidateQueries({ queryKey: ['super-admin-blueprints'] });
    },
    onError: () => toast.error('Failed to push blueprint'),
  });

  const applyBlueprintMutation = useMutation({
    mutationFn: ({ blueprintId, serviceId }: any) =>
      fetchApi(`/super-admin/tenants/${id}/apply-blueprint`, {
        method: 'POST',
        body: JSON.stringify({ blueprintId, serviceId }),
      }),
    onSuccess: () => {
      toast.success('Blueprint applied — white-glove setup complete!');
      setShowBlueprintDrawer(false);
    },
    onError: () => toast.error('Failed to apply blueprint'),
  });

  const handleCancelPlan = () => {
    if (confirm("Cancel this tenant's active plan?")) cancelPlanMutation.mutate();
  };
  const handleDelete = () => {
    if (confirm('PERMANENTLY delete this tenant? This CANNOT be undone.')) {
      deleteTenantMutation.mutate(id as string);
    }
  };
  const handleUpdateSettings = (e: React.FormEvent) => { e.preventDefault(); updateTenantMutation.mutate(editForm); };

  const handleSaveLimits = () => {
    const dto: any = {};
    if (pendingLimits.maxVisits !== undefined) dto.maxVisits = pendingLimits.maxVisits;
    if (pendingLimits.maxQueues !== undefined) dto.maxQueues = pendingLimits.maxQueues;
    if (pendingLimits.maxLocations !== undefined) dto.maxLocations = pendingLimits.maxLocations;
    if (pendingLimits.maxStaff !== undefined) dto.maxStaff = pendingLimits.maxStaff;
    if (Object.keys(pendingFeatures).length > 0) dto.customFeatures = pendingFeatures;
    if (limitsNote) dto.note = limitsNote;
    setCustomLimitsMutation.mutate(dto);
  };

  const isEnterprise = effectiveLimits?.source === 'enterprise_override';
  const TABS = ['overview', 'users', 'subscription', 'settings', 'enterprise'] as const;

  if (isLoading) {
    return (
      <SuperAdminLayout pageTitle="Business Details" pageSubtitle="Loading...">
        <Head><title>Business Details | Super Admin</title></Head>
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          <div className="h-10 w-48 bg-gray-200 dark:bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white dark:bg-zinc-950 rounded-2xl border border-gray-200 dark:border-white/10 animate-pulse" />)}
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (!tenant) {
    return (
      <SuperAdminLayout pageTitle="Business Not Found" pageSubtitle="Does not exist">
        <Head><title>Not Found | Super Admin</title></Head>
        <div className="max-w-6xl mx-auto py-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 dark:text-zinc-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Business Not Found</h2>
          <Link href="/super-admin/tenants" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Businesses
          </Link>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout pageTitle={tenant.name} pageSubtitle="Advanced business management and telemetry">
      <Head><title>{tenant.name} | Super Admin</title></Head>

      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/super-admin/tenants" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-400 dark:text-zinc-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">{tenant.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  tenant.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                  tenant.subscriptionStatus === 'TRIAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' :
                  'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400'
                }`}>{tenant.subscriptionStatus}</span>
                {isEnterprise && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1 shadow-sm">
                    <Crown className="w-3 h-3" /> Enterprise
                  </span>
                )}
              </div>
              <p className="text-gray-500 dark:text-zinc-400 mt-1 font-mono text-xs">
                ID: {tenant.id} · {tenant.subdomain}.qmova.com
              </p>
            </div>
          </div>
          <button
            onClick={() => toast.info('Impersonation requires a secure token exchange endpoint.')}
            className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-medium transition-transform active:scale-95 shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" /> Login as Business
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-white/10 overflow-x-auto no-scrollbar">
          {TABS.map(tab => {
            const icons: Record<string, React.ReactNode> = {
              overview: <Activity className="w-4 h-4" />,
              users: <Users className="w-4 h-4" />,
              subscription: <CreditCard className="w-4 h-4" />,
              settings: <Settings className="w-4 h-4" />,
              enterprise: <Crown className="w-4 h-4" />,
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 mr-5 text-sm font-bold capitalize transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab
                    ? tab === 'enterprise'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                {icons[tab]}{tab}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Customers', val: tenant._count?.customers || 0, color: 'text-blue-500' },
                { label: 'Total Visits', val: tenant._count?.visits || 0, color: 'text-emerald-500' },
                { label: 'Active Queues', val: tenant._count?.queues || 0, color: 'text-indigo-500' },
                { label: 'Services', val: tenant._count?.services || 0, color: 'text-purple-500' },
                { label: 'Staff Members', val: tenant._count?.staffMembers || 0, color: 'text-amber-500' },
                { label: 'Appointments', val: tenant._count?.appointments || 0, color: 'text-rose-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{stat.label}</div>
                  <div className={`text-3xl font-black ${stat.color}`}>{stat.val.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-500" />
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Physical Locations</h2>
              </div>
              <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
                <thead className="bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-zinc-200 font-bold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Address</th>
                    <th className="px-6 py-4">Timezone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {(!tenant.locations || tenant.locations.length === 0) ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400 dark:text-zinc-500">No locations configured.</td></tr>
                  ) : tenant.locations.map((loc: any) => (
                    <tr key={loc.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2"><Store className="w-4 h-4 text-gray-400" />{loc.name}</td>
                      <td className="px-6 py-4 text-gray-500">{loc.address || 'No address'}</td>
                      <td className="px-6 py-4 font-mono text-xs">{loc.timezone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-rose-50 dark:bg-rose-500/5 border border-rose-200 dark:border-rose-500/10 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-rose-900 dark:text-rose-400 flex items-center gap-2"><AlertCircle className="w-5 h-5" />Danger Zone</h3>
                <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">Permanently remove this business and all associated data.</p>
              </div>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-transform active:scale-95 shadow-sm">Delete Tenant</button>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                <h2 className="text-base font-bold text-gray-900 dark:text-white">System Users</h2>
              </div>
              <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
                <thead className="bg-gray-50 dark:bg-white/5 text-xs font-bold uppercase tracking-wider border-b border-gray-200 dark:border-white/10 text-gray-900 dark:text-zinc-200">
                  <tr>
                    <th className="px-6 py-4">User ID</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {(!tenant.users || tenant.users.length === 0) ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400 dark:text-zinc-500">No users found.</td></tr>
                  ) : tenant.users.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{user.id}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/10 dark:text-purple-400' :
                          user.role === 'OWNER' ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400' :
                          user.role === 'TENANT_ADMIN' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-400' :
                          user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-500/10 dark:text-gray-400'
                        }`}>{user.role.replace(/_/g, ' ')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTION ── */}
        {activeTab === 'subscription' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center flex-wrap gap-3">
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-500" />Subscription & Invoicing</h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowAssignPlanModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">Force Assign Plan</button>
                  {(tenant.subscriptionStatus === 'ACTIVE' || tenant.subscriptionStatus === 'TRIAL') && (
                    <button onClick={handleCancelPlan} disabled={cancelPlanMutation.isPending} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">Revoke Access</button>
                  )}
                </div>
              </div>
              <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
                <thead className="bg-gray-50 dark:bg-white/5 text-xs font-bold uppercase tracking-wider border-b border-gray-200 dark:border-white/10 text-gray-900 dark:text-zinc-200">
                  <tr>
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {(!tenant.transactions || tenant.transactions.length === 0) ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 dark:text-zinc-500">No payment history found.</td></tr>
                  ) : tenant.transactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{tx.id}</td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{tx.currency} {tx.amount?.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ['COMPLETE','SUCCEEDED'].includes(tx.status) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          ['PENDING','PROCESSING'].includes(tx.status) ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400'
                        }`}>
                          {['COMPLETE','SUCCEEDED'].includes(tx.status) && <CheckCircle2 className="w-3 h-3" />}
                          {['PENDING','PROCESSING'].includes(tx.status) && <Clock className="w-3 h-3" />}
                          {['CANCELLED','FAILED','ERROR'].includes(tx.status) && <XCircle className="w-3 h-3" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{tx.createdAt ? format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <form onSubmit={handleUpdateSettings} className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6"><Settings className="w-5 h-5 text-indigo-500" />Platform Overrides & Configuration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Business Name</label>
                  <input type="text" required value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Subdomain Route</label>
                  <div className="flex">
                    <input type="text" required value={editForm.subdomain} onChange={e => setEditForm(p => ({...p, subdomain: e.target.value}))} className="w-full h-11 px-4 rounded-l-xl border border-r-0 border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <div className="h-11 px-4 flex items-center bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-r-xl text-gray-500 dark:text-zinc-400 font-mono text-sm">.qmova.com</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Support Email</label>
                  <input type="email" value={editForm.supportEmail} onChange={e => setEditForm(p => ({...p, supportEmail: e.target.value}))} className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-1">Support Phone</label>
                  <input type="text" value={editForm.supportPhone} onChange={e => setEditForm(p => ({...p, supportPhone: e.target.value}))} className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-white/10 pb-2 mb-4">Feature Toggles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {[
                  { id: 'whatsappConnected', label: 'WhatsApp Core Connected', desc: 'Is the Evolution API session paired?' },
                  { id: 'chatbotEnabled', label: 'AI Chatbot Auto-Replies', desc: 'Is the WhatsApp bot active?' },
                  { id: 'enableSmartReviews', label: 'Smart Google Reviews', desc: 'Automated NPS & review routing?' },
                  { id: 'autonomousEnabled', label: 'Fully Autonomous Mode', desc: 'Allows AI agents to act on behalf of staff' },
                ].map(toggle => (
                  <label key={toggle.id} className="flex items-start gap-3 p-4 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <input type="checkbox" checked={editForm[toggle.id as keyof typeof editForm] as boolean} onChange={e => setEditForm(p => ({...p, [toggle.id]: e.target.checked}))} className="w-5 h-5 mt-0.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">{toggle.label}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{toggle.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-white/10">
                <button type="submit" disabled={updateTenantMutation.isPending} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-sm transition-transform active:scale-95">
                  {updateTenantMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ENTERPRISE TAB
           ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'enterprise' && (
          <div className={`space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 ${setCustomLimitsMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}>

            {/* Status Banner */}
            <div className={`relative overflow-hidden rounded-2xl border p-6 ${
              isEnterprise
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/5 dark:to-orange-500/5 border-amber-200 dark:border-amber-500/20'
                : 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-white/3 dark:to-white/1 border-gray-200 dark:border-white/10'
            }`}>
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none bg-amber-400" style={{ transform: 'translate(30%,-50%)' }} />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${isEnterprise ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gray-200 dark:bg-zinc-700'}`}>
                    <Crown className={`w-7 h-7 ${isEnterprise ? 'text-white' : 'text-gray-400 dark:text-zinc-500'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-xl font-black text-gray-900 dark:text-white">{isEnterprise ? 'Enterprise Account' : 'Standard Account'}</h2>
                      {isEnterprise && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">ACTIVE</span>}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-zinc-400 max-w-lg">
                      {isEnterprise
                        ? `Custom limits active. ${Object.keys(effectiveLimits?.customOverrides || {}).length} resource overrides in place.${effectiveLimits?.note ? ` Note: "${effectiveLimits.note}"` : ''}`
                        : 'Standard plan tenant. Set custom limits below to configure enterprise-grade access.'
                      }
                    </p>
                    {effectiveLimits?.planName && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Base plan: <span className="font-medium">{effectiveLimits.planName}</span></p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setEditingLimits(true)}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium transition-all active:scale-95 shadow-sm flex items-center gap-2"
                  >
                    <Sliders className="w-4 h-4" /> {isEnterprise ? 'Edit Limits' : 'Activate Enterprise'}
                  </button>
                  <button
                    onClick={() => { setBlueprintDrawerMode('apply'); setShowBlueprintDrawer(true); }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all active:scale-95 shadow-sm flex items-center gap-2"
                  >
                    <Workflow className="w-4 h-4" /> White-Glove Setup
                  </button>
                </div>
              </div>
            </div>

            {/* Effective Limits Overview */}
            {!limitsLoading && effectiveLimits && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Max Visits', val: effectiveLimits.effectiveLimits?.maxVisits, icon: <Activity className="w-5 h-5" />, key: 'maxVisits' },
                  { label: 'Max Queues', val: effectiveLimits.effectiveLimits?.maxQueues, icon: <Layers className="w-5 h-5" />, key: 'maxQueues' },
                  { label: 'Max Locations', val: effectiveLimits.effectiveLimits?.maxLocations, icon: <MapPin className="w-5 h-5" />, key: 'maxLocations' },
                  { label: 'Max Staff', val: effectiveLimits.effectiveLimits?.maxStaff, icon: <Users className="w-5 h-5" />, key: 'maxStaff' },
                ].map((item) => {
                  const hasOverride = effectiveLimits.customOverrides?.[item.key] !== undefined;
                  return (
                    <div key={item.key} className={`rounded-2xl border p-5 shadow-sm transition-all ${hasOverride ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-950'}`}>
                      <div className={`mb-3 ${hasOverride ? 'text-amber-500' : 'text-gray-400 dark:text-zinc-500'}`}>{item.icon}</div>
                      <div className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">{item.label}</div>
                      <div className={`text-2xl font-black ${item.val === null || item.val === undefined ? 'text-emerald-500' : hasOverride ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                        {item.val === null || item.val === undefined ? '∞' : item.val.toLocaleString()}
                      </div>
                      <div className="text-xs mt-1">
                        {hasOverride
                          ? <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1"><Crown className="w-3 h-3" />Enterprise override</span>
                          : <span className="text-gray-400 dark:text-zinc-500">Plan default</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {limitsLoading && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />)}
              </div>
            )}

            {/* Custom Limits Editor */}
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500"><Sliders className="w-5 h-5" /></div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Custom Resource Limits</h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Enterprise overrides take absolute priority over plan-level limits</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {editingLimits ? (
                    <>
                      <button onClick={() => { setEditingLimits(false); setPendingLimits({}); setPendingFeatures({}); }} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
                      <button onClick={handleSaveLimits} disabled={setCustomLimitsMutation.isPending} className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center gap-2">
                        {setCustomLimitsMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {setCustomLimitsMutation.isPending ? 'Saving...' : 'Save Overrides'}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditingLimits(true)} className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2">
                      <Sliders className="w-4 h-4" />Edit Overrides
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6">
                {limitsLoading ? (
                  <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />)}</div>
                ) : (
                  <>
                    <LimitRow label="Monthly Visit Quota" planVal={effectiveLimits?.effectiveLimits?.maxVisits ?? null} customVal={effectiveLimits?.customOverrides?.maxVisits} unit=" visits" editing={editingLimits} onChange={(v) => setPendingLimits((p: any) => ({...p, maxVisits: v}))} onClear={() => setPendingLimits((p: any) => ({...p, maxVisits: null}))} />
                    <LimitRow label="Maximum Queues" planVal={effectiveLimits?.effectiveLimits?.maxQueues ?? null} customVal={effectiveLimits?.customOverrides?.maxQueues} unit=" queues" editing={editingLimits} onChange={(v) => setPendingLimits((p: any) => ({...p, maxQueues: v}))} onClear={() => setPendingLimits((p: any) => ({...p, maxQueues: null}))} />
                    <LimitRow label="Maximum Locations" planVal={effectiveLimits?.effectiveLimits?.maxLocations ?? null} customVal={effectiveLimits?.customOverrides?.maxLocations} unit=" locations" editing={editingLimits} onChange={(v) => setPendingLimits((p: any) => ({...p, maxLocations: v}))} onClear={() => setPendingLimits((p: any) => ({...p, maxLocations: null}))} />
                    <LimitRow label="Maximum Staff Members" planVal={effectiveLimits?.effectiveLimits?.maxStaff ?? null} customVal={effectiveLimits?.customOverrides?.maxStaff} unit=" staff" editing={editingLimits} onChange={(v) => setPendingLimits((p: any) => ({...p, maxStaff: v}))} onClear={() => setPendingLimits((p: any) => ({...p, maxStaff: null}))} />
                    {editingLimits && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Internal Note <span className="font-normal text-gray-400">(admin only)</span></label>
                        <input type="text" placeholder="e.g., Enterprise deal — 12 month contract signed Oct 2025" value={limitsNote} onChange={e => setLimitsNote(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Feature Flag Overrides */}
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-500"><Zap className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Feature Flag Overrides</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Enable/disable features for this tenant beyond what their plan allows</p>
                </div>
              </div>
              <div className="p-6">
                {limitsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />)}
                  </div>
                ) : [
                  { key: 'customBranding', label: 'Custom Branding', desc: 'Allows logo, colours and hiding Qmova branding' },
                  { key: 'analyticsAdvanced', label: 'Advanced Analytics', desc: 'Historical data export, cohort and attribution analysis' },
                  { key: 'whatsappMultiChannel', label: 'Multi-channel WhatsApp', desc: 'Multiple WhatsApp numbers / instances per account' },
                  { key: 'prioritySupport', label: 'Priority Support SLA', desc: 'Routes account to priority support queue' },
                  { key: 'apiAccess', label: 'Public API Access', desc: 'Grants Qmova REST API and webhook access' },
                  { key: 'customDomain', label: 'Custom Domain / White-label', desc: 'e.g., queue.clientbrand.com as a custom endpoint' },
                ].map(feature => (
                  <FeatureToggleRow
                    key={feature.key}
                    label={feature.label}
                    desc={feature.desc}
                    planVal={effectiveLimits?.effectiveFeatures?.[feature.key]}
                    customVal={effectiveLimits?.customFeatureOverrides?.[feature.key] !== undefined
                      ? effectiveLimits.customFeatureOverrides[feature.key]
                      : pendingFeatures[feature.key]}
                    editing={editingLimits}
                    onChange={(v: any) => setPendingFeatures((p: any) => ({...p, [feature.key]: v}))}
                  />
                ))}
              </div>
            </div>

            {/* Blueprint Manager */}
            <div className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"><Workflow className="w-5 h-5" /></div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Workflow Blueprint Library</h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Push blueprints to tenant library or apply directly to a service (white-glove)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setBlueprintDrawerMode('push'); setShowBlueprintDrawer(true); }} className="px-3 py-2 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors flex items-center gap-2">
                    <Send className="w-4 h-4" />Push to Library
                  </button>
                  <button onClick={() => { setBlueprintDrawerMode('apply'); setShowBlueprintDrawer(true); }} className="px-3 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-2">
                    <Target className="w-4 h-4" />Apply to Service
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {blueprintsLoading ? (
                  <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />)}</div>
                ) : !blueprints || blueprints.length === 0 ? (
                  <div className="p-12 text-center">
                    <Workflow className="w-10 h-10 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-zinc-400 text-sm">No blueprints found. Run the seed script to load global templates.</p>
                  </div>
                ) : blueprints.slice(0, 8).map((bp: any) => (
                  <div key={bp.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors">
                    <button onClick={() => setExpandedBlueprint(expandedBlueprint === bp.id ? null : bp.id)} className="w-full text-left px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bp.tenantId ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                            {bp.name}
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${bp.tenantId ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'}`}>
                              {bp.tenantId ? 'Custom' : 'Global'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-zinc-500 truncate mt-0.5">{bp.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-xs text-gray-400 font-medium">{bp._count?.steps || bp.steps?.length || 0} steps</span>
                        {expandedBlueprint === bp.id ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    {expandedBlueprint === bp.id && bp.steps && (
                      <div className="px-6 pb-4">
                        <div className="bg-gray-50 dark:bg-white/3 rounded-xl p-4">
                          <div className="text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-3">Steps</div>
                          <div className="space-y-2">
                            {bp.steps.map((step: any) => (
                              <div key={step.id} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{step.stepOrder}</div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white flex-1 min-w-0">{step.name}</span>
                                {step.isOptional && <span className="text-xs text-gray-400">(optional)</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                  step.type === 'SERVICE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                                  step.type === 'CHECKPOINT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                  step.type === 'PAYMENT' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                                  step.type === 'COLLECTION' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' :
                                  'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-zinc-400'
                                }`}>{step.type}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-white/10">
                            <button onClick={() => { setSelectedBlueprintId(bp.id); setBlueprintDrawerMode('push'); setShowBlueprintDrawer(true); }} className="flex-1 py-2 text-xs font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-1">
                              <Send className="w-3.5 h-3.5" />Push to Library
                            </button>
                            <button onClick={() => { setSelectedBlueprintId(bp.id); setBlueprintDrawerMode('apply'); setShowBlueprintDrawer(true); }} className="flex-1 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1">
                              <Target className="w-3.5 h-3.5" />Apply to Service
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {blueprints && blueprints.length > 8 && (
                  <div className="px-6 py-3 text-sm text-center text-gray-400 dark:text-zinc-500">
                    +{blueprints.length - 8} more · <button onClick={() => { setBlueprintDrawerMode('push'); setShowBlueprintDrawer(true); }} className="text-indigo-500 hover:underline">View all in drawer</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── ASSIGN PLAN MODAL ── */}
      {showAssignPlanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assign Plan</h2>
              <button onClick={() => setShowAssignPlanModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Select Plan</label>
                {plansLoading ? <div className="h-12 bg-gray-100 dark:bg-zinc-800 rounded-xl animate-pulse" /> : (
                  <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">-- Choose a plan --</option>
                    {plans?.map((plan: any) => <option key={plan.id} value={plan.id}>{plan.name} ({plan.currency} {plan.price})</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Billing Interval</label>
                <select value={billingInterval} onChange={e => setBillingInterval(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="CUSTOM">Custom Expiry</option>
                </select>
              </div>
              {billingInterval === 'CUSTOM' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Custom Expiry Date</label>
                  <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isFree} onChange={e => setIsFree(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Grant for Free (skip billing)</span>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAssignPlanModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-medium transition-colors">Cancel</button>
              <button
                onClick={() => { if (selectedPlanId) assignPlanMutation.mutate({ planId: selectedPlanId, billingInterval, customEndDate, isFree }); }}
                disabled={!selectedPlanId || assignPlanMutation.isPending || (billingInterval === 'CUSTOM' && !customEndDate)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
              >
                {assignPlanMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BLUEPRINT DRAWER ── */}
      {showBlueprintDrawer && (
        <div className="fixed inset-0 z-[100] flex" onClick={() => setShowBlueprintDrawer(false)}>
          <div className="flex-1 bg-zinc-950/60 backdrop-blur-sm" />
          <div className="w-full max-w-lg h-full bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {blueprintDrawerMode === 'push' ? 'Push Blueprint to Library' : '⚡ White-Glove Setup'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  {blueprintDrawerMode === 'push'
                    ? `Adds a private copy to ${tenant.name}'s template library`
                    : `Applies a workflow directly to a service of ${tenant.name}`}
                </p>
              </div>
              <button onClick={() => setShowBlueprintDrawer(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-1 p-2 mx-6 mt-4 bg-gray-100 dark:bg-white/5 rounded-xl">
              {(['push', 'apply'] as const).map(mode => (
                <button key={mode} onClick={() => setBlueprintDrawerMode(mode)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${blueprintDrawerMode === mode ? 'bg-white dark:bg-zinc-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'}`}>
                  {mode === 'push' ? <><Send className="w-4 h-4" />Push to Library</> : <><Target className="w-4 h-4" />Apply to Service</>}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {blueprintDrawerMode === 'push' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">Adds a private, editable copy to this tenant's template library. They can customize it freely — the global original is untouched.</p>
                </div>
              )}
              {blueprintDrawerMode === 'apply' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300"><strong>Replaces</strong> the existing workflow on the selected service. Use for enterprise onboarding white-glove configuration. The tenant can edit the steps afterwards.</p>
                </div>
              )}

              {/* Blueprint Picker */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Select Blueprint</label>
                {blueprintsLoading ? <div className="h-12 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" /> : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {blueprints?.map((bp: any) => (
                      <label key={bp.id} className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${selectedBlueprintId === bp.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-white/10 hover:border-indigo-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                        <input type="radio" name="blueprint" value={bp.id} checked={selectedBlueprintId === bp.id} onChange={() => setSelectedBlueprintId(bp.id)} className="mt-0.5 text-indigo-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                            {bp.name}
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${bp.tenantId ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'}`}>{bp.tenantId ? 'Custom' : 'Global'}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{bp.description}</div>
                          <div className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{bp._count?.steps || bp.steps?.length || 0} steps</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Service picker (apply mode) */}
              {blueprintDrawerMode === 'apply' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Target Service</label>
                  {!tenant?.services || tenant.services.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-white/10 rounded-xl text-center">No services found. The tenant must create a service first.</div>
                  ) : (
                    <div className="space-y-2">
                      {tenant.services.map((svc: any) => (
                        <label key={svc.id} className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${selectedServiceId === svc.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-white/10 hover:border-emerald-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                          <input type="radio" name="service" value={svc.id} checked={selectedServiceId === svc.id} onChange={() => setSelectedServiceId(svc.id)} className="text-emerald-600 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{svc.name}</div>
                            {svc.location?.name && <div className="text-xs text-gray-400 dark:text-zinc-500">at {svc.location.name}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Custom name (push) */}
              {blueprintDrawerMode === 'push' && selectedBlueprintId && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Custom Name for Tenant Copy <span className="font-normal text-gray-400">(optional)</span></label>
                  <input type="text" placeholder="Leave blank to auto-generate" value={pushCustomName} onChange={e => setPushCustomName(e.target.value)} className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex gap-3">
              <button onClick={() => setShowBlueprintDrawer(false)} className="flex-1 py-2.5 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
              {blueprintDrawerMode === 'push' ? (
                <button onClick={() => pushBlueprintMutation.mutate({ blueprintId: selectedBlueprintId, name: pushCustomName || undefined })} disabled={!selectedBlueprintId || pushBlueprintMutation.isPending} className="flex-1 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center gap-2">
                  {pushBlueprintMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {pushBlueprintMutation.isPending ? 'Pushing...' : 'Push to Library'}
                </button>
              ) : (
                <button onClick={() => applyBlueprintMutation.mutate({ blueprintId: selectedBlueprintId, serviceId: selectedServiceId })} disabled={!selectedBlueprintId || !selectedServiceId || applyBlueprintMutation.isPending} className="flex-1 py-2.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center gap-2">
                  {applyBlueprintMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {applyBlueprintMutation.isPending ? 'Applying...' : 'Apply Workflow'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
