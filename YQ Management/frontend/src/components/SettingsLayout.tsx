import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from './AdminLayout';
import { User, Briefcase, Users, CreditCard, Webhook, MessageSquare, Shield, Lock, FileText } from 'lucide-react';
import { useAuth } from './AuthContext';

interface SettingsLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function SettingsLayout({ children, pageTitle = 'Settings', pageSubtitle = 'Manage your preferences' }: SettingsLayoutProps) {
  const router = useRouter();
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  const sidebarGroups = [
    {
      title: 'Personal',
      items: [
        { label: 'Profile', href: '/dashboard/settings/profile', icon: User, adminOnly: false },
      ]
    },
    {
      title: 'Workspace',
      items: [
        { label: 'General', href: '/dashboard/settings/workspace', icon: Briefcase, adminOnly: true },
        { label: 'Staff & Invitations', href: '/dashboard/settings/staff', icon: Users, adminOnly: true },
        { label: 'Billing & Plans', href: '/dashboard/settings/billing', icon: CreditCard, adminOnly: true },
      ]
    },
    {
      title: 'Integrations',
      items: [
        { label: 'WhatsApp API', href: '/dashboard/settings/whatsapp', icon: MessageSquare, adminOnly: true },
        { label: 'Webhooks', href: '/dashboard/settings/webhooks', icon: Webhook, adminOnly: true },
      ]
    },
    {
      title: 'Security & Legal',
      items: [
        { label: 'Security', href: '/dashboard/settings/security', icon: Lock, adminOnly: false },
        { label: 'Compliance', href: '/dashboard/settings/compliance', icon: Shield, adminOnly: false },
        { label: 'Privacy Consent', href: '/dashboard/settings/privacy', icon: FileText, adminOnly: false },
        { label: 'Audit Logs', href: '/dashboard/settings/audit', icon: FileText, adminOnly: true },
      ]
    }
  ];

  return (
    <AdminLayout pageTitle={pageTitle} pageSubtitle={pageSubtitle}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <nav className="space-y-6">
              {sidebarGroups.map((group, idx) => {
                const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin);
                if (visibleItems.length === 0) return null;

                return (
                  <div key={idx}>
                    <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-2">
                      {group.title}
                    </h3>
                    <ul className="space-y-1">
                      {visibleItems.map((item, itemIdx) => {
                        const isActive = router.pathname === item.href;
                        return (
                          <li key={itemIdx}>
                            <Link 
                              href={item.href}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isActive 
                                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' 
                                  : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5'
                              }`}
                            >
                              <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-zinc-400'}`} />
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
              {children}
            </div>
          </div>
          
        </div>

      </div>
    </AdminLayout>
  );
}
