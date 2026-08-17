import { getTenantUrl } from "../../lib/utils";
import { useAuth } from "../AuthContext";
import React, { useState, useEffect } from 'react';
import { Copy, MapPin, Globe, Code, CheckCircle2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface SharePanelProps {
  queueId: string;
}

export function SharePanel({ queueId }: SharePanelProps) {
  const [publicUrl, setPublicUrl] = useState('');
  const [tvDisplayUrl, setTvDisplayUrl] = useState('');

  const { user } = useAuth();
  
  useEffect(() => {
    // Only access window on the client side
    const subdomain = user?.tenant?.subdomain || '';
    setPublicUrl(getTenantUrl(subdomain, `/customer/join/${queueId}`));
    setTvDisplayUrl(getTenantUrl(subdomain, `/public/display/${queueId}`));
  }, [queueId, user?.tenant?.subdomain]);

  const iframeCode = `<iframe src="${publicUrl}" width="100%" height="600px" style="border:none;border-radius:12px;background:#fff;"></iframe>`;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (err) {
      toast.error('Failed to copy. Please do it manually.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Acquire Customers Automatically ✨</h2>
        <p className="text-indigo-100 max-w-2xl text-sm leading-relaxed mb-6">
          Turn your digital channels into booking machines. Share your queue link on Google, your website, and social media to allow customers to join your line before they even arrive.
        </p>

        <div className="bg-white/10 border border-white/20 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 backdrop-blur-sm">
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold text-indigo-100 uppercase tracking-wider mb-1.5 block">Direct Booking Link</label>
            <div className="bg-white/10 rounded-lg px-4 py-2.5 font-mono text-sm break-all">
              {publicUrl || 'Generating link...'}
            </div>
          </div>
          <button 
            onClick={() => copyToClipboard(publicUrl, 'Link')}
            className="w-full sm:w-auto px-6 py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copy Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Google Business Profile Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Google Business Profile</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Add an "Appointments" link to your Google Maps listing.
              </p>
            </div>
          </div>
          <ol className="space-y-3 text-sm text-gray-600 dark:text-zinc-300 mt-6 list-decimal list-inside pl-1">
            <li>Search for "my business" on Google.</li>
            <li>Click on <strong>Edit Profile</strong>.</li>
            <li>Scroll down to the <strong>Booking</strong> or <strong>Appointments link</strong> section.</li>
            <li>Paste your direct booking link and save.</li>
          </ol>
        </div>

        {/* Website Embed Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Website Integration</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Embed the booking flow directly into your website.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <label className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">IFrame Snippet</label>
            <div className="relative group">
              <textarea 
                readOnly
                value={iframeCode}
                className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/5 rounded-lg p-3 text-sm font-mono text-gray-600 dark:text-zinc-400 h-24 resize-none"
              />
              <button
                onClick={() => copyToClipboard(iframeCode, 'Snippet')}
                className="absolute top-2 right-2 p-2 bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-indigo-600 rounded-md border border-gray-200 dark:border-white/10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Code className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Physical Signage / QR */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm md:col-span-2 flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-500" />
              Printable QR Code & Signage
            </h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed">
              Print a physical QR code for walk-in customers. Place it at your reception desk or front door so customers can scan and join the line without speaking to staff.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a 
                href={`/dashboard/queues/${queueId}/display`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
              >
                Open QR Display Screen
              </a>
            </div>
          </div>
          <div className="w-32 h-32 bg-gray-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center shrink-0 border border-gray-200 dark:border-white/5 p-4">
             <div className="w-full h-full bg-white rounded-lg grid grid-cols-2 gap-1 p-2 shadow-sm">
               <div className="bg-indigo-900 rounded-sm"></div>
               <div className="bg-indigo-900 rounded-sm"></div>
               <div className="bg-indigo-900 rounded-sm"></div>
               <div className="bg-indigo-500 rounded-sm"></div>
             </div>
          </div>
        </div>

        {/* Public Live TV Display Card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm md:col-span-2">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Public Live TV Display</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed max-w-2xl">
                Show the live queue on any Smart TV or external tablet without needing to log in. 
                Simply open the web browser on your TV and paste this link.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/5 rounded-lg px-4 py-3 font-mono text-sm text-gray-600 dark:text-zinc-400 truncate">
              {tvDisplayUrl || 'Generating link...'}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => copyToClipboard(tvDisplayUrl, 'TV Display Link')}
                className="flex-1 sm:flex-none px-4 py-3 bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg border border-gray-200 dark:border-indigo-500/30 font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copy
              </button>
              <a 
                href={tvDisplayUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-center"
              >
                Open View
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
