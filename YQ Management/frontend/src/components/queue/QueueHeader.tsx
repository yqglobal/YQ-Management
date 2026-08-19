import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Scan, Settings, QrCode, Share2, Users } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { Button } from '../../components/ui/button';

interface QueueHeaderProps {
  queueName: string;
  queueId: string;
  activeTab: 'workspace' | 'settings' | 'share';
  onTabChange: (tab: 'workspace' | 'settings' | 'share') => void;
  isAdmin: boolean;
}

export function QueueHeader({ queueName, queueId, activeTab, onTabChange, isAdmin }: QueueHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="flex items-center justify-between bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-zinc-500 font-bold mb-0.5">QUEUE</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-none">{queueName || 'Loading...'}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href={`/booking?queueId=${queueId}`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm dark:shadow-none">
          <ExternalLink className="w-4 h-4" /> Customer View
        </Link>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
          <Scan className="w-4 h-4" /> Scan
        </button>
        {isAdmin && (
          <div className="flex bg-gray-100/50 dark:bg-zinc-800/50 p-1 rounded-lg border border-gray-200 dark:border-white/5">
            <button
              onClick={() => onTabChange('workspace')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'workspace' ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Users className="w-4 h-4" /> Workspace
            </button>
            <button
              onClick={() => onTabChange('share')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'share' ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button
              onClick={() => onTabChange('settings')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'settings' ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>
        )}
        <Link href={`/dashboard/queues/${queueId}/display`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-white rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-white/5 shadow-sm dark:shadow-none">
          <QrCode className="w-4 h-4" /> QR Display
        </Link>
      </div>
    </div>
  );
}