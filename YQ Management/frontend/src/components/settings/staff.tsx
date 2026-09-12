import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import {
  Plus, Trash2, Shield, User as UserIcon, Loader2, AlertTriangle,
  MoreVertical, RotateCcw, CheckCircle, Clock, MapPin, 
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { InviteMemberModal } from '../modals/InviteMemberModal';
import { UserPermissionsModal } from '../modals/UserPermissionsModal';

type Member = {
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

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  TENANT_ADMIN: { label: 'Admin', color: '#D97706', bg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  ADMIN: { label: 'Admin', color: '#D97706', bg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  SUPER_ADMIN: { label: 'Owner', color: '#7C3AED', bg: 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  MANAGER: { label: 'Manager', color: '#0891B2', bg: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400' },
  OPERATOR: { label: 'Staff', color: '#0284C7', bg: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ACTIVE: { label: 'Active', icon: <CheckCircle className="w-3 h-3" />, color: 'text-emerald-600 dark:text-emerald-400' },
  INVITED: { label: 'Invite Pending', icon: <Clock className="w-3 h-3" />, color: 'text-amber-600 dark:text-amber-400' },
  EXPIRED: { label: 'Invite Expired', icon: <AlertTriangle className="w-3 h-3" />, color: 'text-red-600 dark:text-red-400' },
  INACTIVE: { label: 'Inactive', icon: null, color: 'text-zinc-400' },
  ON_LEAVE: { label: 'On Leave', icon: null, color: 'text-blue-400' },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_LABELS[role] || { label: role, bg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, icon: null, color: 'text-zinc-400' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function MemberAvatar({ email, role, isOwner }: { email: string; role: string; isOwner?: boolean }) {
  const initial = email ? email.charAt(0).toUpperCase() : '?';
  const cfg = ROLE_LABELS[role] || { color: '#6B7280' };
  return (
    <div className="relative">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: cfg.color || '#6B7280' }}
      >
        {initial}
      </div>
      {isOwner && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
          <Shield className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  );
}

function MemberRowMenu({
  member, canManage, currentUserId, onDelete, onRoleChange, onPermissions, onTransfer, isOwner,
}: {
  member: Member; canManage: boolean; currentUserId?: string;
  onDelete: () => void; onRoleChange: (role: string) => void;
  onPermissions: () => void; onTransfer: () => void; isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isSelf = member.id === currentUserId;
  const isAdmin = member.role === 'TENANT_ADMIN' || member.role === 'SUPER_ADMIN';

  if (!canManage) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg hover:bg-surface-container-low dark:hover:bg-white/10 text-outline transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-52 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-border dark:border-dark-border py-1 overflow-hidden">
            {member.status === 'ACTIVE' && (
              <>
                {member.role === 'OPERATOR' && (
                  <button
                    onClick={() => { onPermissions(); setOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors"
                  >
                    Manage Permissions
                  </button>
                )}
                {!isSelf && !isAdmin && (
                  <button
                    onClick={() => { onRoleChange('MANAGER'); setOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors"
                  >
                    Make Manager
                  </button>
                )}
                {!isSelf && member.role !== 'TENANT_ADMIN' && (
                  <button
                    onClick={() => { onRoleChange('TENANT_ADMIN'); setOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors"
                  >
                    Make Admin
                  </button>
                )}
                {!isSelf && member.role === 'MANAGER' && (
                  <button
                    onClick={() => { onRoleChange('OPERATOR'); setOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors"
                  >
                    Demote to Staff
                  </button>
                )}
                {!isSelf && isOwner && (
                  <>
                    <div className="border-t border-border dark:border-dark-border my-1" />
                    <button
                      onClick={() => { onTransfer(); setOpen(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                    >
                      Transfer Ownership
                    </button>
                  </>
                )}
              </>
            )}
            {!isSelf && (
              <>
                <div className="border-t border-border dark:border-dark-border my-1" />
                <button
                  onClick={() => { onDelete(); setOpen(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  {member.isInvite ? 'Cancel Invitation' : 'Remove from Team'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function StaffDirectory() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<Member | null>(null);

  const isAdmin = user?.role === 'TENANT_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  

  React.useEffect(() => {
    if (user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, router, isAdmin]);

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['staff'],
    queryFn: () => fetchApi('/users'),
    enabled: !!isAdmin,
    staleTime: 30000,
  });

    const deleteMember = useMutation({
    mutationFn: (id: string) => fetchApi(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); toast.success('Removed successfully'); },
    onError: (e: Error) => toast.error(e.message || 'Failed to remove'),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/users/resend-invite/${id}`, { method: 'POST' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); toast.success('Invitation renewed — fresh 3-day timer!'); },
    onError: (e: Error) => toast.error(e.message || 'Failed to resend'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, newRole }: { id: string; newRole: string }) =>
      fetchApi(`/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role: newRole }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); toast.success('Role updated!'); },
    onError: (e: Error) => toast.error(e.message || 'Failed to update role'),
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: (targetUserId: string) => fetchApi(`/users/${targetUserId}/transfer-ownership`, { method: 'POST' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); toast.success('Ownership transferred!'); },
    onError: (e: Error) => toast.error(e.message || 'Failed to transfer ownership'),
  });

      const handleRoleChange = (member: Member, newRole: string) => {
    if (member.isInvite) { toast.warning('Cancel and re-invite to change role.'); return; }
    if (newRole === 'TENANT_ADMIN' && !confirm(`Grant Admin privileges to ${member.email}? They'll have full control.`)) return;
    updateRoleMutation.mutate({ id: member.id, newRole });
  };

  const handleTransferOwnership = (member: Member) => {
    if (!confirm(`Transfer BUSINESS OWNERSHIP to ${member.email}?\n\nYou will lose owner privileges. This cannot be undone.`)) return;
    transferOwnershipMutation.mutate(member.id);
  };

  const activeMembers = members.filter(m => m.status === 'ACTIVE' || !m.isInvite);
  const invitedMembers = members.filter(m => m.isInvite);
  const myOwnership = members.find(m => m.id === user?.userId && m.isOwner);

  return (
    <div className="space-y-6">
      {/* MEMBERS SECTION */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-on-surface dark:text-white">Team Members</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">
                People with access to your dashboard
              </p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 px-4 h-9 bg-[#0284C7] hover:bg-[#0369A1] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Invite Member
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#0284C7]" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 bg-surface-container-lowest dark:bg-zinc-800/50 rounded-2xl border border-dashed border-border dark:border-dark-border">
              <div className="w-12 h-12 rounded-xl bg-[#0284C7]/10 flex items-center justify-center mx-auto mb-3">
                <UserIcon className="w-6 h-6 text-[#0284C7]" />
              </div>
              <p className="font-semibold text-on-surface dark:text-white">No team members yet</p>
              <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1">Invite your first team member to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Active members */}
              {activeMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3.5 bg-white dark:bg-zinc-800/50 rounded-xl border border-border dark:border-dark-border hover:bg-surface-container-lowest dark:hover:bg-zinc-800 transition-colors"
                >
                  <MemberAvatar email={member.email} role={member.role} isOwner={member.isOwner} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-on-surface dark:text-white truncate">
                        {member.email}
                        {member.id === user?.userId && (
                          <span className="text-xs text-on-surface-variant dark:text-zinc-500 font-normal ml-1">(you)</span>
                        )}
                      </span>
                      <RoleBadge role={member.role} />
                      {member.isOwner && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Owner</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-on-surface-variant dark:text-zinc-500">
                      <StatusBadge status={member.status || 'ACTIVE'} />
                      {member.allowedPages && member.allowedPages.length > 0 && member.role === 'OPERATOR' && (
                        <span className="flex items-center gap-1">
                          <span>{member.allowedPages.length} page{member.allowedPages.length !== 1 ? 's' : ''}</span>
                        </span>
                      )}
                      {member.allowedLocationIds && member.allowedLocationIds.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {member.allowedLocationIds.length} location{member.allowedLocationIds.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {member.role === 'OPERATOR' && isAdmin && (
                      <button
                        onClick={() => { setUserToEdit(member); setPermissionsModalOpen(true); }}
                        className="p-1.5 rounded-lg hover:bg-surface-container-low dark:hover:bg-white/10 text-outline transition-colors"
                        title="Manage Permissions"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    )}
                    <MemberRowMenu
                      member={member}
                      canManage={isAdmin}
                      currentUserId={user?.userId}
                      isOwner={!!myOwnership}
                      onDelete={() => deleteMember.mutate(member.id)}
                      onRoleChange={(role) => handleRoleChange(member, role)}
                      onPermissions={() => { setUserToEdit(member); setPermissionsModalOpen(true); }}
                      onTransfer={() => handleTransferOwnership(member)}
                    />
                  </div>
                </div>
              ))}

              {/* Invited / pending */}
              {invitedMembers.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400 px-1 py-2">Pending Invitations</p>
                  {invitedMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3.5 bg-surface-container-lowest dark:bg-zinc-900/50 rounded-xl border border-dashed border-border dark:border-dark-border mb-2"
                    >
                      <div className="w-9 h-9 rounded-xl bg-surface-container dark:bg-zinc-800 border border-dashed border-border dark:border-dark-border flex items-center justify-center">
                        <Clock className="w-4 h-4 text-on-surface-variant dark:text-zinc-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-on-surface dark:text-white truncate">{member.email}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <RoleBadge role={member.role} />
                          <StatusBadge status={member.status || 'INVITED'} />
                          {member.expiresAt && (
                            <span className="text-xs text-on-surface-variant dark:text-zinc-500">
                              Expires {new Date(member.expiresAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {member.status === 'EXPIRED' ? (
                          <button
                            onClick={() => resendMutation.mutate(member.id)}
                            disabled={resendMutation.isPending}
                            className="flex items-center gap-1.5 px-3 h-7 text-xs font-semibold rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" /> Resend
                          </button>
                        ) : null}
                        <button
                          onClick={() => { if (confirm(`Cancel invitation for ${member.email}?`)) deleteMember.mutate(member.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 dark:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      {/* Modals */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {permissionsModalOpen && userToEdit && (
        <UserPermissionsModal
          isOpen={permissionsModalOpen}
          onClose={() => { setPermissionsModalOpen(false); setUserToEdit(null); }}
          member={userToEdit}
        />
      )}
    </div>
  );
}