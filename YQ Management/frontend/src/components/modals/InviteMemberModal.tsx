import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../lib/api';
import { toast } from 'sonner';
import {
  X, Mail, Shield, Users, ChevronRight, Loader2, Copy, MessageSquare, User as UserIcon,
  MapPin, LayoutDashboard, Check, ChevronDown,
} from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  {
    id: 'OPERATOR',
    label: 'Staff',
    description: 'Frontline team member. Access only what you assign to them.',
    icon: UserIcon,
    color: '#0284C7',
    bg: '#0284C7/10',
  },
  {
    id: 'MANAGER',
    label: 'Manager',
    description: 'Operational oversight. Can view all queues, manage providers, and schedules.',
    icon: Users,
    color: '#7C3AED',
    bg: '#7C3AED/10',
  },
  {
    id: 'TENANT_ADMIN',
    label: 'Admin',
    description: 'Full access. Can invite members, manage billing, and change all settings.',
    icon: Shield,
    color: '#D97706',
    bg: '#D97706/10',
  },
];

const DASHBOARD_PAGES = [
  { id: 'queues', label: 'Queues', icon: '🔢' },
  { id: 'service-desk', label: 'Service Desk', icon: '🎫' },
  { id: 'check-in', label: 'Check-In', icon: '✅' },
  { id: 'appointments', label: 'Appointments', icon: '📅' },
  { id: 'history', label: 'History', icon: '🕐' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'inbox', label: 'Inbox', icon: '💬' },
  { id: 'people', label: 'People', icon: '👥' },
];

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const queryClient = useQueryClient();

  // State
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Role, 2: Email+Scope, 3: Result
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('OPERATOR');
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>(['queues', 'service-desk', 'check-in']);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => fetchApi('/location'),
    enabled: isOpen,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetchApi('/service'),
    enabled: isOpen,
  });

  const inviteMutation = useMutation({
    mutationFn: (data: any) => fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setInviteResult(res);
      setStep(3);
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to send invite'),
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate({
      email: email.trim(),
      role: selectedRole,
      allowedLocationIds: selectedRole === 'TENANT_ADMIN' ? [] : selectedLocationIds,
      allowedServiceIds: selectedRole === 'TENANT_ADMIN' ? [] : selectedServiceIds,
      allowedPages: selectedRole === 'TENANT_ADMIN' ? [] : selectedPages,
    });
  };

  const handleSendEmail = async () => {
    if (!inviteResult?.inviteCode) return;
    setSendingEmail(true);
    try {
      await fetchApi('/users/send-invite-email', {
        method: 'POST',
        body: JSON.stringify({ email, code: inviteResult.inviteCode, role: selectedRole }),
      });
      toast.success('Invitation email sent!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteResult?.inviteUrl) return;
    navigator.clipboard.writeText(inviteResult.inviteUrl);
    setCopiedLink(true);
    toast.success('Link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!inviteResult?.inviteUrl) return;
    const text = encodeURIComponent(
      `You've been invited to join our team on Qmova as ${selectedRole === 'TENANT_ADMIN' ? 'an Admin' : `a ${ROLE_OPTIONS.find(r => r.id === selectedRole)?.label}`}.\n\nClick here to accept: ${inviteResult.inviteUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const togglePage = (pageId: string) => {
    setSelectedPages(prev =>
      prev.includes(pageId) ? prev.filter(p => p !== pageId) : [...prev, pageId]
    );
  };

  const toggleLocation = (locId: string) => {
    setSelectedLocationIds(prev =>
      prev.includes(locId) ? prev.filter(l => l !== locId) : [...prev, locId]
    );
  };

  const currentRole = ROLE_OPTIONS.find(r => r.id === selectedRole);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-border dark:border-dark-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0284C7]/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#0284C7]" />
            </div>
            <div>
              <h2 className="font-semibold text-on-surface dark:text-white text-sm">Invite Team Member</h2>
              <p className="text-xs text-on-surface-variant dark:text-zinc-400">Step {step} of 3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-low dark:hover:bg-white/10 text-outline transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step progress */}
        <div className="flex px-6 py-3 gap-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 rounded-full flex-1 transition-colors ${s <= step ? 'bg-[#0284C7]' : 'bg-surface-container dark:bg-zinc-700'}`}
            />
          ))}
        </div>

        <div className="px-6 pb-6">

          {/* STEP 1: Choose Role */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-on-surface dark:text-white mb-4">What role will they have?</p>
              {ROLE_OPTIONS.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedRole === role.id
                      ? 'border-[#0284C7] bg-[#0284C7]/5'
                      : 'border-border dark:border-dark-border hover:border-[#0284C7]/40 hover:bg-surface-container-lowest dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${role.color}20` }}>
                      <role.icon className="w-4 h-4" style={{ color: role.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-on-surface dark:text-white">{role.label}</span>
                        {selectedRole === role.id && <Check className="w-3.5 h-3.5 text-[#0284C7]" />}
                      </div>
                      <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5">{role.description}</p>
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setStep(2)}
                className="w-full mt-2 h-11 bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Continue as {currentRole?.label}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: Email + Scope */}
          {step === 2 && (
            <form onSubmit={handleSendInvite} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-4 py-3 rounded-xl border border-border dark:border-dark-border bg-white dark:bg-zinc-800 text-on-surface dark:text-white outline-none focus:border-[#0284C7] transition-colors text-sm"
                  autoFocus
                />
              </div>

              {/* Location scope — only for Staff/Manager */}
              {selectedRole !== 'TENANT_ADMIN' && locations.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Location Access
                    <span className="text-zinc-400 font-normal normal-case ml-1">(leave empty = all branches)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(locations as any[]).map((loc: any) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => toggleLocation(loc.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          selectedLocationIds.includes(loc.id)
                            ? 'bg-[#0284C7] border-[#0284C7] text-white'
                            : 'border-border dark:border-dark-border text-on-surface-variant dark:text-zinc-400 hover:border-[#0284C7]/40'
                        }`}
                      >
                        {loc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Page access — only for Staff role */}
              {selectedRole === 'OPERATOR' && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant dark:text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <LayoutDashboard className="w-3 h-3" /> Dashboard Access
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DASHBOARD_PAGES.map(page => (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => togglePage(page.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
                          selectedPages.includes(page.id)
                            ? 'bg-[#0284C7]/10 border-[#0284C7]/40 text-[#0284C7]'
                            : 'border-border dark:border-dark-border text-on-surface-variant dark:text-zinc-400 hover:border-[#0284C7]/30'
                        }`}
                      >
                        <span>{page.icon}</span> {page.label}
                        {selectedPages.includes(page.id) && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedRole === 'TENANT_ADMIN' && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Admin role grants <strong>full access</strong> to all settings, billing, and team management. Use sparingly.
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 h-10 rounded-xl border border-border dark:border-dark-border text-sm font-semibold text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending || !email}
                  className="flex-1 h-10 bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Invitation
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Result / Share */}
          {step === 3 && inviteResult && (
            <div className="space-y-4">
              {inviteResult.status === 'USER_ADDED' ? (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-on-surface dark:text-white mb-1">Member Added!</h3>
                  <p className="text-sm text-on-surface-variant dark:text-zinc-400">
                    <strong className="font-mono text-on-surface dark:text-white">{email}</strong> is already on Qmova and has been added to your team as <strong>{currentRole?.label}</strong>.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center pb-2">
                    <div className="w-14 h-14 rounded-2xl bg-[#0284C7]/10 flex items-center justify-center mx-auto mb-3">
                      <Mail className="w-6 h-6 text-[#0284C7]" />
                    </div>
                    <h3 className="font-bold text-on-surface dark:text-white mb-1">No Qmova account found</h3>
                    <p className="text-sm text-on-surface-variant dark:text-zinc-400">
                      Share this invitation so <strong className="font-mono text-on-surface dark:text-white">{email}</strong> can create their account and join your team.
                    </p>
                    {/* Invite code display */}
                    <div className="mt-3 inline-flex items-center gap-2 bg-surface-container dark:bg-zinc-800 border border-border dark:border-dark-border rounded-xl px-4 py-2">
                      <span className="text-xs text-on-surface-variant dark:text-zinc-400">Code:</span>
                      <span className="font-mono font-bold text-lg text-[#0284C7] tracking-widest">{inviteResult.inviteCode}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={handleSendEmail}
                      disabled={sendingEmail}
                      className="w-full flex items-center justify-between px-4 h-12 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">Send Invitation Email</span>
                      </div>
                      {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Brevo</span>}
                    </button>

                    <button
                      onClick={handleWhatsApp}
                      className="w-full flex items-center justify-between px-4 h-12 rounded-xl bg-[#25D366] hover:bg-[#1DA851] text-white font-semibold transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm">Share via WhatsApp</span>
                      </div>
                      <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">Instant</span>
                    </button>

                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center justify-between px-4 h-12 rounded-xl border border-border dark:border-dark-border bg-surface-container-low dark:bg-zinc-800 text-on-surface dark:text-white font-semibold transition-all hover:bg-surface-container-highest dark:hover:bg-zinc-700"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Copy className="w-4 h-4 shrink-0 text-outline" />
                        <span className="text-xs font-mono truncate text-on-surface-variant dark:text-zinc-400">{inviteResult.inviteUrl}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#0284C7] shrink-0 ml-2">{copiedLink ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  onClose();
                  setStep(1);
                  setEmail('');
                  setInviteResult(null);
                  setSelectedRole('OPERATOR');
                }}
                className="w-full h-10 rounded-xl border border-border dark:border-dark-border text-sm font-semibold text-on-surface dark:text-white hover:bg-surface-container-low dark:hover:bg-white/5 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
