import React, { useState } from 'react';
import SettingsLayout from '../../../components/SettingsLayout';
import { ShieldAlert, Trash2, MonitorSmartphone, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
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
      .catch(console.error)
      .finally(() => {
        setIsDeleting(false);
        alert('Account deletion request submitted.');
        setShowDeleteConfirm(false);
      });
  };

  return (
    <SettingsLayout pageTitle="Security & Legal" pageSubtitle="Manage your account security and danger zones">
      <div className="p-6 md:p-8 max-w-4xl space-y-12">
        
        {/* Sessions Section */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">
            Active Sessions
          </h3>
          <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-200 dark:border-white/5 divide-y divide-gray-200 dark:divide-white/10">
            {isLoadingSessions ? (
              <div className="p-5 flex justify-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">No active sessions found.</div>
            ) : (
              sessions.map((session: any) => (
                <div key={session.id} className="flex justify-between items-center p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-200 dark:bg-zinc-700/50 rounded-lg text-gray-600 dark:text-zinc-400 mt-0.5">
                      <MonitorSmartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {session.deviceInfo?.os || 'Unknown OS'} • {session.deviceInfo?.browser || 'Unknown Browser'}
                        {session.isCurrentSession && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Current
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                        {session.ipAddress || 'Unknown IP'} • Last active: {new Date(session.lastActiveAt).toLocaleString()}
                      </p>
                      {session.userAgent && (
                         <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 max-w-lg truncate" title={session.userAgent}>
                           {session.userAgent}
                         </p>
                      )}
                    </div>
                  </div>
                  {!session.isCurrentSession && (
                    <button 
                      onClick={() => revokeSessionMutation.mutate(session.id)}
                      disabled={revokeSessionMutation.isPending}
                      className="text-red-600 dark:text-red-400 text-sm font-medium hover:underline disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Connected Accounts Section */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-white/10 pb-2">
            Connected Accounts
          </h3>
          <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-5 border border-gray-200 dark:border-white/5">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Google OAuth</h4>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Connected to your@email.com</p>
            </div>
            <button className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-sm font-medium text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              Disconnect
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 border-b border-red-200 dark:border-red-500/20 pb-2 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Danger Zone
          </h3>
          <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-5 border border-red-200 dark:border-red-500/20">
            <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">Delete Account</h4>
            <p className="text-sm text-red-700 dark:text-red-400/80 mb-6 max-w-xl">
              Once you delete your account, there is no going back. Please be certain. 
              This will permanently delete your user data and remove access to your workspaces.
            </p>
            
            {!showDeleteConfirm ? (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete your account
              </button>
            ) : (
              <div className="bg-white dark:bg-black p-5 rounded-lg border border-red-200 dark:border-red-500/30">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  This action is irreversible. Type <span className="font-mono bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-red-600">DELETE</span> to confirm.
                </p>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="DELETE"
                  />
                  <button 
                    disabled={deleteInput !== 'DELETE' || isDeleting}
                    onClick={handleDeleteAccount}
                    className="px-5 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Processing...' : 'Confirm Deletion'}
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-5 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

      </div>
    </SettingsLayout>
  );
}
