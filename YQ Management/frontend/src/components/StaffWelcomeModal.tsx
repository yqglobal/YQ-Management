import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Shield, Users, Briefcase, ChevronRight } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../lib/api';

const PAGE_LABELS: Record<string, string> = {
  'service-desk': 'Service Desk & Scanner',
  'inbox': 'Customer Inbox',
  'appointments': 'Appointments',
  'journeys': 'Journey Flows',
  'queues': 'Queue Management',
  'people': 'Customers & People',
  'analytics': 'Analytics & Reports',
  'settings-workspace': 'Workspace Settings',
  'settings-team': 'Team Settings',
  'settings-operations': 'Operations Settings',
  'settings-integrations': 'Integrations Settings',
  'settings-templates': 'Templates Settings',
};

export function StaffWelcomeModal() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [storageKey, setStorageKey] = useState('');

  const { data: tenant } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => fetchApi('/tenant/me').catch(() => null),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || !tenant) return;
    
    // Only show to non-admins
    if (['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(user.role)) return;

    const key = `staff_welcomed_${user.id}_${tenant.id}`;
    setStorageKey(key);

    const seen = localStorage.getItem(key);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, [user, tenant]);

  const dismiss = () => {
    if (storageKey) localStorage.setItem(storageKey, '1');
    setVisible(false);
  };

  if (!visible || !user || !tenant) return null;

  const allowedLabels = ((user.allowedPages as string[]) || [])
    .map((p: string) => PAGE_LABELS[p])
    .filter(Boolean);

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div className="relative bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-xl dark:shadow-[0_0_80px_-20px_rgba(0,0,0,1)] border border-zinc-200 dark:border-white/5 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Section */}
        <div className="relative p-8 pb-6 border-b border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#202020]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-0.5">
                Welcome to
              </p>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{tenant.name}</h2>
            </div>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
            You have successfully joined the workspace. Here is a summary of your assigned role and access permissions.
          </p>
        </div>

        {/* Bottom Section */}
        <div className="p-8 pt-6">
          
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Your Role</span>
              </div>
              <span className="text-sm font-bold text-zinc-900 dark:text-white bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded-full">
                {formatRole(user.role)}
              </span>
            </div>

            {allowedLabels.length > 0 && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-100 dark:border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pages you can access</span>
                </div>
                <div className="pl-11 pr-2 flex flex-wrap gap-2">
                  {allowedLabels.map(label => (
                    <span key={label} className="text-xs bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-md">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-6 text-xs text-zinc-500">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>If you need access to more pages, please contact your workspace administrator.</span>
          </div>

          <button
            onClick={dismiss}
            className="w-full bg-zinc-900 dark:bg-white/10 hover:bg-zinc-800 dark:hover:bg-white/15 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Go to Dashboard <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
