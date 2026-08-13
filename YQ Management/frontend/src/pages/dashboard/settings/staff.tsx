import React, { useState } from 'react';
import Head from 'next/head';
import SettingsLayout from '../../../components/SettingsLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { Plus, Trash2, Mail, Shield, User as UserIcon, Loader2, MailCheck, AlertTriangle, MessageSquare, Copy, KeyRound } from 'lucide-react';
import { useAuth } from '../../../components/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { CreateStaffModal } from '../../../components/modals/CreateStaffModal';

type StaffMember = {
  id: string;
  email: string;
  role: string;
  status?: 'ACTIVE' | 'INVITED' | 'EXPIRED';
  code?: string;
  isInvite?: boolean;
  expiresAt?: string;
  isOwner?: boolean;
};

export default function StaffDirectory() {
  const router = useRouter();
  const { user, refetch } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('OPERATOR');
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Modals state
  const [inviteModalData, setInviteModalData] = useState<null | { email: string; role: string; inviteCode: string; inviteId?: string; inviteUrl: string; workspaceName: string }>(null);
  const [sendingMail, setSendingMail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningWorkspace, setJoiningWorkspace] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'users' | 'providers'>('users');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  React.useEffect(() => {
    if (user && user.role !== 'TENANT_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const { data: staff = [], isLoading, isError } = useQuery<StaffMember[]>({
    queryKey: ['staff'],
    queryFn: () => fetchApi('/users'),
    enabled: !!(user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && activeTab === 'users',
    staleTime: 30000,
  });

  const { data: serviceProviders = [], isLoading: isProvidersLoading } = useQuery({
    queryKey: ['staffList'],
    queryFn: () => fetchApi('/staff'),
    enabled: !!(user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && activeTab === 'providers',
  });

  const createStaff = useMutation({
    mutationFn: (data: { email: string, role: string }) => fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setEmail('');
      setRole('OPERATOR');
      if (res?.status === 'USER_NOT_FOUND_INVITED') {
        setInviteModalData({
          email: res.email,
          role: res.role,
          inviteCode: res.inviteCode,
          inviteId: res.inviteId,
          inviteUrl: res.inviteUrl,
          workspaceName: res.workspaceName || 'Workspace',
        });
      } else {
        setInviteMessage({ type: 'success', text: res?.message || 'Staff member added successfully!' });
        setTimeout(() => setInviteMessage(null), 4000);
      }
    },
    onError: (e: Error) => {
      setInviteMessage({ type: 'error', text: e?.message || 'Error inviting staff member' });
      setTimeout(() => setInviteMessage(null), 5000);
    }
  });

  const deleteStaff = useMutation({
    mutationFn: (id: string) => fetchApi(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Removed successfully');
    }
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/users/resend-invite/${id}`, { method: 'POST' }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setInviteModalData({
        email: res.email,
        role: res.role,
        inviteCode: res.inviteCode,
        inviteId: res.inviteId,
        inviteUrl: res.inviteUrl,
        workspaceName: res.workspaceName || 'Workspace',
      });
      toast.success('Invitation renewed with a fresh 3-day timer!');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to resend invitation')
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, newRole }: { id: string, newRole: string }) => fetchApi(`/users/${id}/role`, {
      method: 'POST',
      body: JSON.stringify({ role: newRole })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Role successfully updated!');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update role')
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    createStaff.mutate({ email, role });
  };

  const handleDelete = (id: string, email: string, isInvite?: boolean) => {
    if (id === user?.userId && !isInvite) {
      toast.warning('You cannot remove yourself from the staff list.');
      return;
    }
    const label = isInvite ? 'invitation for' : 'member';
    if (!confirm(`Are you sure you want to remove this ${label} ${email}?`)) return;
    deleteStaff.mutate(id);
  };

  const handleRoleChange = (id: string, newRole: string, isInvite?: boolean) => {
    if (isInvite) {
      toast.warning('Cancel and send a new invitation to change roles for invited users.');
      return;
    }
    if (newRole === 'TENANT_ADMIN') {
      if (!confirm('Are you sure you want to grant this user Admin privileges? They will have full control over the workspace.')) return;
    }
    if (id === user?.userId && newRole !== 'TENANT_ADMIN') {
      if (!confirm('Are you sure you want to demote yourself? You will lose admin privileges.')) return;
    }
    updateRoleMutation.mutate({ id, newRole });
  };

  const transferOwnershipMutation = useMutation({
    mutationFn: (targetUserId: string) => fetchApi(`/users/${targetUserId}/transfer-ownership`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Ownership transferred successfully!');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to transfer ownership')
  });

  const handleTransferOwnership = (id: string, email: string) => {
    if (confirm(`Are you sure you want to transfer WORKSPACE OWNERSHIP to ${email}? This action is irreversible and you will lose owner privileges.`)) {
      if (confirm(`FINAL WARNING: Relinquishing ownership to ${email}?`)) {
        transferOwnershipMutation.mutate(id);
      }
    }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setJoiningWorkspace(true);
    try {
      await fetchApi('/workspace/join', {
        method: 'POST',
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      toast.success('Successfully joined team workspace!');
      await refetch();
      setShowJoinModal(false);
      setJoinCode('');
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired join code');
    } finally {
      setJoiningWorkspace(false);
    }
  };

  const currentUserEmail = user?.email || '';
  const currentUserId = user?.userId || '';

  const displayStaff: StaffMember[] = React.useMemo(() => {
    const list = Array.isArray(staff) ? [...staff] : [];
    const existingIndex = list.findIndex((s) => s.email?.toLowerCase() === currentUserEmail.toLowerCase());
    if (existingIndex >= 0) {
      list[existingIndex] = {
        id: list[existingIndex].id || currentUserId,
        email: currentUserEmail,
        role: list[existingIndex].role || user?.role || '',
        status: 'ACTIVE',
      };
    } else {
      list.unshift({
        id: currentUserId,
        email: currentUserEmail,
        role: user?.role || '',
        status: 'ACTIVE',
        isOwner: staff.find(s => s.email?.toLowerCase() === currentUserEmail.toLowerCase())?.isOwner,
      });
    }
    return list;
  }, [staff, currentUserEmail, currentUserId, user?.role]);

  const currentUserIsOwner = displayStaff.find(s => s.id === currentUserId)?.isOwner;
  const adminCount = displayStaff.filter((s) => s.role === 'TENANT_ADMIN' && !s.isInvite).length;
  const isLastAdmin = adminCount <= 1;

  if (!user || (user.role !== 'TENANT_ADMIN' && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) return null;

  return (
    <SettingsLayout pageTitle="Staff Directory" pageSubtitle="Manage roles and permissions for your team">
      <Head>
        <title>Staff Directory | Qmova</title>
      </Head>

      <div className="max-w-4xl space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-bold text-sm transition-all border border-gray-200 dark:border-white/10 shrink-0 w-fit"
          >
            <KeyRound className="w-4 h-4 text-indigo-500" />
            <span>Join Another Workspace</span>
          </button>
        </div>

        <div className="flex gap-4 border-b border-gray-200 dark:border-white/10 mb-6 pb-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'users' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            System Users
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'providers' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Service Providers
          </button>
        </div>

        {activeTab === 'users' && (
          <>
            {inviteMessage && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${inviteMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'}`}>
            {inviteMessage.type === 'success' ? <MailCheck className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
            <div><h3 className="font-bold">{inviteMessage.type === 'success' ? 'Success' : 'Error'}</h3><p className="text-sm opacity-90">{inviteMessage.text}</p></div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Invite New Staff</h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="colleague@example.com"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              >
                <option value="OPERATOR">Operator</option>
                <option value="MANAGER">Manager</option>
                <option value="TENANT_ADMIN">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={createStaff.isPending}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-600 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 h-[46px]"
            >
              {createStaff.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              {createStaff.isPending ? 'Inviting...' : 'Invite'}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-sm font-medium text-gray-500 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-4">User / Invitation</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status & Actions</th>
                <th className="px-6 py-4 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading directory...</td></tr>
              ) : isError ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Could not load staff list. Showing your account.</td>
                </tr>
              ) : displayStaff.map((s: StaffMember) => {
                const isCurrentUser = s.email?.toLowerCase() === currentUserEmail?.toLowerCase() && !s.isInvite;
                const isAdmin = s.role === 'TENANT_ADMIN' && !s.isInvite;
                const canRemove = (!isCurrentUser && !(isAdmin && isLastAdmin)) || s.isInvite;

                return (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-200 dark:border-indigo-500/30">
                          {s.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{s.email}</p>
                          {isCurrentUser && <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">You (Active Session)</p>}
                          {s.isInvite && s.code && <p className="text-xs text-gray-400 font-mono">Code: {s.code}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.isInvite ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-white/10">
                          <Shield className="w-3.5 h-3.5" /> {s.role}
                        </span>
                      ) : (
                        <div className="relative w-36">
                          <select
                            value={s.role}
                            onChange={(e) => handleRoleChange(s.id, e.target.value, s.isInvite)}
                            disabled={!isAdmin || updateRoleMutation.isPending}
                            className="w-full bg-transparent border-none appearance-none cursor-pointer focus:ring-0 text-sm font-medium text-gray-700 dark:text-zinc-300 px-2 py-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="TENANT_ADMIN">ADMIN</option>
                          </select>
                          <Shield className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {s.status === 'ACTIVE' || (!s.status && !s.isInvite) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          <MailCheck className="w-3 h-3" /> Active
                        </span>
                      ) : s.status === 'EXPIRED' ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                            <AlertTriangle className="w-3 h-3" /> Expired (3-Day Limit)
                          </span>
                          <button
                            onClick={() => resendMutation.mutate(s.id)}
                            disabled={resendMutation.isPending}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-500 transition-colors disabled:opacity-50"
                          >
                            Resend
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            <Mail className="w-3 h-3" /> Invited (3-Day Timer)
                          </span>
                          <button
                            onClick={() => setInviteModalData({
                              email: s.email,
                              role: s.role,
                              inviteCode: s.code || '',
                              inviteId: s.id,
                              inviteUrl: `https://yq-qmova.vercel.app/register?inviteCode=${s.code}`,
                              workspaceName: 'Your Workspace'
                            })}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-500 transition-colors"
                          >
                            Share
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(s.id, s.email, s.isInvite)}
                        disabled={!canRemove}
                        className={`p-2 rounded-lg transition-colors ${!canRemove
                            ? 'text-gray-300 dark:text-zinc-600 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                          }`}
                        title={!canRemove ? (isCurrentUser ? 'Cannot remove yourself' : 'At least one admin is required') : 'Remove entry'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      {currentUserIsOwner && !s.isOwner && !s.isInvite && (
                        <button
                          onClick={() => handleTransferOwnership(s.id, s.email)}
                          className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors ml-2"
                          title="Transfer Workspace Ownership"
                        >
                          👑
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {displayStaff.length === 1 && !isLoading && !isError && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Only you are in this workspace team. Invite colleagues above to start collaborating.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
        )}

        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-zinc-900/50 p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Service Providers</h2>
                <p className="text-sm text-gray-500">Manage the staff members who provide services (e.g., Doctors, Barbers).</p>
              </div>
              <button 
                onClick={() => setIsStaffModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Provider
              </button>
            </div>
            
            <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100 dark:divide-white/5">
              {isProvidersLoading ? (
                <div className="p-8 text-center text-gray-500">Loading providers...</div>
              ) : serviceProviders.length > 0 ? (
                serviceProviders.map((provider: any) => (
                  <div key={provider.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                        {provider.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{provider.name}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${provider.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {provider.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-zinc-300 rounded-lg transition-colors">
                      Edit
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <p className="mb-4">No service providers added yet.</p>
                  <button 
                    onClick={() => setIsStaffModalOpen(true)}
                    className="px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add a service provider
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* UNREGISTERED USER / INVITE SHARING MODAL */}
      {inviteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative text-left">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 border border-indigo-500/20">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">No Qmova Account Found</h2>
            <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed mb-6">
              There is currently no account associated with <strong className="text-gray-900 dark:text-white font-mono">{inviteModalData.email}</strong>. We have generated a secure 3-day invitation join code so they can set up an account and connect to your team as an <strong className="uppercase font-semibold text-indigo-600 dark:text-indigo-400">{inviteModalData.role}</strong>.
            </p>

            <div className="space-y-3">
              <button
                disabled={sendingMail}
                onClick={async () => {
                  setSendingMail(true);
                  try {
                    await fetchApi('/users/send-invite-email', {
                      method: 'POST',
                      body: JSON.stringify({
                        email: inviteModalData.email,
                        code: inviteModalData.inviteCode,
                        role: inviteModalData.role,
                      }),
                    });
                    toast.success('Invitation email successfully sent via Brevo!');
                  } catch (e: any) {
                    toast.error(e?.message || 'Error sending email invitation');
                  } finally {
                    setSendingMail(false);
                  }
                }}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5" />
                  <span>Send Invitation Email</span>
                </div>
                {sendingMail ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Brevo</span>}
              </button>

              <button
                onClick={() => {
                  const text = encodeURIComponent(
                    `Hello! You have been invited to join our Qmova workspace team (${inviteModalData.workspaceName}) as an ${inviteModalData.role}. Click here to register and join instantly: ${inviteModalData.inviteUrl}`
                  );
                  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                }}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5" />
                  <span>Share via WhatsApp Web</span>
                </div>
                <span className="text-xs opacity-80 font-medium">Instant Share</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteModalData.inviteUrl);
                  setCopiedLink(true);
                  toast.success('Join link copied to clipboard!');
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white font-bold transition-all border border-gray-200 dark:border-white/10"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Copy className="w-5 h-5 shrink-0 text-gray-500 dark:text-zinc-400" />
                  <span className="truncate text-xs font-mono text-gray-600 dark:text-zinc-300">{inviteModalData.inviteUrl}</span>
                </div>
                <span className="text-xs font-semibold shrink-0 text-indigo-600 dark:text-indigo-400 ml-2">{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setInviteModalData(null)}
                className="px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOIN ANOTHER WORKSPACE MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative text-left">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Join Workspace Team</h2>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">Enter the 8-character invitation code provided by your organization admin.</p>

            <form onSubmit={handleJoinWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider mb-2">Invitation Code</label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 font-mono font-bold tracking-widest text-lg text-center text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                  placeholder="ABCD1234"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowJoinModal(false); setJoinCode(''); }}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 font-bold text-sm text-gray-700 dark:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joiningWorkspace || !joinCode}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {joiningWorkspace && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Join Team</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <CreateStaffModal 
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />
    </SettingsLayout>
  );
}