import React from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/AdminLayout';
import { Monitor, QrCode } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';

export default function DisplayPicker() {
  const { data: queues = [], isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: () => fetchApi('/queue'),
  });

  return (
    <AdminLayout pageTitle="Digital Signage" pageSubtitle="Launch Lobby TV Displays">
      <Head>
        <title>Display Picker | Qmova</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8 font-body-md text-on-surface dark:text-white">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2 mb-8">
          <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Lobby TV Management</p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface dark:text-white flex items-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-primary dark:text-sky-500" style={{ fontVariationSettings: "'FILL' 1" }}>tv</span>
            Digital Signage Displays
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant dark:text-outline max-w-2xl mt-2">
            Select a queue below to launch its dedicated TV display mode. You can cast this window to a monitor in your waiting area to show live ticker updates and token calls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full p-12 text-center text-outline-variant font-body-md bg-card dark:bg-dark-card rounded-2xl border border-border dark:border-dark-border">
              Loading queues...
            </div>
          ) : queues.length === 0 ? (
            <div className="col-span-full p-12 text-center text-outline-variant font-body-md bg-card dark:bg-dark-card rounded-2xl border border-border dark:border-dark-border">
              No queues available. Please create a queue first.
            </div>
          ) : (
            queues.map((queue: any) => (
              <div key={queue.id} className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-[24px] p-6 hover:border-outline-variant transition-all shadow-sm flex flex-col justify-between group">
                <div className="mb-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="font-headline-md text-headline-md text-on-surface dark:text-white truncate" title={queue.name}>
                      {queue.name}
                    </h3>
                    <div className={`px-2 py-0.5 rounded font-label-caps text-label-caps uppercase tracking-wider whitespace-nowrap ${queue.status === 'ACTIVE' ? 'bg-secondary/10 text-secondary dark:text-emerald-400 border border-secondary/20' : 'bg-tertiary-container/10 text-tertiary-container dark:text-amber-400 border border-tertiary-container/20'}`}>
                      {queue.status === 'ACTIVE' ? 'Running' : queue.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-outline font-body-sm bg-surface-container-low dark:bg-black/20 p-3 rounded-xl border border-border/50 dark:border-dark-border">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                    Includes live ticketing, visual alerts, and audio announcements.
                  </div>
                </div>
                
                <Link 
                  href={`/dashboard/locations/${queue.id}/display`}
                  target="_blank"
                  className="w-full flex items-center justify-center gap-2 h-[44px] bg-primary dark:bg-sky-600 hover:bg-primary-fixed-variant dark:hover:bg-sky-500 text-white rounded-xl font-body-md font-semibold transition-colors shadow-sm group-hover:shadow-md"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 0" }}>open_in_new</span>
                  Launch Display
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
