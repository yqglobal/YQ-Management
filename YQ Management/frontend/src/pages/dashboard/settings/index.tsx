import React from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import Link from 'next/link';
import { User, Briefcase, MessageSquare, CreditCard, Webhook, Users, Clock, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../../components/AuthContext';

export default function SettingsHub() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'TENANT_ADMIN';

  const settingsOptions = [
    {
      title: 'Personal Profile',
      description: 'Manage your name, email, and preferences.',
      icon: User,
      href: '/dashboard/settings/profile',
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-500/10'
    },
    ...(isAdmin ? [
      {
        title: 'Business Profile',
        description: 'Update company name, logo, and branding.',
        icon: Briefcase,
        href: '/dashboard/settings/profile', // Reusing profile for now as they are on the same page
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-500/10'
      },
      {
        title: 'Services',
        description: 'Manage services offered to customers.',
        icon: SettingsIcon,
        href: '/dashboard/settings/services',
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-500/10'
      },
      {
        title: 'Operating Hours',
        description: 'Set your regular business hours.',
        icon: Clock,
        href: '/dashboard/settings/hours',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10'
      },
      {
        title: 'WhatsApp API',
        description: 'Configure automated WhatsApp messaging.',
        icon: MessageSquare,
        href: '/dashboard/settings/whatsapp',
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-500/10'
      },
      {
        title: 'Team Members',
        description: 'Manage staff access and roles.',
        icon: Users,
        href: '/dashboard/settings/staff',
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-500/10'
      },
      {
        title: 'Billing & Plans',
        description: 'Manage your subscription and payments.',
        icon: CreditCard,
        href: '/dashboard/settings/billing',
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-500/10'
      },
      {
        title: 'Webhooks',
        description: 'Configure integrations with other tools.',
        icon: Webhook,
        href: '/dashboard/settings/webhooks',
        color: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-500/10'
      },
    ] : [])
  ];

  return (
    <SettingsLayout pageTitle="Settings Hub" pageSubtitle="Manage all your configurations in one place.">
      <Head>
        <title>Settings | YQ Platform</title>
      </Head>

      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">Settings</h1>
          <p className="text-gray-500 dark:text-zinc-400">Configure your personal preferences and workspace settings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsOptions.map((option, index) => (
            <Link 
              key={index} 
              href={option.href}
              className="group flex flex-col p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${option.bg} group-hover:scale-110 transition-transform duration-300`}>
                <option.icon className={`w-6 h-6 ${option.color}`} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {option.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed">
                {option.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </SettingsLayout>
  );
}
