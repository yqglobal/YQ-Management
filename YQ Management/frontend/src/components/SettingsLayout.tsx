import React from 'react';
import { useRouter } from 'next/router';
import AdminLayout from './AdminLayout';
import { Workflow, CreditCard, Building, Box, User, Users, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './AuthContext';

interface SettingsLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

const settingsNavLinks = [
  { label: 'Personal',        href: '/dashboard/settings/personal',     icon: <User className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Workspace',       href: '/dashboard/settings/workspace',    icon: <Building className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Billing',         href: '/dashboard/settings/billing',      icon: <CreditCard className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Team & Staff',    href: '/dashboard/settings/team',         icon: <Users className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Operations',      href: '/dashboard/settings/operations',   icon: <Box className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Integrations',    href: '/dashboard/settings/integrations', icon: <Workflow className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Payments',        href: '/dashboard/settings/payments',     icon: <CreditCard className="w-4 h-4" strokeWidth={1.5} /> },
  { label: 'Staff View',      href: '/dashboard/settings/staff-view',   icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} /> },
];

export default function SettingsLayout({ children, pageTitle = 'Settings', pageSubtitle = '' }: SettingsLayoutProps) {
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'OWNER';

  const filteredNavLinks = settingsNavLinks.filter(link => {
    if (isAdmin) return true;
    if (link.href === '/dashboard/settings/personal') return true;
    
    // Check if the operator has explicit permission for this settings page
    // Map the href to the page ID (e.g., /dashboard/settings/workspace -> settings-workspace)
    const pageId = link.href.split('/').slice(-2).join('-');
    return user?.allowedPages?.includes(pageId);
  });

  const activeSection = filteredNavLinks.find(l => router.pathname === l.href);
  const displayTitle = pageTitle === 'Settings' ? (activeSection?.label || 'Settings') : pageTitle;

  return (
    <AdminLayout
      pageTitle="Settings"
      settingsMode
      settingsNavLinks={filteredNavLinks}
    >
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
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
