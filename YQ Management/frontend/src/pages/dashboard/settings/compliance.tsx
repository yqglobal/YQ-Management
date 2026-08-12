import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { useAuth } from '../../../components/AuthContext';
import { Shield, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { useRouter } from 'next/router';

export default function ComplianceSettings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (!user) return null;
  const isOwner = user.role === 'TENANT_ADMIN' || user.role === 'SUPER_ADMIN';

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const data = await fetchApi('/tenant/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qmova-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setExportSuccess(true);
    } catch (err) {
      console.error('Failed to export data', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await fetchApi('/users/me', { method: 'DELETE' });
      await logout();
      router.push('/');
    } catch (err) {
      console.error('Failed to delete account', err);
      setIsDeleting(false);
    }
  };

  return (
    <SettingsLayout pageTitle="Privacy & Compliance" pageSubtitle="Manage your data and privacy settings">
      <Head>
        <title>Compliance | Qmova</title>
      </Head>

      <div className="max-w-4xl space-y-8 pb-12">
        
        {/* Data Export Section */}
        <section className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Export Workspace Data</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-sm mb-4">
                Download a machine-readable JSON copy of all data associated with your workspace (Customers, Visits, Queues, Services, etc.). 
                This complies with Section 23 of our Data Retention Policy.
              </p>
              
              <button
                onClick={handleExport}
                disabled={isExporting || !isOwner}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  !isOwner 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isExporting ? 'Preparing Export...' : 'Export JSON Data'}
              </button>
              
              {!isOwner && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Only workspace administrators can export data.
                </p>
              )}
              {exportSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                  Export successfully generated and downloaded!
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Danger Zone: Account Deletion */}
        <section className="bg-white dark:bg-zinc-900/50 border border-red-200 dark:border-red-500/20 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Danger Zone</h3>
              <p className="text-gray-500 dark:text-zinc-400 text-sm mb-4">
                Permanently delete your account. If you are the owner of the workspace, this will also permanently wipe all workspace data, customers, and visit histories. This action cannot be undone.
              </p>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-xl font-medium transition-colors"
                >
                  Delete Account
                </button>
              ) : (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-4 mt-2">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2 font-medium">
                    <AlertTriangle className="w-5 h-5" />
                    Are you absolutely sure?
                  </div>
                  <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4">
                    This will immediately and permanently delete your account and all associated data. Type <strong>DELETE</strong> below to confirm.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE"
                      className="px-4 py-2 bg-white dark:bg-black/50 border border-red-200 dark:border-red-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-500 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm Deletion
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </SettingsLayout>
  );
}
