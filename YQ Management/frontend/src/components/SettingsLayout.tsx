import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from './AdminLayout';
import { Settings, MessageSquare, Users, CreditCard, Webhook, ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthContext';

interface SettingsLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function SettingsLayout({ children, pageTitle = 'Settings', pageSubtitle = 'Manage your workspace preferences' }: SettingsLayoutProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Only admins can see all settings
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  const settingsTabs = [
    { label: 'General', href: '/dashboard/settings', icon: Settings, adminOnly: false },
    { label: 'Privacy', href: '/dashboard/settings/privacy', icon: Users, adminOnly: false },
    { label: 'Security & Legal', href: '/dashboard/settings/security', icon: CreditCard, adminOnly: false },
    { label: 'WhatsApp API', href: '/dashboard/settings/whatsapp', icon: MessageSquare, adminOnly: true },
    { label: 'Staff & Invitations', href: '/dashboard/settings/staff', icon: Users, adminOnly: true },
    { label: 'Webhooks', href: '/dashboard/settings/webhooks', icon: Webhook, adminOnly: true },
    { label: 'Billing & Plans', href: '/dashboard/settings/billing', icon: CreditCard, adminOnly: true },
  ];

  return (
    <AdminLayout pageTitle={pageTitle} pageSubtitle={pageSubtitle}>
      <div className="max-w-7xl mx-auto h-full min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8">
        
        {router.pathname !== '/dashboard/settings' && (
          <div className="mb-6">
            <Link 
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Link>
          </div>
        )}

        {/* Settings Content Area */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm h-fit">
          {children}
        </div>
      </div>
    </AdminLayout>
  );
}
