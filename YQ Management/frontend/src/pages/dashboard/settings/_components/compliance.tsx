import React, { useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../../../../components/AuthContext';
import { Shield, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchApi } from '../../../../lib/api';
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
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#6366f1]"></div>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-[#6366f1]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Compliance & Data</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Export your data and manage account lifecycle.</p>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* Data Export Section */}
        <section>
          <div className="flex items-center justify-between bg-surface-bright dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-dark-border shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#6366f1]/10 text-[#6366f1] flex items-center justify-center shrink-0 mt-0.5">
                <Download strokeWidth={1.5} className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-body-md font-bold text-on-surface dark:text-white mb-1">Export Workspace Data</h3>
                <p className="font-body-sm text-on-surface-variant dark:text-outline mb-4">
                  Download a machine-readable JSON copy of all data associated with your workspace. This complies with Section 23 of our Data Retention Policy.
                </p>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleExport}
                    disabled={isExporting || !isOwner}
                    className={`h-[44px] px-6 rounded-lg font-body-md font-semibold transition-colors flex items-center justify-center gap-2 w-fit ${
                      !isOwner 
                        ? 'bg-surface-container-low dark:bg-white/5 text-outline cursor-not-allowed border border-border dark:border-dark-border' 
                        : 'bg-[#6366f1] text-white hover:bg-[#4f46e5] shadow-sm'
                    }`}
                  >
                    {isExporting ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <Download strokeWidth={1.5} className="w-5 h-5" />}
                    {isExporting ? 'Preparing Export...' : 'Export JSON Data'}
                  </button>
                  
                  {!isOwner && (
                    <p className="font-body-sm text-error mt-1">
                      Only workspace administrators can export data.
                    </p>
                  )}
                  {exportSuccess && (
                    <p className="font-body-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      Export successfully generated and downloaded!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone: Account Deletion */}
        <section>
          <div className="bg-error-container/50 dark:bg-error-container/20 border border-error/20 rounded-2xl p-6 relative overflow-hidden">
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-error"></div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 strokeWidth={1.5} className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-body-md font-bold text-on-error-container dark:text-error mb-1">Danger Zone: Delete Account</h3>
                <p className="font-body-sm text-on-error-container/80 dark:text-error/80 mb-4">
                  Permanently delete your account. If you are the owner of the workspace, this will also permanently wipe all workspace data, customers, and visit histories. This action cannot be undone.
                </p>
                
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="h-[40px] px-5 bg-error text-white hover:bg-error/90 rounded-lg font-body-sm font-semibold transition-colors flex items-center gap-2"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="bg-white dark:bg-zinc-900 border border-error/30 rounded-xl p-6 mt-4">
                    <div className="flex items-center gap-2 text-on-surface dark:text-white mb-2 font-medium">
                      <AlertTriangle strokeWidth={1.5} className="w-5 h-5 text-error" />
                      Are you absolutely sure?
                    </div>
                    <p className="font-body-sm text-on-surface-variant dark:text-outline mb-4">
                      This will immediately and permanently delete your account and all associated data. Type <strong className="font-data-mono bg-error-container text-on-error-container px-2 py-0.5 rounded ml-1">DELETE</strong> below to confirm.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input 
                        type="text" 
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                        className="flex-1 h-[44px] bg-surface-container-lowest dark:bg-black/50 border border-error/50 rounded-lg px-4 font-data-mono text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-error"
                      />
                      <div className="flex gap-2">
                         <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          className="h-[44px] px-6 border border-border dark:border-dark-border text-on-surface dark:text-white font-body-md font-semibold hover:bg-surface-container-low dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                          className="h-[44px] px-6 bg-error text-white rounded-lg font-body-md font-semibold hover:bg-error/90 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[120px] gap-2"
                        >
                          {isDeleting ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : 'Confirm Deletion'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
