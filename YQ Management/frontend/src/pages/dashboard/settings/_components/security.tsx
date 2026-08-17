import React, { useState } from 'react';
import { ShieldAlert, Trash2, MonitorSmartphone, Loader2, ShieldCheck, Link2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { toast } from 'sonner';

export default function SecuritySettings() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: () => fetchApi('/auth/sessions'),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/auth/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Session revoked');
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
    onError: () => toast.error('Failed to revoke session')
  });

  const handleDeleteAccount = () => {
    if (deleteInput !== 'DELETE') return;
    setIsDeleting(true);
    // Call the placeholder endpoint
    fetch('/api/account/delete', { method: 'POST' })
      .catch(console.warn)
      .finally(() => {
        setIsDeleting(false);
        alert('Account deletion request submitted.');
        setShowDeleteConfirm(false);
      });
  };

  return (
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#10b981]"></div>
      
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-[#10b981]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Account Security</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Manage active sessions, connected accounts, and data deletion.</p>
        </div>
      </div>

      <div className="space-y-12">
        {/* Sessions Section */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-border dark:border-dark-border pb-2">
            <ShieldCheck strokeWidth={1.5} className="w-5 h-5 text-on-surface-variant dark:text-outline" />
            <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white tracking-tight font-semibold">
              Active Sessions
            </h3>
          </div>
          <div className="bg-surface-bright dark:bg-zinc-900 rounded-2xl border border-border dark:border-dark-border divide-y divide-border dark:divide-dark-border overflow-hidden">
            {isLoadingSessions ? (
              <div className="p-8 flex justify-center text-outline">
                <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-outline font-body-sm">No active sessions found.</div>
            ) : (
              sessions.map((session: any) => (
                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-container-low dark:bg-white/10 flex items-center justify-center text-on-surface dark:text-white shrink-0 mt-0.5">
                      <MonitorSmartphone strokeWidth={1.5} className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-body-md font-bold text-on-surface dark:text-white flex items-center gap-2">
                        {session.deviceInfo?.os || 'Unknown OS'} • {session.deviceInfo?.browser || 'Unknown Browser'}
                        {session.isCurrentSession && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-label-caps text-[10px] tracking-wider uppercase border border-emerald-200 dark:border-emerald-500/20">
                            Current
                          </span>
                        )}
                      </h4>
                      <p className="font-data-mono text-[13px] text-on-surface-variant dark:text-outline mt-1">
                        {session.ipAddress || 'Unknown IP'} • Last active: {new Date(session.lastActiveAt).toLocaleString()}
                      </p>
                      {session.userAgent && (
                         <p className="text-[12px] text-outline mt-1 max-w-lg truncate" title={session.userAgent}>
                           {session.userAgent}
                         </p>
                      )}
                    </div>
                  </div>
                  {!session.isCurrentSession && (
                    <button 
                      onClick={() => revokeSessionMutation.mutate(session.id)}
                      disabled={revokeSessionMutation.isPending}
                      className="h-[36px] px-4 rounded-lg bg-surface-container-low dark:bg-white/5 hover:bg-error-container dark:hover:bg-error-container text-on-surface dark:text-white hover:text-on-error-container font-body-sm font-semibold transition-colors disabled:opacity-50 border border-border dark:border-dark-border sm:ml-4 shrink-0"
                    >
                      Revoke Access
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Connected Accounts Section */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-border dark:border-dark-border pb-2">
            <Link2 strokeWidth={1.5} className="w-5 h-5 text-on-surface-variant dark:text-outline" />
            <h3 className="font-headline-sm text-headline-sm text-on-surface dark:text-white tracking-tight font-semibold">
              Connected Accounts
            </h3>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-surface-bright dark:bg-zinc-900 rounded-2xl p-6 border border-border dark:border-dark-border gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 border border-border dark:border-dark-border">
                 <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-body-md font-bold text-on-surface dark:text-white">Google OAuth</h4>
                <p className="font-body-sm text-on-surface-variant dark:text-outline mt-0.5">Connected to your@email.com</p>
              </div>
            </div>
            <button className="h-[36px] px-4 rounded-lg border border-border dark:border-dark-border bg-transparent hover:bg-surface-container-low dark:hover:bg-white/5 font-body-sm font-semibold text-on-surface dark:text-white transition-colors shrink-0">
              Disconnect
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <div className="flex items-center gap-2 mb-4 border-b border-error/20 pb-2">
            <ShieldAlert strokeWidth={1.5} className="w-5 h-5 text-error" />
            <h3 className="font-headline-sm text-headline-sm text-error tracking-tight font-semibold">
              Danger Zone
            </h3>
          </div>
          <div className="bg-error-container/50 dark:bg-error-container/20 rounded-2xl p-6 border border-error/20 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-error"></div>
            
            <h4 className="font-body-md font-bold text-on-error-container dark:text-error mb-2">Delete Account</h4>
            <p className="font-body-sm text-on-error-container/80 dark:text-error/80 mb-6 max-w-xl">
              Once you delete your account, there is no going back. Please be certain. 
              This will permanently delete your user data and remove access to your workspaces.
            </p>
            
            {!showDeleteConfirm ? (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="h-[40px] px-5 rounded-lg bg-error hover:bg-error/90 text-white font-body-sm font-semibold transition-colors flex items-center gap-2"
              >
                <Trash2 strokeWidth={1.5} className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-error/30 mt-4">
                <p className="font-body-md font-medium text-on-surface dark:text-white mb-4">
                  This action is irreversible. Type <span className="font-data-mono bg-error-container text-on-error-container px-2 py-0.5 rounded ml-1">DELETE</span> to confirm.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    className="flex-1 h-[44px] bg-surface-container-lowest dark:bg-black/50 border border-error/50 rounded-lg px-4 font-data-mono text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-error"
                    placeholder="DELETE"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="h-[44px] px-6 rounded-lg border border-border dark:border-dark-border text-on-surface dark:text-white font-body-md font-semibold hover:bg-surface-container-low dark:hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={deleteInput !== 'DELETE' || isDeleting}
                      onClick={handleDeleteAccount}
                      className="h-[44px] px-6 rounded-lg bg-error text-white font-body-md font-semibold hover:bg-error/90 transition-colors disabled:opacity-50 min-w-[120px] flex items-center justify-center"
                    >
                      {isDeleting ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
