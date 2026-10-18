import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import {
  Plus, Trash2, Shield, User as UserIcon, Loader2, AlertTriangle,
  MoreVertical, RotateCcw, CheckCircle, Clock, MapPin, Key,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { InviteMemberModal } from '../modals/InviteMemberModal';
import { UserPermissionsModal } from '../modals/UserPermissionsModal';
import { usePlan } from '../../hooks/usePlan';
import { QuotaWarningBanner } from '../QuotaWarningBanner';

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
  OWNER: { label: 'Owner', color: '#D97706', bg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' },
  ADMIN: { label: 'Admin', color: '#7C3AED', bg: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20' },
  SUPER_ADMIN: { label: 'Super Admin', color: '#EF4444', bg: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20' },
  MANAGER: { label: 'Manager', color: '#0891B2', bg: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20' },
  STAFF: { label: 'Staff', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' },
  OPERATOR: { label: 'Staff', color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20' },
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
  member,
  canManage,
  currentUserId,
  onDelete,
  onOpenModal,
  isOwner,
}: {
  member: Member;
  canManage: boolean;
  currentUserId?: string;
  onDelete: () => void;
  onOpenModal: (step: 1 | 2 | 3) => void;
  isOwner: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isSelf = member.id === currentUserId;

  if (!canManage) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg hover:bg-surface-container-low dark:hover:bg-white/10 text-outline transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-border dark:border-dark-border py-1 overflow-hidden">
            {member.status === 'ACTIVE' && (
              <>
                <button
                  onClick={() => {
                    onOpenModal(2);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Manage Permissions
                </button>
                <button
                  onClick={() => {
                    onOpenModal(3);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  Change Role & Access
                </button>
                {!isSelf && isOwner && member.role !== 'OWNER' && (
                  <>
                    <div className="border-t border-border dark:border-dark-border my-1" />
                    <button
                      onClick={() => {
                        onOpenModal(3);
                        setOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors flex items-center gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
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
                  onClick={() => {
                    onDelete();
                    setOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
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
  const [modalInitialStep, setModalInitialStep] = useState<1 | 2 | 3>(2);

  const handleOpenModal = (member: Member, step: 1 | 2 | 3 = 2) => {
    setUserToEdit(member);
    setModalInitialStep(step);
    setPermissionsModalOpen(true);
  };

  const plan = usePlan();
  const maxStaff = plan.limits?.maxMembers ?? 2;

  const isAdmin = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  

  React.useEffect(() => {
    if (user && !isAdmin) {
      router.push('/dashboard');
    }
  }, [user, router, isAdmin]);

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['staff'],
    queryFn: () => fetchApi('/users') as Promise<Member[]>,
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

  const activeMembers = members.filter(m => m.status === 'ACTIVE' || !m.isInvite);
  const invitedMembers = members.filter(m => m.isInvite);
  const myOwnership = members.find(m => m.id === user?.userId && m.isOwner);

  return (
    <div className="space-y-6">
      {/* JOIN WORKSPACE SECTION */}
      <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-border dark:border-dark-border p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-on-surface dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Have an Invite Code?
            </h3>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400 mt-1 max-w-lg">
              If you accidentally created a new trial workspace instead of joining your team, you can enter your invite code here to discard this workspace and join your intended team.
            </p>
          </div>
          <button
            onClick={() => {
              const code = prompt('Enter your 8-character invite code:');
              if (code && code.trim()) {
                fetchApi('/auth/join-with-invite', {
                  method: 'POST',
                  body: JSON.stringify({ inviteCode: code.trim().toUpperCase() }),
                })
                  .then(() => {
                    toast.success('Successfully joined the workspace! Reloading...', { duration: 5000 });
                    setTimeout(() => window.location.href = '/dashboard', 1500);
                  })
                  .catch((e) => toast.error(e.message || 'Invalid or expired invite code'));
              }
            }}
            className="flex items-center gap-2 px-4 h-9 bg-surface-container hover:bg-surface-container-high dark:bg-zinc-800 dark:hover:bg-zinc-700 text-on-surface dark:text-white text-sm font-semibold rounded-xl transition-colors border border-border dark:border-dark-border"
          >
            Join Workspace
          </button>
        </div>
      </div>

      {/* MEMBERS SECTION */}
      <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
            <div>
              <h3 className="font-bold text-on-surface dark:text-white flex items-center gap-2">Team Members</h3>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">
                People with access to your dashboard
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end shrink-0 mr-2">
                <span className="text-sm font-semibold text-on-surface dark:text-white mb-1">
                  {members.length} of {maxStaff > 0 ? maxStaff : 'Unlimited'} Staff Used
                </span>
                <div className="w-32 h-2 bg-surface-container-low dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: maxStaff > 0 ? `${Math.min((members.length / maxStaff) * 100, 100)}%` : '100%' }}
                  />
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                disabled={maxStaff > 0 && members.length >= maxStaff}
                className={`flex items-center gap-2 px-4 h-9 text-white text-sm font-semibold rounded-xl transition-colors ${
                  maxStaff > 0 && members.length >= maxStaff
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500'
                    : 'bg-primary hover:bg-primary/90'
                }`}
                title={maxStaff > 0 && members.length >= maxStaff ? 'Staff limit reached on current plan' : ''}
              >
                <Plus className="w-4 h-4" /> Invite Member
              </button>
            </div>
          </div>

          <QuotaWarningBanner 
            resourceType="staff" 
            frozenCount={plan.frozenCounts?.members || 0} 
            limit={maxStaff} 
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 bg-surface-container-lowest dark:bg-zinc-800/50 rounded-2xl border border-dashed border-border dark:border-dark-border">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <UserIcon className="w-6 h-6 text-primary" />
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
                      {member.allowedPages && member.allowedPages.length > 0 && (member.role === 'STAFF' || member.role === 'MANAGER') && (
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
                    {isAdmin && !member.isOwner && (
                      <button
                        onClick={() => handleOpenModal(member, 2)}
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
                      onOpenModal={(step) => handleOpenModal(member, step)}
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
                            className="flex items-center gap-1.5 px-3 h-7 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors"
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
          userToEdit={userToEdit}
          initialStep={modalInitialStep}
          isCurrentUserOwner={!!myOwnership}
          currentUserId={user?.userId}
        />
      )}
    </div>
  );
}