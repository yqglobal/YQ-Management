import React from 'react';
import { useRouter } from 'next/router';
import AdminLayout from './AdminLayout';
import { Shield, Workflow, CreditCard, Building, User, Box } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';

interface SettingsLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

const settingsNavLinks = [
  { label: 'My Profile', href: '/dashboard/settings/profile', icon: <User className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Workspace & Identity', href: '/dashboard/settings/workspace', icon: <Building className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Team & Security', href: '/dashboard/settings/team', icon: <Shield className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Operations', href: '/dashboard/settings/operations', icon: <Box className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Integrations & Comms', href: '/dashboard/settings/integrations', icon: <Workflow className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Billing & Usage', href: '/dashboard/settings/billing', icon: <CreditCard className="w-4 h-4" strokeWidth={1.5} /> },
];

export default function SettingsLayout({ children, pageTitle = 'Settings', pageSubtitle = '' }: SettingsLayoutProps) {
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  const filteredNavLinks = settingsNavLinks.filter(link => {
    if (link.href === '/dashboard/settings/profile') return true;
    return isAdmin;
  });

  const activeSection = filteredNavLinks.find(l => router.pathname === l.href);
  const displayTitle = pageTitle === 'Settings' ? (activeSection?.label || 'Settings') : pageTitle;

  return (
    <AdminLayout
      pageTitle="Settings"
      settingsMode
      settingsNavLinks={filteredNavLinks}
    >
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-on-surface dark:text-white tracking-tight">
            {displayTitle}
          </h1>
          {pageSubtitle && (
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              {pageSubtitle}
            </p>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={router.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>

        <div className="h-24" />
      </div>
    </AdminLayout>
  );
}
