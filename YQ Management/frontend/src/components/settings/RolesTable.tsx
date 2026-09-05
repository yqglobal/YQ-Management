import React from 'react';
import { Check, X, Minus } from 'lucide-react';

type Permission = true | false | 'partial'; // true=full, false=none, 'partial'=limited

interface FeatureRow {
  category: string;
  features: {
    label: string;
    description?: string;
    owner: Permission;
    admin: Permission;
    manager: Permission;
    staff: Permission;
  }[];
}

const FEATURE_MATRIX: FeatureRow[] = [
  {
    category: 'Billing & Ownership',
    features: [
      { label: 'View billing & invoices', owner: true, admin: true, manager: false, staff: false },
      { label: 'Manage subscription', owner: true, admin: true, manager: false, staff: false },
      { label: 'Transfer ownership', owner: true, admin: false, manager: false, staff: false },
      { label: 'Delete business account', owner: true, admin: false, manager: false, staff: false },
    ],
  },
  {
    category: 'Team Management',
    features: [
      { label: 'View team members', owner: true, admin: true, manager: true, staff: false },
      { label: 'Invite Admin members', description: 'Invite others as Admin', owner: true, admin: true, manager: false, staff: false },
      { label: 'Invite Managers & Staff', description: 'Managers can invite Staff', owner: true, admin: true, manager: 'partial', staff: false },
      { label: 'Remove team members', owner: true, admin: true, manager: 'partial', staff: false },
      { label: 'Change member roles', owner: true, admin: true, manager: false, staff: false },
      { label: 'Manage page permissions', description: 'Configure per-Staff access', owner: true, admin: true, manager: false, staff: false },
    ],
  },
  {
    category: 'Providers',
    features: [
      { label: 'View providers', owner: true, admin: true, manager: true, staff: false },
      { label: 'Add / edit providers', owner: true, admin: true, manager: true, staff: false },
      { label: 'Manage provider schedules', owner: true, admin: true, manager: true, staff: false },
      { label: 'Delete providers', owner: true, admin: true, manager: false, staff: false },
    ],
  },
  {
    category: 'Queues & Operations',
    features: [
      { label: 'View queues', owner: true, admin: true, manager: true, staff: 'partial' },
      { label: 'Create / configure queues', owner: true, admin: true, manager: false, staff: false },
      { label: 'Operate queues (serve, call next)', owner: true, admin: true, manager: true, staff: 'partial' },
      { label: 'Delete queues', owner: true, admin: true, manager: false, staff: false },
    ],
  },
  {
    category: 'Appointments',
    features: [
      { label: 'View all appointments', owner: true, admin: true, manager: true, staff: 'partial' },
      { label: 'Create / reschedule appointments', owner: true, admin: true, manager: true, staff: 'partial' },
      { label: 'Cancel appointments', owner: true, admin: true, manager: true, staff: 'partial' },
    ],
  },
  {
    category: 'Analytics & Reports',
    features: [
      { label: 'View operational analytics', owner: true, admin: true, manager: true, staff: false },
      { label: 'Export reports', owner: true, admin: true, manager: true, staff: false },
      { label: 'View revenue analytics', owner: true, admin: true, manager: false, staff: false },
    ],
  },
  {
    category: 'Settings',
    features: [
      { label: 'View general settings', owner: true, admin: true, manager: 'partial', staff: false },
      { label: 'Edit business profile', owner: true, admin: true, manager: false, staff: false },
      { label: 'Manage locations', owner: true, admin: true, manager: false, staff: false },
      { label: 'Manage services', owner: true, admin: true, manager: false, staff: false },
      { label: 'WhatsApp integration', owner: true, admin: true, manager: false, staff: false },
      { label: 'Webhook management', owner: true, admin: true, manager: false, staff: false },
    ],
  },
  {
    category: 'Inbox & Customers',
    features: [
      { label: 'View inbox & messages', owner: true, admin: true, manager: true, staff: 'partial' },
      { label: 'Manage customers', owner: true, admin: true, manager: true, staff: 'partial' },
    ],
  },
];

const COLUMNS = [
  { key: 'owner', label: 'Owner', color: '#D97706', bgClass: 'bg-amber-50 dark:bg-amber-500/10' },
  { key: 'admin', label: 'Admin', color: '#7C3AED', bgClass: 'bg-violet-50 dark:bg-violet-500/10' },
  { key: 'manager', label: 'Manager', color: '#0891B2', bgClass: 'bg-cyan-50 dark:bg-cyan-500/10' },
  { key: 'staff', label: 'Staff', color: '#0284C7', bgClass: 'bg-sky-50 dark:bg-sky-500/10' },
] as const;

function PermIcon({ value }: { value: Permission }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-500" />;
  if (value === false) return <X className="w-4 h-4 text-red-400 opacity-50" />;
  return <Minus className="w-4 h-4 text-amber-500" title="Limited — depends on scope" />;
}

export function RolesTable() {
  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-on-surface-variant dark:text-zinc-400">
        <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Full access</span>
        <span className="flex items-center gap-1.5"><Minus className="w-3.5 h-3.5 text-amber-500" /> Limited / scope-dependent</span>
        <span className="flex items-center gap-1.5"><X className="w-3.5 h-3.5 text-red-400" /> No access</span>
      </div>

      {/* Role header cards */}
      <div className="grid grid-cols-4 gap-3 mb-2">
        {COLUMNS.map(col => (
          <div key={col.key} className={`rounded-xl p-3 text-center ${col.bgClass}`}>
            <div className="font-bold text-sm" style={{ color: col.color }}>{col.label}</div>
            <div className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">
              {col.key === 'owner' && 'Primary account holder'}
              {col.key === 'admin' && 'Full operational control'}
              {col.key === 'manager' && 'Operational oversight'}
              {col.key === 'staff' && 'Assigned-scope only'}
            </div>
          </div>
        ))}
      </div>

      {/* Permission matrix */}
      <div className="border border-border dark:border-dark-border rounded-xl overflow-hidden">
        {FEATURE_MATRIX.map((section, si) => (
          <div key={section.category}>
            {/* Category row */}
            <div className="bg-surface-container dark:bg-zinc-800/80 px-4 py-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400">
                {section.category}
              </span>
            </div>
            {/* Feature rows */}
            {section.features.map((feat, fi) => (
              <div
                key={feat.label}
                className={`grid grid-cols-[1fr_repeat(4,_80px)] items-center gap-0 border-t border-border dark:border-dark-border ${
                  (si + fi) % 2 === 0 ? '' : 'bg-surface-container-lowest/30 dark:bg-zinc-900/20'
                }`}
              >
                <div className="px-4 py-3">
                  <span className="text-sm text-on-surface dark:text-white">{feat.label}</span>
                  {feat.description && (
                    <p className="text-xs text-on-surface-variant dark:text-zinc-500 mt-0.5">{feat.description}</p>
                  )}
                </div>
                {COLUMNS.map(col => (
                  <div key={col.key} className="flex items-center justify-center py-3">
                    <PermIcon value={feat[col.key]} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Note about Staff */}
      <div className="text-xs text-on-surface-variant dark:text-zinc-400 bg-surface-container dark:bg-zinc-800 border border-border dark:border-dark-border rounded-xl p-3 leading-relaxed">
        <strong className="text-on-surface dark:text-white">Staff (Limited) </strong>
        means access depends on which locations, services, and dashboard pages have been assigned to that specific team member. You can configure these when inviting or editing a Staff member.
      </div>
    </div>
  );
}
