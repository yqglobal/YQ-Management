import React, { useState } from 'react';
import Head from 'next/head';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../lib/api';
import { Plus, Trash2, Mail, Shield, User as UserIcon, Loader2, MailCheck, AlertTriangle, MessageSquare, Copy, KeyRound } from 'lucide-react';
import { useAuth } from '../../../../components/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { CreateStaffModal } from '../../../../components/modals/CreateStaffModal';
import { UserPermissionsModal } from '../../../../components/modals/UserPermissionsModal';

type StaffMember = {
  id: string;
  email: string;
  role: string;
  status?: 'ACTIVE' | 'INVITED' | 'EXPIRED';
  code?: string;
  isInvite?: boolean;
  expiresAt?: string;
  isOwner?: boolean;
  allowedLocationIds?: string[];
  allowedServiceIds?: string[];
  allowedPages?: string[];
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
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any>(null);

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
    <div className="bg-card dark:bg-dark-card rounded-[24px] border border-border dark:border-dark-border shadow-sm p-8 relative overflow-hidden mb-8">
      {/* Decorative left edge accent */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#0284C7]"></div>

      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-[#0284C7]" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold">Staff & Team</h2>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline">Manage team members, roles, and service providers.</p>
        </div>
        <button
          onClick={() => setShowJoinModal(true)}
          className="h-[44px] px-6 bg-surface-container-low dark:bg-white/5 border border-border dark:border-dark-border text-on-surface dark:text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 hover:bg-surface-container-highest dark:hover:bg-white/10"
        >
          <KeyRound strokeWidth={1.5} className="w-4 h-4 text-[#0284C7]" />
          Join Another Workspace
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-border dark:border-dark-border pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 h-[44px] rounded-t-lg font-body-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'users' ? 'border-[#0284C7] text-[#0284C7]' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Shield strokeWidth={1.5} className="w-4 h-4" />
          System Users
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 h-[44px] rounded-t-lg font-body-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'providers' ? 'border-[#0284C7] text-[#0284C7]' : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Service Providers
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {inviteMessage && (
            <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 ${inviteMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'}`}>
              {inviteMessage.type === 'success' ? <MailCheck strokeWidth={1.5} className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle strokeWidth={1.5} className="w-5 h-5 shrink-0 mt-0.5" />}
              <div>
                <h3 className="font-body-md font-bold">{inviteMessage.type === 'success' ? 'Success' : 'Error'}</h3>
                <p className="font-body-sm opacity-90 mt-1">{inviteMessage.text}</p>
              </div>
            </div>
          )}

          <div className="bg-surface-bright dark:bg-zinc-900 border border-border dark:border-dark-border rounded-2xl p-6 shadow-sm mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-body-lg text-body-lg font-semibold text-on-surface dark:text-white">Staff Management</h3>
              <p className="font-body-sm text-on-surface-variant dark:text-outline mt-1">Add new staff members and configure their system access permissions.</p>
            </div>
            <button
              onClick={() => {
                setUserToEdit(null);
                setPermissionsModalOpen(true);
              }}
              className="h-[44px] px-6 bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus strokeWidth={1.5} className="w-5 h-5" />
              Invite Staff
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-surface-container-lowest dark:bg-black/20 border-b border-border dark:border-dark-border">
                <tr>
                  <th className="py-3 px-6 font-label-caps text-label-caps text-on-surface-variant font-semibold uppercase tracking-wider">User / Invitation</th>
                  <th className="py-3 px-6 font-label-caps text-label-caps text-on-surface-variant font-semibold uppercase tracking-wider">Role</th>
                  <th className="py-3 px-6 font-label-caps text-label-caps text-on-surface-variant font-semibold uppercase tracking-wider">Status & Actions</th>
                  <th className="py-3 px-6 font-label-caps text-label-caps text-on-surface-variant font-semibold uppercase tracking-wider text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-dark-border font-body-md">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-outline">Loading directory...</td></tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-error">Could not load staff list. Showing your account.</td>
                  </tr>
                ) : displayStaff.map((s: StaffMember) => {
                  const isCurrentUser = s.email?.toLowerCase() === currentUserEmail?.toLowerCase() && !s.isInvite;
                  const isAdmin = s.role === 'TENANT_ADMIN' && !s.isInvite;
                  const canRemove = (!isCurrentUser && !(isAdmin && isLastAdmin)) || s.isInvite;

                  return (
                    <tr key={s.id} className="hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-container/30 text-on-primary-container font-bold flex items-center justify-center text-sm border border-primary/20">
                            {s.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface dark:text-white">{s.email}</p>
                            {isCurrentUser && <p className="text-[12px] text-[#0284C7] font-semibold mt-0.5">You (Active Session)</p>}
                            {s.isInvite && s.code && <p className="text-[12px] text-outline font-data-mono mt-0.5">Code: {s.code}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {s.isInvite ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium border bg-surface-container-low dark:bg-black/50 text-on-surface-variant dark:text-outline border-border dark:border-dark-border">
                            <Shield strokeWidth={1.5} className="w-3.5 h-3.5" /> {s.role}
                          </span>
                        ) : (
                          <div className="relative w-36">
                            <select
                              value={s.role}
                              onChange={(e) => handleRoleChange(s.id, e.target.value, s.isInvite)}
                              disabled={!isAdmin || updateRoleMutation.isPending}
                              className="w-full bg-transparent border-none appearance-none cursor-pointer focus:ring-0 text-sm font-medium text-on-surface dark:text-white px-2 py-1 hover:bg-surface-container-low dark:hover:bg-white/10 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed outline-none"
                            >
                              <option value="OPERATOR">OPERATOR</option>
                              <option value="MANAGER">MANAGER</option>
                              <option value="TENANT_ADMIN">ADMIN</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[16px]">expand_more</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {s.status === 'ACTIVE' || (!s.status && !s.isInvite) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-wide">
                            <MailCheck strokeWidth={1.5} className="w-3 h-3" /> Active
                          </span>
                        ) : s.status === 'EXPIRED' ? (
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-error-container text-on-error-container border border-error/20 uppercase tracking-wide">
                              <AlertTriangle strokeWidth={1.5} className="w-3 h-3" /> Expired (3-Day Limit)
                            </span>
                            <button
                              onClick={() => resendMutation.mutate(s.id)}
                              disabled={resendMutation.isPending}
                              className="text-[12px] font-bold text-[#0284C7] underline hover:text-[#0369A1] transition-colors disabled:opacity-50"
                            >
                              Resend
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20 uppercase tracking-wide">
                              <Mail strokeWidth={1.5} className="w-3 h-3" /> Invited (3-Day Timer)
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
                              className="text-[12px] font-bold text-[#0284C7] underline hover:text-[#0369A1] transition-colors"
                            >
                              Share
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {currentUserIsOwner && !s.isOwner && !s.isInvite && (
                            <button
                              onClick={() => handleTransferOwnership(s.id, s.email)}
                              className="p-2 rounded-lg text-outline hover:text-[#D97706] hover:bg-[#D97706]/10 transition-colors"
                              title="Transfer Workspace Ownership"
                            >
                              👑
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setUserToEdit(s);
                              setPermissionsModalOpen(true);
                            }}
                            className="p-2 rounded-lg text-[#0284C7] hover:bg-[#0284C7]/10 transition-colors"
                            title="Edit Permissions"
                          >
                            <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.email, s.isInvite)}
                            disabled={!canRemove}
                            className={`p-2 rounded-lg transition-colors ${!canRemove
                                ? 'text-surface-container-highest cursor-not-allowed'
                                : 'text-outline hover:text-error hover:bg-error-container'
                              }`}
                            title={!canRemove ? (isCurrentUser ? 'Cannot remove yourself' : 'At least one admin is required') : 'Remove entry'}
                          >
                            <Trash2 strokeWidth={1.5} className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayStaff.length === 1 && !isLoading && !isError && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-outline">Only you are in this workspace team. Invite colleagues above to start collaborating.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-surface-bright dark:bg-zinc-900 p-6 rounded-2xl border border-border dark:border-dark-border shadow-sm">
            <div>
              <h3 className="font-body-lg font-semibold text-on-surface dark:text-white">Service Providers</h3>
              <p className="font-body-sm text-on-surface-variant dark:text-outline mt-1">Manage the staff members who provide services (e.g., Doctors, Barbers).</p>
            </div>
            <button 
              onClick={() => setIsStaffModalOpen(true)}
              className="flex items-center gap-2 px-4 h-[44px] bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-lg font-body-md font-semibold transition-colors shadow-sm"
            >
              <Plus strokeWidth={1.5} className="w-5 h-5" /> Add Provider
            </button>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 border border-border dark:border-dark-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border dark:divide-dark-border">
            {isProvidersLoading ? (
              <div className="p-8 text-center text-outline">Loading providers...</div>
            ) : serviceProviders.length > 0 ? (
              serviceProviders.map((provider: any) => (
                <div key={provider.id} className="p-5 flex items-center justify-between hover:bg-surface-container-lowest dark:hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#0284C7]/10 flex items-center justify-center text-[#0284C7] font-bold">
                      {provider.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-body-md font-bold text-on-surface dark:text-white">{provider.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[12px] font-medium uppercase tracking-wide border ${provider.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'}`}>
                          {provider.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 h-[36px] bg-surface-container-low dark:bg-white/5 hover:bg-surface-container-highest dark:hover:bg-white/10 text-on-surface dark:text-white rounded-lg transition-colors font-body-sm font-semibold border border-border dark:border-dark-border">
                    Edit
                  </button>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-outline border-2 border-dashed border-border dark:border-dark-border rounded-xl m-4">
                <p className="font-body-md mb-4">No service providers added yet.</p>
                <button 
                  onClick={() => setIsStaffModalOpen(true)}
                  className="px-4 h-[44px] bg-white dark:bg-black/50 border border-border dark:border-dark-border hover:bg-surface-container-low dark:hover:bg-white/10 rounded-lg font-body-sm font-semibold transition-colors"
                >
                  Add a service provider
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UNREGISTERED USER / INVITE SHARING MODAL */}
      {inviteModalData && (
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-[24px] p-6 md:p-8 max-w-lg w-full shadow-2xl relative text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center mb-5 border border-[#0284C7]/20">
              <Mail strokeWidth={1.5} className="w-6 h-6" />
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white mb-2 tracking-tight font-semibold">No Qmova Account Found</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline leading-relaxed mb-6">
              There is currently no account associated with <strong className="text-on-surface dark:text-white font-data-mono">{inviteModalData.email}</strong>. We have generated a secure 3-day invitation join code so they can set up an account and connect to your team as an <strong className="uppercase font-semibold text-[#0284C7]">{inviteModalData.role}</strong>.
            </p>

            <div className="space-y-4">
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
                className="w-full flex items-center justify-between px-5 h-[56px] rounded-2xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Mail strokeWidth={1.5} className="w-5 h-5" />
                  <span>Send Invitation Email</span>
                </div>
                {sendingMail ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <span className="text-[12px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">Brevo</span>}
              </button>

              <button
                onClick={() => {
                  const text = encodeURIComponent(
                    `Hello! You have been invited to join our Qmova workspace team (${inviteModalData.workspaceName}) as an ${inviteModalData.role}. Click here to register and join instantly: ${inviteModalData.inviteUrl}`
                  );
                  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                }}
                className="w-full flex items-center justify-between px-5 h-[56px] rounded-2xl bg-[#10b981] hover:bg-[#059669] text-white font-semibold transition-all shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare strokeWidth={1.5} className="w-5 h-5" />
                  <span>Share via WhatsApp Web</span>
                </div>
                <span className="text-[12px] opacity-80 font-medium bg-black/20 px-2 py-0.5 rounded-full">Instant</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteModalData.inviteUrl);
                  setCopiedLink(true);
                  toast.success('Join link copied to clipboard!');
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="w-full flex items-center justify-between px-5 h-[56px] rounded-2xl bg-surface-container-low dark:bg-black/50 hover:bg-surface-container-highest dark:hover:bg-white/10 text-on-surface dark:text-white font-semibold transition-all border border-border dark:border-dark-border"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Copy strokeWidth={1.5} className="w-5 h-5 shrink-0 text-outline" />
                  <span className="truncate text-sm font-data-mono">{inviteModalData.inviteUrl}</span>
                </div>
                <span className="text-[12px] font-semibold shrink-0 text-[#0284C7] ml-2">{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            <div className="mt-8 pt-4 border-t border-border dark:border-dark-border flex justify-end">
              <button
                onClick={() => setInviteModalData(null)}
                className="px-6 h-[44px] rounded-lg bg-surface-container-low dark:bg-white/5 text-on-surface dark:text-white font-semibold hover:bg-surface-container-highest dark:hover:bg-white/10 transition-colors border border-border dark:border-dark-border"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOIN ANOTHER WORKSPACE MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-[24px] p-6 md:p-8 max-w-md w-full shadow-2xl relative text-left">
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white mb-2 tracking-tight font-semibold">Join Workspace Team</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline mb-6">Enter the 8-character invitation code provided by your organization admin.</p>

            <form onSubmit={handleJoinWorkspace} className="space-y-4">
              <div>
                <label className="block font-label-caps text-label-caps text-on-surface-variant dark:text-outline uppercase tracking-wider mb-2">Invitation Code</label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full bg-surface-bright dark:bg-black/50 border border-border dark:border-dark-border rounded-xl px-4 py-3 font-data-mono text-xl text-center text-[#0284C7] focus:outline-none focus:border-[#0284C7] uppercase"
                  placeholder="ABCD1234"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => { setShowJoinModal(false); setJoinCode(''); }}
                  className="px-5 h-[44px] rounded-lg bg-transparent border border-border dark:border-dark-border hover:bg-surface-container-low dark:hover:bg-white/5 font-semibold text-on-surface dark:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joiningWorkspace || !joinCode}
                  className="px-6 h-[44px] rounded-lg bg-[#0284C7] hover:bg-[#0369A1] font-semibold text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {joiningWorkspace && <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" />}
                  <span>Join Team</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {isStaffModalOpen && (
        <CreateStaffModal 
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
        />
      )}

      {permissionsModalOpen && (
        <UserPermissionsModal
          isOpen={permissionsModalOpen}
          onClose={() => {
            setPermissionsModalOpen(false);
            setUserToEdit(null);
          }}
          userToEdit={userToEdit}
          onSuccess={(res) => {
            if (res?.status === 'USER_NOT_FOUND_INVITED') {
              setInviteModalData({
                email: res.email,
                role: res.role,
                inviteCode: res.inviteCode,
                inviteId: res.inviteId,
                inviteUrl: res.inviteUrl,
                workspaceName: res.workspaceName || 'Workspace',
              });
            }
          }}
        />
      )}
    </div>
  );
}