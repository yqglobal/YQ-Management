import React, { useState } from 'react';
import Head from 'next/head';
import SuperAdminLayout from '../../../components/SuperAdminLayout';
import { fetchApi } from '../../../lib/api';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Send, Users, Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminMarketing() {
  const [audience, setAudience] = useState('ALL');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['marketing-stats'],
    queryFn: () => fetchApi('/super-admin/marketing/audiences'),
  });

  const sendMutation = useMutation({
    mutationFn: (payload: any) => fetchApi('/super-admin/marketing/send', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      toast.success(`Successfully sent emails to ${data.count || 0} recipients.`);
      setSubject('');
      setHtmlContent('');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to send campaign'),
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !htmlContent.trim()) {
      toast.error('Subject and content are required');
      return;
    }
    if (confirm(`Are you sure you want to broadcast this to the chosen audience?`)) {
      sendMutation.mutate({ audience, subject, htmlContent });
    }
  };

  return (
    <SuperAdminLayout>
      <Head>
        <title>Marketing & Campaigns | Super Admin</title>
      </Head>

      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
          <p className="text-gray-500">Send broadcasts and promotional campaigns</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Tenants</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats?.totalTenants || 0}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Newsletter Subscribers</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats?.subscribers || 0}</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSend} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
              
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['ALL', 'ALL_TENANTS', 'SUBSCRIBERS', ...Object.keys(stats?.planBreakdown || {}).map(p => `PLAN_${p}`)].map(aud => (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => setAudience(aud)}
                      className={`p-3 text-sm font-medium rounded-lg border text-left transition-colors ${
                        audience === aud 
                          ? 'border-blue-600 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {aud.replace('PLAN_', 'Plan: ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Big Updates for Qmova!"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Email Content (HTML / Text)</label>
                <textarea
                  value={htmlContent}
                  onChange={e => setHtmlContent(e.target.value)}
                  className="w-full border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={12}
                  placeholder="<h1>Hello!</h1><p>Welcome to our new update...</p>"
                  required
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={sendMutation.isPending}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {sendMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  <span>Send Campaign</span>
                </button>
              </div>

            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">How it works</h3>
              <p className="text-sm text-gray-500 mb-4">
                This engine sends bulk emails directly through Brevo using a BCC chunking strategy.
                Your emails are safely delivered without revealing the full recipient list.
              </p>
              <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                <li><strong>ALL:</strong> Sends to both Tenants and Subscribers.</li>
                <li><strong>ALL_TENANTS:</strong> Target only registered users (Admins).</li>
                <li><strong>SUBSCRIBERS:</strong> Users who opted into marketing.</li>
                <li><strong>Plan:* </strong> Target active users on a specific tier.</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">HTML Guide</h3>
              <p className="text-sm text-blue-800 mb-2">
                You can write raw HTML directly in the content editor. The content will be wrapped in the standard Qmova branding layout (Logo header, footer).
              </p>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
